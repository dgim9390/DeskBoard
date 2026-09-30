import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DESK_LIMITS, useDeskStore } from "@/store/useDeskStore";
import { MATERIAL_ORDER, MATERIALS } from "./DeskSurface";
import { SizeFields } from "./SizeFields";

/** 선택된 장비가 없을 때 보여주는 책상 크기(cm) 입력과 상판 재질 */
export function DeskBar() {
  const desk = useDeskStore((s) => s.desk);
  const setDeskSize = useDeskStore((s) => s.setDeskSize);
  const setDeskMaterial = useDeskStore((s) => s.setDeskMaterial);
  const material = desk.material ?? "oak";

  return (
    <View className="mb-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
      <View className="flex-row items-center">
        <Ionicons name="resize-outline" size={16} color="#a1a1aa" />
        <Text className="ml-1.5 mr-2 flex-1 text-sm font-semibold text-zinc-100">책상 크기</Text>
        <SizeFields
          w={desk.width}
          h={desk.depth}
          min={{ w: DESK_LIMITS.minW, h: DESK_LIMITS.minD }}
          onChange={setDeskSize}
          resetKey="desk"
        />
      </View>

      <View className="mt-2 flex-row items-center">
        <Ionicons name="color-palette-outline" size={16} color="#a1a1aa" />
        <Text className="ml-1.5 text-sm font-semibold text-zinc-100">상판</Text>
        <Text className="ml-1.5 flex-1 text-xs text-zinc-500">{MATERIALS[material].label}</Text>
        {MATERIAL_ORDER.map((m) => {
          const on = m === material;
          return (
            <Pressable
              key={m}
              onPress={() => setDeskMaterial(m)}
              accessibilityRole="button"
              accessibilityLabel={`상판 ${MATERIALS[m].label}`}
              accessibilityState={{ selected: on }}
              hitSlop={4}
              className="ml-1.5 h-7 w-7 items-center justify-center rounded-full"
              style={{ borderWidth: 2, borderColor: on ? "#818cf8" : "transparent" }}
            >
              <View className="h-5 w-5 rounded-full" style={{ backgroundColor: MATERIALS[m].swatch, borderWidth: 1, borderColor: "#52525b" }} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
