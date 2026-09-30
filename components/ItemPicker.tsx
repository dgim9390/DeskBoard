import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CATALOG, CATEGORY_COLOR, CATEGORY_LABEL, PICKER_GROUPS, type PickerGroup } from "@/data/catalog";
import { useDeskStore, type CustomProduct } from "@/store/useDeskStore";
import { ProductImage } from "./ProductImage";

type Entry = (typeof CATALOG)[number];
type Filter = "all" | "mine" | PickerGroup;

interface Props {
  onPick: (entry: Entry) => void;
  onPickCustom: (p: CustomProduct) => void;
  /** 링크로 제품 추가 창 열기 */
  onAddLink: () => void;
  /** "내 제품"에서 삭제 (확인은 부모가) */
  onRemoveCustom: (p: CustomProduct) => void;
}

export function ItemPicker({ onPick, onPickCustom, onAddLink, onRemoveCustom }: Props) {
  const customProducts = useDeskStore((s) => s.customProducts);
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filter === "all" ? CATALOG : filter === "mine" ? [] : CATALOG.filter((e) => e.group === filter);
  const showCustom = filter === "all" || filter === "mine";
  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "mine", label: `내 제품${customProducts.length ? ` ${customProducts.length}` : ""}` },
    ...PICKER_GROUPS,
  ];

  const card = "w-28 items-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 active:bg-zinc-800";

  return (
    <View>
      <Text className="mb-2 px-1 text-sm font-semibold text-zinc-400">장비 추가</Text>

      {/* 카테고리 블록 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4, paddingBottom: 8 }}>
        {chips.map((c) => {
          const on = c.key === filter;
          return (
            <Pressable
              key={c.key}
              onPress={() => setFilter(c.key)}
              accessibilityRole="button"
              accessibilityLabel={`${c.label} 카테고리`}
              accessibilityState={{ selected: on }}
              className={`rounded-lg border px-3 py-1.5 ${on ? "border-indigo-400 bg-indigo-500/20" : "border-zinc-800 bg-zinc-900 active:bg-zinc-800"}`}
            >
              <Text className={`text-xs ${on ? "font-semibold text-indigo-200" : "text-zinc-300"}`}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        key={filter} // 카테고리를 바꾸면 스크롤을 처음으로
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}
      >
        {showCustom && (
          <>
            {/* 링크로 추가 */}
            <Pressable
              onPress={onAddLink}
              accessibilityRole="button"
              accessibilityLabel="링크로 제품 추가"
              className="w-28 items-center justify-center rounded-xl border border-dashed border-indigo-400/60 bg-indigo-500/5 p-2 active:bg-indigo-500/15"
            >
              <View className="h-16 w-full items-center justify-center">
                <Ionicons name="link" size={26} color="#a5b4fc" />
              </View>
              <Text className="mt-1.5 text-xs font-semibold text-indigo-200">링크로 추가</Text>
            </Pressable>

            {customProducts.map((p) => (
              <Pressable key={p.id} onPress={() => onPickCustom(p)} accessibilityLabel={`${p.name} 추가`} className={card}>
                <View className="h-16 w-full items-center justify-center rounded-lg bg-[#b98e63]">
                  <ProductImage kind={p.kind} imageUrl={p.imageUrl} label={p.name} color={p.color} width={88} height={52} dims={{ w: p.width, h: p.height }} />
                </View>
                <Text className="mt-1.5 self-start text-xs font-semibold text-zinc-100" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text className="self-start text-[10px] font-bold text-indigo-300" numberOfLines={1}>
                  {p.width}×{p.height}cm{p.site ? ` · ${p.site}` : ""}
                </Text>
                <Pressable
                  onPress={() => onRemoveCustom(p)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name} 내 제품에서 삭제`}
                  className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/60"
                >
                  <Ionicons name="close" size={12} color="#e4e4e7" />
                </Pressable>
              </Pressable>
            ))}

            {filter === "mine" && customProducts.length === 0 && (
              <View className="justify-center px-2">
                <Text className="text-xs leading-5 text-zinc-500">쓰고 싶은 제품의 상품 페이지 링크를{"\n"}붙여 넣어 책상에 올려 보세요.</Text>
              </View>
            )}
          </>
        )}

        {visible.map((entry) => (
          <Pressable key={entry.key} onPress={() => onPick(entry)} className={card}>
            <View className="h-16 w-full items-center justify-center rounded-lg bg-[#b98e63]">
              <ProductImage kind={entry.kind!} width={88} height={52} color={entry.color} dims={{ w: entry.width, h: entry.height }} />
            </View>
            <Text className="mt-1.5 self-start text-xs font-semibold text-zinc-100" numberOfLines={1}>
              {entry.name}
            </Text>
            <Text
              className="self-start text-[10px] font-bold"
              style={{ color: CATEGORY_COLOR[entry.category] }}
              numberOfLines={1}
              accessibilityLabel={`${CATEGORY_LABEL[entry.category]} ${entry.width}×${entry.height}cm`}
            >
              {entry.width}×{entry.height}cm
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
