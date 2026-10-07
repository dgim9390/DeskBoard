import { Platform } from "react-native";
import { CATALOG } from "@/data/catalog";
import { parse } from "@/lib/productParse";
import type { Category, ProductKind } from "@/store/useDeskStore";

/** 제품 링크 미리보기 결과 (api/product-preview.js 응답) */
export interface ProductPreview {
  url: string;
  title: string | null;
  image: string | null;
  /** 페이지 안의 사진 후보 (대표 사진 포함). 예전 서버 응답에는 없음 */
  images?: string[];
  siteName: string;
  brand: string | null;
  price: number | null;
  currency: string | null;
  description: string;
  /** 페이지에서 찾은 크기(cm). 추정값이라 사용자가 확인해야 함. height: 책상에서 위로 솟은 높이 */
  dimensions: { width: number; depth: number; height?: number | null; all?: number[]; text: string } | null;
}

/** 배포 사이트 주소. 로컬 개발·맥 앱에서는 링크 읽기 서버로 이 주소를 씀 */
const DEPLOYED = process.env.EXPO_PUBLIC_SITE_URL ?? "https://deskboard-one.vercel.app";

function apiBase() {
  // 배포된 웹에서는 같은 사이트의 /api 를 사용
  if (Platform.OS === "web" && typeof window !== "undefined" && /^https:$/.test(window.location.protocol) && !/localhost/.test(window.location.host)) {
    return "";
  }
  return DEPLOYED;
}

/** 다른 사이트 사진을 링크 읽기 서버를 거쳐 받는 주소 (배경 지우기에 필요한 픽셀 읽기용) */
export const imageProxyUrl = (url: string) => `${apiBase()}/api/image-proxy?url=${encodeURIComponent(url)}`;

/** 자동으로 읽는 것을 막아 둔 쇼핑몰 (지원하지 않음) */
const SERVER_BLOCKED = /(^|\.)(coupang\.com|coupa\.ng)$/i;

/** 맥 앱(Electron)이 제공하는 페이지 읽기. 웹 브라우저에서는 없음 */
type PageReader = (url: string) => Promise<{ html: string; finalUrl: string }>;
const pageReader = (): PageReader | undefined =>
  Platform.OS === "web" && typeof window !== "undefined" ? (window as unknown as { deskterior?: { readPage?: PageReader } }).deskterior?.readPage : undefined;

class PreviewError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function fromServer(url: string): Promise<ProductPreview> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/product-preview?url=${encodeURIComponent(url)}`);
  } catch {
    throw new PreviewError("링크 읽기 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.", "network");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) throw new PreviewError(body?.message ?? `정보를 불러오지 못했어요 (${res.status}).`, body?.error);
  return body as ProductPreview;
}

async function fromApp(read: PageReader, url: string): Promise<ProductPreview> {
  let page: { html: string; finalUrl: string };
  try {
    page = await read(url);
  } catch (e) {
    // "Error invoking remote method '…': Error: 메시지" → 메시지만
    const msg = (e instanceof Error ? e.message : String(e)).replace(/^.*Error:\s*/, "");
    throw new PreviewError(msg || "페이지를 불러오지 못했어요.");
  }
  const data = parse(page.html, page.finalUrl);
  if (!data.title && !data.image) throw new PreviewError("이 페이지에서 제품 정보를 찾지 못했어요. 직접 입력해 주세요.");
  return data;
}

export async function fetchProductPreview(rawUrl: string): Promise<ProductPreview> {
  const url = rawUrl.trim();
  const host = new URL(url).hostname;
  const read = pageReader();
  if (SERVER_BLOCKED.test(host)) {
    throw new PreviewError("쿠팡 링크는 지원하지 않아요. 아래에 이름·크기를 직접 입력하고, 상품 사진은 저장해서 '사진 올리기'로 넣어 주세요.");
  }
  try {
    return await fromServer(url);
  } catch (e) {
    // 서버가 막힌 사이트는 맥 앱이 직접 열어 한 번 더 시도
    if (read && e instanceof PreviewError && ["blocked_by_site", "fetch_failed", "timeout"].includes(e.code ?? "")) return fromApp(read, url);
    throw e;
  }
}

/** 링크처럼 보이는지 (앞뒤 공백 허용, http 생략 시 붙여줌) */
export function normalizeUrl(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withProto);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

// ── 제목으로 종류 추정 ───────────────────────────────────
// 위에서부터 먼저 맞는 규칙을 씀 (구체적인 것 먼저: "모니터 암"이 "모니터"보다 앞)
const RULES: { re: RegExp; kind: ProductKind; category: Category }[] = [
  { re: /모니터\s*암|monitor\s*arm/i, kind: "monitor-arm", category: "accessory" },
  { re: /모니터\s*(받침|선반|스탠드)|monitor\s*(riser|stand|shelf)/i, kind: "monitor-riser", category: "accessory" },
  { re: /라이트\s*바|light\s*bar|screenbar/i, kind: "light-bar", category: "accessory" },
  { re: /수직\s*거치대|vertical\s*(laptop\s*)?stand/i, kind: "laptop-vertical-stand", category: "accessory" },
  { re: /노트북\s*(받침|거치|스탠드)|laptop\s*stand/i, kind: "laptop-stand", category: "accessory" },
  { re: /울트라\s*와이드|ultra\s*wide|34\s*(인치|")/i, kind: "ultrawide", category: "monitor" },
  { re: /모니터|monitor|display|디스플레이/i, kind: "monitor", category: "monitor" },
  { re: /맥북|macbook/i, kind: "macbook-open", category: "laptop" },
  { re: /노트북|laptop|notebook|그램|갤럭시\s*북/i, kind: "laptop", category: "laptop" },
  { re: /손목\s*받침|wrist\s*rest/i, kind: "wrist-rest", category: "accessory" },
  { re: /데스크\s*매트|desk\s*mat|장패드/i, kind: "desk-mat", category: "accessory" },
  { re: /마우스\s*패드|mouse\s*pad/i, kind: "mouse-pad", category: "accessory" },
  { re: /트랙패드|trackpad/i, kind: "trackpad", category: "accessory" },
  { re: /키보드|keyboard|키크론|keychron/i, kind: "keyboard", category: "keyboard" },
  { re: /버티컬\s*마우스|vertical\s*mouse|mx\s*vertical/i, kind: "mouse-vertical", category: "mouse" },
  { re: /마우스|mouse|mice|mx\s*(master|anywhere|ergo)/i, kind: "mouse", category: "mouse" },
  { re: /헤드폰\s*(거치|스탠드)|headphone\s*(stand|hanger)/i, kind: "headphone-stand", category: "accessory" },
  { re: /헤드폰|헤드셋|headphone|headset/i, kind: "headphones", category: "accessory" },
  { re: /스피커\s*(받침|스탠드|거치|선반)|speaker\s*(stand|riser|pad)|isolation\s*pad/i, kind: "speaker-stand", category: "accessory" },
  { re: /웹\s*캠|웹\s*카메라|webcam|web\s*cam|brio|c920|c922/i, kind: "webcam", category: "accessory" },
  { re: /키\s*라이트|링\s*라이트|방송\s*조명|key\s*light|ring\s*light|elgato\s*light/i, kind: "key-light", category: "accessory" },
  { re: /무드\s*등|수면\s*등|mood\s*light|night\s*light/i, kind: "mood-light", category: "accessory" },
  { re: /캔들|양초|candle|디퓨저|diffuser/i, kind: "candle", category: "accessory" },
  { re: /데스크\s*(선반|쉘프|셸프)|책상\s*선반|desk\s*shelf|desktop\s*shelf/i, kind: "desk-shelf", category: "accessory" },
  { re: /오디오\s*인터페이스|audio\s*interface|\bdac\b|앰프|scarlett|focusrite/i, kind: "audio-interface", category: "accessory" },
  { re: /드로잉\s*태블릿|펜\s*태블릿|타블렛|wacom|와콤|drawing\s*tablet|pen\s*tablet/i, kind: "drawing-tablet", category: "accessory" },
  { re: /숫자\s*키\s*패드|텐\s*키|넘패드|numpad|number\s*pad|numeric\s*keypad/i, kind: "numpad", category: "keyboard" },
  { re: /게임\s*패드|컨트롤러|조이\s*패드|gamepad|controller|dualsense|듀얼\s*센스/i, kind: "gamepad", category: "accessory" },
  { re: /맥\s*미니|맥\s*스튜디오|mac\s*mini|mac\s*studio|미니\s*pc|mini\s*pc|nuc\b/i, kind: "mini-pc", category: "accessory" },
  { re: /본체|데스크탑\s*pc|게이밍\s*pc|pc\s*케이스|미들\s*타워|tower|pc\s*case|desktop\s*pc/i, kind: "pc-tower", category: "accessory" },
  { re: /펜\s*꽂이|연필\s*꽂이|pen\s*(cup|holder)|pencil\s*cup/i, kind: "pen-cup", category: "accessory" },
  { re: /북\s*엔드|bookend|책\s*꽂이|book\s*stand/i, kind: "books", category: "accessory" },
  { re: /액자|사진\s*틀|photo\s*frame|picture\s*frame/i, kind: "photo-frame", category: "accessory" },
  { re: /탁상\s*달력|달력|calendar/i, kind: "calendar", category: "accessory" },
  { re: /에어팟|버즈|무선\s*이어폰|airpods|earbuds|galaxy\s*buds/i, kind: "earbuds", category: "accessory" },
  { re: /텀블러|보온병|tumbler|water\s*bottle|물병/i, kind: "tumbler", category: "accessory" },
  { re: /선풍기|서큘레이터|desk\s*fan|circulator/i, kind: "desk-fan", category: "accessory" },
  { re: /사운드\s*바|sound\s*bar/i, kind: "soundbar", category: "accessory" },
  { re: /스피커|speaker/i, kind: "speaker", category: "accessory" },
  { re: /마이크|microphone|\bmic\b/i, kind: "mic-arm", category: "accessory" },
  { re: /램프|조명|스탠드\s*등|lamp|light/i, kind: "lamp", category: "accessory" },
  { re: /허브|hub|독|dock/i, kind: "usbc-hub", category: "accessory" },
  { re: /무선\s*충전|wireless\s*charg/i, kind: "wireless-charger", category: "accessory" },
  { re: /태블릿|아이패드|ipad|tablet/i, kind: "tablet-stand", category: "accessory" },
  { re: /(휴대폰|스마트폰|핸드폰)\s*거치|phone\s*stand/i, kind: "phone-stand", category: "accessory" },
  { re: /멀티탭|power\s*strip/i, kind: "power-strip", category: "accessory" },
  { re: /화분|식물|plant/i, kind: "plant", category: "accessory" },
  { re: /머그|컵|mug|tumbler|텀블러/i, kind: "mug", category: "accessory" },
  { re: /시계|clock/i, kind: "clock", category: "accessory" },
  { re: /가습기|humidifier/i, kind: "humidifier", category: "accessory" },
  { re: /정리함|오거나이저|organizer/i, kind: "desk-organizer", category: "accessory" },
];

/** 제목으로 종류를 추정. category는 추천·결합 규칙에 쓰이고, kind는 "그림으로 표시"할 때 쓰임 */
export function guessProduct(title: string): { kind: ProductKind; category: Category } | null {
  const hit = RULES.find((r) => r.re.test(title));
  return hit ? { kind: hit.kind, category: hit.category } : null;
}

/** 책상 위에 납작하게 놓이는 종류 (3D에서 위에서 찍은 사진을 눕혀서 표시) */
export const FLAT_KINDS = new Set<ProductKind>([
  "keyboard", "keyboard-full", "mouse", "mouse-vertical", "trackpad", "mouse-pad", "desk-mat", "wrist-rest",
  "notebook-pad", "macro-pad", "usbc-hub", "wireless-charger", "power-strip",
]);

/**
 * 페이지에서 찾은 치수를 가로·깊이·높이로 정리.
 * 마우스·키보드처럼 납작한 제품은 쇼핑몰마다 '높이'를 길이로 적기도 해서(로지텍: Height = 길이),
 * 세 값 중 가장 작은 값을 높이로 본다. 마우스는 길쭉한 쪽이 깊이, 키보드는 긴 쪽이 가로.
 */
export function resolveDimensions(found: NonNullable<ProductPreview["dimensions"]>, kind: ProductKind | null) {
  if (kind && FLAT_KINDS.has(kind) && found.all?.length === 3) {
    const [tall, a, b] = [...found.all].sort((x, y) => x - y);
    const mouse = kind === "mouse" || kind === "mouse-vertical";
    return { width: mouse ? a : b, depth: mouse ? b : a, tall };
  }
  return { width: found.width, depth: found.depth, tall: found.height ?? null };
}

/** 크기를 못 찾았을 때 같은 종류 기본 제품의 크기 (없으면 20×20) */
export function defaultSize(kind: ProductKind | null): { width: number; height: number } {
  const entry = kind ? CATALOG.find((e) => e.kind === kind) : undefined;
  return entry ? { width: entry.width, height: entry.height } : { width: 20, height: 20 };
}

/**
 * 사진 제품이 3D에서 쓸 모형 (종류별로 통일된 모형을 실제 크기·높이·사진 색에 맞춰 그림).
 * 앞쪽일수록 자주 쓰는 것
 */
export const MODEL_CHOICES: { kind: ProductKind; label: string }[] = [
  { kind: "monitor", label: "모니터" },
  { kind: "ultrawide", label: "울트라와이드" },
  { kind: "keyboard", label: "키보드" },
  { kind: "keyboard-full", label: "풀사이즈 키보드" },
  { kind: "mouse", label: "마우스" },
  { kind: "trackpad", label: "트랙패드" },
  { kind: "laptop", label: "노트북" },
  { kind: "macbook-closed", label: "덮은 노트북" },
  { kind: "speaker", label: "스피커" },
  { kind: "speaker-stand", label: "스피커 받침대" },
  { kind: "soundbar", label: "사운드바" },
  { kind: "headphones", label: "헤드폰" },
  { kind: "headphone-stand", label: "헤드폰 거치대" },
  { kind: "mic-arm", label: "마이크" },
  { kind: "lamp", label: "스탠드 조명" },
  { kind: "light-bar", label: "모니터 라이트바" },
  { kind: "monitor-riser", label: "모니터 받침대" },
  { kind: "laptop-stand", label: "노트북 받침대" },
  { kind: "laptop-vertical-stand", label: "수직 거치대" },
  { kind: "tablet-stand", label: "태블릿" },
  { kind: "phone-stand", label: "폰 거치대" },
  { kind: "macro-pad", label: "스트림덱" },
  { kind: "desk-mat", label: "데스크 매트" },
  { kind: "mouse-pad", label: "마우스 패드" },
  { kind: "wrist-rest", label: "손목 받침대" },
  { kind: "usbc-hub", label: "허브" },
  { kind: "wireless-charger", label: "무선 충전기" },
  { kind: "power-strip", label: "멀티탭" },
  { kind: "desk-organizer", label: "정리함" },
  { kind: "notebook-pad", label: "노트" },
  { kind: "plant", label: "화분" },
  { kind: "mug", label: "컵" },
  { kind: "clock", label: "시계" },
  { kind: "humidifier", label: "가습기" },
  { kind: "pc-tower", label: "PC 본체" },
  { kind: "mini-pc", label: "미니 PC" },
  { kind: "webcam", label: "웹캠" },
  { kind: "gamepad", label: "게임패드" },
  { kind: "numpad", label: "숫자 키패드" },
  { kind: "drawing-tablet", label: "드로잉 태블릿" },
  { kind: "audio-interface", label: "오디오 인터페이스" },
  { kind: "key-light", label: "키라이트" },
  { kind: "mood-light", label: "무드등" },
  { kind: "candle", label: "캔들" },
  { kind: "desk-shelf", label: "데스크 선반" },
  { kind: "pen-cup", label: "펜꽂이" },
  { kind: "books", label: "책" },
  { kind: "photo-frame", label: "액자" },
  { kind: "calendar", label: "달력" },
  { kind: "earbuds", label: "이어폰" },
  { kind: "tumbler", label: "텀블러" },
  { kind: "desk-fan", label: "선풍기" },
  { kind: "generic", label: "상자(기타)" },
];

/** 이름·주소로 3D 모형 추정 (모르면 null) */
export function guessModel(text: string): ProductKind | null {
  const g = guessProduct(text);
  return g && MODEL_CHOICES.some((m) => m.kind === g.kind) ? g.kind : g?.kind === "macbook-open" ? "laptop" : null;
}

/** 그림으로 표시할 때 고를 수 있는 모양 */
export const SHAPE_CHOICES: { kind: ProductKind; label: string; category: Category }[] = [
  { kind: "monitor", label: "모니터", category: "monitor" },
  { kind: "ultrawide", label: "울트라와이드", category: "monitor" },
  { kind: "keyboard", label: "키보드", category: "keyboard" },
  { kind: "mouse", label: "마우스", category: "mouse" },
  { kind: "macbook-open", label: "맥북", category: "laptop" },
  { kind: "laptop", label: "노트북", category: "laptop" },
  { kind: "speaker", label: "스피커", category: "accessory" },
  { kind: "lamp", label: "램프", category: "accessory" },
  { kind: "headphones", label: "헤드폰", category: "accessory" },
  { kind: "plant", label: "화분", category: "accessory" },
  { kind: "generic", label: "상자(기타)", category: "accessory" },
];
