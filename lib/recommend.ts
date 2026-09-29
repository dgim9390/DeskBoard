import type { Category, DeskItem, ProductKind } from "@/store/useDeskStore";

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
  product: Omit<Product, "matched" | "category"> & { category?: Category };
}

const RULES: Rule[] = [
  // ── 모니터 ──
  {
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
    when: ({ has }) => has("keyboard"),
    product: { id: "wrist-rest", kind: "wrist-rest", section: "input", width: 44, height: 9, name: "메모리폼 손목 받침대", price: 19000, reason: "장시간 타이핑 시 손목 부담을 덜어줘요." },
  },
  {
    when: ({ has }) => has("mouse") || has("keyboard"),
    product: { id: "desk-mat", kind: "desk-mat", section: "input", width: 80, height: 40, name: "대형 데스크 매트", price: 29000, reason: "키보드와 마우스를 한 번에 아우르는 통일감 있는 바닥면." },
  },
  {
    when: ({ has }) => has("mouse"),
    hideWhen: ({ hasKind }) => hasKind("desk-mat"),
    product: { id: "mouse-pad", kind: "mouse-pad", section: "input", width: 30, height: 25, name: "패브릭 마우스 패드", price: 12000, reason: "마우스 움직임이 부드러워지고 책상 표면도 보호해요." },
  },
  {
    when: ({ has }) => has("keyboard"),
    product: { id: "macro-pad", kind: "macro-pad", section: "input", width: 12, height: 8, name: "매크로 컨트롤러", price: 149000, reason: "자주 쓰는 앱·단축키를 버튼 하나로. 작업 효율을 확 올려줘요." },
  },

  // ── 오디오 ──
  {
    product: { id: "headphones", kind: "headphones", section: "audio", width: 17, height: 19, name: "노이즈캔슬링 헤드폰", price: 399000, reason: "집중이 필요할 때 주변 소음을 차단해요." },
  },
  {
    product: { id: "headphone-stand", kind: "headphone-stand", section: "audio", width: 13, height: 13, name: "헤드폰 거치대", price: 25000, reason: "헤드폰을 걸어두면 책상이 정돈되고 인테리어 소품이 돼요." },
  },
  {
    when: ({ has }) => has("monitor"),
    product: { id: "speaker", kind: "speaker", section: "audio", width: 15, height: 18, name: "북쉘프 스피커", price: 189000, reason: "모니터 양옆에 두면 공간감 있는 사운드와 대칭 구도가 완성돼요." },
  },
  {
    product: { id: "mic-arm", kind: "mic-arm", section: "audio", width: 14, height: 45, name: "마이크 + 붐암", price: 159000, reason: "화상회의·스트리밍용. 암에 달면 책상 공간을 차지하지 않아요." },
  },

  // ── 조명 ──
  {
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

export function getRecommendations(items: DeskItem[]): Product[] {
  const cats = new Set(items.map((i) => i.category));
  const kinds = new Set(items.flatMap((i) => [i.kind, i.mount?.kind]));
  const ctx: Ctx = { has: (c) => cats.has(c), hasKind: (...k) => k.some((x) => kinds.has(x)), items };

  const list = RULES.filter((r) => (r.when ? r.when(ctx) : true) && !r.hideWhen?.(ctx)).map(
    (r): Product => ({ category: "accessory", ...r.product, matched: !!r.when }),
  );
  // 내 책상 맞춤 추천을 먼저, 그다음 인기 아이템
  return [...list.filter((p) => p.matched), ...list.filter((p) => !p.matched)];
}
