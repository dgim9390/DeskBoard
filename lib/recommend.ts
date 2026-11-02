import { fitsOnDesk } from "@/lib/placement";
import type { Budget, Category, DeskItem, DeskSize, ProductKind, Purpose, UserProfile } from "@/store/useDeskStore";

export const PURPOSE_LABEL: Record<Purpose, string> = { dev: "개발", design: "디자인·영상", game: "게임", work: "재택근무", study: "공부" };
export const BUDGET_LABEL: Record<Budget, string> = { low: "10만 원 이하", mid: "30만 원 이하", any: "상관없음" };
const BUDGET_MAX: Record<Budget, number> = { low: 100000, mid: 300000, any: Infinity };

export type Section = "monitor" | "laptop" | "input" | "audio" | "light" | "organize" | "decor";

export const SECTION_LABEL: Record<Section, string> = {
  monitor: "모니터",
  laptop: "노트북·기기",
  input: "키보드·마우스",
  audio: "오디오",
  light: "조명",
  organize: "정리·전원",
  decor: "소품·인테리어",
};

export interface Product {
  id: string;
  name: string;
  price: number;
  reason: string;
  section: Section;
  kind: ProductKind;
  category: Category;
  width: number; // cm, 위에서 본 점유 면적
  height: number;
  /** 현재 책상 구성을 보고 추천된 제품인지 (false면 데스크테리어 인기 아이템) */
  matched: boolean;
  /** 고른 용도에 맞춘 추천인지 */
  forMe: boolean;
  /** 책상에 다른 장비를 가리지 않고 놓을 빈자리가 있는지 */
  fits: boolean;
  /** 놓을 때 함께 정할 값 (예: 세로로 돌린 서브 모니터) */
  extra?: Partial<DeskItem>;
}

type Ctx = {
  has: (c: Category) => boolean;
  hasKind: (...k: ProductKind[]) => boolean;
  items: DeskItem[];
};

interface Rule {
  /** 없으면 항상 추천하는 인기 아이템. 있으면 조건을 만족할 때만 "내 책상 맞춤"으로 추천 */
  when?: (c: Ctx) => boolean;
  /** 이미 책상에 있어 추천하지 않을 조건 */
  hideWhen?: (c: Ctx) => boolean;
  /** 이 용도에 특히 맞는 제품 (위로 올리고 "내 용도 맞춤" 표시) */
  for?: Purpose[];
  /** 그 용도를 고른 사람에게만 보이는 제품 */
  only?: true;
  /** 용도별 추천 이유 (없으면 product.reason) */
  why?: Partial<Record<Purpose, string>>;
  product: Omit<Product, "matched" | "category" | "forMe" | "fits"> & { category?: Category };
}

const RULES: Rule[] = [
  // ── 용도별 ──
  {
    for: ["dev"],
    only: true,
    when: ({ has }) => has("monitor"),
    hideWhen: ({ items }) => items.some((i) => i.category === "monitor" && i.pivot),
    product: { id: "sub-monitor", kind: "monitor", category: "monitor", section: "monitor", width: 54.5, height: 20, name: '24" 서브 모니터 (세로)', price: 199000, reason: "세로로 돌려 쓰는 서브 모니터.", extra: { pivot: true } },
    why: { dev: "코드·문서를 길게 보는 개발에는 세로 모니터가 편해요. 피벗으로 세워 놓아요." },
  },
  {
    for: ["design"],
    only: true,
    product: { id: "drawing-tablet", kind: "drawing-tablet", section: "input", width: 35, height: 22, name: "드로잉 태블릿", price: 290000, reason: "펜으로 그리고 보정하는 작업용 태블릿." },
    why: { design: "보정·일러스트 작업은 마우스보다 펜이 훨씬 정확하고 빨라요." },
  },
  {
    for: ["work"],
    only: true,
    when: ({ has }) => has("monitor"),
    product: { id: "webcam", kind: "webcam", section: "monitor", width: 10, height: 3.5, name: "FHD 웹캠", price: 99000, reason: "모니터 위에 올리는 웹캠." },
    why: { work: "화상회의가 잦은 재택근무엔 노트북 캠보다 선명한 웹캠이 좋아요. 모니터 위에 올라가요." },
  },
  {
    for: ["work", "design"],
    only: true,
    product: { id: "key-light", kind: "key-light", section: "light", width: 20, height: 20, name: "키라이트 (화상회의 조명)", price: 159000, reason: "얼굴을 고르게 밝혀 주는 조명." },
    why: { work: "화상회의에서 얼굴이 밝고 또렷하게 보여요.", design: "색을 볼 때 주변 조명이 일정하면 작업물 색이 덜 흔들려요." },
  },
  {
    for: ["game"],
    only: true,
    product: { id: "gamepad", kind: "gamepad", section: "input", width: 15.5, height: 10.5, name: "게임패드", price: 69000, reason: "콘솔처럼 즐기는 PC 게임용 패드." },
    why: { game: "레이싱·액션 게임은 패드가 훨씬 편해요." },
  },
  {
    for: ["study"],
    only: true,
    product: { id: "books", kind: "books", section: "decor", width: 24, height: 18, name: "책 + 북엔드", price: 30000, reason: "자주 보는 책을 세워 두는 북엔드." },
    why: { study: "교재를 책상 위에 세워 두면 찾기 쉽고 공간도 덜 차지해요." },
  },

  // ── 모니터 ──
  {
    for: ["dev", "design", "work"],
    why: { dev: "모니터를 눈높이로 올리고 자유롭게 돌릴 수 있어 오래 앉아 있어도 목이 덜 아파요.", design: "작업마다 화면 높이·각도를 바꾸기 쉬워요." },
    when: ({ items }) => items.some((i) => i.category === "monitor" && !i.mount),
    product: { id: "monitor-arm", kind: "monitor-arm", section: "monitor", width: 11, height: 21, name: "싱글 모니터 암", price: 69000, reason: "책상 공간을 확보하고 모니터 높이를 자유롭게 조절해요. 놓으면 모니터가 암에 장착돼요." },
  },
  {
    when: ({ has }) => has("monitor"),
    product: { id: "light-bar", kind: "light-bar", section: "monitor", width: 45, height: 12, name: "모니터 라이트바", price: 59000, reason: "화면 반사 없이 책상 위만 밝혀 눈 피로를 줄여요." },
  },
  {
    when: ({ items }) => items.some((i) => i.category === "monitor" && !i.mount),
    product: { id: "monitor-riser", kind: "monitor-riser", section: "monitor", width: 60, height: 22, name: "모니터 받침대", price: 39000, reason: "모니터를 눈높이로 올리고, 아래 공간에 키보드를 밀어 넣어 책상을 넓게 써요." },
  },
  {
    when: ({ has }) => has("monitor"),
    product: { id: "soundbar", kind: "soundbar", section: "audio", width: 45, height: 8, name: "PC 사운드바", price: 89000, reason: "모니터 아래에 쏙 들어가는 슬림 스피커. 공간은 적게, 소리는 넓게." },
  },

  // ── 노트북·기기 ──
  {
    when: ({ items }) => items.some((i) => i.category === "laptop" && !i.mount),
    product: { id: "laptop-stand", kind: "laptop-stand", section: "laptop", width: 26, height: 23, name: "알루미늄 노트북 받침대", price: 39000, reason: "노트북 화면 높이를 눈높이에 맞춰 목 부담을 줄여줘요. 놓으면 노트북이 받침대 위에 올라가요." },
  },
  {
    when: ({ has }) => has("laptop"),
    hideWhen: ({ items }) => items.some((i) => i.kind === "laptop-vertical-stand" || i.mount?.kind === "laptop-vertical-stand"),
    product: { id: "laptop-vertical-stand", kind: "laptop-vertical-stand", section: "laptop", width: 5, height: 18, name: "노트북 수직 거치대", price: 29000, reason: "노트북을 덮어 세워두면 책상 공간을 크게 아낄 수 있어요. 놓으면 노트북이 거치대에 꽂혀요." },
  },
  {
    when: ({ has }) => has("laptop"),
    product: { id: "usbc-hub", kind: "usbc-hub", section: "laptop", width: 15, height: 4, name: "USB-C 멀티 허브", price: 49000, reason: "노트북에 모니터·키보드·마우스를 한 번에 연결해요." },
  },
  {
    when: ({ hasKind }) => hasKind("macbook-open", "macbook-closed"),
    product: { id: "trackpad", kind: "trackpad", section: "input", width: 16, height: 11.5, name: "매직 트랙패드", price: 189000, reason: "맥북을 덮어두고 쓸 때도 제스처를 그대로. 맥 사용자 필수템." },
  },
  {
    product: { id: "phone-stand", kind: "phone-stand", section: "laptop", width: 8, height: 10, name: "알루미늄 스마트폰 거치대", price: 15000, reason: "알림을 한눈에 보고, 영상통화도 편하게. 가장 많이 사는 데스크 소품이에요." },
  },
  {
    product: { id: "wireless-charger", kind: "wireless-charger", section: "laptop", width: 10, height: 10, name: "무선 충전 패드", price: 25000, reason: "케이블 없이 올려두기만 하면 충전. 책상 위 선 정리에 좋아요." },
  },
  {
    product: { id: "tablet-stand", kind: "tablet-stand", section: "laptop", width: 18, height: 14, name: "태블릿 거치대", price: 29000, reason: "태블릿을 세컨드 스크린이나 메모장으로 활용해요." },
  },

  // ── 키보드·마우스 ──
  {
    for: ["dev", "work"],
    why: { dev: "하루 종일 타이핑하는 개발자는 손목 받침이 체감이 커요." },
    when: ({ has }) => has("keyboard"),
    product: { id: "wrist-rest", kind: "wrist-rest", section: "input", width: 44, height: 9, name: "메모리폼 손목 받침대", price: 19000, reason: "장시간 타이핑 시 손목 부담을 덜어줘요." },
  },
  {
    for: ["game"],
    why: { game: "마우스를 크게 휘두르는 게임에는 키보드까지 덮는 큰 매트가 좋아요." },
    when: ({ has }) => has("mouse") || has("keyboard"),
    product: { id: "desk-mat", kind: "desk-mat", section: "input", width: 80, height: 40, name: "대형 데스크 매트", price: 29000, reason: "키보드와 마우스를 한 번에 아우르는 통일감 있는 바닥면." },
  },
  {
    when: ({ has }) => has("mouse"),
    hideWhen: ({ hasKind }) => hasKind("desk-mat"),
    product: { id: "mouse-pad", kind: "mouse-pad", section: "input", width: 30, height: 25, name: "패브릭 마우스 패드", price: 12000, reason: "마우스 움직임이 부드러워지고 책상 표면도 보호해요." },
  },
  {
    for: ["design", "dev"],
    why: { design: "포토샵·프리미어 단축키를 버튼 하나로 눌러 작업이 빨라져요." },
    when: ({ has }) => has("keyboard"),
    product: { id: "macro-pad", kind: "macro-pad", section: "input", width: 12, height: 8, name: "매크로 컨트롤러", price: 149000, reason: "자주 쓰는 앱·단축키를 버튼 하나로. 작업 효율을 확 올려줘요." },
  },

  // ── 오디오 ──
  {
    for: ["game", "study", "dev"],
    why: { game: "발소리까지 들리는 몰입감, 밤에도 소리 걱정 없어요.", study: "주변 소음을 막아 집중이 오래가요.", dev: "소음을 막아 집중 시간이 길어져요." },
    product: { id: "headphones", kind: "headphones", section: "audio", width: 17, height: 19, name: "노이즈캔슬링 헤드폰", price: 399000, reason: "집중이 필요할 때 주변 소음을 차단해요." },
  },
  {
    for: ["game"],
    product: { id: "headphone-stand", kind: "headphone-stand", section: "audio", width: 13, height: 13, name: "헤드폰 거치대", price: 25000, reason: "헤드폰을 걸어두면 책상이 정돈되고 인테리어 소품이 돼요." },
  },
  {
    when: ({ has }) => has("monitor"),
    product: { id: "speaker", kind: "speaker", section: "audio", width: 15, height: 18, name: "북쉘프 스피커", price: 189000, reason: "모니터 양옆에 두면 공간감 있는 사운드와 대칭 구도가 완성돼요." },
  },
  {
    for: ["work", "game"],
    why: { work: "회의 음성이 또렷해지고, 암에 달아 책상을 차지하지 않아요.", game: "보이스챗·방송용. 암에 달면 책상이 깔끔해요." },
    product: { id: "mic-arm", kind: "mic-arm", section: "audio", width: 14, height: 45, name: "마이크 + 붐암", price: 159000, reason: "화상회의·스트리밍용. 암에 달면 책상 공간을 차지하지 않아요." },
  },

  // ── 조명 ──
  {
    for: ["study"],
    why: { study: "공부할 땐 손 그늘 없이 책을 고르게 비추는 스탠드가 필수예요." },
    when: ({ items }) => items.length > 0,
    hideWhen: ({ hasKind }) => hasKind("lamp"),
    product: { id: "desk-lamp", kind: "lamp", section: "light", width: 20, height: 20, name: "LED 데스크 램프", price: 45000, reason: "책상에 조명이 없어요. 분위기와 작업 환경을 함께 개선해요." },
  },

  // ── 정리·전원 ──
  {
    product: { id: "desk-organizer", kind: "desk-organizer", section: "organize", width: 24, height: 12, name: "데스크 정리함", price: 22000, reason: "펜·포스트잇·클립을 한곳에. 책상 위 잡동사니가 사라져요." },
  },
  {
    when: ({ items }) => items.length >= 3,
    product: { id: "power-strip", kind: "power-strip", section: "organize", width: 34, height: 6, name: "슬림 멀티탭", price: 19000, reason: "기기가 많아졌어요. 책상 뒤쪽에 두고 전원을 한 번에 정리해요." },
  },
  {
    for: ["study"],
    product: { id: "notebook-pad", kind: "notebook-pad", section: "organize", width: 30, height: 21, name: "노트 & 펜", price: 12000, reason: "아이디어를 바로 적어두는 아날로그 감성. 데스크 사진에도 자주 등장해요." },
  },

  // ── 소품·인테리어 ──
  {
    product: { id: "plant", kind: "plant", section: "decor", width: 13, height: 13, name: "탁상 화분", price: 18000, reason: "초록 식물 하나로 책상 분위기가 확 살아나요. 데스크테리어 1순위 아이템." },
  },
  {
    product: { id: "mug", kind: "mug", section: "decor", width: 12, height: 9, name: "머그컵", price: 15000, reason: "좋아하는 머그 하나로 완성되는 데스크 감성." },
  },
  {
    product: { id: "clock", kind: "clock", section: "decor", width: 14, height: 5, name: "디지털 탁상시계", price: 29000, reason: "미니멀한 LED 시계로 시간 확인과 인테리어를 함께." },
  },
  {
    product: { id: "humidifier", kind: "humidifier", section: "decor", width: 10, height: 10, name: "미니 가습기", price: 32000, reason: "건조한 사무 공간에 촉촉함을. 은은한 무드등 역할도 해요." },
  },
];

export function getRecommendations(items: DeskItem[], desk: DeskSize, profile: UserProfile = {}): Product[] {
  const cats = new Set(items.map((i) => i.category));
  const kinds = new Set(items.flatMap((i) => [i.kind, i.mount?.kind]));
  const ctx: Ctx = { has: (c) => cats.has(c), hasKind: (...k) => k.some((x) => kinds.has(x)), items };
  const { purpose, budget = "any" } = profile;

  const list = RULES.filter((r) => (r.when ? r.when(ctx) : true) && !r.hideWhen?.(ctx) && r.product.price <= BUDGET_MAX[budget])
    .filter((r) => !r.only || (!!purpose && !!r.for?.includes(purpose)))
    .map((r): Product => {
      const forMe = !!purpose && !!r.for?.includes(purpose);
      return {
        category: "accessory",
        ...r.product,
        reason: (forMe && purpose && r.why?.[purpose]) || r.product.reason,
        matched: !!r.when,
        forMe,
        fits: fitsOnDesk(r.product.kind, r.product, items, desk),
      };
    });
  // 내 용도 맞춤 → 내 책상 맞춤 → 인기 아이템 순, 같은 순위면 자리가 있는 것 먼저
  const rank = (p: Product) => (p.forMe ? 4 : 0) + (p.matched ? 2 : 0) + (p.fits ? 1 : 0);
  return list.map((p, i) => ({ p, i })).sort((a, b) => rank(b.p) - rank(a.p) || a.i - b.i).map((x) => x.p);
}
