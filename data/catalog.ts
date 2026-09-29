import type { Category, NewDeskItem } from "@/store/useDeskStore";

export const CATEGORY_LABEL: Record<Category, string> = {
  monitor: "모니터",
  keyboard: "키보드",
  mouse: "마우스",
  laptop: "노트북",
  accessory: "액세서리",
};

export const CATEGORY_COLOR: Record<Category, string> = {
  monitor: "#3b82f6",
  keyboard: "#a855f7",
  mouse: "#10b981",
  laptop: "#f59e0b",
  accessory: "#ec4899",
};

/** 장비 추가 칸의 카테고리 블록 */
export type PickerGroup = "monitor" | "laptop" | "input" | "stand" | "audio" | "light" | "decor";

export const PICKER_GROUPS: { key: PickerGroup; label: string }[] = [
  { key: "monitor", label: "모니터" },
  { key: "laptop", label: "노트북" },
  { key: "input", label: "키보드·마우스" },
  { key: "stand", label: "거치대·받침" },
  { key: "audio", label: "오디오" },
  { key: "light", label: "조명" },
  { key: "decor", label: "소품·정리" },
];

type CatalogEntry = Omit<NewDeskItem, "x" | "y"> & { key: string; group: PickerGroup };

// 크기는 실제 책상 위 점유 면적(cm, 위에서 내려다본 기준). x, y는 추가 시 책상 중앙으로 덮어씌워짐
export const CATALOG: CatalogEntry[] = [
  // ── 모니터: 가로는 베젤 포함 폭, 세로는 위에서 본 깊이(스탠드 받침 포함). 화면 높이는 위에서 보이지 않아 제외
  { group: "monitor", key: "mon24", kind: "monitor", name: '24" 모니터', category: "monitor", width: 54.5, height: 20, price: 199000 },
  { group: "monitor", key: "mon27", kind: "monitor", name: '27" 모니터', category: "monitor", width: 61.5, height: 22, price: 329000 },
  { group: "monitor", key: "mon32", kind: "monitor", name: '32" 모니터', category: "monitor", width: 72.5, height: 25, price: 459000 },
  { group: "monitor", key: "mon34", kind: "ultrawide", name: '34" 울트라와이드', category: "monitor", width: 81.5, height: 24, price: 649000 },

  // ── 노트북: 맥북 펼침/덮음 × 13·14·15·16인치 (애플 공개 규격, 두께 제외. 덮은 상태도 책상 위 점유 면적은 동일)
  { group: "laptop", key: "mb13-open", kind: "macbook-open", name: '맥북 13" 펼침', category: "laptop", width: 30.41, height: 21.5, price: 1590000 },
  { group: "laptop", key: "mb13-closed", kind: "macbook-closed", name: '맥북 13" 덮음', category: "laptop", width: 30.41, height: 21.5, price: 1590000 },
  { group: "laptop", key: "mb14-open", kind: "macbook-open", name: '맥북 14" 펼침', category: "laptop", width: 31.26, height: 22.12, price: 2390000 },
  { group: "laptop", key: "mb14-closed", kind: "macbook-closed", name: '맥북 14" 덮음', category: "laptop", width: 31.26, height: 22.12, price: 2390000 },
  { group: "laptop", key: "mb15-open", kind: "macbook-open", name: '맥북 15" 펼침', category: "laptop", width: 34.04, height: 23.76, price: 1890000 },
  { group: "laptop", key: "mb15-closed", kind: "macbook-closed", name: '맥북 15" 덮음', category: "laptop", width: 34.04, height: 23.76, price: 1890000 },
  { group: "laptop", key: "mb16-open", kind: "macbook-open", name: '맥북 16" 펼침', category: "laptop", width: 35.57, height: 24.81, price: 3490000 },
  { group: "laptop", key: "mb16-closed", kind: "macbook-closed", name: '맥북 16" 덮음', category: "laptop", width: 35.57, height: 24.81, price: 3490000 },
  { group: "laptop", key: "notebook", kind: "laptop", name: "노트북 15.6", category: "laptop", width: 36, height: 25, price: 1290000 },
  { group: "laptop", key: "tablet-stand", kind: "tablet-stand", name: "태블릿 + 거치대", category: "accessory", width: 18, height: 14, price: 29000 },
  { group: "laptop", key: "phone-stand", kind: "phone-stand", name: "스마트폰 거치대", category: "accessory", width: 8, height: 10, price: 15000 },
  { group: "laptop", key: "wireless-charger", kind: "wireless-charger", name: "무선 충전 패드", category: "accessory", width: 10, height: 10, price: 25000 },
  { group: "laptop", key: "usbc-hub", kind: "usbc-hub", name: "USB-C 허브", category: "accessory", width: 15, height: 4, price: 49000 },

  // ── 키보드·마우스
  { group: "input", key: "kb-tkl", kind: "keyboard", name: "텐키리스 키보드", category: "keyboard", width: 36, height: 14, price: 129000 },
  { group: "input", key: "kb-full", kind: "keyboard-full", name: "풀사이즈 키보드", category: "keyboard", width: 44, height: 14, price: 99000 },
  { group: "input", key: "mouse", kind: "mouse", name: "무선 마우스", category: "mouse", width: 6.5, height: 11.5, price: 59000 },
  { group: "input", key: "mouse-vert", kind: "mouse-vertical", name: "버티컬 마우스", category: "mouse", width: 8, height: 12, price: 79000 },
  { group: "input", key: "trackpad", kind: "trackpad", name: "매직 트랙패드", category: "accessory", width: 16, height: 11.5, price: 189000 },
  { group: "input", key: "macro-pad", kind: "macro-pad", name: "매크로 컨트롤러", category: "accessory", width: 12, height: 8, price: 149000 },
  { group: "input", key: "wrist-rest", kind: "wrist-rest", name: "손목 받침대", category: "accessory", width: 44, height: 9, price: 19000 },
  { group: "input", key: "mouse-pad", kind: "mouse-pad", name: "마우스 패드", category: "accessory", width: 30, height: 25, price: 12000 },
  { group: "input", key: "desk-mat", kind: "desk-mat", name: "데스크 매트", category: "accessory", width: 80, height: 40, price: 29000 },

  // ── 거치대·받침
  { group: "stand", key: "arm", kind: "monitor-arm", name: "모니터 암", category: "accessory", width: 11, height: 21, price: 69000 },
  { group: "stand", key: "monitor-riser", kind: "monitor-riser", name: "모니터 받침대", category: "accessory", width: 60, height: 22, price: 39000 },
  { group: "stand", key: "lstand", kind: "laptop-stand", name: "노트북 받침대", category: "accessory", width: 26, height: 23, price: 39000 },
  { group: "stand", key: "vstand", kind: "laptop-vertical-stand", name: "노트북 수직 거치대", category: "accessory", width: 5, height: 18, price: 29000 },
  { group: "stand", key: "headphone-stand", kind: "headphone-stand", name: "헤드폰 거치대", category: "accessory", width: 13, height: 13, price: 25000 },

  // ── 오디오
  { group: "audio", key: "speaker", kind: "speaker", name: "북쉘프 스피커", category: "accessory", width: 15, height: 18, price: 189000 },
  { group: "audio", key: "soundbar", kind: "soundbar", name: "PC 사운드바", category: "accessory", width: 45, height: 8, price: 89000 },
  { group: "audio", key: "headphones", kind: "headphones", name: "헤드폰", category: "accessory", width: 17, height: 19, price: 399000 },
  { group: "audio", key: "mic-arm", kind: "mic-arm", name: "마이크 + 붐암", category: "accessory", width: 14, height: 45, price: 159000 },

  // ── 조명
  { group: "light", key: "lamp", kind: "lamp", name: "데스크 램프", category: "accessory", width: 20, height: 20, price: 45000 },
  { group: "light", key: "light-bar", kind: "light-bar", name: "모니터 라이트바", category: "accessory", width: 45, height: 12, price: 59000 },

  // ── 소품·정리
  { group: "decor", key: "plant", kind: "plant", name: "탁상 화분", category: "accessory", width: 13, height: 13, price: 18000 },
  { group: "decor", key: "mug", kind: "mug", name: "머그컵", category: "accessory", width: 12, height: 9, price: 15000 },
  { group: "decor", key: "clock", kind: "clock", name: "디지털 탁상시계", category: "accessory", width: 14, height: 5, price: 29000 },
  { group: "decor", key: "humidifier", kind: "humidifier", name: "미니 가습기", category: "accessory", width: 10, height: 10, price: 32000 },
  { group: "decor", key: "notebook-pad", kind: "notebook-pad", name: "노트 & 펜", category: "accessory", width: 30, height: 21, price: 12000 },
  { group: "decor", key: "desk-organizer", kind: "desk-organizer", name: "데스크 정리함", category: "accessory", width: 24, height: 12, price: 22000 },
  { group: "decor", key: "power-strip", kind: "power-strip", name: "슬림 멀티탭", category: "accessory", width: 34, height: 6, price: 19000 },
];
