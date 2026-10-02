import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { previewItems, TEMPLATES, type SetupTemplate } from "@/data/templates";
import { toast } from "@/lib/toast";
import { useDeskStore } from "@/store/useDeskStore";
import { SetupPreview } from "./SetupPreview";

const CARD_W = 248;

/** 추천 셋업 템플릿: 가로로 넘겨 보고 한 번에 불러오기 */
export function TemplateGallery() {
  const router = useRouter();

  const apply = (t: SetupTemplate) => {
    useDeskStore.getState().applyTemplate({ desk: t.desk, items: t.items });
    router.navigate("/");
    toast(`'${t.name}' 불러왔어요`, {
      icon: "sparkles",
      action: { label: "되돌리기", onPress: () => useDeskStore.getState().undo() },
    });
  };

  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-end justify-between px-1">
        <View>
          <Text className="text-base font-bold text-zinc-100">추천 셋업</Text>
          <Text className="mt-0.5 text-xs text-zinc-500">완성된 책상으로 시작해서 내 취향대로 바꿔 보세요</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 2 }} snapToInterval={CARD_W + 12} decelerationRate="fast">
        {TEMPLATES.map((t) => (
          <View key={t.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900" style={{ width: CARD_W }}>
            <View className="items-center justify-center bg-black/40 py-3">
              <SetupPreview desk={t.desk} items={previewItems(t)} width={CARD_W - 24} />
            </View>
            <View className="p-3">
              <Text className="text-sm font-semibold text-zinc-100">{t.name}</Text>
              <Text className="mt-1 text-xs leading-4 text-zinc-400" numberOfLines={2}>
                {t.description}
              </Text>
              <View className="mt-2 flex-row" style={{ gap: 4 }}>
                {t.tags.map((tag) => (
                  <View key={tag} className="rounded-full bg-white/5 px-2 py-0.5">
                    <Text className="text-[10px] text-zinc-400">#{tag}</Text>
                  </View>
                ))}
                <View className="rounded-full bg-white/5 px-2 py-0.5">
                  <Text className="text-[10px] text-zinc-400">
                    {t.desk.width}×{t.desk.depth}cm
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => apply(t)}
                accessibilityRole="button"
                accessibilityLabel={`${t.name} 셋업으로 시작`}
                className="mt-3 flex-row items-center justify-center rounded-lg bg-indigo-500 py-2 active:bg-indigo-600"
              >
                <Ionicons name="sparkles" size={13} color="#fff" />
                <Text className="ml-1.5 text-xs font-semibold text-white">이 셋업으로 시작</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
