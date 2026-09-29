import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { CATALOG, CATEGORY_COLOR, CATEGORY_LABEL, PICKER_GROUPS, type PickerGroup } from "@/data/catalog";
import { ProductImage } from "./ProductImage";

type Entry = (typeof CATALOG)[number];
type Filter = "all" | PickerGroup;

export function ItemPicker({ onPick }: { onPick: (entry: Entry) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filter === "all" ? CATALOG : CATALOG.filter((e) => e.group === filter);
  const chips: { key: Filter; label: string }[] = [{ key: "all", label: "전체" }, ...PICKER_GROUPS];

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
        {visible.map((entry) => (
          <Pressable
            key={entry.key}
            onPress={() => onPick(entry)}
            className="w-28 items-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 active:bg-zinc-800"
          >
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
