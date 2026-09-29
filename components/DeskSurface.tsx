import { memo } from "react";
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

// 시드 고정 난수 → 렌더마다 나뭇결이 바뀌지 않게
const rng = (() => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
})();

const GRAIN = Array.from({ length: 70 }, () => {
  const y = rng() * 500;
  const d = () => (rng() - 0.5) * 26;
  const dark = rng() > 0.35;
  return {
    d: `M0 ${y} C 280 ${y + d()}, 640 ${y + d()}, 1000 ${y + d()}`,
    stroke: dark ? "#6b4423" : "#fff1d6",
    opacity: dark ? 0.1 + rng() * 0.14 : 0.06 + rng() * 0.08,
    width: 0.6 + rng() * 2,
  };
});

/** 원목(오크) 책상 상판. 크기는 부모가 정하고 SVG가 늘어남 */
export const DeskSurface = memo(function DeskSurface({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 1000 500" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#c9a17a" />
          <Stop offset="0.5" stopColor="#b98e63" />
          <Stop offset="1" stopColor="#c59d72" />
        </LinearGradient>
        <RadialGradient id="vig" cx="0.5" cy="0.45" r="0.75">
          <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.28} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={1000} height={500} fill="url(#wood)" />
      {GRAIN.map((g, i) => (
        <Path key={i} d={g.d} stroke={g.stroke} strokeOpacity={g.opacity} strokeWidth={g.width} fill="none" />
      ))}
      <Rect x={0} y={0} width={1000} height={500} fill="url(#vig)" />
      <Rect x={2} y={2} width={996} height={496} fill="none" stroke="#fff" strokeOpacity={0.18} strokeWidth={3} />
      <Rect x={0} y={0} width={1000} height={500} fill="none" stroke="#5b3a1e" strokeWidth={6} />
    </Svg>
  );
});
