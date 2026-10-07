import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { fetchSetups, removeSetup, upsertSetups } from "@/lib/cloud";
import { clampInto, halfExtents, normalizeDeg } from "@/lib/geometry";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export type Category = "monitor" | "keyboard" | "mouse" | "laptop" | "accessory";

export type ProductKind =
  | "monitor" | "ultrawide" | "keyboard" | "keyboard-full" | "mouse" | "mouse-vertical"
  | "laptop" | "macbook-open" | "macbook-closed" | "lamp" | "speaker"
  | "laptop-stand" | "laptop-vertical-stand" | "usbc-hub" | "monitor-arm" | "light-bar" | "wrist-rest" | "desk-mat"
  // 데스크테리어 소품
  | "monitor-riser" | "wireless-charger" | "phone-stand" | "tablet-stand" | "headphones" | "headphone-stand"
  | "soundbar" | "mic-arm" | "desk-organizer" | "power-strip" | "trackpad" | "macro-pad" | "mouse-pad"
  | "plant" | "mug" | "clock" | "humidifier" | "notebook-pad" | "speaker-stand"
  // 책상 세팅 확장
  | "pc-tower" | "mini-pc" | "webcam" | "gamepad" | "numpad" | "drawing-tablet" | "audio-interface"
  | "key-light" | "mood-light" | "candle" | "desk-shelf" | "pen-cup" | "books" | "photo-frame" | "calendar"
  | "earbuds" | "tumbler" | "desk-fan"
  // 사용자가 링크로 추가한 제품: 제품 사진 그대로(photo) 또는 이름이 적힌 상자(generic)
  | "photo" | "generic";

export type ItemColor = "black" | "white";

/** 색상을 지정하지 않았을 때의 기본값. 알루미늄 계열(맥북, 거치대, 허브, 라이트바)은 화이트(실버) */
const WHITE_BY_DEFAULT: ProductKind[] = [
  "macbook-open", "macbook-closed", "laptop-stand", "laptop-vertical-stand", "usbc-hub", "light-bar",
  "trackpad", "mug", "plant", "humidifier", "phone-stand", "tablet-stand",
  "mini-pc", "earbuds", "mood-light", "calendar", "desk-fan",
];
export const defaultColor = (kind?: ProductKind): ItemColor => (kind && WHITE_BY_DEFAULT.includes(kind) ? "white" : "black");

/** 모든 좌표/크기는 cm 단위 (책상 좌상단이 원점). 화면 px 변환은 캔버스가 축척으로 처리 */
export const MIN_ITEM_CM = 2;
export const DESK_LIMITS = { minW: 60, maxW: 300, minD: 40, maxD: 150 };

/** 다른 장비에 결합된 액세서리(모니터 암, 노트북 받침대, 수직 거치대). 분리하면 원래 아이템으로 복원 */
export interface Mount {
  kind: ProductKind;
  name: string;
  price: number;
  width: number;
  height: number;
  color: ItemColor;
  /** 결합 전 호스트 크기. 분리 시 복원 */
  hostWidth: number;
  hostHeight: number;
}

export interface DeskItem {
  id: string;
  name: string;
  category: Category;
  kind?: ProductKind; // 이미지 종류. 없으면 카테고리 기본값
  color?: ItemColor; // 없으면 defaultColor(kind)
  mount?: Mount;
  x: number; // cm
  y: number; // cm
  width: number; // cm (가로)
  height: number; // cm (세로/깊이)
  rotation: number; // deg
  price: number; // KRW
  /** 링크로 추가한 제품: 제품 사진, 구매 링크, 사이트 이름 */
  imageUrl?: string;
  link?: string;
  site?: string;
  /** 책상에서 위로 솟은 높이(cm). 사진·상자 제품의 3D 표시에 씀 (없으면 자동) */
  tall?: number;
  /** 사진 제품이 3D에서 쓸 모형 종류 (없으면 이름으로 자동) */
  model?: ProductKind;
}

/** 사용자가 링크(또는 직접 입력)로 만든 제품. "내 제품"에 보관돼 다시 쓸 수 있음 */
export interface CustomProduct {
  id: string;
  name: string;
  category: Category;
  kind: ProductKind;
  width: number; // cm
  height: number; // cm
  color?: ItemColor;
  imageUrl?: string;
  link?: string;
  site?: string;
  price?: number;
  /** 높이(cm, 3D용) */
  tall?: number;
  /** 3D 모형 종류 */
  model?: ProductKind;
  createdAt: number;
}

export type DeskMaterial = "oak" | "walnut" | "maple" | "white" | "black" | "concrete";
export type Lighting = "day" | "evening" | "night";

/** 책상 크기와 분위기. 셋업에 함께 저장됨 (예전 셋업은 material/lighting 이 없어 기본값) */
export interface DeskSize {
  width: number; // cm
  depth: number; // cm
  material?: DeskMaterial; // 없으면 oak
  lighting?: Lighting; // 없으면 day
}

export type NewDeskItem = Omit<DeskItem, "id" | "rotation"> & { rotation?: number };

type Transform = Pick<DeskItem, "x" | "y" | "width" | "height" | "rotation">;

/** 이름 붙여 저장한 책상 배치 */
export interface SavedSetup {
  id: string;
  name: string;
  savedAt: number; // epoch ms
  desk: DeskSize;
  items: DeskItem[];
}

/** 되돌리기 기록 한 칸: 책상과 그 위 제품 */
export interface Layout {
  desk: DeskSize;
  deskItems: DeskItem[];
}

export interface AuthUser {
  id: string;
  email: string;
}

interface DeskState {
  desk: DeskSize;
  deskItems: DeskItem[];
  /** 로그인하면 계정(Supabase)의 셋업, 로그아웃 상태면 이 기기에만 저장된 셋업 */
  savedSetups: SavedSetup[];
  user: AuthUser | null;
  /** 계정 셋업을 불러오는 중 */
  cloudLoading: boolean;
  /** 서버 저장 실패 등 사용자에게 보여줄 오류 */
  syncError: string | null;
  /** 마지막으로 저장하거나 불러온 셋업 (덮어쓰기 대상) */
  activeSetupId: string | null;
  /** 현재 배치를 새 셋업으로 저장하고 id를 반환 */
  saveSetup: (name: string) => string;
  /** 현재 배치로 기존 셋업을 덮어씀 */
  overwriteSetup: (id: string) => void;
  loadSetup: (id: string) => void;
  renameSetup: (id: string, name: string) => void;
  deleteSetup: (id: string) => void;
  setDeskSize: (width: number, depth: number) => void;
  setDeskMaterial: (material: DeskMaterial) => void;
  setLighting: (lighting: Lighting) => void;
  /** 추가된 아이템 id를 반환. 결합되면 결합된 호스트(모니터/노트북)의 id */
  addDeskItem: (item: NewDeskItem) => string;
  updateItemPosition: (id: string, x: number, y: number) => void;
  updateItemSize: (id: string, width: number, height: number) => void;
  updateItemRotation: (id: string, rotation: number) => void;
  /** 드래그 제스처 종료 시 위치/크기/회전을 한 번에 저장. 결합되면 호스트 id를 반환 */
  updateItemTransform: (id: string, t: Transform) => string;
  setItemColor: (id: string, color: ItemColor) => void;
  /** 제품 사진 바꾸기(배경 지운 사진 등). 같은 사진을 쓰는 "내 제품"도 함께 바꿈 */
  setItemImage: (id: string, imageUrl: string) => void;
  /** 사진·상자 제품의 높이(cm). undefined면 자동 */
  setItemTall: (id: string, tall: number | undefined) => void;
  /** 사진 제품의 3D 모형 종류. undefined면 자동 */
  setItemModel: (id: string, model: ProductKind | undefined) => void;
  detachMount: (id: string) => void;
  /** 가장 가까운 짝과 결합. 결합 후 남는 아이템 id를 반환 */
  mountNearest: (id: string) => string;
  /** 겹쳐 있는 다른 제품의 앞/뒤로 순서 변경 */
  reorder: (id: string, dir: "forward" | "backward") => void;
  removeItem: (id: string) => void;
  clearDesk: () => void;
  customProducts: CustomProduct[];
  addCustomProduct: (p: Omit<CustomProduct, "id" | "createdAt">) => CustomProduct;
  removeCustomProduct: (id: string) => void;
  /** 되돌리기 / 다시하기 (기기에 저장하지 않음) */
  past: Layout[];
  future: Layout[];
  undo: () => void;
  redo: () => void;
  /** 같은 제품을 살짝 옆에 하나 더 놓고 새 id 반환 */
  duplicateItem: (id: string) => string | null;
  /** 템플릿(추천 셋업)으로 책상 전체를 바꿈. 제품 id는 새로 만듦 */
  applyTemplate: (layout: { desk: DeskSize; items: Omit<DeskItem, "id">[] }) => void;
}

// ── 결합 규칙 ────────────────────────────────────────────
interface MountRule {
  accessory: ProductKind;
  isHost: (i: DeskItem) => boolean;
  /** 결합 후 크기(cm) */
  size: (host: DeskItem, acc: DeskItem) => { width: number; height: number };
  pinBack: boolean; // 책상 뒤쪽 모서리에 붙임 (모니터 암 클램프)
}

const isLaptop = (i: DeskItem) => i.category === "laptop";

export const MOUNT_RULES: MountRule[] = [
  { accessory: "monitor-arm", isHost: (i) => i.category === "monitor", size: (h) => ({ width: h.width, height: h.height }), pinBack: true },
  // 받침대 앞쪽 립(3cm)이 노트북 밖으로 보임
  { accessory: "laptop-stand", isHost: isLaptop, size: (h) => ({ width: h.width, height: h.height + 3 }), pinBack: false },
  // 노트북을 덮어 세로로 꽂음: 위에서 보면 거치대 폭 × 노트북 가로 길이
  { accessory: "laptop-vertical-stand", isHost: isLaptop, size: (h, a) => ({ width: a.width, height: Math.max(h.width, a.height) }), pinBack: false },
];

const MOUNT_KINDS = MOUNT_RULES.map((r) => r.accessory);
export const isMountAccessory = (i: DeskItem) => !!i.kind && MOUNT_KINDS.includes(i.kind);

const centerOf = (i: DeskItem) => ({ cx: i.x + i.width / 2, cy: i.y + i.height / 2 });
const dist2 = (a: DeskItem, b: DeskItem) => {
  const p = centerOf(a);
  const q = centerOf(b);
  return (p.cx - q.cx) ** 2 + (p.cy - q.cy) ** 2;
};

interface Pairing {
  host: DeskItem;
  acc: DeskItem;
  rule: MountRule;
}

/** item과 결합 가능한 짝 중 match를 만족하는 가장 가까운 것 */
export function findPartner(items: DeskItem[], item: DeskItem, match: (other: DeskItem) => boolean = () => true): Pairing | undefined {
  const cands: Pairing[] = [];
  const accRule = MOUNT_RULES.find((r) => r.accessory === item.kind);
  if (accRule) {
    for (const o of items) if (o.id !== item.id && !o.mount && accRule.isHost(o) && match(o)) cands.push({ host: o, acc: item, rule: accRule });
  } else if (!item.mount) {
    for (const rule of MOUNT_RULES) {
      if (!rule.isHost(item)) continue;
      for (const o of items) if (o.id !== item.id && o.kind === rule.accessory && match(o)) cands.push({ host: item, acc: o, rule });
    }
  }
  const self = item;
  return cands.sort((a, b) => dist2(self, a.host === self ? a.acc : a.host) - dist2(self, b.host === self ? b.acc : b.host))[0];
}

/** 결합: moved 쪽이 짝의 위치로 가서 붙음 (모니터 암은 책상 뒤 모서리에 고정) */
function attach({ host, acc, rule }: Pairing, movedId: string): DeskItem {
  const anchor = centerOf(movedId === host.id ? acc : host);
  const { width, height } = rule.size(host, acc);
  return {
    ...host,
    width,
    height,
    x: anchor.cx - width / 2,
    y: rule.pinBack ? 0 : anchor.cy - height / 2,
    mount: {
      kind: acc.kind!,
      name: acc.name,
      price: acc.price,
      width: acc.width,
      height: acc.height,
      color: acc.color ?? defaultColor(acc.kind),
      hostWidth: host.width,
      hostHeight: host.height,
    },
  };
}

function applyPairing(items: DeskItem[], pair: Pairing, movedId: string, desk: DeskSize) {
  const merged = fit(attach(pair, movedId), desk);
  return { id: pair.host.id, items: items.filter((i) => i.id !== pair.acc.id).map((i) => (i.id === pair.host.id ? merged : i)) };
}

/** 회전을 고려한 축정렬 경계 상자가 겹치는지 */
const boxesOverlap = (a: DeskItem, b: DeskItem) => {
  const ea = halfExtents(a.width, a.height, a.rotation);
  const eb = halfExtents(b.width, b.height, b.rotation);
  const pa = centerOf(a);
  const pb = centerOf(b);
  return Math.abs(pa.cx - pb.cx) < ea.ex + eb.ex && Math.abs(pa.cy - pb.cy) < ea.ey + eb.ey;
};

/** 앞/뒤로 보낼 때 넘어갈 겹친 제품의 index (없으면 -1). 배열 뒤쪽일수록 위에 그려짐 */
export function reorderTarget(items: DeskItem[], id: string, dir: "forward" | "backward") {
  const i = items.findIndex((x) => x.id === id);
  if (i < 0) return -1;
  if (dir === "forward") {
    for (let j = i + 1; j < items.length; j++) if (boxesOverlap(items[i], items[j])) return j;
  } else {
    for (let j = i - 1; j >= 0; j--) if (boxesOverlap(items[i], items[j])) return j;
  }
  return -1;
}

const centerIn = (box: DeskItem, i: DeskItem) => {
  const { cx, cy } = centerOf(i);
  return cx >= box.x && cx <= box.x + box.width && cy >= box.y && cy <= box.y + box.height;
};
const overlaps = (a: DeskItem, b: DeskItem) => centerIn(a, b) || centerIn(b, a);

// ── 보정 ────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** 아이템을 책상 범위 안으로 보정 (회전 고려) */
const fit = (i: DeskItem, desk: DeskSize): DeskItem => {
  const rotation = normalizeDeg(i.rotation);
  const quarter = Math.abs(rotation) % 180;
  const straight = quarter < 0.5;
  const sideways = Math.abs(quarter - 90) < 0.5;
  const maxDim = Math.max(desk.width, desk.depth);
  const maxW = straight ? desk.width : sideways ? desk.depth : maxDim;
  const maxH = straight ? desk.depth : sideways ? desk.width : maxDim;
  const width = clamp(i.width, MIN_ITEM_CM, maxW);
  const height = clamp(i.height, MIN_ITEM_CM, maxH);
  const p = clampInto(i.x, i.y, width, height, rotation, desk.width, desk.depth);
  return { ...i, rotation, width, height, x: p.x, y: p.y };
};

const UNDERLAY_KINDS: ProductKind[] = ["desk-mat", "mouse-pad", "monitor-riser"];

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const initialDesk: DeskSize = { width: 120, depth: 60 };

const initialItems: DeskItem[] = [
  { id: "d-monitor", name: '27" 모니터', category: "monitor", kind: "monitor", x: 29.25, y: 4, width: 61.5, height: 22, rotation: 0, price: 329000 },
  { id: "d-keyboard", name: "텐키리스 키보드", category: "keyboard", kind: "keyboard", x: 38, y: 34, width: 36, height: 14, rotation: 0, price: 129000 },
  { id: "d-mouse", name: "무선 마우스", category: "mouse", kind: "mouse", x: 84, y: 34, width: 6.5, height: 11.5, rotation: 0, price: 59000 },
];

export const useDeskStore = create<DeskState>()((set, get) => ({
  desk: initialDesk,
  deskItems: initialItems,
  savedSetups: [],
  user: null,
  cloudLoading: false,
  syncError: null,
  activeSetupId: null,

  saveSetup: (name) => {
    const { desk, deskItems, savedSetups } = get();
    const setup: SavedSetup = { id: makeId(), name: name.trim() || `셋업 ${savedSetups.length + 1}`, savedAt: Date.now(), desk, items: deskItems };
    set({ savedSetups: [setup, ...savedSetups], activeSetupId: setup.id });
    syncToCloud(() => upsertSetups([setup]));
    return setup.id;
  },

  overwriteSetup: (id) => {
    set((s) => ({
      savedSetups: s.savedSetups.map((x) => (x.id === id ? { ...x, desk: s.desk, items: s.deskItems, savedAt: Date.now() } : x)),
      activeSetupId: id,
    }));
    const x = get().savedSetups.find((v) => v.id === id);
    if (x) syncToCloud(() => upsertSetups([x]));
  },

  loadSetup: (id) =>
    set((s) => {
      const x = s.savedSetups.find((v) => v.id === id);
      return x ? { desk: x.desk, deskItems: x.items, activeSetupId: id } : s;
    }),

  renameSetup: (id, name) => {
    if (!name.trim()) return;
    set((s) => ({ savedSetups: s.savedSetups.map((x) => (x.id === id ? { ...x, name: name.trim() } : x)) }));
    const x = get().savedSetups.find((v) => v.id === id);
    if (x) syncToCloud(() => upsertSetups([x]));
  },

  deleteSetup: (id) => {
    set((s) => ({ savedSetups: s.savedSetups.filter((x) => x.id !== id), activeSetupId: s.activeSetupId === id ? null : s.activeSetupId }));
    syncToCloud(() => removeSetup(id));
  },

  setDeskSize: (width, depth) =>
    set((s) => {
      const desk = {
        ...s.desk, // 재질·조명 유지
        width: clamp(width, DESK_LIMITS.minW, DESK_LIMITS.maxW),
        depth: clamp(depth, DESK_LIMITS.minD, DESK_LIMITS.maxD),
      };
      return { desk, deskItems: s.deskItems.map((i) => fit(i, desk)) };
    }),

  setDeskMaterial: (material) => set((s) => ({ desk: { ...s.desk, material } })),
  setLighting: (lighting) => set((s) => ({ desk: { ...s.desk, lighting } })),

  addDeskItem: (item) => {
    const { desk, deskItems } = get();
    const created = fit({ rotation: 0, ...item, id: makeId() }, desk);
    // 매트/패드/모니터 받침대는 다른 장비 아래에 깔리도록 맨 뒤(배열 앞)에 넣음
    const items = created.kind && UNDERLAY_KINDS.includes(created.kind) ? [created, ...deskItems] : [...deskItems, created];
    // 새로 놓은 모니터 암/받침대/거치대는 짝이 되는 모니터/노트북에 바로 결합 (반대도 마찬가지)
    const pair = findPartner(items, created);
    if (!pair) {
      set({ deskItems: items });
      return created.id;
    }
    const r = applyPairing(items, pair, created.id, desk);
    set({ deskItems: r.items });
    return r.id;
  },

  updateItemPosition: (id, x, y) =>
    set((s) => ({ deskItems: s.deskItems.map((i) => (i.id === id ? fit({ ...i, x, y }, s.desk) : i)) })),

  updateItemSize: (id, width, height) =>
    set((s) => ({ deskItems: s.deskItems.map((i) => (i.id === id ? fit({ ...i, width, height }, s.desk) : i)) })),

  updateItemRotation: (id, rotation) =>
    set((s) => ({ deskItems: s.deskItems.map((i) => (i.id === id ? fit({ ...i, rotation }, s.desk) : i)) })),

  updateItemTransform: (id, t) => {
    const { desk, deskItems } = get();
    const cur = deskItems.find((i) => i.id === id);
    if (!cur) return id;
    const moved = fit({ ...cur, ...t }, desk);
    const items = deskItems.map((i) => (i.id === id ? moved : i));
    // 드래그로 짝 위에 올려놓으면 결합
    const pair = findPartner(items, moved, (o) => overlaps(o, moved));
    if (!pair) {
      set({ deskItems: items });
      return id;
    }
    const r = applyPairing(items, pair, id, desk);
    set({ deskItems: r.items });
    return r.id;
  },

  setItemColor: (id, color) => set((s) => ({ deskItems: s.deskItems.map((i) => (i.id === id ? { ...i, color } : i)) })),

  setItemTall: (id, tall) => set((s) => ({ deskItems: s.deskItems.map((i) => (i.id === id ? { ...i, tall } : i)) })),
  setItemModel: (id, model) => set((s) => ({ deskItems: s.deskItems.map((i) => (i.id === id ? { ...i, model } : i)) })),

  setItemImage: (id, imageUrl) =>
    set((s) => {
      const old = s.deskItems.find((i) => i.id === id)?.imageUrl;
      if (!old) return s;
      return {
        deskItems: s.deskItems.map((i) => (i.id === id ? { ...i, imageUrl } : i)),
        customProducts: s.customProducts.map((p) => (p.imageUrl === old ? { ...p, imageUrl } : p)),
      };
    }),

  detachMount: (id) =>
    set((s) => {
      const host = s.deskItems.find((i) => i.id === id);
      if (!host?.mount) return s;
      const m = host.mount;
      const rule = MOUNT_RULES.find((r) => r.accessory === m.kind);
      const { mount: _removed, ...rest } = host;
      const c = centerOf(host);
      const freedHost = fit({ ...rest, width: m.hostWidth, height: m.hostHeight, x: c.cx - m.hostWidth / 2, y: rule?.pinBack ? host.y : c.cy - m.hostHeight / 2 }, s.desk);
      // 분리한 액세서리는 호스트 옆(공간이 없으면 반대쪽)에 둠
      const right = freedHost.x + freedHost.width + 2;
      const x = right + m.width <= s.desk.width ? right : freedHost.x - m.width - 2;
      const freed = fit(
        { id: makeId(), name: m.name, category: "accessory", kind: m.kind, color: m.color, price: m.price, width: m.width, height: m.height, rotation: 0, x, y: rule?.pinBack ? 0 : freedHost.y },
        s.desk,
      );
      return { deskItems: [...s.deskItems.map((i) => (i.id === id ? freedHost : i)), freed] };
    }),

  mountNearest: (id) => {
    const { desk, deskItems } = get();
    const item = deskItems.find((i) => i.id === id);
    const pair = item && findPartner(deskItems, item);
    if (!pair) return id;
    const r = applyPairing(deskItems, pair, id, desk);
    set({ deskItems: r.items });
    return r.id;
  },

  reorder: (id, dir) =>
    set((s) => {
      const j = reorderTarget(s.deskItems, id, dir);
      if (j < 0) return s;
      const items = [...s.deskItems];
      const [it] = items.splice(items.findIndex((x) => x.id === id), 1);
      // 앞으로: 겹친 제품 바로 위(뒤 index), 뒤로: 겹친 제품 바로 아래
      const target = items.findIndex((x) => x.id === s.deskItems[j].id);
      items.splice(dir === "forward" ? target + 1 : target, 0, it);
      return { deskItems: items };
    }),

  removeItem: (id) => set((s) => ({ deskItems: s.deskItems.filter((i) => i.id !== id) })),

  clearDesk: () => set({ deskItems: [] }),

  customProducts: [],
  addCustomProduct: (p) => {
    const product: CustomProduct = { ...p, id: makeId(), createdAt: Date.now() };
    set((s) => ({ customProducts: [product, ...s.customProducts] }));
    return product;
  },
  removeCustomProduct: (id) => set((s) => ({ customProducts: s.customProducts.filter((x) => x.id !== id) })),

  past: [],
  future: [],
  undo: () => {
    const { past, future, desk, deskItems } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    history.lastKey = null;
    set({ desk: prev.desk, deskItems: prev.deskItems, past: past.slice(0, -1), future: [{ desk, deskItems }, ...future].slice(0, HISTORY_LIMIT) });
  },
  redo: () => {
    const { past, future, desk, deskItems } = get();
    const next = future[0];
    if (!next) return;
    history.lastKey = null;
    set({ desk: next.desk, deskItems: next.deskItems, future: future.slice(1), past: [...past, { desk, deskItems }].slice(-HISTORY_LIMIT) });
  },

  duplicateItem: (id) => {
    const { desk, deskItems } = get();
    const src = deskItems.find((i) => i.id === id);
    if (!src) return null;
    const copy = fit({ ...src, id: makeId(), x: src.x + 4, y: src.y + 4 }, desk);
    // 원본 바로 위에 그려지도록 원본 다음 순서에 넣음
    const idx = deskItems.findIndex((i) => i.id === id);
    set({ deskItems: [...deskItems.slice(0, idx + 1), copy, ...deskItems.slice(idx + 1)] });
    return copy.id;
  },

  applyTemplate: ({ desk, items }) =>
    set({ desk: { ...desk }, deskItems: items.map((i) => fit({ ...i, id: makeId() }, desk)), activeSetupId: null }),
}));

// ── 되돌리기 기록 ─────────────────────────────────────────
const HISTORY_LIMIT = 50;
const history = { lastKey: null as string | null, lastTime: 0 };

/** 책상·제품을 바꾸는 동작. 실행 전 상태를 기록해 두고, 실제로 바뀐 경우에만 되돌리기 목록에 넣음 */
type Tracked =
  | "setDeskSize" | "setDeskMaterial" | "setLighting" | "addDeskItem" | "updateItemPosition" | "updateItemSize"
  | "updateItemRotation" | "updateItemTransform" | "setItemColor" | "setItemImage" | "setItemTall" | "setItemModel" | "detachMount" | "mountNearest" | "reorder"
  | "removeItem" | "clearDesk" | "loadSetup" | "duplicateItem" | "applyTemplate";

/** 연속 입력(크기 타이핑, 화살표 이동 등)은 1초 안이면 한 단계로 묶음 */
const COALESCE: Partial<Record<Tracked, (args: unknown[]) => string>> = {
  setDeskSize: () => "desk-size",
  updateItemSize: (a) => `size:${a[0]}`,
  updateItemPosition: (a) => `move:${a[0]}`,
  setItemTall: (a) => `tall:${a[0]}`,
};

function trackHistory() {
  const st = useDeskStore.getState();
  const names: Tracked[] = [
    "setDeskSize", "setDeskMaterial", "setLighting", "addDeskItem", "updateItemPosition", "updateItemSize",
    "updateItemRotation", "updateItemTransform", "setItemColor", "setItemImage", "setItemTall", "setItemModel", "detachMount", "mountNearest", "reorder",
    "removeItem", "clearDesk", "loadSetup", "duplicateItem", "applyTemplate",
  ];
  const wrapped: Partial<DeskState> = {};
  for (const name of names) {
    const original = st[name] as (...args: unknown[]) => unknown;
    (wrapped as Record<string, unknown>)[name] = (...args: unknown[]) => {
      const before: Layout = { desk: useDeskStore.getState().desk, deskItems: useDeskStore.getState().deskItems };
      const result = original(...args);
      const after = useDeskStore.getState();
      const changed =
        (after.desk !== before.desk || after.deskItems !== before.deskItems) &&
        JSON.stringify([after.desk, after.deskItems]) !== JSON.stringify([before.desk, before.deskItems]);
      if (!changed) return result;
      const key = COALESCE[name]?.(args) ?? null;
      const now = Date.now();
      if (key && key === history.lastKey && now - history.lastTime < 1000) {
        history.lastTime = now; // 같은 묶음: 처음 상태만 기록되어 있으면 충분
        if (after.future.length) useDeskStore.setState({ future: [] });
        return result;
      }
      history.lastKey = key;
      history.lastTime = now;
      useDeskStore.setState({ past: [...after.past, before].slice(-HISTORY_LIMIT), future: [] });
      return result;
    };
  }
  useDeskStore.setState(wrapped);
}
trackHistory();

// ── 계정(Supabase) 동기화 ─────────────────────────────────
const errText = (e: unknown) => (e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e));

/** 로그인 상태면 서버에도 반영. 화면은 먼저 바꾸고(낙관적 업데이트) 실패하면 오류를 표시 */
function syncToCloud(op: () => Promise<unknown>) {
  if (!useDeskStore.getState().user) return;
  op()
    .then(() => useDeskStore.setState({ syncError: null }))
    .catch((e) => useDeskStore.setState({ syncError: `서버에 저장하지 못했어요: ${errText(e)}` }));
}

let currentUserId: string | null = null;

/** 로그인되면: 이 기기에만 있던 셋업을 계정으로 옮기고, 계정의 셋업 목록을 불러옴 */
async function handleSignedIn(user: AuthUser) {
  if (currentUserId === user.id) return; // 토큰 갱신 등으로 같은 사용자 이벤트가 반복될 때
  currentUserId = user.id;
  const deviceSetups = useDeskStore.getState().savedSetups;
  useDeskStore.setState({ user, cloudLoading: true, syncError: null });
  try {
    await upsertSetups(deviceSetups);
    const list = await fetchSetups();
    useDeskStore.setState({ savedSetups: list, cloudLoading: false });
  } catch (e) {
    useDeskStore.setState({ cloudLoading: false, syncError: `계정 셋업을 불러오지 못했어요: ${errText(e)}` });
  }
}

function handleSignedOut() {
  if (currentUserId === null && !useDeskStore.getState().user) return;
  currentUserId = null;
  // 기기 셋업은 로그인 때 계정으로 옮겼으므로 목록을 비움 (다시 로그인하면 계정에서 불러옴)
  useDeskStore.setState({ user: null, savedSetups: [], activeSetupId: null, syncError: null, cloudLoading: false });
}

function startAuth() {
  if (!supabaseConfigured) return;
  supabase.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    // 콜백 안에서 Supabase 호출이 막히지 않도록 다음 틱에 처리 (Supabase 권장)
    setTimeout(() => {
      if (u) handleSignedIn({ id: u.id, email: u.email ?? "" });
      else handleSignedOut();
    }, 0);
  });
}

// ── 기기 저장 (앱을 다시 켜도 유지, 웹은 localStorage) ─────────────
const STORAGE_KEY = "deskterior-store:v1";
type Persisted = Pick<DeskState, "desk" | "deskItems" | "savedSetups" | "activeSetupId" | "customProducts">;

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Persisted>;
      useDeskStore.setState({
        ...(saved.desk && { desk: saved.desk }),
        ...(saved.deskItems && { deskItems: saved.deskItems }),
        savedSetups: saved.savedSetups ?? [],
        activeSetupId: saved.activeSetupId ?? null,
        customProducts: saved.customProducts ?? [],
      });
    }
  })
  .catch(() => {})
  .finally(() => {
    // 불러온 뒤부터 변경을 저장 (불러오기 전 기본값으로 덮어쓰지 않도록)
    let last = "";
    useDeskStore.subscribe((s) => {
      // 로그인 중인 셋업은 계정에 있으므로 기기에는 로그아웃 상태의 셋업만 보관
      const data: Persisted = { desk: s.desk, deskItems: s.deskItems, savedSetups: s.user ? [] : s.savedSetups, activeSetupId: s.activeSetupId, customProducts: s.customProducts };
      const json = JSON.stringify(data);
      if (json !== last) {
        last = json;
        AsyncStorage.setItem(STORAGE_KEY, json).catch(() => {});
      }
    });
    // 기기 저장을 먼저 불러온 뒤 로그인 상태 확인 (순서가 바뀌면 계정 목록을 기기 목록이 덮어씀)
    startAuth();
  });

/** 현재 배치가 셋업과 같은지 (저장 안 된 변경 확인용) */
export const sameLayout = (a: { desk: DeskSize; items: DeskItem[] }, b: { desk: DeskSize; items: DeskItem[] }) =>
  JSON.stringify([a.desk, a.items]) === JSON.stringify([b.desk, b.items]);

/** 결합된 액세서리까지 포함한 가격 */
export const itemTotalPrice = (i: DeskItem) => i.price + (i.mount?.price ?? 0);
