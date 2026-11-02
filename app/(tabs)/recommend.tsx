import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ProductCard } from "@/components/ProductCard";
import { ProductFinder } from "@/components/ProductFinder";
import { TemplateGallery } from "@/components/TemplateGallery";
import { suggestPosition } from "@/lib/placement";
import { BUDGET_LABEL, getRecommendations, PURPOSE_LABEL, SECTION_LABEL, type Product, type Section } from "@/lib/recommend";
import { useDeskStore, type Budget, type Purpose, type StylePref } from "@/store/useDeskStore";

const STYLE_LABEL: Record<StylePref, string> = { white: "화이트", black: "블랙", wood: "원목·내추럴" };

/** 내 용도 고르기: 한 줄에 칩 여러 개 (다시 누르면 해제) */
function ChoiceRow<T extends string>({ label, options, value, onChange }: { label: string; options: Record<T, string>; value?: T; onChange: (v: T | undefined) => void }) {
  return (
    <View className="mt-2 flex-row items-center" style={{ flexWrap: "wrap", rowGap: 6 }}>
      <Text className="mr-2 w-14 text-xs text-zinc-400">{label}</Text>
      {(Object.keys(options) as T[]).map((k) => {
        const on = k === value;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(on ? undefined : k)}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${options[k]}`}
            accessibilityState={{ selected: on }}
            className={`mr-1.5 rounded-lg border px-2.5 py-1 ${on ? "border-indigo-400 bg-indigo-500/20" : "border-zinc-700 active:bg-zinc-800"}`}
          >
            <Text className={`text-xs ${on ? "font-semibold text-indigo-200" : "text-zinc-300"}`}>{options[k]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type Filter = "all" | "forMe" | "matched" | Section;

export default function RecommendScreen() {
  const router = useRouter();
  const deskItems = useDeskStore((s) => s.deskItems);
  const desk = useDeskStore((s) => s.desk);
  const profile = useDeskStore((s) => s.profile);
  const setProfile = useDeskStore((s) => s.setProfile);
  const addDeskItem = useDeskStore((s) => s.addDeskItem);
  const products = useMemo(() => getRecommendations(deskItems, desk, profile), [deskItems, desk, profile]);
  const [filter, setFilter] = useState<Filter>("all");
  const [mode, setMode] = useState<"recommend" | "finder">("recommend");

  // 추천 결과에 실제로 있는 섹션만 필터로 노출
  const filters = useMemo(() => {
    const sections = (Object.keys(SECTION_LABEL) as Section[]).filter((s) => products.some((p) => p.section === s));
    const f: { key: Filter; label: string; count: number }[] = [
      { key: "all", label: "전체", count: products.length },
      { key: "forMe", label: "내 용도 맞춤", count: products.filter((p) => p.forMe).length },
      { key: "matched", label: "내 책상 맞춤", count: products.filter((p) => p.matched).length },
      ...sections.map((s) => ({ key: s, label: SECTION_LABEL[s], count: products.filter((p) => p.section === s).length })),
    ];
    return f.filter((x) => x.count > 0);
  }, [products]);

  const visible = products.filter((p) => filter === "all" || (filter === "forMe" ? p.forMe : filter === "matched" ? p.matched : p.section === filter));

  const place = (p: Product) => {
    const { desk, deskItems: items } = useDeskStore.getState();
    const pos = suggestPosition(p.kind, p, items, desk);
    // 선호 색이 화이트·블랙이면 그 색으로 놓음
    const color = profile.style === "white" || profile.style === "black" ? profile.style : undefined;
    addDeskItem({ name: p.name, category: p.category, kind: p.kind, width: p.width, height: p.height, price: p.price, color, ...p.extra, ...pos });
    router.navigate("/"); // 시뮬레이터에서 바로 확인
  };

  // 맞춤 추천 / 조건으로 찾기 전환
  const modeTabs = (
    <View className="flex-row px-4 pt-3">
      {(
        [
          ["recommend", "맞춤 추천"],
          ["finder", "조건으로 찾기"],
        ] as const
      ).map(([m, label]) => {
        const on = mode === m;
        return (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            className={`mr-2 rounded-lg px-3 py-1.5 ${on ? "bg-zinc-100" : "bg-zinc-900 active:bg-zinc-800"}`}
          >
            <Text className={`text-sm font-semibold ${on ? "text-zinc-900" : "text-zinc-300"}`}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (mode === "finder") {
    return (
      <View className="flex-1 bg-zinc-950">
        {modeTabs}
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <ProductFinder />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-950">
      {modeTabs}
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
            <View className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <Text className="text-sm font-semibold text-zinc-100">내 용도</Text>
              <Text className="mt-0.5 text-xs text-zinc-500">고르면 용도와 예산에 맞는 제품을 먼저 보여 줘요</Text>
              <ChoiceRow<Purpose> label="용도" options={PURPOSE_LABEL} value={profile.purpose} onChange={(purpose) => setProfile({ ...profile, purpose })} />
              <ChoiceRow<Budget> label="예산" options={BUDGET_LABEL} value={profile.budget} onChange={(budget) => setProfile({ ...profile, budget })} />
              <ChoiceRow<StylePref> label="선호 색" options={STYLE_LABEL} value={profile.style} onChange={(style) => setProfile({ ...profile, style })} />
            </View>
            <Text className="px-1 text-base font-bold text-zinc-100">추천 제품</Text>
            <Text className="mb-1 mt-0.5 px-1 text-xs text-zinc-500">
              {profile.purpose ? `${PURPOSE_LABEL[profile.purpose]}용으로 고른 제품과 ` : ""}현재 책상의 {deskItems.length}개 장비에 맞춘 추천이에요. 책상에 빈자리가 있는지도 함께 봐요.
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
