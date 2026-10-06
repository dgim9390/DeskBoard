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
  /** 페이지에서 찾은 크기(cm). 추정값이라 사용자가 확인해야 함 */
  dimensions: { width: number; depth: number; text: string } | null;
}

/** 배포 사이트 주소. 로컬 개발·맥 앱에서는 링크 읽기 서버로 이 주소를 씀 */
const DEPLOYED = process.env.EXPO_PUBLIC_SITE_URL ?? "https://deskterior-one.vercel.app";

function apiBase() {
  // 배포된 웹에서는 같은 사이트의 /api 를 사용
  if (Platform.OS === "web" && typeof window !== "undefined" && /^https:$/.test(window.location.protocol) && !/localhost/.test(window.location.host)) {
    return "";
  }
  return DEPLOYED;
}

/** 다른 사이트 사진을 링크 읽기 서버를 거쳐 받는 주소 (배경 지우기에 필요한 픽셀 읽기용) */
export const imageProxyUrl = (url: string) => `${apiBase()}/api/image-proxy?url=${encodeURIComponent(url)}`;

/** 서버 접속을 막는 쇼핑몰. 맥 앱에서는 앱이 직접 페이지를 열어 읽음 */
const SERVER_BLOCKED = /(^|\.)(coupang\.com|coupa\.ng)$/i;

/** 맥 앱(Electron)이 제공하는 페이지 읽기. 웹 브라우저에서는 없음 */
type PageReader = (url: string) => Promise<{ html: string; finalUrl: string }>;
const pageReader = (): PageReader | undefined =>
  Platform.OS === "web" && typeof window !== "undefined" ? (window as unknown as { deskterior?: { readPage?: PageReader } }).deskterior?.readPage : undefined;

/** 서버가 막힌 쇼핑몰(쿠팡 등)도 읽을 수 있는지 = 맥 앱(1.2 이상) */
export const canReadBlockedSites = () => !!pageReader();

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
    if (read) return fromApp(read, url);
    // 예전 맥 앱(1.1.x)은 화면만 자동 업데이트되고 페이지 읽기 기능이 없음
    if (typeof navigator !== "undefined" && /Electron/.test(navigator.userAgent)) {
      throw new PreviewError("쿠팡 링크는 맥 앱 1.2부터 불러올 수 있어요. GitHub에서 새 버전(.dmg)을 받아 덮어 설치해 주세요. 지금은 아래에서 직접 입력할 수 있어요.");
    }
    throw new PreviewError(
      "쿠팡 링크는 맥 앱(1.2 이상)에서 바로 불러올 수 있어요. 웹에서는 아래에 이름·크기를 직접 입력하고, 상품 사진은 저장해서 '사진 올리기'로 넣어 주세요.",
    );
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
  { re: /버티컬\s*마우스|vertical\s*mouse/i, kind: "mouse-vertical", category: "mouse" },
  { re: /마우스|mouse/i, kind: "mouse", category: "mouse" },
  { re: /헤드폰\s*(거치|스탠드)|headphone\s*(stand|hanger)/i, kind: "headphone-stand", category: "accessory" },
  { re: /헤드폰|헤드셋|headphone|headset/i, kind: "headphones", category: "accessory" },
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

/** 크기를 못 찾았을 때 같은 종류 기본 제품의 크기 (없으면 20×20) */
export function defaultSize(kind: ProductKind | null): { width: number; height: number } {
  const entry = kind ? CATALOG.find((e) => e.kind === kind) : undefined;
  return entry ? { width: entry.width, height: entry.height } : { width: 20, height: 20 };
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
