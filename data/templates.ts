import type { DeskItem, DeskSize } from "@/store/useDeskStore";

/** 추천 셋업 템플릿: 한 번에 불러오는 완성된 책상 (좌표·크기는 cm, 책상 좌상단 기준) */
export interface SetupTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  desk: DeskSize;
  items: Omit<DeskItem, "id">[];
}

type Item = Omit<DeskItem, "id">;

// 자주 쓰는 제품 (카탈로그와 같은 크기)
const monitor27 = (x: number, y: number, color?: DeskItem["color"]): Item => ({ name: '27" 모니터', category: "monitor", kind: "monitor", color, x, y, width: 61.5, height: 22, rotation: 0, price: 329000 });
const tkl = (x: number, y: number, color?: DeskItem["color"]): Item => ({ name: "텐키리스 키보드", category: "keyboard", kind: "keyboard", color, x, y, width: 36, height: 14, rotation: 0, price: 129000 });
const mouse = (x: number, y: number, color?: DeskItem["color"]): Item => ({ name: "무선 마우스", category: "mouse", kind: "mouse", color, x, y, width: 6.5, height: 11.5, rotation: 0, price: 59000 });
const acc = (name: string, kind: Item["kind"], x: number, y: number, width: number, height: number, price: number, color?: DeskItem["color"]): Item => ({
  name,
  category: "accessory",
  kind,
  color,
  x,
  y,
  width,
  height,
  rotation: 0,
  price,
});

export const TEMPLATES: SetupTemplate[] = [
  {
    id: "dev-dual",
    name: "개발자 듀얼 모니터",
    description: "27인치 두 대에 맥북은 세워 두고 클램쉘로. 넓은 월넛 책상에 저녁 조명.",
    tags: ["개발", "듀얼"],
    desk: { width: 160, depth: 70, material: "walnut", lighting: "evening" },
    items: [
      acc("데스크 매트", "desk-mat", 40, 28, 80, 40, 29000),
      monitor27(16, 3),
      monitor27(82.5, 3),
      tkl(62, 38),
      mouse(104, 39),
      {
        name: '맥북 14" 덮음',
        category: "laptop",
        kind: "macbook-closed",
        color: "white",
        x: 150,
        y: 22,
        width: 5,
        height: 31.26,
        rotation: 0,
        price: 2390000,
        mount: { kind: "laptop-vertical-stand", name: "노트북 수직 거치대", price: 29000, width: 5, height: 18, color: "white", hostWidth: 31.26, hostHeight: 22.12 },
      },
      acc("데스크 램프", "lamp", 3, 46, 20, 20, 45000),
      acc("탁상 화분", "plant", 145, 55, 13, 13, 18000),
    ],
  },
  {
    id: "minimal-white",
    name: "미니멀 화이트",
    description: "화이트 상판에 화이트 장비만. 라이트바 하나로 깔끔하게.",
    tags: ["미니멀", "화이트"],
    desk: { width: 120, depth: 60, material: "white", lighting: "day" },
    items: [
      monitor27(29.25, 3, "white"),
      acc("모니터 라이트바", "light-bar", 37.5, 0, 45, 12, 59000, "white"),
      tkl(38, 36, "white"),
      mouse(82, 37, "white"),
      acc("탁상 화분", "plant", 4, 4, 13, 13, 18000),
      acc("머그컵", "mug", 100, 42, 12, 9, 15000),
    ],
  },
  {
    id: "gaming",
    name: "게이밍",
    description: "34인치 울트라와이드와 양옆 스피커, 매크로패드까지. 밤 조명이 어울려요.",
    tags: ["게이밍", "울트라와이드"],
    desk: { width: 140, depth: 70, material: "black", lighting: "night" },
    items: [
      acc("데스크 매트", "desk-mat", 30, 28, 80, 40, 29000, "black"),
      { name: '34" 울트라와이드', category: "monitor", kind: "ultrawide", x: 29.25, y: 2, width: 81.5, height: 24, rotation: 0, price: 649000 },
      acc("모니터 라이트바", "light-bar", 47.5, 0, 45, 12, 59000, "black"),
      { name: "풀사이즈 키보드", category: "keyboard", kind: "keyboard-full", x: 40, y: 40, width: 44, height: 14, rotation: 0, price: 99000 },
      mouse(94, 41),
      acc("북쉘프 스피커", "speaker", 8, 4, 15, 18, 189000),
      acc("북쉘프 스피커", "speaker", 117, 4, 15, 18, 189000),
      acc("헤드폰 거치대", "headphone-stand", 122, 50, 13, 13, 25000),
      acc("매크로 컨트롤러", "macro-pad", 24, 43, 12, 8, 149000),
    ],
  },
  {
    id: "macbook-wfh",
    name: "맥북 재택근무",
    description: "받침대에 올린 맥북 + 24인치 모니터, 트랙패드와 노트로 하루 종일 편하게.",
    tags: ["재택", "맥북"],
    desk: { width: 120, depth: 60, material: "oak", lighting: "day" },
    items: [
      {
        name: '맥북 14" 펼침',
        category: "laptop",
        kind: "macbook-open",
        color: "white",
        x: 6,
        y: 6,
        width: 31.26,
        height: 25.12,
        rotation: 0,
        price: 2390000,
        mount: { kind: "laptop-stand", name: "노트북 받침대", price: 39000, width: 26, height: 23, color: "white", hostWidth: 31.26, hostHeight: 22.12 },
      },
      { name: '24" 모니터', category: "monitor", kind: "monitor", x: 50, y: 3, width: 54.5, height: 20, rotation: 0, price: 199000 },
      tkl(55, 35, "white"),
      acc("매직 트랙패드", "trackpad", 95, 36, 16, 11.5, 189000, "white"),
      acc("노트 & 펜", "notebook-pad", 8, 36, 30, 21, 12000),
      acc("머그컵", "mug", 104, 49, 12, 9, 15000),
      acc("미니 가습기", "humidifier", 107, 5, 10, 10, 32000),
    ],
  },
  {
    id: "studio-mini",
    name: "원룸 미니 책상",
    description: "100cm 작은 책상에 맥북 하나. 램프와 화분으로 아늑하게.",
    tags: ["원룸", "미니"],
    desk: { width: 100, depth: 50, material: "maple", lighting: "evening" },
    items: [
      {
        name: '맥북 13" 펼침',
        category: "laptop",
        kind: "macbook-open",
        color: "white",
        x: 34.8,
        y: 4,
        width: 30.41,
        height: 24.5,
        rotation: 0,
        price: 1590000,
        mount: { kind: "laptop-stand", name: "노트북 받침대", price: 39000, width: 26, height: 23, color: "white", hostWidth: 30.41, hostHeight: 21.5 },
      },
      mouse(72, 32),
      acc("데스크 램프", "lamp", 2, 2, 20, 20, 45000),
      acc("탁상 화분", "plant", 84, 3, 13, 13, 18000),
      acc("머그컵", "mug", 8, 34, 12, 9, 15000),
    ],
  },
];

/** 미리보기용: 템플릿 제품에 표시용 id를 붙임 */
export const previewItems = (t: SetupTemplate): DeskItem[] => t.items.map((i, k) => ({ ...i, id: `${t.id}-${k}` }));
