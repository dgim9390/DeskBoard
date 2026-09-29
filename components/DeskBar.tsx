import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DESK_LIMITS, useDeskStore } from "@/store/useDeskStore";
import { SizeFields } from "./SizeFields";

/** 선택된 장비가 없을 때 보여주는 책상 크기(cm) 입력 */
export function DeskBar() {
  const desk = useDeskStore((s) => s.desk);
  const setDeskSize = useDeskStore((s) => s.setDeskSize);

  return (
    <View className="mb-2 flex-row items-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
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
  );
}
