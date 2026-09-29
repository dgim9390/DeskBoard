import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";

/** 드래그 중인 제품이 공유하는 가이드 상태: active(드래그 중), snapX/snapY(중앙선에 붙음) */
export interface GuideState {
  active: SharedValue<number>;
  snapX: SharedValue<number>;
  snapY: SharedValue<number>;
}

export function useGuideState(): GuideState {
  return { active: useSharedValue(0), snapX: useSharedValue(0), snapY: useSharedValue(0) };
}

/** 픽셀 단위 스냅 거리: 제품 중심이 책상 중앙선에서 이만큼 안에 들어오면 붙음 */
export const SNAP_PX = 8;

const ABS = { position: "absolute", left: 0, top: 0 } as const;

/** 제품을 드래그하는 동안에만 보이는 책상 중앙 점선. 스냅된 축은 강조색 실선 */
export function CenterGuides({ left, top, width, height, g }: { left: number; top: number; width: number; height: number; g: GuideState }) {
  const base = useAnimatedStyle(() => ({ opacity: withTiming(g.active.value, { duration: 120 }) }));
  const vHi = useAnimatedStyle(() => ({ opacity: withTiming(g.snapX.value, { duration: 80 }) }));
  const hHi = useAnimatedStyle(() => ({ opacity: withTiming(g.snapY.value, { duration: 80 }) }));
  const cx = width / 2;
  const cy = height / 2;

  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left, top, width, height }, base]}>
      <Svg width={width} height={height} style={ABS}>
        <Line x1={cx} y1={0} x2={cx} y2={height} stroke="#fff" strokeOpacity={0.7} strokeWidth={1} strokeDasharray="6 5" />
        <Line x1={0} y1={cy} x2={width} y2={cy} stroke="#fff" strokeOpacity={0.7} strokeWidth={1} strokeDasharray="6 5" />
        <Circle cx={cx} cy={cy} r={3} fill="#fff" fillOpacity={0.8} />
      </Svg>
      <Animated.View style={[ABS, { width, height }, vHi]}>
        <Svg width={width} height={height}>
          <Line x1={cx} y1={0} x2={cx} y2={height} stroke="#818cf8" strokeWidth={2} />
        </Svg>
      </Animated.View>
      <Animated.View style={[ABS, { width, height }, hHi]}>
        <Svg width={width} height={height}>
          <Line x1={0} y1={cy} x2={width} y2={cy} stroke="#818cf8" strokeWidth={2} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
