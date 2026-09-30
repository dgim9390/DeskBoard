import { useId } from "react";
import Svg, { Defs, Ellipse, G, Mask, RadialGradient, Rect, Stop } from "react-native-svg";
import type { DeskItem, Lighting } from "@/store/useDeskStore";

/**
 * 조명 분위기. 저녁/밤에는 책상 위에 어둠을 깔고, 빛을 내는 제품 주변만 어둠을 뚫어(마스크)
 * 빛 웅덩이를 만든 뒤 빛 색을 살짝 입힌다. 낮에는 아무것도 그리지 않음.
 */

const COLORS = {
  warm: "#ffcf87", // 램프
  white: "#fff1d6", // 라이트바
  cool: "#8fb6ff", // 화면
  mist: "#d6f0ff", // 가습기
  purple: "#b39dff", // 매크로패드 키 조명
} as const;
type LightColor = keyof typeof COLORS;

interface Light {
  cx: number; // cm (책상 좌상단 기준)
  cy: number;
  rx: number; // cm
  ry: number;
  rot: number; // deg
  color: LightColor;
  /** 어둠을 얼마나 걷어낼지 (0~1) */
  power: number;
}

interface ModeSpec {
  dark: string;
  darkness: number;
  tint?: { color: string; opacity: number };
  glow: number; // 빛 색 입히는 세기
  /** 캔버스(방) 바탕색 */
  room: string;
}

export const LIGHTING: Record<Lighting, ModeSpec & { label: string; icon: "sunny-outline" | "partly-sunny-outline" | "moon-outline" }> = {
  day: { label: "낮", icon: "sunny-outline", dark: "#000", darkness: 0, glow: 0, room: "#18181b" },
  evening: { label: "저녁", icon: "partly-sunny-outline", dark: "#1a0f14", darkness: 0.42, tint: { color: "#ff8a3d", opacity: 0.08 }, glow: 0.55, room: "#16110f" },
  night: { label: "밤", icon: "moon-outline", dark: "#04050b", darkness: 0.8, glow: 1, room: "#07080c" },
};

/** 제품 하나가 내는 빛 (제품 기준 좌표 → 회전 → 책상 좌표) */
function lightsOf(i: DeskItem): Light[] {
  const w = i.width;
  const h = i.height;
  const cx = i.x + w / 2;
  const cy = i.y + h / 2;
  const r = (i.rotation * Math.PI) / 180;
  const at = (ox: number, oy: number, rx: number, ry: number, color: LightColor, power: number): Light => ({
    cx: cx + ox * Math.cos(r) - oy * Math.sin(r),
    cy: cy + ox * Math.sin(r) + oy * Math.cos(r),
    rx,
    ry,
    rot: i.rotation,
    color,
    power,
  });

  switch (i.kind) {
    case "lamp": {
      // 램프 머리(그림의 오른쪽 위) 아래로 떨어지는 넓은 빛
      const R = Math.max(30, w * 1.8);
      return [at(w * 0.21, -h * 0.22, R, R, "warm", 1)];
    }
    case "light-bar":
      // 모니터 앞쪽(사용자 쪽) 책상을 넓게 비춤
      return [at(0, h * 0.5 + 14, Math.max(24, w * 0.62), 20, "white", 1)];
    case "monitor":
    case "ultrawide":
      // 화면(그림의 68% 지점)에서 사용자 쪽으로 번지는 푸른 빛
      return [at(0, h * 0.18 + 10, w * 0.5, 13, "cool", 0.55)];
    case "macbook-open":
    case "laptop":
      if (i.mount?.kind === "laptop-vertical-stand") return []; // 덮어서 세워 둔 상태
      return [at(0, -h * 0.15, w * 0.55, h * 0.5, "cool", 0.4)];
    case "humidifier":
      return [at(0, 0, 14, 14, "mist", 0.6)];
    case "clock":
      return [at(0, 0, 9, 7, "warm", 0.35)];
    case "tablet-stand":
      return [at(0, 0, 12, 10, "cool", 0.35)];
    case "phone-stand":
      return [at(0, 0, 7, 7, "cool", 0.3)];
    case "macro-pad":
      return [at(0, 0, 9, 7, "purple", 0.35)];
    default:
      return [];
  }
}

interface Props {
  items: DeskItem[];
  lighting: Lighting;
  /** cm → px */
  scale: number;
  width: number; // px
  height: number; // px
}

export function LightingOverlay({ items, lighting, scale, width, height }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const mode = LIGHTING[lighting];
  if (lighting === "day" || !mode || scale <= 0) return null;

  const lights = items.flatMap(lightsOf);
  const px = (l: Light) => ({ cx: l.cx * scale, cy: l.cy * scale, rx: l.rx * scale, ry: l.ry * scale, t: `rotate(${l.rot} ${l.cx * scale} ${l.cy * scale})` });

  return (
    <Svg pointerEvents="none" width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }}>
      <Defs>
        {/* 마스크용: 가운데 검정(=어둠 제거) → 가장자리 투명 */}
        <RadialGradient id={`cut${uid}`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#000" stopOpacity={1} />
          <Stop offset="0.45" stopColor="#000" stopOpacity={0.75} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </RadialGradient>
        {(Object.keys(COLORS) as LightColor[]).map((c) => (
          <RadialGradient key={c} id={`glow${c}${uid}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={COLORS[c]} stopOpacity={0.5} />
            <Stop offset="0.5" stopColor={COLORS[c]} stopOpacity={0.18} />
            <Stop offset="1" stopColor={COLORS[c]} stopOpacity={0} />
          </RadialGradient>
        ))}
        <Mask id={`mask${uid}`} x={0} y={0} width={width} height={height} maskUnits="userSpaceOnUse">
          <Rect x={0} y={0} width={width} height={height} fill="#fff" />
          {lights.map((l, k) => {
            const p = px(l);
            return <Ellipse key={k} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} transform={p.t} fill={`url(#cut${uid})`} opacity={l.power} />;
          })}
        </Mask>
      </Defs>

      {/* 어둠 (빛 웅덩이는 뚫림) */}
      <Rect x={0} y={0} width={width} height={height} fill={mode.dark} opacity={mode.darkness} mask={`url(#mask${uid})`} />
      {mode.tint && <Rect x={0} y={0} width={width} height={height} fill={mode.tint.color} opacity={mode.tint.opacity} />}

      {/* 빛 색 */}
      <G opacity={mode.glow}>
        {lights.map((l, k) => {
          const p = px(l);
          return <Ellipse key={k} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} transform={p.t} fill={`url(#glow${l.color}${uid})`} opacity={l.power} />;
        })}
      </G>
    </Svg>
  );
}
