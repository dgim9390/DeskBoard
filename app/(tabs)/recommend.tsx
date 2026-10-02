import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ProductCard } from "@/components/ProductCard";
import { TemplateGallery } from "@/components/TemplateGallery";
import { suggestPosition } from "@/lib/placement";
import { getRecommendations, SECTION_LABEL, type Product, type Section } from "@/lib/recommend";
import { useDeskStore } from "@/store/useDeskStore";

type Filter = "all" | "matched" | Section;

export default function RecommendScreen() {
  const router = useRouter();
  const deskItems = useDeskStore((s) => s.deskItems);
  const addDeskItem = useDeskStore((s) => s.addDeskItem);
  const products = useMemo(() => getRecommendations(deskItems), [deskItems]);
  const [filter, setFilter] = useState<Filter>("all");

  // 추천 결과에 실제로 있는 섹션만 필터로 노출
  const filters = useMemo(() => {
    const sections = (Object.keys(SECTION_LABEL) as Section[]).filter((s) => products.some((p) => p.section === s));
    const f: { key: Filter; label: string; count: number }[] = [
      { key: "all", label: "전체", count: products.length },
      { key: "matched", label: "내 책상 맞춤", count: products.filter((p) => p.matched).length },
      ...sections.map((s) => ({ key: s, label: SECTION_LABEL[s], count: products.filter((p) => p.section === s).length })),
    ];
    return f.filter((x) => x.count > 0);
  }, [products]);

  const visible = products.filter((p) => filter === "all" || (filter === "matched" ? p.matched : p.section === filter));

  const place = (p: Product) => {
    const { desk, deskItems: items } = useDeskStore.getState();
    const pos = suggestPosition(p.kind, p, items, desk);
    addDeskItem({ name: p.name, category: p.category, kind: p.kind, width: p.width, height: p.height, price: p.price, ...pos });
    router.navigate("/"); // 시뮬레이터에서 바로 확인
  };

  return (
    <View className="flex-1 bg-zinc-950">
      <View className="border-b border-zinc-900 pb-2 pt-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {filters.map((f) => {
            const on = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={`flex-row items-center rounded-full border px-3 py-1.5 ${on ? "border-indigo-400 bg-indigo-500/20" : "border-zinc-800 bg-zinc-900"}`}
              >
                <Text className={`text-sm ${on ? "font-semibold text-indigo-200" : "text-zinc-300"}`}>{f.label}</Text>
                <Text className={`ml-1 text-xs ${on ? "text-indigo-300" : "text-zinc-500"}`}>{f.count}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={
          <View>
            {filter === "all" && <TemplateGallery />}
            <Text className="px-1 text-base font-bold text-zinc-100">추천 제품</Text>
            <Text className="mb-1 mt-0.5 px-1 text-xs text-zinc-500">
              현재 책상의 {deskItems.length}개 장비에 맞춘 추천과 데스크테리어 인기 아이템이에요.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-zinc-500">이 분류에는 추천할 제품이 없어요.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            placed={deskItems.some((i) => (i.kind === item.kind || i.mount?.kind === item.kind) && (i.name === item.name || i.mount?.name === item.name))}
            onPlace={place}
          />
        )}
      />
    </View>
  );
}
