import { useState, type ReactNode } from "react";
import { Image, Platform, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { isCutout } from "@/lib/cutout";
import { defaultColor, type Category, type ItemColor, type Mount, type ProductKind } from "@/store/useDeskStore";

export const DEFAULT_KIND: Record<Category, ProductKind> = {
  monitor: "monitor",
  keyboard: "keyboard",
  mouse: "mouse",
  laptop: "laptop",
  accessory: "lamp",
};

/**
 * 책상 위에서 내려다본(top-down) 제품 일러스트.
 * 좌표 단위는 mm이고 viewBox가 실제 제품 점유 면적 비율과 같아서,
 * 캔버스에서 cm 크기대로 그리면 실제 책상 위 모습에 가깝게 보인다.
 */
interface Art {
  w: number;
  h: number;
  node: ReactNode;
}

// ── 색상 팔레트 (블랙 / 화이트) ─────────────────────────────
interface Pal {
  s: string; // gradient id 접미사 (웹에서 같은 id의 다른 색이 섞이지 않게)
  body0: string;
  body1: string;
  edge: string;
  plate: string;
  key0: string;
  key1: string;
  mod0: string;
  mod1: string;
  keyEdge: string;
  metal0: string;
  metal1: string;
  detail: string;
  deck0: string;
  deck1: string;
  deckEdge: string;
  hinge: string;
  lapKey: string;
  pad0: string;
  pad1: string;
  soft0: string;
  soft1: string;
  stitch: string;
}

const PAL: Record<ItemColor, Pal> = {
  black: {
    s: "b",
    body0: "#55555d",
    body1: "#1d1d21",
    edge: "#0d0d0f",
    plate: "#141417",
    key0: "#54545c",
    key1: "#3a3a41",
    mod0: "#3f3f46",
    mod1: "#2b2b30",
    keyEdge: "#0b0b0d",
    metal0: "#2e2e33",
    metal1: "#5f5f68",
    detail: "#0c0c0e",
    deck0: "#44454b",
    deck1: "#2b2c31",
    deckEdge: "#1c1d21",
    hinge: "#1c1d21",
    lapKey: "#0d0d0f",
    pad0: "#4a4b51",
    pad1: "#36373c",
    soft0: "#3a3a41",
    soft1: "#222227",
    stitch: "#8b8b94",
  },
  white: {
    s: "w",
    body0: "#ffffff",
    body1: "#d6d6db",
    edge: "#9f9fa8",
    plate: "#e4e4e8",
    key0: "#ffffff",
    key1: "#ececef",
    mod0: "#e0e0e5",
    mod1: "#cdcdd3",
    keyEdge: "#a8a8b0",
    metal0: "#a9a9b1",
    metal1: "#f1f1f4",
    detail: "#7d7d86",
    deck0: "#dcdde1",
    deck1: "#b4b5bb",
    deckEdge: "#9a9ba2",
    hinge: "#8d8e95",
    lapKey: "#1d1d20",
    pad0: "#e6e7ea",
    pad1: "#c3c4ca",
    soft0: "#ededf0",
    soft1: "#cfcfd5",
    stitch: "#9f9fa8",
  },
};

type StopList = [number, string, number?][];

const lin = (id: string, list: StopList, horizontal = false) => (
  <LinearGradient key={id} id={id} x1="0" y1="0" x2={horizontal ? "1" : "0"} y2={horizontal ? "0" : "1"}>
    {list.map(([o, c, a]) => (
      <Stop key={o} offset={o} stopColor={c} stopOpacity={a ?? 1} />
    ))}
  </LinearGradient>
);
const L = (p: Pal, id: string, list: StopList, horizontal = false) => lin(id + p.s, list, horizontal);
const U = (p: Pal, id: string) => `url(#${id}${p.s})`;

/** 겹친 반투명 사각형으로 만든 부드러운 그림자 (SVG 필터 미사용 → 웹/네이티브 동일) */
function Shadow({ w, h, r, dx = 3, dy = 6 }: { w: number; h: number; r: number; dx?: number; dy?: number }) {
  return (
    <G>
      {[0, 1, 2, 3, 4].map((i) => (
        <Rect key={i} x={dx - i * 2.5} y={dy - i * 2.5} width={w + i * 5} height={h + i * 5} rx={r + i * 2.5} fill="#000" opacity={0.07} />
      ))}
    </G>
  );
}

// ── 키보드 ───────────────────────────────────────────────
type Cell = number; // 양수: 키 너비(u), 음수: 간격(u)

function Keys({ rows, x0, y0, u, gapY, mod, p }: { rows: Cell[][]; x0: number; y0: number; u: number; gapY: number; mod: (w: number) => boolean; p: Pal }) {
  const out: ReactNode[] = [];
  rows.forEach((row, r) => {
    let x = x0;
    const y = y0 + r * u + (r > 0 ? gapY : 0);
    row.forEach((c, i) => {
      if (c < 0) {
        x += -c * u;
        return;
      }
      const w = c * u;
      out.push(
        <G key={`${r}-${i}`}>
          <Rect x={x + 0.3} y={y + 0.9} width={w - 0.6} height={u - 0.6} rx={2.8} fill={p.keyEdge} />
          <Rect x={x + 1} y={y + 1} width={w - 2} height={u - 2.6} rx={2.4} fill={mod(c) ? U(p, "kkMod") : U(p, "kk")} />
        </G>,
      );
      x += w;
    });
  });
  return <>{out}</>;
}

const ones = (n: number): Cell[] => Array(n).fill(1);

const MAIN: Cell[][] = [
  [1, -1, ...ones(4), -0.5, ...ones(4), -0.5, ...ones(4)],
  [...ones(13), 2],
  [1.5, ...ones(12), 1.5],
  [1.75, ...ones(11), 2.25],
  [2.25, ...ones(10), 2.75],
  [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
];
const NAV: Cell[][] = [ones(3), ones(3), ones(3), [], [-1, 1, -1], ones(3)];
const NUM: Cell[][] = [[], ones(4), ones(4), [...ones(3), -1], ones(4), [2, 1, -1]];

const keyboardArt = (p: Pal, numpad: boolean): Art => {
  const W = numpad ? 440 : 360;
  const D = 140;
  const units = 15 + 3.5 + (numpad ? 4.5 : 0);
  const u = (W - 16) / units;
  const y0 = (D - 6.5 * u) / 2;
  const gapY = u * 0.5;
  return {
    w: W,
    h: D,
    node: (
      <>
        <Defs>
          {L(p, "kbCase", [[0, p.body0], [1, p.body1]])}
          {L(p, "kk", [[0, p.key0], [1, p.key1]])}
          {L(p, "kkMod", [[0, p.mod0], [1, p.mod1]])}
        </Defs>
        <Shadow w={W} h={D} r={10} />
        <Rect x={0} y={0} width={W} height={D} rx={10} fill={U(p, "kbCase")} stroke={p.edge} strokeWidth={0.8} />
        <Rect x={4} y={4} width={W - 8} height={D - 8} rx={7} fill={p.plate} />
        <Keys rows={MAIN} x0={8} y0={y0} u={u} gapY={gapY} mod={(w) => w !== 1} p={p} />
        <Keys rows={NAV} x0={8 + 15.5 * u} y0={y0} u={u} gapY={gapY} mod={() => false} p={p} />
        {numpad && <Keys rows={NUM} x0={8 + 19 * u} y0={y0} u={u} gapY={gapY} mod={() => false} p={p} />}
        <Line x1={12} y1={2} x2={W - 12} y2={2} stroke="#fff" strokeOpacity={0.3} strokeWidth={1} />
      </>
    ),
  };
};

// ── 모니터 ───────────────────────────────────────────────
/**
 * 위에서 본 모니터 (제조사 탑뷰 사진 기준):
 * 뒤쪽 사각 받침판 + 넥 + 둥근 피벗, 살짝 볼록한 후면 커버, 베젤 윗면,
 * 그 앞으로 화면 유리 가장자리가 얇게 보이고 받침판 앞쪽 끝이 화면 아래로 나온다.
 * arm이 있으면 받침판/넥 대신 책상 뒤 모서리 클램프에서 뻗은 모니터 암에 결합된 모습.
 */
const monitorArt = (p: Pal, W: number, D: number, curved: boolean, arm?: Pal): Art => {
  const sag = curved ? D * 0.07 : 0; // 곡면: 양 끝이 사용자 쪽으로 휨
  const coverTop = D * 0.52; // 볼록한 후면 커버 꼭대기(중앙)
  const bezelTop = D * 0.6;
  const screenTop = D * 0.645;
  const screenBot = D * 0.68;
  const plateW = W * 0.3;
  const plateX = (W - plateW) / 2;

  // 곡면을 따라가는 띠(위 y0 ~ 아래 y1, 좌우 인셋 i0/i1)
  const band = (y0: number, y1: number, i0 = 0, i1 = 0) =>
    `M${i0} ${y0 + sag} Q${W / 2} ${y0 - sag} ${W - i0} ${y0 + sag} L${W - i1} ${y1 + sag} Q${W / 2} ${y1 - sag} ${i1} ${y1 + sag} Z`;
  const cover = `M${W * 0.01} ${bezelTop + sag} Q${W / 2} ${coverTop * 2 - bezelTop - sag} ${W * 0.99} ${bezelTop + sag} Z`;
  const bezel = band(bezelTop, screenTop, 0, W * 0.004);
  const screen = band(screenTop, screenBot, W * 0.004, W * 0.012);
  const chin = `M${W * 0.012} ${screenBot + sag} Q${W / 2} ${screenBot - sag} ${W * 0.988} ${screenBot + sag}`;

  // 모니터 암: 뒤쪽 모서리 클램프 → 관절 → 커버 뒤 VESA 마운트
  const c0 = { x: W * 0.2, y: 16 };
  const j1 = { x: W * 0.34, y: coverTop * 0.5 };
  const vesa = { x: W / 2, y: coverTop + 8 };
  const armPath = `M${c0.x} ${c0.y} L${j1.x} ${j1.y} L${vesa.x} ${vesa.y}`;

  const knob = { x: W / 2, y: D * 0.1, r: Math.min(D * 0.08, W * 0.03) };
  const neckW = knob.r * 1.3;

  return {
    w: W,
    h: D,
    node: (
      <>
        <Defs>
          {L(p, "mCover", [[0, p.mod1], [1, p.mod0]])}
          {L(p, "mBezel", [[0, p.mod0], [1, p.body1]])}
          {L(p, "mNeck", [[0, p.mod1], [0.5, p.mod0], [1, p.mod1]], true)}
          <LinearGradient id="mScreen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#27272a" />
            <Stop offset="1" stopColor="#09090b" />
          </LinearGradient>
          {arm && L(arm, "maClamp", [[0, arm.metal0], [0.5, arm.metal1], [1, arm.metal0]], true)}
        </Defs>

        {!arm && (
          <>
            {/* 사각 받침판 */}
            <G transform={`translate(${plateX} ${D * 0.07})`}>
              <Shadow w={plateW} h={D * 0.93 - 2} r={8} dx={0} dy={3} />
            </G>
            <Rect x={plateX} y={D * 0.07} width={plateW} height={D * 0.93 - 2} rx={8} fill={p.mod1} stroke={p.edge} strokeWidth={1} />
            <Rect x={plateX + 3} y={D * 0.07 + 3} width={plateW - 6} height={D * 0.93 - 8} rx={6} fill="none" stroke="#fff" strokeOpacity={0.08} />
            {/* 넥 + 힌지 */}
            <Rect x={knob.x - neckW / 2} y={knob.y + 4} width={neckW} height={coverTop - knob.y} fill="#000" opacity={0.2} />
            <Rect x={knob.x - neckW / 2} y={knob.y} width={neckW} height={coverTop - knob.y} rx={neckW / 3} fill={U(p, "mNeck")} stroke={p.edge} strokeWidth={0.8} />
            <Path
              d={`M${W / 2 - W * 0.045} ${coverTop + 6} L${W / 2 - W * 0.03} ${coverTop - D * 0.07} L${W / 2 + W * 0.03} ${coverTop - D * 0.07} L${W / 2 + W * 0.045} ${coverTop + 6} Z`}
              fill={p.mod1}
              stroke={p.edge}
              strokeWidth={0.8}
            />
            {/* 피벗 */}
            <Circle cx={knob.x} cy={knob.y + 3} r={knob.r} fill="#000" opacity={0.2} />
            <Circle cx={knob.x} cy={knob.y} r={knob.r} fill={U(p, "mNeck")} stroke={p.edge} strokeWidth={0.8} />
          </>
        )}

        {arm && (
          <>
            <Path d={armPath} stroke="#000" strokeOpacity={0.22} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(4 7)" />
            <Rect x={c0.x - 24} y={0} width={48} height={34} rx={5} fill={U(arm, "maClamp")} stroke={arm.edge} />
            <Path d={armPath} stroke={arm.edge} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d={armPath} stroke={arm.metal1} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Circle cx={c0.x} cy={c0.y} r={9} fill={arm.metal0} stroke={arm.edge} />
            <Circle cx={j1.x} cy={j1.y} r={10} fill={arm.metal0} stroke={arm.edge} />
          </>
        )}

        {/* 모니터 본체 그림자 */}
        {[3, 2, 1, 0].map((i) => (
          <Path key={i} d={band(bezelTop - 4, screenBot)} transform={`translate(0 ${2 + i * 1.5})`} fill="#000" opacity={0.07} />
        ))}
        {/* 볼록한 후면 커버 */}
        <Path d={cover} fill={U(p, "mCover")} stroke={p.edge} strokeWidth={0.8} />
        {/* 베젤 윗면 */}
        <Path d={bezel} fill={U(p, "mBezel")} stroke={p.edge} strokeWidth={0.8} />
        <Path d={`M${W * 0.01} ${bezelTop + sag + 1.5} Q${W / 2} ${bezelTop - sag + 1.5} ${W * 0.99} ${bezelTop + sag + 1.5}`} stroke="#fff" strokeOpacity={0.25} strokeWidth={1} fill="none" />
        {/* 기울어진 화면 */}
        <Path d={screen} fill="url(#mScreen)" />
        <Path d={`M${W * 0.02} ${screenTop + sag + 1.5} Q${W / 2} ${screenTop - sag + 1.5} ${W * 0.98} ${screenTop + sag + 1.5}`} stroke="#fff" strokeOpacity={0.12} strokeWidth={1} fill="none" />
        <Path d={chin} stroke={p.edge} strokeWidth={1.2} fill="none" />
      </>
    ),
  };
};

// ── 마우스 ───────────────────────────────────────────────
const mouseArt = (p: Pal, vertical: boolean): Art => {
  const W = vertical ? 80 : 65;
  const H = vertical ? 120 : 115;
  const body = vertical
    ? "M42 4 C62 4 75 20 75 48 C75 88 66 116 46 116 C24 116 13 96 13 62 C13 30 26 4 42 4 Z"
    : "M32 4 C51 4 62 22 62 50 C62 86 55 111 32 111 C10 111 3 86 3 50 C3 22 14 4 32 4 Z";
  const cx = vertical ? 43 : 32.5;
  return {
    w: W,
    h: H,
    node: (
      <>
        <Defs>
          {L(p, "moBody", [[0, p.body0], [1, p.body1]])}
          <RadialGradient id={`moSheen${p.s}`} cx="0.35" cy="0.22" r="0.65">
            <Stop offset="0" stopColor="#fff" stopOpacity={0.3} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {[3, 2, 1, 0].map((i) => (
          <Path key={i} d={body} transform={`translate(${2 + i}, ${4 + i * 1.5})`} fill="#000" opacity={0.08} />
        ))}
        <Path d={body} fill={U(p, "moBody")} stroke={p.edge} strokeWidth={1} />
        {vertical && <Path d="M13 58 C2 62 2 92 16 98 L22 84 C18 76 17 66 13 58 Z" fill={p.mod1} stroke={p.edge} />}
        <Path d={body} fill={U(p, "moSheen")} />
        <Line x1={cx} y1={8} x2={cx} y2={vertical ? 50 : 47} stroke={p.edge} strokeWidth={1.4} />
        <Path d={vertical ? "M18 50 C34 56 54 56 70 50" : "M6 47 C20 52 45 52 59 47"} stroke={p.edge} strokeWidth={1.4} fill="none" />
        <Rect x={cx - 4.5} y={vertical ? 22 : 20} width={9} height={17} rx={4.5} fill={p.metal1} stroke={p.edge} strokeWidth={0.8} />
      </>
    ),
  };
};

// ── 노트북 ───────────────────────────────────────────────
const laptopArt = (p: Pal): Art => {
  const W = 310;
  const D = 215;
  const keys: ReactNode[] = [];
  const kx = 18;
  const ky = 26;
  const cols = 14;
  const rowsN = 6;
  const pw = 274 / cols;
  const ph = 98 / rowsN;
  for (let r = 0; r < rowsN; r++)
    for (let c = 0; c < cols; c++)
      keys.push(<Rect key={`${r}-${c}`} x={kx + 4 + c * pw} y={ky + 3 + r * ph} width={pw - 2} height={ph - 2.4} rx={2} fill="#2a2a2f" stroke="#050506" strokeWidth={0.6} />);
  return {
    w: W,
    h: D,
    node: (
      <>
        <Defs>
          {L(p, "lpDeck", [[0, p.deck0], [1, p.deck1]])}
          {L(p, "lpPad", [[0, p.pad0], [1, p.pad1]])}
        </Defs>
        <Shadow w={W} h={D} r={12} dy={7} />
        <Rect x={0} y={9} width={W} height={D - 9} rx={12} fill={U(p, "lpDeck")} stroke={p.deckEdge} strokeWidth={1} />
        <Rect x={0} y={0} width={W} height={12} rx={5} fill={p.hinge} />
        <Rect x={kx} y={ky} width={274} height={106} rx={5} fill="#111114" />
        {keys}
        <Rect x={100} y={144} width={110} height={62} rx={7} fill={U(p, "lpPad")} stroke={p.deckEdge} strokeWidth={1} />
      </>
    ),
  };
};

// 맥북 펼침: 알루미늄 데크 + 블랙 키캡 + 큰 트랙패드 + 좌우 스피커 그릴
const MAC_ROWS: { h: number; w: number[] }[] = [
  { h: 8, w: Array(14).fill(1) },
  { h: 14, w: [...Array(13).fill(1), 1.5] },
  { h: 14, w: [1.5, ...Array(12).fill(1), 1.1] },
  { h: 14, w: [1.8, ...Array(11).fill(1), 1.9] },
  { h: 14, w: [2.3, ...Array(10).fill(1), 2.4] },
  { h: 14, w: [1, 1, 1, 1.3, 5, 1.3, 1, 1, 1, 1] },
];

const macOpenArt = (p: Pal): Art => {
  const W = 310;
  const D = 215;
  const kx = 24;
  const kw = 262;
  const keys: ReactNode[] = [];
  let y = 24;
  MAC_ROWS.forEach((row, r) => {
    const total = row.w.reduce((a, b) => a + b, 0);
    const unit = kw / total;
    let x = kx;
    row.w.forEach((w, i) => {
      keys.push(<Rect key={`${r}-${i}`} x={x + 0.8} y={y} width={w * unit - 1.6} height={row.h} rx={2} fill={p.lapKey} stroke="#050506" strokeWidth={0.5} />);
      x += w * unit;
    });
    y += row.h + 2.4;
  });
  return {
    w: W,
    h: D,
    node: (
      <>
        <Defs>
          {L(p, "mbDeck", [[0, p.deck0], [1, p.deck1]])}
          {L(p, "mbPad", [[0, p.pad0], [1, p.pad1]])}
        </Defs>
        <Shadow w={W} h={D} r={12} dy={7} />
        <Rect x={0} y={9} width={W} height={D - 9} rx={12} fill={U(p, "mbDeck")} stroke={p.deckEdge} strokeWidth={1} />
        <Rect x={0} y={0} width={W} height={12} rx={5} fill={p.hinge} />
        <Line x1={14} y1={11.5} x2={W - 14} y2={11.5} stroke="#fff" strokeOpacity={0.3} strokeWidth={1} />
        <Line x1={11} y1={24} x2={11} y2={112} stroke={p.detail} strokeWidth={6} strokeDasharray="0.1 4.2" strokeLinecap="round" opacity={0.75} />
        <Line x1={W - 11} y1={24} x2={W - 11} y2={112} stroke={p.detail} strokeWidth={6} strokeDasharray="0.1 4.2" strokeLinecap="round" opacity={0.75} />
        {keys}
        <Rect x={100} y={130} width={110} height={76} rx={6} fill={U(p, "mbPad")} stroke={p.deckEdge} strokeWidth={1} />
      </>
    ),
  };
};

// 맥북 덮음: 매끈한 알루미늄 뚜껑 (로고 없이 은은한 광택만)
const macClosedArt = (p: Pal): Art => ({
  w: 310,
  h: 215,
  node: (
    <>
      <Defs>
        {L(p, "mcLid", [[0, p.deck0], [1, p.deck1]])}
        <RadialGradient id={`mcSheen${p.s}`} cx="0.3" cy="0.2" r="0.8">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Shadow w={310} h={215} r={12} dy={7} />
      <Rect x={0} y={0} width={310} height={215} rx={12} fill={U(p, "mcLid")} stroke={p.deckEdge} strokeWidth={1.2} />
      <Rect x={0} y={0} width={310} height={215} rx={12} fill={U(p, "mcSheen")} />
      <Rect x={0} y={0} width={310} height={9} rx={5} fill={p.hinge} opacity={0.85} />
      <Rect x={3} y={3} width={304} height={209} rx={10} fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={1} />
      <Circle cx={155} cy={112} r={13} fill="#fff" opacity={0.18} />
    </>
  ),
});

/** 노트북 받침대 위에 올라간 노트북: 받침대 앞 립이 노트북 아래로 보이고 그림자가 더 길어짐 */
const onStand = (host: Art, sp: Pal): Art => {
  const lip = 30;
  const W = host.w;
  const H = host.h + lip;
  const sw = W * 0.84;
  const sx = (W - sw) / 2;
  return {
    w: W,
    h: H,
    node: (
      <>
        <Defs>
          {L(sp, "osBody", [[0, sp.metal1], [1, sp.metal0]])}
          {L(sp, "osLip", [[0, sp.metal0], [1, sp.metal1]])}
        </Defs>
        <G transform={`translate(${sx} 14)`}>
          <Shadow w={sw} h={H - 14} r={14} />
        </G>
        <Rect x={sx} y={14} width={sw} height={H - 14} rx={14} fill={U(sp, "osBody")} stroke={sp.edge} strokeWidth={1.2} />
        <Rect x={sx} y={H - lip - 6} width={sw} height={lip + 6} rx={12} fill={U(sp, "osLip")} stroke={sp.edge} strokeWidth={1} />
        {[0.3, 0.45, 0.55, 0.7].map((f) => (
          <Rect key={f} x={W * f - 10} y={H - lip + 8} width={20} height={6} rx={3} fill={sp.detail} opacity={0.6} />
        ))}
        <Shadow w={W} h={host.h} r={12} dx={6} dy={16} />
        {host.node}
      </>
    ),
  };
};

// ── 액세서리 ─────────────────────────────────────────────
const lampArt = (p: Pal): Art => ({
  w: 200,
  h: 200,
  node: (
    <>
      <Defs>
        <RadialGradient id="lmGlow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#fde68a" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#fde68a" stopOpacity={0} />
        </RadialGradient>
        {L(p, "lmBase", [[0, p.body0], [1, p.body1]])}
        {L(p, "lmHead", [[0, p.metal1], [1, p.metal0]])}
      </Defs>
      <Circle cx={138} cy={62} r={100} fill="url(#lmGlow)" />
      <Circle cx={64} cy={152} r={54} fill="#000" opacity={0.12} />
      <Circle cx={60} cy={146} r={48} fill={U(p, "lmBase")} stroke={p.edge} />
      <Circle cx={60} cy={146} r={38} fill="none" stroke="#fff" strokeOpacity={0.15} strokeWidth={2} />
      <Path d="M60 146 L100 102 L138 64" stroke="#000" strokeOpacity={0.25} strokeWidth={14} strokeLinecap="round" fill="none" transform="translate(4 6)" />
      <Path d="M60 146 L100 102 L138 64" stroke={p.edge} strokeWidth={12} strokeLinecap="round" fill="none" />
      <Path d="M60 146 L100 102 L138 64" stroke={p.metal1} strokeWidth={7} strokeLinecap="round" fill="none" />
      <Circle cx={100} cy={102} r={8} fill={p.metal0} stroke={p.edge} />
      <G transform="rotate(-38 142 56)">
        <Rect x={116} y={34} width={54} height={44} rx={16} fill={U(p, "lmHead")} stroke={p.edge} strokeWidth={1.5} />
        <Rect x={124} y={42} width={38} height={28} rx={11} fill="#fff3bf" />
      </G>
    </>
  ),
});

const speakerArt = (p: Pal): Art => {
  const dots: ReactNode[] = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 12; c++) dots.push(<Circle key={`${r}-${c}`} cx={22 + c * 9.6} cy={149 + r * 10} r={2.3} fill={p.edge} opacity={0.6} />);
  return {
    w: 150,
    h: 180,
    node: (
      <>
        <Defs>
          {L(p, "spBody", [[0, p.body0], [1, p.body1]])}
          {L(p, "spTop", [[0, p.plate], [1, p.body1]])}
        </Defs>
        <Shadow w={150} h={180} r={14} />
        <Rect x={0} y={0} width={150} height={180} rx={14} fill={U(p, "spBody")} stroke={p.edge} strokeWidth={0.8} />
        <Rect x={6} y={6} width={138} height={168} rx={10} fill={U(p, "spTop")} stroke={p.edge} strokeWidth={0.8} strokeOpacity={0.5} />
        <Circle cx={75} cy={24} r={7} fill="#1f1f23" stroke={p.edge} />
        <Circle cx={75} cy={78} r={9} fill="none" stroke={p.detail} strokeWidth={1.5} />
        <Rect x={12} y={138} width={126} height={32} rx={7} fill={p.mod1} />
        {dots}
      </>
    ),
  };
};

const laptopStandArt = (p: Pal): Art => ({
  w: 260,
  h: 230,
  node: (
    <>
      <Defs>
        {L(p, "lsBody", [[0, p.metal1], [1, p.metal0]])}
        {L(p, "lsLip", [[0, p.metal0], [1, p.metal1]])}
      </Defs>
      <Shadow w={260} h={230} r={16} />
      <Rect x={0} y={0} width={260} height={230} rx={16} fill={U(p, "lsBody")} stroke={p.edge} strokeWidth={1.5} />
      <Rect x={44} y={34} width={172} height={140} rx={20} fill="#1a1a1f" opacity={0.45} />
      <Rect x={0} y={188} width={260} height={42} rx={16} fill={U(p, "lsLip")} />
      {[24, 130, 236].map((x) => (
        <Circle key={x} cx={x} cy={16} r={6} fill={p.detail} />
      ))}
      {[70, 110, 150, 190].map((x) => (
        <Rect key={x} x={x} y={200} width={26} height={8} rx={4} fill={p.detail} opacity={0.6} />
      ))}
    </>
  ),
});

// 노트북 수직 거치대 (위에서 본 5×18cm): 얇은 받침판 위 두 레일 사이 슬롯
const VS_W = 50;
const VS_H = 180;

function VerticalStandBody({ p, y0 }: { p: Pal; y0: number }) {
  return (
    <>
      <G transform={`translate(0 ${y0})`}>
        <Shadow w={VS_W} h={VS_H} r={9} dx={2} dy={4} />
      </G>
      <Rect x={0} y={y0} width={VS_W} height={VS_H} rx={9} fill={U(p, "vsBody")} stroke={p.edge} strokeWidth={1} />
      <Rect x={8} y={y0 + 10} width={11} height={VS_H - 20} rx={5} fill={U(p, "vsRail")} stroke={p.edge} strokeWidth={0.8} />
      <Rect x={31} y={y0 + 10} width={11} height={VS_H - 20} rx={5} fill={U(p, "vsRail")} stroke={p.edge} strokeWidth={0.8} />
      <Line x1={11} y1={y0 + 16} x2={11} y2={y0 + VS_H - 16} stroke="#fff" strokeOpacity={0.35} />
      <Line x1={34} y1={y0 + 16} x2={34} y2={y0 + VS_H - 16} stroke="#fff" strokeOpacity={0.35} />
    </>
  );
}

const vsDefs = (p: Pal) => [
  L(p, "vsBody", [[0, p.metal1], [1, p.metal0]]),
  L(p, "vsRail", [[0, p.metal0], [0.5, p.metal1], [1, p.metal0]], true),
];

const verticalStandArt = (p: Pal): Art => ({
  w: VS_W,
  h: VS_H,
  node: (
    <>
      <Defs>{vsDefs(p)}</Defs>
      <VerticalStandBody p={p} y0={0} />
      <Rect x={21} y={14} width={8} height={VS_H - 28} rx={3} fill="#111114" />
    </>
  ),
});

/** 수직 거치대에 덮은 노트북을 세로로 꽂은 모습: 위에서 보면 노트북 옆면(얇은 막대)이 레일 사이에 보임 */
const laptopInVerticalStand = (lp: Pal, sp: Pal, lengthMm: number): Art => {
  const H = Math.max(lengthMm, VS_H);
  const y0 = (H - VS_H) / 2;
  return {
    w: VS_W,
    h: H,
    node: (
      <>
        <Defs>
          {vsDefs(sp)}
          {L(lp, "lvEdge", [[0, lp.deck1], [0.5, lp.deck0], [1, lp.deck1]], true)}
        </Defs>
        {/* 세워진 노트북이 드리우는 긴 그림자 */}
        <Rect x={24} y={6} width={22} height={H - 2} rx={6} fill="#000" opacity={0.18} />
        <VerticalStandBody p={sp} y0={y0} />
        <Rect x={19} y={0} width={12} height={H} rx={4} fill={U(lp, "lvEdge")} stroke={lp.deckEdge} strokeWidth={0.8} />
        <Line x1={25} y1={4} x2={25} y2={H - 4} stroke={lp.hinge} strokeWidth={1.2} opacity={0.7} />
      </>
    ),
  };
};

const hubArt = (p: Pal): Art => ({
  w: 150,
  h: 40,
  node: (
    <>
      <Defs>{L(p, "hbBody", [[0, p.metal1], [1, p.metal0]])}</Defs>
      <Path d="M108 16 C126 16 128 24 150 24" stroke={p.body1} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Shadow w={112} h={40} r={8} dy={4} />
      <Rect x={0} y={0} width={112} height={40} rx={8} fill={U(p, "hbBody")} stroke={p.edge} />
      <Rect x={5} y={4} width={102} height={12} rx={5} fill="#fff" opacity={0.2} />
      {[10, 34, 58, 82].map((x) => (
        <Rect key={x} x={x} y={33} width={18} height={7} rx={2} fill="#0c0c0e" />
      ))}
      <Circle cx={98} cy={9} r={2.2} fill="#22c55e" />
    </>
  ),
});

const armArt = (p: Pal): Art => ({
  w: 110,
  h: 210,
  node: (
    <>
      <Defs>
        {L(p, "arPlate", [[0, p.body0], [1, p.body1]])}
        {L(p, "arClamp", [[0, p.metal0], [0.5, p.metal1], [1, p.metal0]], true)}
      </Defs>
      <Shadow w={50} h={26} r={4} dx={2} dy={4} />
      <Rect x={30} y={0} width={50} height={26} rx={4} fill={U(p, "arClamp")} stroke={p.edge} />
      <Path d="M55 20 L55 100 L55 162" stroke="#000" strokeOpacity={0.25} strokeWidth={18} strokeLinecap="round" fill="none" transform="translate(4 6)" />
      <Path d="M55 20 L55 100 L55 162" stroke={p.edge} strokeWidth={16} strokeLinecap="round" fill="none" />
      <Path d="M55 20 L55 100 L55 162" stroke={p.metal1} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Circle cx={55} cy={100} r={10} fill={p.metal0} stroke={p.edge} />
      <Rect x={12} y={158} width={86} height={46} rx={6} fill={U(p, "arPlate")} stroke={p.edge} />
      {[22, 88].flatMap((x) => [168, 194].map((y) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill={p.detail} />))}
    </>
  ),
});

const lightBarArt = (p: Pal): Art => ({
  w: 450,
  h: 120,
  node: (
    <>
      <Defs>
        <LinearGradient id="lbCone" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff1b8" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#fff1b8" stopOpacity={0} />
        </LinearGradient>
        {L(p, "lbBar", [[0, p.metal1], [1, p.metal0]])}
      </Defs>
      <Path d="M30 30 L420 30 L450 120 L0 120 Z" fill="url(#lbCone)" />
      <Shadow w={450} h={26} r={13} dy={5} />
      <Rect x={0} y={4} width={450} height={26} rx={13} fill={U(p, "lbBar")} stroke={p.edge} />
      <Rect x={195} y={0} width={60} height={12} rx={4} fill={p.body1} stroke={p.edge} />
    </>
  ),
});

const wristRestArt = (p: Pal): Art => ({
  w: 440,
  h: 90,
  node: (
    <>
      <Defs>{L(p, "wrBody", [[0, p.soft0], [1, p.soft1]])}</Defs>
      <Shadow w={440} h={90} r={38} dy={4} />
      <Rect x={0} y={0} width={440} height={90} rx={38} fill={U(p, "wrBody")} />
      <Rect x={30} y={10} width={380} height={30} rx={15} fill="#fff" opacity={0.1} />
      <Rect x={6} y={6} width={428} height={78} rx={33} fill="none" stroke={p.stitch} strokeWidth={1.5} strokeDasharray="7 5" />
    </>
  ),
});

const deskMatArt = (p: Pal): Art => ({
  w: 800,
  h: 400,
  node: (
    <>
      <Defs>{L(p, "dmBody", [[0, p.soft0], [1, p.soft1]])}</Defs>
      <Shadow w={800} h={400} r={16} dy={4} />
      <Rect x={0} y={0} width={800} height={400} rx={16} fill={U(p, "dmBody")} />
      <Rect x={0} y={0} width={800} height={130} rx={16} fill="#fff" opacity={0.05} />
      <Rect x={9} y={9} width={782} height={382} rx={11} fill="none" stroke={p.stitch} strokeWidth={1.6} strokeDasharray="8 6" />
    </>
  ),
});

// ── 데스크테리어 소품 ─────────────────────────────────────
const monitorRiserArt = (p: Pal): Art => ({
  w: 600,
  h: 220,
  node: (
    <>
      <Defs>{L(p, "mrTop", [[0, p.body0], [1, p.body1]])}</Defs>
      <Shadow w={600} h={220} r={10} />
      <Rect x={0} y={0} width={600} height={220} rx={10} fill={U(p, "mrTop")} stroke={p.edge} strokeWidth={1.2} />
      <Rect x={8} y={8} width={584} height={204} rx={6} fill="none" stroke="#fff" strokeOpacity={0.12} />
      <Rect x={0} y={200} width={600} height={20} rx={8} fill="#000" opacity={0.12} />
      <Rect x={250} y={206} width={100} height={8} rx={4} fill={p.detail} opacity={0.7} />
    </>
  ),
});

const speakerStandArt = (p: Pal): Art => ({
  w: 150,
  h: 180,
  node: (
    <>
      <Defs>{L(p, "ssTop", [[0, p.body0], [1, p.body1]])}</Defs>
      <Shadow w={150} h={180} r={8} />
      <Rect x={0} y={0} width={150} height={180} rx={8} fill={p.plate} stroke={p.edge} strokeWidth={1.2} />
      <Rect x={10} y={12} width={130} height={150} rx={6} fill={U(p, "ssTop")} stroke={p.edge} strokeWidth={1} />
      {[[30, 34], [120, 34], [30, 140], [120, 140]].map(([cx, cy]) => (
        <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={7} fill="#111" opacity={0.55} />
      ))}
      <Rect x={14} y={16} width={122} height={142} rx={5} fill="none" stroke="#fff" strokeOpacity={0.1} />
    </>
  ),
});

// ── 책상 세팅 확장 (위에서 본 그림) ─────────────────────────
const pcTowerArt = (p: Pal): Art => ({
  w: 210,
  h: 450,
  node: (
    <>
      <Defs>{L(p, "pcTop", [[0, p.body0], [1, p.body1]], true)}</Defs>
      <Shadow w={210} h={450} r={8} />
      <Rect x={0} y={0} width={210} height={450} rx={8} fill={U(p, "pcTop")} stroke={p.edge} strokeWidth={1.4} />
      {/* 왼쪽 유리 옆판(RGB) */}
      <Rect x={2} y={8} width={10} height={434} rx={3} fill="#7c3aed" opacity={0.55} />
      {/* 윗면 팬 두 개 */}
      {[120, 270].map((cy) => (
        <G key={cy}>
          <Circle cx={110} cy={cy} r={62} fill={p.detail} opacity={0.35} />
          <Circle cx={110} cy={cy} r={62} fill="none" stroke={p.edge} strokeWidth={2} />
          {[0, 1, 2, 3, 4].map((k) => (
            <Circle key={k} cx={110} cy={cy} r={14 + k * 11} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={1.5} />
          ))}
        </G>
      ))}
      {/* 앞면 전원·포트 */}
      <Rect x={60} y={420} width={90} height={14} rx={4} fill={p.detail} opacity={0.6} />
      <Circle cx={170} cy={427} r={6} fill="#38bdf8" opacity={0.85} />
    </>
  ),
});

const miniPcArt = (p: Pal): Art => ({
  w: 130,
  h: 130,
  node: (
    <>
      <Defs>{L(p, "mpTop", [[0, p.metal1], [1, p.metal0]])}</Defs>
      <Shadow w={130} h={130} r={22} />
      <Rect x={0} y={0} width={130} height={130} rx={22} fill={U(p, "mpTop")} stroke={p.edge} strokeWidth={1.2} />
      <Rect x={5} y={5} width={120} height={120} rx={18} fill="none" stroke="#fff" strokeOpacity={0.25} />
      <Circle cx={65} cy={65} r={11} fill={p.detail} opacity={0.25} />
    </>
  ),
});

const webcamArt = (p: Pal): Art => ({
  w: 100,
  h: 35,
  node: (
    <>
      <Defs>{L(p, "wcTop", [[0, p.body0], [1, p.body1]])}</Defs>
      <Shadow w={100} h={35} r={14} />
      <Rect x={0} y={4} width={100} height={27} rx={13} fill={U(p, "wcTop")} stroke={p.edge} strokeWidth={1.2} />
      <Rect x={38} y={0} width={24} height={8} rx={3} fill={p.detail} opacity={0.6} />
      <Circle cx={50} cy={24} r={7} fill="#0b0b0d" />
      <Circle cx={52} cy={22} r={2} fill="#60a5fa" opacity={0.8} />
    </>
  ),
});

const gamepadArt = (p: Pal): Art => ({
  w: 155,
  h: 105,
  node: (
    <>
      <Defs>{L(p, "gpBody", [[0, p.body0], [1, p.body1]])}</Defs>
      <Ellipse cx={80} cy={58} rx={74} ry={44} fill="#000" opacity={0.15} />
      <Path
        d="M30 18 Q77 6 125 18 Q150 26 152 66 Q154 98 132 100 Q116 101 106 80 L49 80 Q39 101 23 100 Q1 98 3 66 Q5 26 30 18 Z"
        fill={U(p, "gpBody")}
        stroke={p.edge}
        strokeWidth={1.4}
      />
      <Circle cx={45} cy={44} r={11} fill={p.detail} />
      <Circle cx={98} cy={66} r={10} fill={p.detail} />
      <Rect x={50} y={60} width={6} height={18} rx={1.5} fill={p.detail} />
      <Rect x={44} y={66} width={18} height={6} rx={1.5} fill={p.detail} />
      <Circle cx={118} cy={34} r={5} fill="#facc15" />
      <Circle cx={108} cy={44} r={5} fill="#3b82f6" />
      <Circle cx={128} cy={44} r={5} fill="#ef4444" />
      <Circle cx={118} cy={54} r={5} fill="#22c55e" />
      <Circle cx={77} cy={30} r={6} fill={p.detail} opacity={0.6} />
    </>
  ),
});

const numpadArt = (p: Pal): Art => ({
  w: 90,
  h: 130,
  node: (
    <>
      <Defs>{L(p, "npCase", [[0, p.body0], [1, p.body1]])}</Defs>
      <Shadow w={90} h={130} r={8} />
      <Rect x={0} y={0} width={90} height={130} rx={8} fill={U(p, "npCase")} stroke={p.edge} strokeWidth={1.2} />
      {[0, 1, 2, 3, 4].map((r) =>
        [0, 1, 2, 3].map((c) =>
          r === 4 && c === 1 ? null : (
            <Rect
              key={`${r}-${c}`}
              x={7 + c * 19.5}
              y={8 + r * 23.5}
              width={r === 4 && c === 0 ? 37 : 16}
              height={20}
              rx={3}
              fill={c === 3 || r === 0 ? p.mod0 : p.key0}
              stroke={p.keyEdge}
              strokeWidth={0.8}
            />
          ),
        ),
      )}
    </>
  ),
});

const drawingTabletArt = (p: Pal): Art => ({
  w: 350,
  h: 220,
  node: (
    <>
      <Shadow w={350} h={220} r={12} />
      <Rect x={0} y={0} width={350} height={220} rx={12} fill="#1c1c20" stroke="#0a0a0c" strokeWidth={1.4} />
      <Rect x={70} y={22} width={258} height={176} rx={4} fill="#26262b" stroke="#3f3f46" strokeWidth={1.2} />
      {[0, 1, 2, 3].map((k) => (
        <Rect key={k} x={22} y={40 + k * 36} width={28} height={26} rx={5} fill="#2f2f35" />
      ))}
      <Line x1={120} y1={180} x2={300} y2={60} stroke="#71717a" strokeWidth={6} strokeLinecap="round" />
      <Line x1={120} y1={180} x2={134} y2={171} stroke="#18181b" strokeWidth={6} strokeLinecap="round" />
    </>
  ),
});

const audioInterfaceArt = (p: Pal): Art => ({
  w: 180,
  h: 120,
  node: (
    <>
      <Defs>{L(p, "aiTop", [[0, p.body0], [1, p.body1]])}</Defs>
      <Shadow w={180} h={120} r={10} />
      <Rect x={0} y={0} width={180} height={120} rx={10} fill={U(p, "aiTop")} stroke={p.edge} strokeWidth={1.2} />
      <Circle cx={128} cy={58} r={30} fill={p.detail} />
      <Circle cx={128} cy={58} r={24} fill={p.metal1} opacity={0.5} />
      <Line x1={128} y1={58} x2={128} y2={38} stroke={p.detail} strokeWidth={3} />
      {[40, 72].map((cx) => (
        <G key={cx}>
          <Circle cx={cx} cy={48} r={13} fill={p.detail} />
          <Circle cx={cx} cy={48} r={14} fill="none" stroke="#22c55e" strokeOpacity={0.7} strokeWidth={2} />
        </G>
      ))}
      <Rect x={20} y={86} width={70} height={12} rx={3} fill={p.detail} opacity={0.6} />
    </>
  ),
});

const keyLightArt = (p: Pal): Art => ({
  w: 200,
  h: 200,
  node: (
    <>
      <Circle cx={100} cy={150} r={46} fill="#000" opacity={0.18} />
      <Circle cx={100} cy={146} r={44} fill={p.body1} stroke={p.edge} />
      <Circle cx={100} cy={146} r={8} fill={p.detail} />
      <Rect x={10} y={40} width={180} height={34} rx={6} fill={p.body0} stroke={p.edge} strokeWidth={1.4} />
      <Rect x={16} y={46} width={168} height={22} rx={4} fill="#fff7e6" opacity={0.9} />
      <Rect x={96} y={74} width={8} height={64} fill={p.detail} />
    </>
  ),
});

const moodLightArt = (p: Pal): Art => ({
  w: 100,
  h: 100,
  node: (
    <>
      <Defs>
        <RadialGradient id={`mlGlow${p.s}`} cx="0.5" cy="0.45" r="0.55">
          <Stop offset="0" stopColor="#fff7d6" />
          <Stop offset="0.7" stopColor="#ffd08a" />
          <Stop offset="1" stopColor="#e8a95a" />
        </RadialGradient>
      </Defs>
      <Circle cx={52} cy={54} r={46} fill="#000" opacity={0.16} />
      <Circle cx={50} cy={50} r={46} fill={p.body1} stroke={p.edge} />
      <Circle cx={50} cy={50} r={38} fill={`url(#mlGlow${p.s})`} />
    </>
  ),
});

const candleArt = (p: Pal): Art => ({
  w: 80,
  h: 80,
  node: (
    <>
      <Circle cx={42} cy={43} r={37} fill="#000" opacity={0.16} />
      <Circle cx={40} cy={40} r={37} fill="#d8cfc3" stroke="#a89c8d" />
      <Circle cx={40} cy={40} r={30} fill="#f3ebe0" />
      <Circle cx={40} cy={40} r={4} fill="#1f1f22" />
      <Circle cx={40} cy={37} r={5} fill="#ffb347" opacity={0.85} />
    </>
  ),
});

const deskShelfArt = (p: Pal): Art => ({
  w: 800,
  h: 220,
  node: (
    <>
      <Defs>{L(p, "dsTop", [[0, p.body0], [1, p.body1]])}</Defs>
      <Shadow w={800} h={220} r={8} />
      <Rect x={0} y={0} width={800} height={220} rx={8} fill={U(p, "dsTop")} stroke={p.edge} strokeWidth={1.4} />
      <Rect x={0} y={0} width={24} height={220} rx={6} fill="#000" opacity={0.18} />
      <Rect x={776} y={0} width={24} height={220} rx={6} fill="#000" opacity={0.18} />
      <Rect x={10} y={10} width={780} height={200} rx={6} fill="none" stroke="#fff" strokeOpacity={0.1} />
    </>
  ),
});

const penCupArt = (p: Pal): Art => ({
  w: 80,
  h: 80,
  node: (
    <>
      <Circle cx={42} cy={43} r={37} fill="#000" opacity={0.16} />
      <Circle cx={40} cy={40} r={37} fill={p.body0} stroke={p.edge} />
      <Circle cx={40} cy={40} r={31} fill={p.detail} opacity={0.75} />
      {[
        [30, 30, "#2563eb"],
        [48, 28, "#111827"],
        [52, 46, "#dc2626"],
        [32, 50, "#16a34a"],
        [42, 39, "#f59e0b"],
      ].map(([cx, cy, c]) => (
        <Circle key={String(c)} cx={cx as number} cy={cy as number} r={5} fill={c as string} stroke="#000" strokeOpacity={0.3} />
      ))}
    </>
  ),
});

const BOOK_COLORS = ["#7f1d1d", "#1e3a8a", "#e7e5e4", "#14532d", "#78350f", "#334155", "#a16207"];
const booksArt = (p: Pal): Art => ({
  w: 240,
  h: 180,
  node: (
    <>
      <Shadow w={240} h={180} r={4} />
      <Rect x={0} y={0} width={14} height={180} rx={3} fill={p.body1} stroke={p.edge} />
      <Rect x={226} y={0} width={14} height={180} rx={3} fill={p.body1} stroke={p.edge} />
      {BOOK_COLORS.map((c, k) => (
        <Rect key={c} x={16 + k * 30} y={8 + (k % 3) * 4} width={28} height={164 - (k % 3) * 8} rx={2} fill={c} stroke="#000" strokeOpacity={0.35} />
      ))}
    </>
  ),
});

const photoFrameArt = (p: Pal): Art => ({
  w: 150,
  h: 60,
  node: (
    <>
      <Shadow w={150} h={20} r={3} />
      <Rect x={0} y={4} width={150} height={16} rx={2} fill={p.body0} stroke={p.edge} strokeWidth={1.2} />
      <Path d="M60 20 L75 56 L90 20 Z" fill={p.body1} stroke={p.edge} />
    </>
  ),
});

const calendarArt = (p: Pal): Art => ({
  w: 180,
  h: 80,
  node: (
    <>
      <Shadow w={180} h={80} r={4} />
      <Rect x={0} y={0} width={180} height={80} rx={4} fill="#f5f5f4" stroke="#a8a29e" strokeWidth={1.2} />
      <Rect x={0} y={34} width={180} height={12} fill="#dc2626" />
      <Line x1={0} y1={40} x2={180} y2={40} stroke="#7f1d1d" strokeWidth={1} />
      {[20, 50, 80, 110, 140, 160].map((x) => (
        <Circle key={x} cx={x} cy={40} r={2.5} fill="#52525b" />
      ))}
    </>
  ),
});

const earbudsArt = (p: Pal): Art => ({
  w: 60,
  h: 50,
  node: (
    <>
      <Shadow w={60} h={50} r={20} />
      <Rect x={0} y={0} width={60} height={50} rx={20} fill={p.body0} stroke={p.edge} strokeWidth={1.2} />
      <Line x1={4} y1={20} x2={56} y2={20} stroke={p.edge} strokeWidth={1} />
      <Circle cx={30} cy={33} r={2} fill="#22c55e" />
    </>
  ),
});

const tumblerArt = (p: Pal): Art => ({
  w: 80,
  h: 80,
  node: (
    <>
      <Defs>{L(p, "tbLid", [[0, p.body0], [1, p.body1]])}</Defs>
      <Circle cx={42} cy={43} r={37} fill="#000" opacity={0.16} />
      <Circle cx={40} cy={40} r={37} fill={U(p, "tbLid")} stroke={p.edge} />
      <Circle cx={40} cy={40} r={27} fill="none" stroke={p.edge} strokeOpacity={0.7} strokeWidth={2} />
      <Rect x={34} y={14} width={12} height={8} rx={3} fill={p.detail} />
    </>
  ),
});

const deskFanArt = (p: Pal): Art => ({
  w: 180,
  h: 150,
  node: (
    <>
      <Ellipse cx={92} cy={112} rx={58} ry={34} fill="#000" opacity={0.15} />
      <Ellipse cx={90} cy={108} rx={56} ry={34} fill={p.body1} stroke={p.edge} />
      <Rect x={84} y={52} width={12} height={56} fill={p.detail} opacity={0.6} />
      <Ellipse cx={90} cy={40} rx={86} ry={34} fill={p.body0} stroke={p.edge} strokeWidth={1.4} />
      {[0, 1, 2, 3, 4].map((k) => (
        <Line key={k} x1={18 + k * 36} y1={18} x2={18 + k * 36} y2={62} stroke={p.edge} strokeOpacity={0.6} />
      ))}
      <Circle cx={90} cy={40} r={10} fill={p.detail} />
    </>
  ),
});

const wirelessChargerArt = (p: Pal): Art => ({
  w: 100,
  h: 100,
  node: (
    <>
      <Defs>{L(p, "wcBody", [[0, p.body0], [1, p.body1]])}</Defs>
      <Circle cx={51} cy={54} r={47} fill="#000" opacity={0.15} />
      <Circle cx={50} cy={50} r={46} fill={U(p, "wcBody")} stroke={p.edge} />
      <Circle cx={50} cy={50} r={32} fill="none" stroke={p.detail} strokeOpacity={0.5} strokeWidth={1.5} />
      <Circle cx={50} cy={50} r={6} fill="none" stroke={p.detail} strokeOpacity={0.5} />
      <Circle cx={50} cy={90} r={2} fill="#38bdf8" />
    </>
  ),
});

/** 기울어진 화면 기기(폰/태블릿): 위에서 보면 앞으로 기운 검은 화면면 */
function TiltedScreen({ x, y, w, h, r }: { x: number; y: number; w: number; h: number; r: number }) {
  return (
    <>
      <Rect x={x + 2} y={y + 5} width={w} height={h} rx={r} fill="#000" opacity={0.25} />
      <Rect x={x} y={y} width={w} height={h} rx={r} fill="#0b0b0d" stroke="#3f3f46" strokeWidth={1} />
      <Rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={r - 3} fill="url(#tsGlass)" />
      <Path d={`M${x + 6} ${y + h - 8} L${x + w * 0.55} ${y + 6} L${x + w * 0.75} ${y + 6} L${x + 14} ${y + h - 8} Z`} fill="#fff" opacity={0.06} />
    </>
  );
}
const glassDefs = (
  <LinearGradient key="tsGlass" id="tsGlass" x1="0" y1="0" x2="0" y2="1">
    <Stop offset="0" stopColor="#1f2937" />
    <Stop offset="1" stopColor="#0b0b0d" />
  </LinearGradient>
);

const phoneStandArt = (p: Pal): Art => ({
  w: 80,
  h: 100,
  node: (
    <>
      <Defs>
        {L(p, "psBase", [[0, p.metal1], [1, p.metal0]])}
        {glassDefs}
      </Defs>
      <Shadow w={80} h={100} r={10} dy={3} />
      <Rect x={0} y={0} width={80} height={100} rx={10} fill={U(p, "psBase")} stroke={p.edge} />
      <TiltedScreen x={6} y={10} w={68} h={62} r={10} />
      <Rect x={10} y={82} width={60} height={8} rx={4} fill={p.detail} opacity={0.5} />
    </>
  ),
});

const tabletStandArt = (p: Pal): Art => ({
  w: 180,
  h: 140,
  node: (
    <>
      <Defs>
        {L(p, "tbBase", [[0, p.metal1], [1, p.metal0]])}
        {glassDefs}
      </Defs>
      <Shadow w={180} h={140} r={12} dy={3} />
      <Rect x={20} y={60} width={140} height={80} rx={12} fill={U(p, "tbBase")} stroke={p.edge} />
      <TiltedScreen x={4} y={4} w={172} h={104} r={10} />
    </>
  ),
});

function Headband({ x0, x1, y, arch, p }: { x0: number; x1: number; y: number; arch: number; p: Pal }) {
  const d = `M${x0} ${y} Q${(x0 + x1) / 2} ${y - arch} ${x1} ${y}`;
  return (
    <>
      <Path d={d} stroke="#000" strokeOpacity={0.2} strokeWidth={16} fill="none" strokeLinecap="round" transform="translate(2 5)" />
      <Path d={d} stroke={p.edge} strokeWidth={15} fill="none" strokeLinecap="round" />
      <Path d={d} stroke={U(p, "hpBody")} strokeWidth={12} fill="none" strokeLinecap="round" />
    </>
  );
}

const headphonesArt = (p: Pal): Art => ({
  w: 170,
  h: 190,
  node: (
    <>
      <Defs>
        {L(p, "hpBody", [[0, p.body0], [1, p.body1]])}
        {L(p, "hpPad", [[0, p.soft0], [1, p.soft1]])}
      </Defs>
      <Headband x0={32} x1={138} y={90} arch={150} p={p} />
      {[32, 138].map((cx) => (
        <G key={cx}>
          <Rect x={cx - 29} y={72} width={58} height={96} rx={29} fill="#000" opacity={0.18} transform="translate(2 5)" />
          <Rect x={cx - 29} y={70} width={58} height={96} rx={29} fill={U(p, "hpBody")} stroke={p.edge} />
          <Rect x={cx - 20} y={80} width={40} height={76} rx={20} fill={U(p, "hpPad")} opacity={0.9} />
        </G>
      ))}
    </>
  ),
});

const headphoneStandArt = (p: Pal): Art => ({
  w: 130,
  h: 130,
  node: (
    <>
      <Defs>
        {L(p, "hsBase", [[0, p.metal1], [1, p.metal0]])}
        {L(p, "hpBody", [[0, p.body0], [1, p.body1]])}
      </Defs>
      <Circle cx={67} cy={70} r={60} fill="#000" opacity={0.14} />
      <Circle cx={65} cy={65} r={58} fill={U(p, "hsBase")} stroke={p.edge} />
      {/* 걸려 있는 헤드폰: 위에서 보면 헤드밴드와 양쪽 이어컵 */}
      <Rect x={22} y={52} width={86} height={24} rx={12} fill="#000" opacity={0.2} transform="translate(2 5)" />
      <Rect x={22} y={52} width={86} height={24} rx={12} fill={U(p, "hpBody")} stroke={p.edge} />
      {[14, 116].map((cx) => (
        <Rect key={cx} x={cx - 12} y={36} width={24} height={56} rx={11} fill={U(p, "hpBody")} stroke={p.edge} />
      ))}
    </>
  ),
});

const soundbarArt = (p: Pal): Art => {
  const dots: ReactNode[] = [];
  for (let c = 0; c < 40; c++) dots.push(<Circle key={c} cx={30 + c * 10} cy={48} r={2} fill={p.edge} opacity={0.55} />);
  return {
    w: 450,
    h: 80,
    node: (
      <>
        <Defs>{L(p, "sbBody", [[0, p.body0], [1, p.body1]])}</Defs>
        <Shadow w={450} h={80} r={30} dy={4} />
        <Rect x={0} y={0} width={450} height={80} rx={30} fill={U(p, "sbBody")} stroke={p.edge} />
        <Rect x={16} y={36} width={418} height={26} rx={13} fill={p.mod1} />
        {dots}
        <Circle cx={225} cy={18} r={3} fill="#22c55e" />
      </>
    ),
  };
};

const micArmArt = (p: Pal): Art => {
  const arm = "M34 18 L60 170 L96 330";
  return {
    w: 140,
    h: 450,
    node: (
      <>
        <Defs>
          {L(p, "maMic", [[0, p.body0], [1, p.body1]], true)}
          {L(p, "maClampM", [[0, p.metal0], [0.5, p.metal1], [1, p.metal0]], true)}
        </Defs>
        <Path d={arm} stroke="#000" strokeOpacity={0.22} strokeWidth={16} fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(4 7)" />
        <Rect x={10} y={0} width={48} height={32} rx={5} fill={U(p, "maClampM")} stroke={p.edge} />
        <Path d={arm} stroke={p.edge} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={arm} stroke={p.body0} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={60} cy={170} r={10} fill={p.metal0} stroke={p.edge} />
        {/* 마이크 본체 */}
        <Rect x={72} y={318} width={60} height={124} rx={30} fill="#000" opacity={0.22} transform="translate(3 6)" />
        <Rect x={72} y={318} width={60} height={124} rx={30} fill={U(p, "maMic")} stroke={p.edge} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Line key={i} x1={80} y1={336 + i * 9} x2={124} y2={336 + i * 9} stroke={p.edge} strokeOpacity={0.5} />
        ))}
      </>
    ),
  };
};

const deskOrganizerArt = (p: Pal): Art => ({
  w: 240,
  h: 120,
  node: (
    <>
      <Defs>{L(p, "doBody", [[0, p.body0], [1, p.body1]])}</Defs>
      <Shadow w={240} h={120} r={10} />
      <Rect x={0} y={0} width={240} height={120} rx={10} fill={U(p, "doBody")} stroke={p.edge} />
      {[[8, 8, 70, 104], [84, 8, 72, 104], [162, 8, 70, 104]].map(([x, y, w, h]) => (
        <Rect key={x} x={x} y={y} width={w} height={h} rx={6} fill={p.plate} stroke={p.edge} strokeOpacity={0.5} />
      ))}
      {/* 펜들 */}
      {[["#2563eb", 20, 22], ["#dc2626", 44, 30], ["#111827", 28, 58], ["#16a34a", 54, 70], ["#f59e0b", 22, 88]].map(([c, x, y]) => (
        <G key={String(c)}>
          <Circle cx={Number(x)} cy={Number(y)} r={6} fill={String(c)} />
          <Circle cx={Number(x)} cy={Number(y)} r={2} fill="#fff" opacity={0.6} />
        </G>
      ))}
      {/* 포스트잇 */}
      <Rect x={94} y={20} width={52} height={52} rx={2} fill="#fde047" />
      <Rect x={98} y={24} width={52} height={52} rx={2} fill="#fef08a" />
      <Line x1={106} y1={40} x2={140} y2={40} stroke="#a16207" strokeOpacity={0.4} />
      <Line x1={106} y1={50} x2={134} y2={50} stroke="#a16207" strokeOpacity={0.4} />
      {/* 클립/명함 */}
      <Rect x={172} y={20} width={50} height={30} rx={3} fill="#fafafa" stroke="#d4d4d8" />
      <Rect x={176} y={60} width={40} height={40} rx={20} fill="none" stroke="#a1a1aa" strokeWidth={3} />
    </>
  ),
});

const powerStripArt = (p: Pal): Art => ({
  w: 340,
  h: 60,
  node: (
    <>
      <Defs>{L(p, "pwBody", [[0, p.body0], [1, p.body1]])}</Defs>
      <Path d="M320 30 C335 30 332 45 340 45" stroke={p.body1} strokeWidth={8} fill="none" strokeLinecap="round" />
      <Shadow w={322} h={60} r={14} dy={3} />
      <Rect x={0} y={0} width={322} height={60} rx={14} fill={U(p, "pwBody")} stroke={p.edge} />
      <Rect x={16} y={20} width={22} height={20} rx={4} fill="#dc2626" />
      {[80, 150, 220, 290].map((cx) => (
        <G key={cx}>
          <Circle cx={cx} cy={30} r={20} fill={p.plate} stroke={p.edge} />
          <Circle cx={cx - 7} cy={30} r={3.2} fill="#18181b" />
          <Circle cx={cx + 7} cy={30} r={3.2} fill="#18181b" />
        </G>
      ))}
    </>
  ),
});

const trackpadArt = (p: Pal): Art => ({
  w: 160,
  h: 115,
  node: (
    <>
      <Defs>
        {L(p, "tpBody", [[0, p.metal1], [1, p.metal0]])}
        <RadialGradient id={`tpSheen${p.s}`} cx="0.3" cy="0.2" r="0.8">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Shadow w={160} h={115} r={12} dy={3} />
      <Rect x={0} y={0} width={160} height={115} rx={12} fill={U(p, "tpBody")} stroke={p.edge} />
      <Rect x={0} y={0} width={160} height={115} rx={12} fill={U(p, "tpSheen")} />
    </>
  ),
});

const macroPadArt = (p: Pal): Art => {
  const colors = ["#6366f1", "#ec4899", "#22c55e", "#f59e0b", "#06b6d4", "#ef4444", "#a855f7", "#14b8a6", "#f97316", "#3b82f6", "#84cc16", "#e11d48", "#0ea5e9", "#eab308", "#8b5cf6"];
  return {
    w: 120,
    h: 80,
    node: (
      <>
        <Defs>{L(p, "mpBody", [[0, p.body0], [1, p.body1]])}</Defs>
        <Shadow w={120} h={80} r={8} dy={3} />
        <Rect x={0} y={0} width={120} height={80} rx={8} fill={U(p, "mpBody")} stroke={p.edge} />
        {colors.map((c, i) => (
          <G key={i}>
            <Rect x={8 + (i % 5) * 21.5} y={8 + Math.floor(i / 5) * 21.5} width={18} height={18} rx={3} fill="#0b0b0d" />
            <Rect x={11 + (i % 5) * 21.5} y={11 + Math.floor(i / 5) * 21.5} width={12} height={12} rx={2} fill={c} opacity={0.75} />
          </G>
        ))}
      </>
    ),
  };
};

const mousePadArt = (p: Pal): Art => ({
  w: 300,
  h: 250,
  node: (
    <>
      <Defs>{L(p, "mpdBody", [[0, p.soft0], [1, p.soft1]])}</Defs>
      <Shadow w={300} h={250} r={14} dy={3} />
      <Rect x={0} y={0} width={300} height={250} rx={14} fill={U(p, "mpdBody")} />
      <Rect x={6} y={6} width={288} height={238} rx={10} fill="none" stroke={p.stitch} strokeWidth={1.4} strokeDasharray="6 5" />
    </>
  ),
});

const plantArt = (p: Pal): Art => {
  const leaves: [number, number, number, number][] = [
    [-20, 30, 18, 44], [35, 38, 16, 40], [100, 34, 17, 42], [160, 30, 16, 44], [215, 36, 18, 40], [280, 32, 16, 42], [320, 24, 12, 30], [60, 20, 12, 30], [190, 18, 12, 28],
  ];
  return {
    w: 130,
    h: 130,
    node: (
      <>
        <Defs>
          {L(p, "plPot", [[0, p.body0], [1, p.body1]])}
          <LinearGradient id="plLeaf" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#86c06c" />
            <Stop offset="1" stopColor="#2f6b2c" />
          </LinearGradient>
        </Defs>
        <Circle cx={68} cy={70} r={50} fill="#000" opacity={0.16} />
        <Circle cx={65} cy={65} r={48} fill={U(p, "plPot")} stroke={p.edge} />
        <Circle cx={65} cy={65} r={40} fill="#3f2a1d" />
        {leaves.map(([deg, len, rx, ry], i) => (
          <G key={i} transform={`rotate(${deg} 65 65)`}>
            <Ellipse cx={65} cy={65 - len} rx={rx} ry={ry} fill="#000" opacity={0.12} transform="translate(2 3)" />
            <Ellipse cx={65} cy={65 - len} rx={rx} ry={ry} fill="url(#plLeaf)" stroke="#1f4d1d" strokeWidth={0.8} />
            <Line x1={65} y1={65 - len + ry * 0.8} x2={65} y2={65 - len - ry * 0.8} stroke="#1f4d1d" strokeOpacity={0.6} />
          </G>
        ))}
      </>
    ),
  };
};

const mugArt = (p: Pal): Art => ({
  w: 120,
  h: 90,
  node: (
    <>
      <Defs>
        {L(p, "mgBody", [[0, p.body0], [1, p.body1]])}
        <RadialGradient id="mgCoffee" cx="0.4" cy="0.4" r="0.6">
          <Stop offset="0" stopColor="#8a5a3a" />
          <Stop offset="1" stopColor="#3b2213" />
        </RadialGradient>
      </Defs>
      <Circle cx={48} cy={50} r={40} fill="#000" opacity={0.16} />
      <Rect x={78} y={32} width={36} height={26} rx={13} fill="none" stroke={p.edge} strokeWidth={11} />
      <Rect x={78} y={32} width={36} height={26} rx={13} fill="none" stroke={U(p, "mgBody")} strokeWidth={8} />
      <Circle cx={45} cy={45} r={40} fill={U(p, "mgBody")} stroke={p.edge} />
      <Circle cx={45} cy={45} r={33} fill="url(#mgCoffee)" />
      <Circle cx={45} cy={45} r={33} fill="none" stroke="#c89b6d" strokeOpacity={0.5} strokeWidth={2} />
    </>
  ),
});

const clockArt = (p: Pal): Art => ({
  w: 140,
  h: 50,
  node: (
    <>
      <Defs>{L(p, "ckBody", [[0, p.body0], [1, p.body1]])}</Defs>
      <Shadow w={140} h={50} r={8} dy={3} />
      <Rect x={0} y={0} width={140} height={50} rx={8} fill={U(p, "ckBody")} stroke={p.edge} />
      <Rect x={8} y={8} width={124} height={34} rx={4} fill="#0b0b0d" />
      <SvgText x={70} y={34} fontSize={24} fontWeight="bold" fill="#f5f5f4" textAnchor="middle" letterSpacing={2}>
        12:34
      </SvgText>
    </>
  ),
});

const humidifierArt = (p: Pal): Art => ({
  w: 100,
  h: 100,
  node: (
    <>
      <Defs>
        {L(p, "hmBody", [[0, p.body0], [1, p.body1]])}
        <RadialGradient id="hmMist" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.7} />
          <Stop offset="1" stopColor="#e0f2fe" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={52} cy={54} r={44} fill="#000" opacity={0.16} />
      <Circle cx={50} cy={50} r={43} fill={U(p, "hmBody")} stroke={p.edge} />
      <Circle cx={50} cy={50} r={30} fill="none" stroke={p.edge} strokeOpacity={0.35} />
      <Circle cx={50} cy={50} r={9} fill="#18181b" />
      <Circle cx={50} cy={50} r={26} fill="url(#hmMist)" />
      <Circle cx={50} cy={86} r={2.5} fill="#38bdf8" />
    </>
  ),
});

const notebookPadArt = (p: Pal): Art => {
  const lines: ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    lines.push(<Line key={`l${i}`} x1={14} y1={30 + i * 18} x2={140} y2={30 + i * 18} stroke="#cbd5e1" />);
    lines.push(<Line key={`r${i}`} x1={160} y1={30 + i * 18} x2={286} y2={30 + i * 18} stroke="#cbd5e1" />);
  }
  return {
    w: 300,
    h: 210,
    node: (
      <>
        <Shadow w={300} h={210} r={6} dy={3} />
        <Rect x={0} y={0} width={300} height={210} rx={6} fill={p.body1} stroke={p.edge} />
        <Rect x={5} y={4} width={143} height={202} rx={3} fill="#fafaf9" />
        <Rect x={152} y={4} width={143} height={202} rx={3} fill="#fafaf9" />
        {lines}
        <Rect x={146} y={4} width={8} height={202} fill="#000" opacity={0.08} />
        {/* 펜 */}
        <G transform="rotate(-28 220 120)">
          <Rect x={150} y={114} width={140} height={10} rx={5} fill="#000" opacity={0.2} transform="translate(2 4)" />
          <Rect x={150} y={114} width={140} height={10} rx={5} fill="#1f2937" />
          <Rect x={278} y={114} width={12} height={10} rx={3} fill="#d4d4d8" />
        </G>
      </>
    ),
  };
};

const ART: Record<Exclude<ProductKind, "monitor" | "ultrawide" | "photo" | "generic">, (p: Pal) => Art> = {
  keyboard: (p) => keyboardArt(p, false),
  "keyboard-full": (p) => keyboardArt(p, true),
  mouse: (p) => mouseArt(p, false),
  "mouse-vertical": (p) => mouseArt(p, true),
  laptop: laptopArt,
  "macbook-open": macOpenArt,
  "macbook-closed": macClosedArt,
  lamp: lampArt,
  speaker: speakerArt,
  "laptop-stand": laptopStandArt,
  "laptop-vertical-stand": verticalStandArt,
  "usbc-hub": hubArt,
  "monitor-arm": armArt,
  "light-bar": lightBarArt,
  "wrist-rest": wristRestArt,
  "desk-mat": deskMatArt,
  "monitor-riser": monitorRiserArt,
  "speaker-stand": speakerStandArt,
  "pc-tower": pcTowerArt,
  "mini-pc": miniPcArt,
  webcam: webcamArt,
  gamepad: gamepadArt,
  numpad: numpadArt,
  "drawing-tablet": drawingTabletArt,
  "audio-interface": audioInterfaceArt,
  "key-light": keyLightArt,
  "mood-light": moodLightArt,
  candle: candleArt,
  "desk-shelf": deskShelfArt,
  "pen-cup": penCupArt,
  books: booksArt,
  "photo-frame": photoFrameArt,
  calendar: calendarArt,
  earbuds: earbudsArt,
  tumbler: tumblerArt,
  "desk-fan": deskFanArt,
  "wireless-charger": wirelessChargerArt,
  "phone-stand": phoneStandArt,
  "tablet-stand": tabletStandArt,
  headphones: headphonesArt,
  "headphone-stand": headphoneStandArt,
  soundbar: soundbarArt,
  "mic-arm": micArmArt,
  "desk-organizer": deskOrganizerArt,
  "power-strip": powerStripArt,
  trackpad: trackpadArt,
  "macro-pad": macroPadArt,
  "mouse-pad": mousePadArt,
  plant: plantArt,
  mug: mugArt,
  clock: clockArt,
  humidifier: humidifierArt,
  "notebook-pad": notebookPadArt,
};

type MountInfo = Pick<Mount, "kind" | "color">;

/** 사진이 없거나 못 불러온 사용자 제품: 이름이 적힌 상자 (위에서 본 무난한 모양) */
const genericArt = (p: Pal, label: string, dims?: { w: number; h: number }): Art => {
  const W = Math.max(40, (dims?.w ?? 20) * 10);
  const H = Math.max(40, (dims?.h ?? 20) * 10);
  const fs = Math.max(14, Math.min(W / Math.max(4, label.length * 0.9), H * 0.35, 60));
  return {
    w: W,
    h: H,
    node: (
      <>
        <Defs>{L(p, "gnBody", [[0, p.body0], [1, p.body1]])}</Defs>
        <Shadow w={W} h={H} r={Math.min(W, H) * 0.08} />
        <Rect x={0} y={0} width={W} height={H} rx={Math.min(W, H) * 0.08} fill={U(p, "gnBody")} stroke={p.edge} strokeWidth={2} />
        <Rect x={6} y={6} width={W - 12} height={H - 12} rx={Math.min(W, H) * 0.06} fill="none" stroke={p.detail} strokeOpacity={0.4} strokeDasharray="8 6" />
        <SvgText x={W / 2} y={H / 2 + fs * 0.35} fontSize={fs} fontWeight="bold" fill={p.s === "w" ? "#3f3f46" : "#e4e4e7"} textAnchor="middle">
          {label.length > 14 ? `${label.slice(0, 13)}…` : label}
        </SvgText>
      </>
    ),
  };
};

function buildArt(kind: ProductKind, p: Pal, mount?: MountInfo, dims?: { w: number; h: number }, label = ""): Art {
  if (kind === "photo" || kind === "generic") return genericArt(p, label, dims);
  if (kind === "monitor" || kind === "ultrawide") {
    const ultra = kind === "ultrawide";
    const w = (dims?.w ?? (ultra ? 81.5 : 61.5)) * 10;
    const d = (dims?.h ?? (ultra ? 24 : 22)) * 10;
    return monitorArt(p, w, d, ultra, mount?.kind === "monitor-arm" ? PAL[mount.color] : undefined);
  }
  if (mount?.kind === "laptop-vertical-stand") return laptopInVerticalStand(p, PAL[mount.color], (dims?.h ?? 31) * 10);
  const art = ART[kind](p);
  return mount?.kind === "laptop-stand" ? onStand(art, PAL[mount.color]) : art;
}

interface Props {
  kind: ProductKind;
  width: number | string;
  height: number | string;
  /** "meet": 비율 유지(카드/목록), "none": 주어진 박스 크기에 꽉 채움(캔버스, 사용자가 크기를 바꾼 경우) */
  fit?: "meet" | "none";
  color?: ItemColor;
  /** 결합된 액세서리(모니터 암, 노트북 받침대) */
  mount?: MountInfo;
  /** 실제 크기(cm). 모니터는 이 비율로 스탠드/베젤을 다시 그림 */
  dims?: { w: number; h: number };
  /** 사용자 제품(photo)의 사진 주소 */
  imageUrl?: string;
  /** 사진이 없을 때 상자에 적을 이름 */
  label?: string;
}

/** 사용자 제품 사진. 비율을 유지해 박스 안에 맞추고, 못 불러오면 이름 상자로 대체 */
function PhotoImage({ uri, width, height, fallback }: { uri: string; width: number | string; height: number | string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  // 배경을 지운 사진: 흰 카드 없이 제품 모양 그대로, 그림자도 제품 윤곽을 따라
  if (isCutout(uri)) {
    return (
      <View style={{ width: width as number, height: height as number }}>
        <Image
          source={{ uri }}
          style={[{ width: "100%", height: "100%" }, Platform.OS === "web" ? ({ filter: "drop-shadow(2px 4px 4px rgba(0,0,0,0.45))" } as object) : null]}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }
  return (
    <View
      style={{
        width: width as number,
        height: height as number,
        borderRadius: 6,
        overflow: "hidden",
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 6,
        shadowOffset: { width: 2, height: 4 },
      }}
    >
      <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="contain" onError={() => setFailed(true)} />
    </View>
  );
}

export function ProductImage({ kind, width, height, fit = "meet", color, mount, dims, imageUrl, label }: Props) {
  const art = buildArt(kind, PAL[color ?? defaultColor(kind)], mount, dims, label);
  const svg = (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${art.w} ${art.h}`}
      preserveAspectRatio={fit === "none" ? "none" : "xMidYMid meet"}
      style={{ overflow: "visible" }}
    >
      {art.node}
    </Svg>
  );
  if (kind === "photo" && imageUrl) return <PhotoImage uri={imageUrl} width={width} height={height} fallback={svg} />;
  return svg;
}
