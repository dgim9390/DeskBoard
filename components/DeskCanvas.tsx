import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { exportNodeAsPng } from "@/lib/exportImage";
import { toast } from "@/lib/toast";
import { useDeskStore, type Lighting } from "@/store/useDeskStore";
import { CenterGuides, useGuideState } from "./CenterGuides";
import { Desk3DView } from "./Desk3DView";
import { DeskSurface } from "./DeskSurface";
import { DraggableItem } from "./DraggableItem";
import { LIGHTING, LightingOverlay } from "./LightingOverlay";

const LIGHTING_ORDER: Lighting[] = ["day", "evening", "night"];

const PAD = 30; // 캔버스 가장자리 여백 (치수 표시 공간)

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/** 캔버스 위 반투명 알약 모양 도구 버튼 */
function ToolButton({ icon, text, label, onPress, disabled, active, danger }: { icon?: IconName; text?: string; label: string; onPress: () => void; disabled?: boolean; active?: boolean; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      hitSlop={4}
      className={`h-8 items-center justify-center rounded-full ${text ? "px-2.5" : "w-8"} ${active ? "bg-zinc-100" : "active:bg-white/10"} ${disabled ? "opacity-30" : ""}`}
    >
      {icon && <Ionicons name={icon} size={16} color={active ? "#18181b" : danger ? "#fca5a5" : "#e4e4e7"} />}
      {text && <Text className={`text-xs font-bold ${active ? "text-zinc-900" : "text-zinc-200"}`}>{text}</Text>}
    </Pressable>
  );
}

const pill = "absolute top-2 flex-row items-center rounded-full border border-white/10 bg-black/55 p-0.5";

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** 책상 비우기 (확인 창은 부모가 띄움) */
  onRequestClear: () => void;
}

export function DeskCanvas({ selectedId, onSelect, onRequestClear }: Props) {
  const router = useRouter();
  const desk = useDeskStore((s) => s.desk);
  const deskItems = useDeskStore((s) => s.deskItems);
  const setLighting = useDeskStore((s) => s.setLighting);
  const canUndo = useDeskStore((s) => s.past.length > 0);
  const canRedo = useDeskStore((s) => s.future.length > 0);
  const undo = useDeskStore((s) => s.undo);
  const redo = useDeskStore((s) => s.redo);
  const lighting = desk.lighting ?? "day";
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [exporting, setExporting] = useState(false);
  const [view3d, setView3d] = useState(false);
  const rootRef = useRef<View>(null);
  const guides = useGuideState();

  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout);

  // 책상 전체가 화면에 들어오도록 cm → px 축척 계산
  const scale = size.width > 0 ? Math.max(0.1, Math.min((size.width - PAD * 2) / desk.width, (size.height - PAD * 2) / desk.depth)) : 0;
  const dw = desk.width * scale;
  const dd = desk.depth * scale;
  const left = (size.width - dw) / 2;
  const top = (size.height - dd) / 2;
  const room = LIGHTING[lighting].room;

  const saveImage = async () => {
    if (Platform.OS !== "web") return toast("이미지 저장은 웹과 맥 앱에서 쓸 수 있어요");
    onSelect(null); // 선택 테두리·핸들은 빼고 찍기
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 150)); // 도구 모음이 사라진 화면이 그려질 때까지
      await exportNodeAsPng(rootRef.current, { backgroundColor: room, fileName: `deskterior-${desk.width}x${desk.depth}` });
      toast("이미지를 저장했어요", { icon: "image-outline" });
    } catch {
      toast("이미지를 만들지 못했어요. 다시 시도해 주세요");
    } finally {
      setExporting(false);
    }
  };

  return (
    <View ref={rootRef} onLayout={onLayout} className="flex-1 overflow-hidden rounded-2xl border border-zinc-800" style={{ backgroundColor: room }}>
      {view3d ? (
        <Desk3DView selectedId={selectedId} onSelect={onSelect} hideUi={exporting} />
      ) : (
        <>
          {/* 방 조명: 책상 뒤로 은은하게 밝고 가장자리는 어둡게 */}
          <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="roomSpot" cx="0.5" cy="0.42" r="0.85">
                <Stop offset="0" stopColor="#fff" stopOpacity={lighting === "night" ? 0.025 : 0.055} />
                <Stop offset="0.45" stopColor="#fff" stopOpacity={0.015} />
                <Stop offset="0.75" stopColor="#000" stopOpacity={0.08} />
                <Stop offset="1" stopColor="#000" stopOpacity={0.22} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#roomSpot)" />
          </Svg>

          {/* 바닥 탭 → 선택 해제 */}
          <Pressable style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} onPress={() => onSelect(null)} />

          {scale > 0 && (
            <>
              <Text pointerEvents="none" className="absolute text-center text-[11px] text-zinc-500" style={{ left, width: dw, top: top - 20 }}>
                {desk.width} cm
              </Text>
              <Text
                pointerEvents="none"
                className="absolute text-center text-[11px] text-zinc-500"
                style={{ left: left - 40, width: 60, top: top + dd / 2 - 8, transform: [{ rotate: "-90deg" }] }}
              >
                {desk.depth} cm
              </Text>

              {/* 책상 상판 (좌표계 원점 = 책상 좌상단) */}
              <View style={{ position: "absolute", left, top, width: dw, height: dd }}>
                {/* 책상이 바닥에서 살짝 떠 보이는 그림자 (겹친 반투명 판으로 부드럽게) */}
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={{ position: "absolute", left: -2 - i * 3, top: 5 + i * 2, width: dw + 4 + i * 6, height: dd + 2 + i * 4, borderRadius: 4 + i * 3, backgroundColor: "rgba(0,0,0,0.14)" }}
                  />
                ))}
                <Pressable style={{ position: "absolute", left: 0, top: 0, width: dw, height: dd, borderRadius: 3, overflow: "hidden" }} onPress={() => onSelect(null)}>
                  <DeskSurface width={dw} height={dd} material={desk.material} />
                </Pressable>
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

              {/* 빈 책상: 시작 안내 */}
              {deskItems.length === 0 && !exporting && (
                <View pointerEvents="box-none" style={{ position: "absolute", left, top, width: dw, height: dd, alignItems: "center", justifyContent: "center" }}>
                  <View className="items-center rounded-2xl bg-black/55 px-5 py-4">
                    <Text className="text-sm font-semibold text-white">빈 책상이에요</Text>
                    <Text className="mt-1 text-xs text-zinc-300">아래에서 장비를 추가하거나, 완성된 셋업으로 시작해 보세요</Text>
                    <Pressable
                      onPress={() => router.navigate("/recommend")}
                      accessibilityRole="button"
                      accessibilityLabel="추천 셋업으로 시작하기"
                      className="mt-3 flex-row items-center rounded-full bg-indigo-500 px-4 py-2 active:bg-indigo-600"
                    >
                      <Ionicons name="sparkles" size={14} color="#fff" />
                      <Text className="ml-1.5 text-xs font-semibold text-white">추천 셋업으로 시작하기</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* 드래그 중에만 보이는 중앙 가이드 (제품 위에 표시, 터치 통과) */}
              <CenterGuides left={left} top={top} width={dw} height={dd} g={guides} />
            </>
          )}
        </>
      )}

      {exporting ? (
        // 저장 이미지에만 들어가는 표시
        <View pointerEvents="none" className="absolute bottom-3 right-4 flex-row items-center">
          <Text className="text-xs font-bold tracking-wide text-white/70">Deskterior</Text>
          <Text className="ml-2 text-[11px] text-white/45">
            {desk.width}×{desk.depth}cm · 장비 {deskItems.length}개
          </Text>
        </View>
      ) : (
        <>
          {/* 왼쪽 위: 되돌리기 · 다시하기 · 이미지 저장 · 비우기 */}
          <View className={`${pill} left-2`}>
            <ToolButton icon="arrow-undo" label="되돌리기" onPress={undo} disabled={!canUndo} />
            <ToolButton icon="arrow-redo" label="다시하기" onPress={redo} disabled={!canRedo} />
            <View className="mx-0.5 h-4 w-px bg-white/15" />
            <ToolButton icon="image-outline" label="이미지로 저장" onPress={saveImage} disabled={deskItems.length === 0} />
            <ToolButton icon="trash-outline" label="책상 비우기" onPress={onRequestClear} disabled={deskItems.length === 0} danger />
          </View>

          {/* 오른쪽 위: 2D/3D 보기 · 조명 분위기 (낮 · 저녁 · 밤) */}
          <View className={`${pill} right-2`}>
            <ToolButton text="3D" label={view3d ? "위에서 보기(2D)로 전환" : "3D로 보기"} onPress={() => setView3d((v) => !v)} active={view3d} />
            <View className="mx-0.5 h-4 w-px bg-white/15" />
            {LIGHTING_ORDER.map((l) => (
              <ToolButton key={l} icon={LIGHTING[l].icon} label={`조명 ${LIGHTING[l].label}`} onPress={() => setLighting(l)} active={l === lighting} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}
