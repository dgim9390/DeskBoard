import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DESK_LIMITS, useDeskStore, type ChairKind, type FloorKind } from "@/store/useDeskStore";
import { MATERIAL_ORDER, MATERIALS } from "./DeskSurface";
import { SizeFields } from "./SizeFields";

const WALLS = [
  { value: "#cfcac2", label: "웜 화이트" },
  { value: "#e8e8e4", label: "화이트" },
  { value: "#a3a7ab", label: "그레이" },
  { value: "#aab6a2", label: "세이지" },
  { value: "#cbb99e", label: "베이지" },
  { value: "#4d586b", label: "네이비" },
];
const FLOORS: { value: FloorKind; label: string }[] = [
  { value: "wood", label: "원목" },
  { value: "light", label: "밝은 원목" },
  { value: "dark", label: "어두운 원목" },
  { value: "tile", label: "타일" },
  { value: "carpet", label: "카펫" },
];
const CHAIRS: { value: ChairKind | undefined; label: string }[] = [
  { value: undefined, label: "없음" },
  { value: "office", label: "사무용" },
  { value: "gaming", label: "게이밍" },
];

function Pick({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      className={`mr-1.5 rounded-lg border px-2.5 py-1 ${on ? "border-indigo-400 bg-indigo-500/20" : "border-zinc-700 active:bg-zinc-800"}`}
    >
      <Text className={`text-xs ${on ? "font-semibold text-indigo-200" : "text-zinc-300"}`}>{label}</Text>
    </Pressable>
  );
}

function Swatch({ color, label, on, onPress }: { color: string; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      hitSlop={4}
      className="mr-1.5 h-7 w-7 items-center justify-center rounded-full"
      style={{ borderWidth: 2, borderColor: on ? "#818cf8" : "transparent" }}
    >
      <View
        className="h-5 w-5 rounded-full"
        style={{
          backgroundColor: color,
          borderWidth: 1,
          borderColor: "#52525b",
        }}
      />
    </Pressable>
  );
}

/** 선택된 장비가 없을 때: 평소엔 한 줄 요약, 누르면 책상 크기 · 상판 · 방(3D) 설정 */
export function DeskBar() {
  const desk = useDeskStore((s) => s.desk);
  const setDeskSize = useDeskStore((s) => s.setDeskSize);
  const setDeskMaterial = useDeskStore((s) => s.setDeskMaterial);
  const material = desk.material ?? "oak";
  const setRoom = useDeskStore((s) => s.setRoom);
  const [open, setOpen] = useState(false);
  const wall = desk.wall ?? WALLS[0].value;

  return (
    <View className="mb-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={open ? "책상 설정 접기" : "책상 설정 펼치기"}
        className="flex-row items-center py-0.5"
      >
        <Ionicons name="options-outline" size={16} color="#a1a1aa" />
        <Text className="ml-1.5 text-sm font-semibold text-zinc-100">책상 설정</Text>
        <Text className="ml-2 flex-1 text-xs text-zinc-500" numberOfLines={1}>
          {desk.width}×{desk.depth}cm · {MATERIALS[material].label}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color="#a1a1aa" />
      </Pressable>

      {open && (
        <View className="mt-2" style={{ rowGap: 8 }}>
          <View className="flex-row items-center">
            <Text className="mr-2 w-8 text-xs text-zinc-400">크기</Text>
            <SizeFields w={desk.width} h={desk.depth} min={{ w: DESK_LIMITS.minW, h: DESK_LIMITS.minD }} onChange={setDeskSize} resetKey="desk" />
          </View>
          <View className="flex-row items-center">
            <Text className="mr-2 w-8 text-xs text-zinc-400">상판</Text>
            {MATERIAL_ORDER.map((m) => (
              <Swatch key={m} color={MATERIALS[m].swatch} label={`상판 ${MATERIALS[m].label}`} on={m === material} onPress={() => setDeskMaterial(m)} />
            ))}
          </View>
          <Text className="mt-1 text-[11px] text-zinc-500">아래는 3D 보기에서 보여요</Text>
          <View className="flex-row items-center" style={{ flexWrap: "wrap", rowGap: 6 }}>
            <Text className="mr-2 w-8 text-xs text-zinc-400">의자</Text>
            {CHAIRS.map((c) => (
              <Pick key={c.label} label={c.label} on={desk.chair === c.value} onPress={() => setRoom({ chair: c.value })} />
            ))}
            <Pick label={desk.window ? "창문 있음" : "창문 없음"} on={!!desk.window} onPress={() => setRoom({ window: !desk.window || undefined })} />
          </View>
          <View className="flex-row items-center">
            <Text className="mr-2 w-8 text-xs text-zinc-400">벽</Text>
            {WALLS.map((w) => (
              <Swatch
                key={w.value}
                color={w.value}
                label={`벽 ${w.label}`}
                on={w.value === wall}
                onPress={() =>
                  setRoom({
                    wall: w.value === WALLS[0].value ? undefined : w.value,
                  })
                }
              />
            ))}
          </View>
          <View className="flex-row items-center" style={{ flexWrap: "wrap", rowGap: 6 }}>
            <Text className="mr-2 w-8 text-xs text-zinc-400">바닥</Text>
            {FLOORS.map((f) => (
              <Pick key={f.value} label={f.label} on={(desk.floor ?? "wood") === f.value} onPress={() => setRoom({ floor: f.value === "wood" ? undefined : f.value })} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
