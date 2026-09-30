import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDeskStore, type Lighting } from "@/store/useDeskStore";
import { CenterGuides, useGuideState } from "./CenterGuides";
import { DeskSurface } from "./DeskSurface";
import { DraggableItem } from "./DraggableItem";
import { LIGHTING, LightingOverlay } from "./LightingOverlay";

const LIGHTING_ORDER: Lighting[] = ["day", "evening", "night"];

const PAD = 30; // 캔버스 가장자리 여백 (치수 표시 공간)

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function DeskCanvas({ selectedId, onSelect }: Props) {
  const desk = useDeskStore((s) => s.desk);
  const deskItems = useDeskStore((s) => s.deskItems);
  const setLighting = useDeskStore((s) => s.setLighting);
  const lighting = desk.lighting ?? "day";
  const [size, setSize] = useState({ width: 0, height: 0 });
  const guides = useGuideState();

  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout);

  // 책상 전체가 화면에 들어오도록 cm → px 축척 계산
  const scale = size.width > 0 ? Math.max(0.1, Math.min((size.width - PAD * 2) / desk.width, (size.height - PAD * 2) / desk.depth)) : 0;
  const dw = desk.width * scale;
  const dd = desk.depth * scale;
  const left = (size.width - dw) / 2;
  const top = (size.height - dd) / 2;

  return (
    <View onLayout={onLayout} className="flex-1 overflow-hidden rounded-2xl border border-zinc-800" style={{ backgroundColor: LIGHTING[lighting].room }}>
      {/* 바닥 탭 → 선택 해제 */}
      <Pressable style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} onPress={() => onSelect(null)} />

      {scale > 0 && (
        <>
          <Text
            pointerEvents="none"
            className="absolute text-center text-[11px] text-zinc-500"
            style={{ left, width: dw, top: top - 20 }}
          >
            {desk.width} cm
          </Text>
          <Text
            pointerEvents="none"
            className="absolute text-center text-[11px] text-zinc-500"
            style={{ left: left - 40, width: 60, top: top + dd / 2 - 8, transform: [{ rotate: "-90deg" }] }}
          >
            {desk.depth} cm
          </Text>

          {/* 책상 상판 + 아이템 (좌표계 원점 = 책상 좌상단) */}
          <View style={{ position: "absolute", left, top, width: dw, height: dd }}>
            <View
              style={{
                position: "absolute",
                left: -2,
                top: 4,
                width: dw + 4,
                height: dd + 1,
                borderRadius: 4,
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
            />
            <Pressable style={{ position: "absolute", left: 0, top: 0, width: dw, height: dd, borderRadius: 3, overflow: "hidden" }} onPress={() => onSelect(null)}>
              <DeskSurface width={dw} height={dd} material={desk.material} />
            </Pressable>

            {deskItems.length === 0 && (
              <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
                <Text className="text-sm font-semibold text-black/40">아래에서 장비를 추가해 보세요</Text>
              </View>
            )}

          </View>

          {/* 아이템 레이어: 캔버스 전체를 덮어서 책상 밖에 걸친 핸들도 터치 가능 (빈 곳 터치는 통과) */}
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            {deskItems.map((item) => (
              <DraggableItem
                key={item.id}
                item={item}
                scale={scale}
                originX={left}
                originY={top}
                deskWidthPx={dw}
                deskHeightPx={dd}
                selected={selectedId === item.id}
                onSelect={onSelect}
                guides={guides}
              />
            ))}
            {/* 조명 분위기: 제품 위(zIndex 1~100), 선택 핸들 아래(200) */}
            <View pointerEvents="none" style={{ position: "absolute", left, top, width: dw, height: dd, zIndex: 150 }}>
              <LightingOverlay items={deskItems} lighting={lighting} scale={scale} width={dw} height={dd} />
            </View>
          </View>

          {/* 드래그 중에만 보이는 중앙 가이드 (제품 위에 표시, 터치 통과) */}
          <CenterGuides left={left} top={top} width={dw} height={dd} g={guides} />
        </>
      )}

      {/* 조명 분위기 전환 (낮 · 저녁 · 밤) */}
      <View className="absolute right-2 top-2 flex-row rounded-full border border-zinc-700/70 bg-black/50 p-0.5">
        {LIGHTING_ORDER.map((l) => {
          const on = l === lighting;
          return (
            <Pressable
              key={l}
              onPress={() => setLighting(l)}
              accessibilityRole="button"
              accessibilityLabel={`조명 ${LIGHTING[l].label}`}
              accessibilityState={{ selected: on }}
              hitSlop={4}
              className={`h-7 w-7 items-center justify-center rounded-full ${on ? "bg-zinc-100" : ""}`}
            >
              <Ionicons name={LIGHTING[l].icon} size={15} color={on ? "#18181b" : "#d4d4d8"} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
