import { useEffect } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { clampInto, normalizeDeg } from "@/lib/geometry";
import { MIN_ITEM_CM, useDeskStore, type DeskItem } from "@/store/useDeskStore";
import { SNAP_PX, type GuideState } from "./CenterGuides";
import { DEFAULT_KIND, ProductImage } from "./ProductImage";

const D2R = Math.PI / 180;
const HANDLE = 26; // 핸들 지름
const STEM = 26; // 회전 핸들이 아이템 윗변에서 떨어진 거리

interface Props {
  item: DeskItem;
  scale: number; // cm → px
  originX: number; // 책상 좌상단의 캔버스 내 위치(px)
  originY: number;
  deskWidthPx: number;
  deskHeightPx: number;
  selected: boolean;
  onSelect: (id: string | null) => void;
  guides: GuideState;
}

export function DraggableItem({ item, scale, originX, originY, deskWidthPx, deskHeightPx, selected, onSelect, guides }: Props) {
  const updateItemTransform = useDeskStore((s) => s.updateItemTransform);
  const removeItem = useDeskStore((s) => s.removeItem);

  // 제스처 중에는 px 단위 shared value로 움직이고, 손을 떼면 cm로 환산해 스토어에 한 번만 저장
  const x = useSharedValue(item.x * scale); // 회전 전 사각형의 좌상단 (책상 기준 px)
  const y = useSharedValue(item.y * scale);
  const w = useSharedValue(item.width * scale);
  const h = useSharedValue(item.height * scale);
  const rot = useSharedValue(item.rotation);
  const active = useSharedValue(false);

  useEffect(() => {
    x.value = item.x * scale;
    y.value = item.y * scale;
    w.value = item.width * scale;
    h.value = item.height * scale;
    rot.value = item.rotation;
  }, [item.x, item.y, item.width, item.height, item.rotation, scale, x, y, w, h, rot]);

  const commit = (px: number, py: number, pw: number, ph: number, r: number) => {
    const id = updateItemTransform(item.id, { x: px / scale, y: py / scale, width: pw / scale, height: ph / scale, rotation: r });
    if (id !== item.id) onSelect(id); // 모니터 암/받침대를 짝 위에 놓아 결합되면 결합된 장비를 선택
  };

  // ── 이동 ──────────────────────────────────────────────
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
      active.value = true;
      guides.active.value = 1;
      runOnJS(onSelect)(item.id);
    })
    .onUpdate((e) => {
      const p = clampInto(startX.value + e.translationX, startY.value + e.translationY, w.value, h.value, rot.value, deskWidthPx, deskHeightPx);
      // 제품 중심이 책상 중앙선 가까이 오면 중앙에 스냅
      const snapX = Math.abs(p.x + w.value / 2 - deskWidthPx / 2) < SNAP_PX;
      const snapY = Math.abs(p.y + h.value / 2 - deskHeightPx / 2) < SNAP_PX;
      const s = clampInto(snapX ? deskWidthPx / 2 - w.value / 2 : p.x, snapY ? deskHeightPx / 2 - h.value / 2 : p.y, w.value, h.value, rot.value, deskWidthPx, deskHeightPx);
      guides.snapX.value = snapX ? 1 : 0;
      guides.snapY.value = snapY ? 1 : 0;
      x.value = s.x;
      y.value = s.y;
    })
    .onEnd(() => {
      runOnJS(commit)(x.value, y.value, w.value, h.value, rot.value);
    })
    .onFinalize(() => {
      active.value = false;
      guides.active.value = 0;
      guides.snapX.value = 0;
      guides.snapY.value = 0;
    });

  const tap = Gesture.Tap().onEnd((_e, success) => {
    if (success) runOnJS(onSelect)(item.id);
  });

  const gesture = Gesture.Exclusive(pan, tap);

  // ── 크기 조절: 우하단 핸들, 반대쪽(좌상단) 모서리 고정 ─────────
  const tlx = useSharedValue(0);
  const tly = useSharedValue(0);
  const brx = useSharedValue(0);
  const bry = useSharedValue(0);
  const minPx = MIN_ITEM_CM * scale;
  const maxPx = Math.max(deskWidthPx, deskHeightPx);

  const resize = Gesture.Pan()
    .onStart(() => {
      const r = rot.value * D2R;
      const c = Math.cos(r);
      const s = Math.sin(r);
      const cx = x.value + w.value / 2;
      const cy = y.value + h.value / 2;
      const hw = w.value / 2;
      const hh = h.value / 2;
      tlx.value = cx + -hw * c - -hh * s;
      tly.value = cy + -hw * s + -hh * c;
      brx.value = cx + hw * c - hh * s;
      bry.value = cy + hw * s + hh * c;
      active.value = true;
    })
    .onUpdate((e) => {
      const r = rot.value * D2R;
      const c = Math.cos(r);
      const s = Math.sin(r);
      const vx = brx.value + e.translationX - tlx.value;
      const vy = bry.value + e.translationY - tly.value;
      // 회전 좌표계(아이템 로컬)로 변환
      const nw = Math.min(Math.max(vx * c + vy * s, minPx), maxPx);
      const nh = Math.min(Math.max(-vx * s + vy * c, minPx), maxPx);
      const ncx = tlx.value + (nw / 2) * c - (nh / 2) * s;
      const ncy = tly.value + (nw / 2) * s + (nh / 2) * c;
      w.value = nw;
      h.value = nh;
      x.value = ncx - nw / 2;
      y.value = ncy - nh / 2;
    })
    .onEnd(() => {
      runOnJS(commit)(x.value, y.value, w.value, h.value, rot.value);
    })
    .onFinalize(() => {
      active.value = false;
    });

  // ── 회전: 윗쪽 핸들, 중심 기준 ─────────────────────────
  const rcx = useSharedValue(0);
  const rcy = useSharedValue(0);
  const rhx = useSharedValue(0);
  const rhy = useSharedValue(0);

  const rotate = Gesture.Pan()
    .onStart(() => {
      const r = rot.value * D2R;
      const d = h.value / 2 + STEM;
      rcx.value = x.value + w.value / 2;
      rcy.value = y.value + h.value / 2;
      rhx.value = rcx.value + d * Math.sin(r);
      rhy.value = rcy.value - d * Math.cos(r);
      active.value = true;
    })
    .onUpdate((e) => {
      const fx = rhx.value + e.translationX;
      const fy = rhy.value + e.translationY;
      let ang = Math.atan2(fy - rcy.value, fx - rcx.value) / D2R + 90;
      const snap = Math.round(ang / 45) * 45; // 45° 단위로 살짝 달라붙음
      if (Math.abs(ang - snap) < 4) ang = snap;
      rot.value = normalizeDeg(ang);
    })
    .onEnd(() => {
      runOnJS(commit)(x.value, y.value, w.value, h.value, rot.value);
    })
    .onFinalize(() => {
      active.value = false;
    });

  // ✕ 버튼: 부모 제스처(Pan/Tap)와 충돌하지 않도록 자체 GestureDetector로 처리
  const removeTap = Gesture.Tap().onEnd((_e, success) => {
    if (success) {
      runOnJS(onSelect)(null);
      runOnJS(removeItem)(item.id);
    }
  });
  const showBadge = item.width * scale >= 44 && item.height * scale >= 28;

  const itemStyle = useAnimatedStyle(() => ({
    width: w.value,
    height: h.value,
    transform: [
      { translateX: originX + x.value },
      { translateY: originY + y.value },
      { rotate: `${rot.value}deg` },
      { scale: active.value ? 1.02 : 1 },
    ],
    zIndex: active.value ? 100 : 1, // 평소엔 배열 순서(앞/뒤 배치)대로 그려짐
    opacity: active.value ? 0.94 : 1,
  }));

  // 핸들 위치: 회전을 반영해 아이템 모서리/윗변에 붙임 (아이템과 형제 요소라 제스처가 겹치지 않음)
  const resizeStyle = useAnimatedStyle(() => {
    const r = rot.value * D2R;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const cx = x.value + w.value / 2;
    const cy = y.value + h.value / 2;
    const hw = w.value / 2;
    const hh = h.value / 2;
    return {
      transform: [
        { translateX: originX + cx + hw * c - hh * s - HANDLE / 2 },
        { translateY: originY + cy + hw * s + hh * c - HANDLE / 2 },
      ],
    };
  });

  const rotateStyle = useAnimatedStyle(() => {
    const r = rot.value * D2R;
    const d = h.value / 2 + STEM;
    const cx = x.value + w.value / 2;
    const cy = y.value + h.value / 2;
    return {
      transform: [
        { translateX: originX + cx + d * Math.sin(r) - HANDLE / 2 },
        { translateY: originY + cy - d * Math.cos(r) - HANDLE / 2 },
      ],
    };
  });

  const handleBase = {
    position: "absolute" as const,
    left: 0,
    top: 0,
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 200,
  };

  return (
    <>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, itemStyle]}>
          <ProductImage
            kind={item.kind ?? DEFAULT_KIND[item.category]}
            width="100%"
            height="100%"
            fit="none"
            color={item.color}
            mount={item.mount}
            dims={{ w: item.width, h: item.height }}
            imageUrl={item.imageUrl}
            label={item.name}
          />
          {selected && (
            <View
              pointerEvents="none"
              style={{ position: "absolute", left: -3, top: -3, right: -3, bottom: -3, borderWidth: 2, borderColor: "#fff", borderRadius: 6 }}
            />
          )}
          {selected && showBadge && (
            <GestureDetector gesture={removeTap}>
              <View
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="삭제"
                className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-red-500"
              >
                <Ionicons name="close" size={14} color="white" />
              </View>
            </GestureDetector>
          )}
        </Animated.View>
      </GestureDetector>

      {selected && (
        <>
          <GestureDetector gesture={rotate}>
            <Animated.View
              accessibilityLabel="회전"
              style={[handleBase, { backgroundColor: "#6366f1", borderWidth: 2, borderColor: "#fff" }, rotateStyle]}
            >
              <Ionicons name="refresh" size={14} color="white" />
            </Animated.View>
          </GestureDetector>
          <GestureDetector gesture={resize}>
            <Animated.View
              accessibilityLabel="크기 조절"
              style={[handleBase, { backgroundColor: "#fff", borderWidth: 2, borderColor: "#6366f1" }, resizeStyle]}
            >
              <Ionicons name="resize" size={13} color="#6366f1" />
            </Animated.View>
          </GestureDetector>
        </>
      )}
    </>
  );
}
