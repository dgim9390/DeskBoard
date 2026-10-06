import * as THREE from "three";
import type { DeskItem, ItemColor, Lighting, Mount, ProductKind } from "@/store/useDeskStore";

/**
 * 제품 3D 모형. 단위는 cm, 제품 바닥 가운데가 원점, 앞(사용자 쪽)이 +z.
 * 위에서 본 크기(가로 width × 깊이 height)를 그대로 쓰고, 높이는 종류별 실제 비율로 정함.
 */

export interface ModelCtx {
  lighting: Lighting;
  mat: (color: string, o?: MatOpts) => THREE.Material;
  screen: THREE.Material;
  clock: THREE.Material;
  label: (text: string, dark: boolean) => THREE.Material;
  /** 사용자 제품 사진. 다 불러오면 onReady로 크기를 알려줌 */
  photo: (url: string, onReady: (tex: THREE.Texture) => void) => void;
  /** 그림자를 만드는 조명 개수 제한용 */
  shadowLights: { count: number };
}

export interface MatOpts {
  rough?: number;
  metal?: number;
  emissive?: string;
  emissiveIntensity?: number;
  side?: THREE.Side;
}

interface Pal {
  body: string;
  trim: string;
  key: string;
  metal: number;
}
const PAL: Record<ItemColor, Pal> = {
  black: { body: "#1f1f23", trim: "#2c2c31", key: "#2a2a2f", metal: 0.15 },
  white: { body: "#e4e4e7", trim: "#cfd0d4", key: "#f6f6f7", metal: 0.15 },
};
/** 맥북·거치대 같은 알루미늄 */
const ALU: Record<ItemColor, string> = { black: "#3a3b3f", white: "#d5d7db" };

const WHITE_DEFAULT: ProductKind[] = [
  "macbook-open", "macbook-closed", "laptop-stand", "laptop-vertical-stand", "usbc-hub", "light-bar",
  "trackpad", "mug", "plant", "humidifier", "phone-stand", "tablet-stand",
];
const colorOf = (i: { kind?: ProductKind; color?: ItemColor }): ItemColor => i.color ?? (i.kind && WHITE_DEFAULT.includes(i.kind) ? "white" : "black");

/** 조명 세기 배율 (낮에는 제품 조명 끔) */
const glow = (l: Lighting) => (l === "night" ? 1 : l === "evening" ? 0.6 : 0);

// ── 도형 도우미 ──────────────────────────────────────────
function box(w: number, h: number, d: number, m: THREE.Material | THREE.Material[], x = 0, y = h / 2, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return shadow(mesh);
}

function cyl(rTop: number, rBottom: number, h: number, m: THREE.Material, x = 0, y = h / 2, z = 0, seg = 32) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), m);
  mesh.position.set(x, y, z);
  return shadow(mesh);
}

/** a → b 를 잇는 막대 */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) {
  const len = a.distanceTo(b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return shadow(mesh);
}

function shadow<T extends THREE.Object3D>(o: T): T {
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function pointLight(ctx: ModelCtx, color: string, power: number, pos: THREE.Vector3, distance = 120) {
  const k = glow(ctx.lighting);
  if (!k) return null;
  const l = new THREE.PointLight(color, power * k, distance, 1);
  l.position.copy(pos);
  return l;
}

/** 아래를 비추는 조명 (스탠드·라이트바). 그림자는 처음 2개만 */
function spotDown(ctx: ModelCtx, color: string, power: number, pos: THREE.Vector3, target: THREE.Vector3, angle = 0.9) {
  const k = glow(ctx.lighting);
  if (!k) return [];
  const s = new THREE.SpotLight(color, power * k, 220, angle, 0.6, 1);
  s.position.copy(pos);
  s.target.position.copy(target);
  if (ctx.shadowLights.count < 2) {
    ctx.shadowLights.count++;
    s.castShadow = true;
    s.shadow.mapSize.set(1024, 1024);
    s.shadow.bias = -0.0008;
    s.shadow.normalBias = 0.4;
  }
  return [s, s.target];
}

// ── 키캡 배열 ────────────────────────────────────────────
function keys(ctx: ModelCtx, p: Pal, w: number, d: number, rows: number, top: number, opts: { space?: boolean; glowColor?: string } = {}) {
  const cols = Math.max(3, Math.round(w / 1.9));
  const cw = w / cols;
  const rh = d / rows;
  const geo = new THREE.BoxGeometry(cw * 0.82, 0.8, rh * 0.8);
  const m = opts.glowColor && glow(ctx.lighting)
    ? ctx.mat(p.key, { rough: 0.6, emissive: opts.glowColor, emissiveIntensity: 0.35 * glow(ctx.lighting) })
    : ctx.mat(p.key, { rough: 0.7 });
  const spaceRow = opts.space ? rows - 1 : -1;
  const count = rows * cols;
  const inst = new THREE.InstancedMesh(geo, m, count);
  const mtx = new THREE.Matrix4();
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + cw * (c + 0.5);
      const z = -d / 2 + rh * (r + 0.5);
      const s0 = Math.floor(cols * 0.3);
      const s1 = Math.ceil(cols * 0.68);
      if (r === spaceRow && c > s0 && c < s1) continue; // 스페이스바 자리
      if (r === spaceRow && c === s0) {
        // 스페이스바 한 개로 길게
        const span = s1 - s0;
        mtx.compose(v(-w / 2 + cw * (s0 + span / 2), top + 0.4, z), new THREE.Quaternion(), v(span * 0.97, 1, 1));
      } else mtx.compose(v(x, top + 0.4, z), new THREE.Quaternion(), v(1, 1, 1));
      inst.setMatrixAt(n++, mtx);
    }
  }
  inst.count = n;
  inst.castShadow = true;
  inst.receiveShadow = true;
  return inst;
}

// ── 종류별 모형 ──────────────────────────────────────────
type Build = (ctx: ModelCtx, w: number, d: number, p: Pal, item: DeskItem) => THREE.Object3D[];

const SCREEN_GLOW = "#8fb6ff";

/** 모니터 (울트라와이드는 살짝 휘게) */
function monitor(ctx: ModelCtx, w: number, d: number, p: Pal, ultra: boolean, arm?: Mount): THREE.Object3D[] {
  const ph = w * (ultra ? 0.43 : 0.575);
  const standH = arm ? 14 : 11;
  const panelZ = -d / 2 + 4.3;
  const curve = ultra ? w * 0.07 : 0;
  const bend = (g: THREE.BufferGeometry) => {
    if (!curve) return g;
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getX(i) / (w / 2);
      pos.setZ(i, pos.getZ(i) + t * t * curve);
    }
    g.computeVertexNormals();
    return g;
  };
  const out: THREE.Object3D[] = [];
  const panel = shadow(new THREE.Mesh(bend(new THREE.BoxGeometry(w, ph, 1.4, 32, 1, 1)), ctx.mat(p.body, { rough: 0.45, metal: 0.2 })));
  panel.position.set(0, standH + ph / 2, panelZ);
  const screen = new THREE.Mesh(bend(new THREE.PlaneGeometry(w - 1.4, ph - 1.6, 32, 1)), ctx.screen);
  screen.position.set(0, standH + ph / 2 + 0.2, panelZ + 0.72);
  const back = box(w * 0.46, ph * 0.5, 2.2, ctx.mat(p.trim, { rough: 0.55 }), 0, standH + ph * 0.48, panelZ - 1.6);
  out.push(panel, screen, back);

  const metal = ctx.mat(arm ? ALU[arm.color] : p.trim, { rough: 0.35, metal: 0.6 });
  if (arm) {
    // 책상 뒤 끝 클램프 → 기둥 → 팔 → 모니터 뒤
    const cz = -d / 2 + 1.2;
    out.push(box(6, 5, 6, metal, 0, 2.5, cz));
    out.push(rod(v(0, 5, cz), v(0, standH + ph * 0.5, cz), 1.5, metal));
    out.push(rod(v(0, standH + ph * 0.5, cz), v(0, standH + ph * 0.5, panelZ - 2.7), 1.2, metal));
  } else {
    // 받침대: 화면 아래 앞쪽으로 넓게, 목은 화면 뒤
    const bw = Math.min(26, w * 0.42);
    const bd = Math.max(6, d - 3);
    out.push(box(bw, 1, bd, metal, 0, 0.5, -d / 2 + 3 + bd / 2));
    out.push(box(5.5, standH + ph * 0.45, 2.4, metal, 0, (standH + ph * 0.45) / 2, panelZ - 2.2));
  }
  const l = pointLight(ctx, SCREEN_GLOW, 70, v(0, standH + ph / 2, panelZ + 20), 220);
  if (l) out.push(l);
  return out;
}

/** 노트북 (펼침). 받침대에 올리면 뒤쪽을 들어 올림 */
function laptopOpen(ctx: ModelCtx, w: number, d: number, color: string, stand?: Mount): THREE.Object3D[] {
  const g = new THREE.Group();
  const shell = ctx.mat(color, { rough: 0.35, metal: 0.55 });
  const deck = ctx.mat("#141416", { rough: 0.8 });
  g.add(box(w, 1.3, d, shell, 0, 0.65, 0));
  g.add(box(w * 0.86, 0.1, d * 0.42, deck, 0, 1.33, -d * 0.18)); // 키보드 자리
  g.add(box(w * 0.36, 0.06, d * 0.3, ctx.mat(color, { rough: 0.2, metal: 0.4 }), 0, 1.33, d * 0.27)); // 트랙패드
  const lid = new THREE.Group();
  lid.position.set(0, 1.3, -d / 2);
  const lh = d * 0.94;
  lid.add(box(w, lh, 0.5, shell, 0, lh / 2, 0));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, lh * 0.88), ctx.screen);
  screen.position.set(0, lh * 0.52, 0.26);
  lid.add(screen);
  const baseTilt = stand ? Math.atan(9 / d) : 0;
  lid.rotation.x = -0.26 + baseTilt; // 사용자 쪽에서 보기에 약 15° 뒤로 젖힘
  g.add(lid);
  const out: THREE.Object3D[] = [];
  if (stand) {
    const m = ctx.mat(ALU[stand.color], { rough: 0.35, metal: 0.6 });
    for (const sx of [-1, 1]) {
      const rail = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, d * 1.02), m));
      rail.position.set(sx * w * 0.36, 4 + 4.5, 0);
      rail.rotation.x = baseTilt;
      out.push(rail);
      out.push(box(1.4, 13, 1.4, m, sx * w * 0.36, 6.5, -d / 2 + 1));
      out.push(box(1.4, 4, 1.4, m, sx * w * 0.36, 2, d / 2 - 1));
    }
    g.position.y = 9.2;
    g.rotation.x = baseTilt;
  }
  g.traverse((o) => shadow(o));
  const l = pointLight(ctx, SCREEN_GLOW, 30, v(0, 18 + (stand ? 9 : 0), 8), 120);
  if (l) out.push(l);
  return [g, ...out];
}

const BUILD: Partial<Record<ProductKind, Build>> = {
  keyboard: (ctx, w, d, p) => [box(w, 2, d, ctx.mat(p.body, { rough: 0.5, metal: p.metal })), keys(ctx, p, w - 1.4, d - 1.4, 6, 2, { space: true })],
  "keyboard-full": (ctx, w, d, p) => [box(w, 2, d, ctx.mat(p.body, { rough: 0.5, metal: p.metal })), keys(ctx, p, w - 1.4, d - 1.4, 6, 2, { space: true })],
  "macro-pad": (ctx, w, d, p) => [box(w, 2.4, d, ctx.mat(p.body, { rough: 0.5 })), keys(ctx, p, w - 1.6, d - 1.6, 3, 2.4, { glowColor: "#b39dff" })],
  mouse: (ctx, w, d, p) => {
    const dome = shadow(new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), ctx.mat(p.body, { rough: 0.35 })));
    dome.scale.set(w / 2, 3.6, d / 2);
    return [dome, cyl(0.45, 0.45, 0.6, ctx.mat(p.trim), 0, 3.2, -d * 0.22, 16)];
  },
  "mouse-vertical": (ctx, w, d, p) => {
    const dome = shadow(new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), ctx.mat(p.body, { rough: 0.35 })));
    dome.scale.set(w / 2, 7, d / 2);
    dome.rotation.z = -0.25;
    return [dome];
  },
  trackpad: (ctx, w, d, _p, item) => [box(w, 0.7, d, ctx.mat(ALU[colorOf(item)], { rough: 0.3, metal: 0.5 }))],
  laptop: (ctx, w, d, p, item) => laptopOpen(ctx, w, d, p.body, item.mount?.kind === "laptop-stand" ? item.mount : undefined),
  "macbook-open": (ctx, w, d, _p, item) => laptopOpen(ctx, w, d, ALU[colorOf(item)], item.mount?.kind === "laptop-stand" ? item.mount : undefined),
  "macbook-closed": (ctx, w, d, _p, item) => {
    const shell = ctx.mat(ALU[colorOf(item)], { rough: 0.35, metal: 0.55 });
    const m = item.mount;
    if (m?.kind === "laptop-vertical-stand") {
      // 수직 거치대에 세운 노트북: 위에서 본 가로(w)는 두께, 깊이(d)는 노트북 가로
      const H = Math.min(m.hostWidth, m.hostHeight);
      const sd = Math.min(d * 0.6, 18);
      const sm = ctx.mat(ALU[m.color], { rough: 0.35, metal: 0.6 });
      return [box(Math.max(w, 5), 2, sd, sm), box(1, 6, sd, sm, -1.5, 3), box(1, 6, sd, sm, 1.5, 3), box(1.5, H, d * 0.97, shell, 0, 1.5 + H / 2)];
    }
    if (m?.kind === "laptop-stand") return laptopOpen(ctx, w, d, ALU[colorOf(item)], m).slice(0, 1);
    return [box(w, 1.5, d, shell)];
  },
  lamp: (ctx, w, d, p) => {
    const m = ctx.mat(p.body, { rough: 0.4, metal: 0.4 });
    const r = Math.min(w, d) * 0.32;
    const head = v(0, 40, Math.min(d, 20) * 0.9);
    const out: THREE.Object3D[] = [cyl(r, r * 1.08, 1.8, m), rod(v(0, 1.8, 0), v(0, 34, -2), 0.8, m), rod(v(0, 34, -2), head, 0.7, m)];
    const shade = shadow(new THREE.Mesh(new THREE.ConeGeometry(5, 6.5, 32, 1, true), ctx.mat(p.body, { rough: 0.5, side: THREE.DoubleSide })));
    shade.position.copy(head).add(v(0, -2, 0));
    const k = glow(ctx.lighting);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 12), ctx.mat("#fff4dc", { emissive: "#ffcf87", emissiveIntensity: 0.3 + k * 2.2 }));
    bulb.position.copy(head).add(v(0, -4.5, 0));
    out.push(shade, bulb, ...spotDown(ctx, "#ffcf87", 260, head.clone().add(v(0, -4, 0)), head.clone().setY(0).add(v(0, 0, 6)), 0.95));
    return out;
  },
  "light-bar": (ctx, w, _d, p) => {
    const bar = rod(v(-w / 2, 1.6, 0), v(w / 2, 1.6, 0), 1.4, ctx.mat(p.body, { rough: 0.35, metal: 0.5 }));
    const k = glow(ctx.lighting);
    const strip = box(w * 0.92, 0.2, 1.2, ctx.mat("#fff8ea", { emissive: "#fff1d6", emissiveIntensity: 0.2 + k * 2 }), 0, 0.25, 0.6);
    strip.castShadow = false;
    return [bar, strip, ...spotDown(ctx, "#fff1d6", 220, v(0, 0, 3), v(0, -60, 30), 0.85)];
  },
  speaker: (ctx, w, d, p) => {
    const h = Math.min(32, Math.max(10, w * 1.55));
    const dark = ctx.mat("#111113", { rough: 0.6 });
    const out: THREE.Object3D[] = [box(w, h, d, ctx.mat(p.body, { rough: 0.6 }))];
    for (const [r, y] of [[w * 0.32, h * 0.34], [w * 0.13, h * 0.76]] as const) {
      const drv = cyl(r, r, 0.6, dark, 0, y, d / 2, 32);
      drv.rotation.x = Math.PI / 2;
      out.push(drv);
    }
    return out;
  },
  soundbar: (ctx, w, d, p) => [box(w, 6.5, d, ctx.mat(p.body, { rough: 0.7 })), box(w * 0.96, 5, 0.2, ctx.mat("#141416", { rough: 0.95 }), 0, 3.25, d / 2)],
  "desk-mat": (ctx, w, d, p) => [box(w, 0.35, d, ctx.mat(p === PAL.black ? "#252528" : "#c8c8cd", { rough: 0.95 }))],
  "mouse-pad": (ctx, w, d, p) => [box(w, 0.35, d, ctx.mat(p === PAL.black ? "#252528" : "#c8c8cd", { rough: 0.95 }))],
  "wrist-rest": (ctx, w, d, p) => [box(w, 2, d, ctx.mat(p.body, { rough: 0.85 }))],
  "notebook-pad": (ctx, w, d) => [box(w, 0.9, d, ctx.mat("#f2efe6", { rough: 0.9 })), box(0.6, 0.95, d, ctx.mat("#3f3f46"), -w / 2 + 0.3, 0.475), rod(v(w * 0.15, 1.3, -d * 0.3), v(w * 0.35, 1.3, d * 0.25), 0.45, ctx.mat("#1f2937"))],
  "monitor-riser": (ctx, w, d, p) => {
    const m = ctx.mat(p.body, { rough: 0.5, metal: 0.3 });
    return [box(w, 1.6, d, m, 0, 9.2), box(2.4, 8.4, d, m, -w / 2 + 1.2, 4.2), box(2.4, 8.4, d, m, w / 2 - 1.2, 4.2)];
  },
  "monitor-arm": (ctx, _w, d, p) => {
    const m = ctx.mat(p.body, { rough: 0.35, metal: 0.6 });
    const cz = -d / 2 + 2;
    return [box(6, 5, 6, m, 0, 2.5, cz), rod(v(0, 5, cz), v(0, 40, cz), 1.5, m), rod(v(0, 40, cz), v(0, 38, d / 2 - 2), 1.2, m), box(8, 8, 1, m, 0, 38, d / 2 - 1.5)];
  },
  "laptop-stand": (ctx, w, d, p) => {
    const m = ctx.mat(ALU[p === PAL.black ? "black" : "white"], { rough: 0.35, metal: 0.6 });
    const t = Math.atan(9 / d);
    const out: THREE.Object3D[] = [];
    for (const sx of [-1, 1]) {
      const rail = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, d), m));
      rail.position.set(sx * w * 0.36, 8.5, 0);
      rail.rotation.x = t;
      out.push(rail, box(1.4, 13, 1.4, m, sx * w * 0.36, 6.5, -d / 2 + 1), box(1.4, 4, 1.4, m, sx * w * 0.36, 2, d / 2 - 1));
    }
    return out;
  },
  "laptop-vertical-stand": (ctx, w, d, p) => {
    const m = ctx.mat(ALU[p === PAL.black ? "black" : "white"], { rough: 0.35, metal: 0.6 });
    return [box(w, 2, d, m), box(1, 6, d * 0.9, m, -1.5, 3), box(1, 6, d * 0.9, m, 1.5, 3)];
  },
  "usbc-hub": (ctx, w, d) => [box(w, 1.3, d, ctx.mat("#9ca3af", { rough: 0.35, metal: 0.6 }))],
  "wireless-charger": (ctx, w, d, p) => [cyl(Math.min(w, d) / 2, Math.min(w, d) / 2, 0.9, ctx.mat(p.body, { rough: 0.6 }))],
  "power-strip": (ctx, w, d, p) => {
    const out: THREE.Object3D[] = [box(w, 3.4, d, ctx.mat(p.body, { rough: 0.6 }))];
    const n = Math.max(2, Math.floor(w / 6));
    for (let i = 0; i < n; i++) out.push(cyl(1.4, 1.4, 0.15, ctx.mat("#0b0b0c"), -w / 2 + (w / n) * (i + 0.5), 3.45, 0, 20));
    return out;
  },
  "phone-stand": (ctx, w, d, p) => {
    const phone = box(7.2, 15, 0.8, ctx.mat("#111113", { rough: 0.3 }), 0, 0, 0);
    phone.position.set(0, 8.2, -d * 0.1);
    phone.rotation.x = -0.32;
    return [box(w, 0.8, d, ctx.mat(ALU[p === PAL.black ? "black" : "white"], { rough: 0.35, metal: 0.6 })), phone];
  },
  "tablet-stand": (ctx, w, d, p) => {
    const tw = Math.min(w * 0.95, 25);
    const tab = new THREE.Group();
    tab.add(box(tw, 17.5, 0.7, ctx.mat("#1a1a1d", { rough: 0.3 }), 0, 0, 0));
    const s = new THREE.Mesh(new THREE.PlaneGeometry(tw - 1.2, 16.3), ctx.screen);
    s.position.z = 0.36;
    tab.add(s);
    tab.position.set(0, 10, -d * 0.1);
    tab.rotation.x = -0.3;
    return [box(w, 0.8, d, ctx.mat(ALU[p === PAL.black ? "black" : "white"], { rough: 0.35, metal: 0.6 })), tab];
  },
  headphones: (ctx, w, d, p) => {
    const m = ctx.mat(p.body, { rough: 0.55 });
    const R = Math.max(3, w / 2 - 3.5);
    const cz = d * 0.12;
    const band = shadow(new THREE.Mesh(new THREE.TorusGeometry(R, 1.1, 12, 40, Math.PI), m));
    band.rotation.x = -Math.PI / 2;
    band.position.set(0, 1.2, cz);
    return [band, cyl(4, 4, 3.2, m, -R, 1.6, cz), cyl(4, 4, 3.2, m, R, 1.6, cz)];
  },
  "headphone-stand": (ctx, w, d, p) => {
    const m = ctx.mat(p.body, { rough: 0.4, metal: 0.4 });
    const hook = shadow(new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.8, 12, 24, Math.PI), m));
    hook.position.set(0, 26, 0);
    return [cyl(Math.min(w, d) * 0.45, Math.min(w, d) * 0.48, 1.4, m), cyl(0.8, 0.8, 26, m, 0, 13), hook];
  },
  "mic-arm": (ctx, _w, d, p) => {
    const m = ctx.mat(p.body, { rough: 0.4, metal: 0.4 });
    const cz = -d / 2 + 2;
    const elbow = v(0, 30, -d * 0.05);
    const tip = v(0, 28, d / 2 - 4);
    const mic = cyl(2.4, 2.2, 12, ctx.mat("#2b2b30", { rough: 0.6, metal: 0.3 }), tip.x, tip.y - 7, tip.z);
    return [box(6, 5, 6, m, 0, 2.5, cz), rod(v(0, 5, cz), elbow, 0.8, m), rod(elbow, tip, 0.7, m), mic];
  },
  "desk-organizer": (ctx, w, d, p) => {
    const out: THREE.Object3D[] = [box(w, 9, d, ctx.mat(p.body, { rough: 0.7 })), box(w - 1, 0.1, d - 1, ctx.mat("#0d0d0f"), 0, 9.02)];
    const colors = ["#2563eb", "#111827", "#dc2626", "#16a34a"];
    colors.forEach((c, i) => out.push(cyl(0.45, 0.45, 15, ctx.mat(c, { rough: 0.5 }), -w * 0.3 + i * 1.6, 9.5, -d * 0.15 + (i % 2) * 1.4, 12)));
    return out;
  },
  plant: (ctx, w, d, p) => {
    const r = Math.min(w, d) * 0.42;
    const pot = cyl(r, r * 0.8, 10, ctx.mat(p === PAL.black ? "#2a2a2e" : "#e8e6e1", { rough: 0.8 }));
    const leafM = ctx.mat("#3c7a46", { rough: 0.7 });
    const out: THREE.Object3D[] = [pot, cyl(r * 0.95, r * 0.95, 0.4, ctx.mat("#3b2a1e", { rough: 1 }), 0, 9.8)];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const leaf = shadow(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), i % 2 ? leafM : ctx.mat("#2f6b3a", { rough: 0.7 })));
      leaf.scale.set(2.4, 0.45, 6.5);
      leaf.position.set(Math.cos(a) * 3.2, 15 + (i % 3) * 2.5, Math.sin(a) * 3.2);
      leaf.rotation.set(0, -a + Math.PI / 2, 0);
      leaf.rotateX(-0.9);
      out.push(leaf);
    }
    return out;
  },
  mug: (ctx, w, d, p) => {
    const r = (Math.min(w, d) / 2) * 0.78;
    const m = ctx.mat(p === PAL.black ? "#26262a" : "#f1f1ef", { rough: 0.35 });
    const handle = shadow(new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.6, 12, 24), m));
    handle.position.set(r + 1.4, 5, 0);
    return [cyl(r, r * 0.95, 9.5, m), cyl(r * 0.9, r * 0.9, 0.2, ctx.mat("#3b2416", { rough: 0.3 }), 0, 8.6), handle];
  },
  clock: (ctx, w, d, p) => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, 4.4), ctx.clock);
    face.position.set(0, 3.2, d / 2 + 0.02);
    return [box(w, 6.4, d, ctx.mat(p.body, { rough: 0.6 })), face];
  },
  humidifier: (ctx, w, d, p) => {
    const r = Math.min(w, d) / 2;
    return [cyl(r * 0.92, r, 18, ctx.mat(p === PAL.black ? "#2a2a2e" : "#eef0f2", { rough: 0.5 })), cyl(r * 0.5, r * 0.5, 0.4, ctx.mat("#9ca3af"), 0, 18.1)];
  },
};

/** 사용자 제품 사진: 키보드·마우스는 바닥에 눕히고, 나머지는 세워서(입간판처럼) 표시 */
function photoModel(ctx: ModelCtx, item: DeskItem, w: number, d: number): THREE.Object3D[] {
  const g = new THREE.Group();
  const flat = item.category === "keyboard" || item.category === "mouse";
  const base = box(w, 0.4, d, new THREE.MeshBasicMaterial({ visible: false }));
  base.castShadow = false;
  g.add(base); // 사진을 불러오기 전에도 클릭할 수 있게
  if (!item.imageUrl) return [g];
  ctx.photo(item.imageUrl, (tex) => {
    const img = tex.image as { width: number; height: number };
    const aspect = img.height / img.width;
    const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.35, transparent: false, side: THREE.DoubleSide, roughness: 0.6 });
    if (flat) {
      const s = Math.min(w, d / aspect);
      const plane = shadow(new THREE.Mesh(new THREE.PlaneGeometry(s, s * aspect), mat));
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = 0.6;
      g.add(plane);
    } else {
      const h = Math.min(70, w * aspect);
      const pw = h / aspect;
      const plane = shadow(new THREE.Mesh(new THREE.PlaneGeometry(pw, h), mat));
      plane.position.set(0, h / 2, 0);
      g.add(plane);
    }
  });
  return [g];
}

function genericModel(ctx: ModelCtx, item: DeskItem, w: number, d: number, p: Pal): THREE.Object3D[] {
  const side = ctx.mat(p.body, { rough: 0.6 });
  const top = ctx.label(item.name, colorOf(item) === "black");
  return [box(w, 8, d, [side, side, top, side, side, side])];
}

/** 제품 하나의 3D 모형 (원점 = 제품 바닥 가운데) */
export function buildItem(ctx: ModelCtx, item: DeskItem): THREE.Group {
  const g = new THREE.Group();
  const w = item.width;
  const d = item.height;
  const p = PAL[colorOf(item)];
  const kind = item.kind ?? "generic";
  let parts: THREE.Object3D[];
  if (kind === "monitor" || kind === "ultrawide") parts = monitor(ctx, w, d, p, kind === "ultrawide", item.mount?.kind === "monitor-arm" ? item.mount : undefined);
  else if (kind === "photo") parts = photoModel(ctx, item, w, d);
  else if (BUILD[kind]) parts = BUILD[kind]!(ctx, w, d, p, item);
  else parts = genericModel(ctx, item, w, d, p);
  for (const o of parts) g.add(o);
  return g;
}

/** 다른 제품을 올려놓을 수 있는 제품과 그 윗면 높이 */
export const SUPPORT_TOP: Partial<Record<ProductKind, number>> = { "desk-mat": 0.35, "mouse-pad": 0.35, "monitor-riser": 10 };

/** 모니터 화면 윗변 높이와 화면 위치(제품 기준) — 라이트바를 올릴 때 씀 */
export function monitorTop(item: DeskItem) {
  const ultra = item.kind === "ultrawide";
  const ph = item.width * (ultra ? 0.43 : 0.575);
  const standH = item.mount?.kind === "monitor-arm" ? 14 : 11;
  return { y: standH + ph, z: -item.height / 2 + 4.3 };
}
