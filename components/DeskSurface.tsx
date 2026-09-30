import { memo } from "react";
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import type { DeskMaterial } from "@/store/useDeskStore";

// 시드 고정 난수 → 렌더마다 결·질감이 바뀌지 않게
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const rngGrain = seeded(7);
const GRAIN = Array.from({ length: 70 }, () => {
  const y = rngGrain() * 500;
  const d = () => (rngGrain() - 0.5) * 26;
  return {
    d: `M0 ${y} C 280 ${y + d()}, 640 ${y + d()}, 1000 ${y + d()}`,
    dark: rngGrain() > 0.35,
    k: rngGrain(), // 진하기 편차
    width: 0.6 + rngGrain() * 2,
  };
});

const rngSpeck = seeded(11);
const SPECKS = Array.from({ length: 420 }, () => ({ x: rngSpeck() * 1000, y: rngSpeck() * 500, r: 0.6 + rngSpeck() * 1.8, dark: rngSpeck() > 0.45 }));

interface MaterialSpec {
  label: string;
  /** 설정 화면 동그라미 색 */
  swatch: string;
  base: [string, string, string];
  edge: string;
  grain?: { dark: string; light: string; darkOp: number; lightOp: number };
  speck?: { dark: string; light: string; op: number };
  /** 단색 상판의 은은한 광택 */
  sheen?: number;
}

export const MATERIALS: Record<DeskMaterial, MaterialSpec> = {
  oak: {
    label: "오크",
    swatch: "#c19669",
    base: ["#c9a17a", "#b98e63", "#c59d72"],
    edge: "#5b3a1e",
    grain: { dark: "#6b4423", light: "#fff1d6", darkOp: 0.24, lightOp: 0.14 },
  },
  walnut: {
    label: "월넛",
    swatch: "#6a462c",
    base: ["#7b5335", "#5f3e27", "#724b30"],
    edge: "#2e1d10",
    grain: { dark: "#24140a", light: "#d9a877", darkOp: 0.34, lightOp: 0.12 },
  },
  maple: {
    label: "메이플",
    swatch: "#e3cda6",
    base: ["#ecd9b8", "#dcc49c", "#e6d0a9"],
    edge: "#a88a5e",
    grain: { dark: "#a0784a", light: "#fffaf0", darkOp: 0.18, lightOp: 0.2 },
  },
  white: {
    label: "화이트",
    swatch: "#f0f0ed",
    base: ["#f3f3f1", "#e8e8e5", "#f0f0ed"],
    edge: "#b9b9b4",
    speck: { dark: "#000", light: "#fff", op: 0.035 },
    sheen: 0.45,
  },
  black: {
    label: "블랙",
    swatch: "#27272b",
    base: ["#2e2e33", "#232327", "#2b2b30"],
    edge: "#0c0c0e",
    speck: { dark: "#000", light: "#fff", op: 0.04 },
    sheen: 0.1,
  },
  concrete: {
    label: "콘크리트",
    swatch: "#9a9893",
    base: ["#a6a49f", "#93918c", "#9f9d98"],
    edge: "#5f5d59",
    speck: { dark: "#3f3d3a", light: "#e4e2dd", op: 0.16 },
    sheen: 0.08,
  },
};

export const MATERIAL_ORDER: DeskMaterial[] = ["oak", "walnut", "maple", "white", "black", "concrete"];

/** 책상 상판. 크기는 부모가 정하고 SVG가 늘어남 */
export const DeskSurface = memo(function DeskSurface({ width, height, material = "oak" }: { width: number; height: number; material?: DeskMaterial }) {
  const m = MATERIALS[material] ?? MATERIALS.oak;
  const id = (name: string) => `${name}-${material}`; // 웹에서 재질이 다른 상판끼리 id가 섞이지 않게
  return (
    <Svg width={width} height={height} viewBox="0 0 1000 500" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id("base")} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={m.base[0]} />
          <Stop offset="0.5" stopColor={m.base[1]} />
          <Stop offset="1" stopColor={m.base[2]} />
        </LinearGradient>
        <LinearGradient id={id("sheen")} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity={m.sheen ?? 0} />
          <Stop offset="0.45" stopColor="#fff" stopOpacity={0} />
          <Stop offset="1" stopColor="#fff" stopOpacity={(m.sheen ?? 0) * 0.3} />
        </LinearGradient>
        <RadialGradient id={id("vig")} cx="0.5" cy="0.45" r="0.75">
          <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.28} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={1000} height={500} fill={`url(#${id("base")})`} />
      {m.grain &&
        GRAIN.map((g, i) => (
          <Path
            key={i}
            d={g.d}
            stroke={g.dark ? m.grain!.dark : m.grain!.light}
            strokeOpacity={(g.dark ? m.grain!.darkOp : m.grain!.lightOp) * (0.45 + g.k * 0.55)}
            strokeWidth={g.width}
            fill="none"
          />
        ))}
      {m.speck && SPECKS.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.dark ? m.speck!.dark : m.speck!.light} opacity={m.speck!.op} />)}
      {m.sheen ? <Rect x={0} y={0} width={1000} height={500} fill={`url(#${id("sheen")})`} /> : null}
      <Rect x={0} y={0} width={1000} height={500} fill={`url(#${id("vig")})`} />
      <Rect x={2} y={2} width={996} height={496} fill="none" stroke="#fff" strokeOpacity={0.18} strokeWidth={3} />
      <Rect x={0} y={0} width={1000} height={500} fill="none" stroke={m.edge} strokeWidth={6} />
    </Svg>
  );
});
