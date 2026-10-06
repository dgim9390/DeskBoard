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
  /** row: 화면 아래 가로 목록, column: 오른쪽 세로 패널 */
  layout?: "row" | "column";
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const COL_CARD_W = 128; // 세로 패널에서 두 줄로 놓이는 카드 폭

export function ItemPicker({ onPick, onPickCustom, onAddLink, onRemoveCustom, layout = "row", collapsed = false, onToggleCollapsed }: Props) {
  const customProducts = useDeskStore((s) => s.customProducts);
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filter === "all" ? CATALOG : filter === "mine" ? [] : CATALOG.filter((e) => e.group === filter);
  const showCustom = filter === "all" || filter === "mine";
  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "mine", label: `내 제품${customProducts.length ? ` ${customProducts.length}` : ""}` },
    ...PICKER_GROUPS,
  ];

  const column = layout === "column";
  const card = `${column ? "" : "w-28 "}items-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 active:bg-zinc-800`;
  const cardStyle = column ? { width: COL_CARD_W } : undefined;

  // 세로 패널을 접으면 얇은 막대만 남김 (누르면 다시 펼침)
  if (column && collapsed) {
    return (
      <Pressable
        onPress={onToggleCollapsed}
        accessibilityRole="button"
        accessibilityLabel="장비 추가 펼치기"
        className="flex-1 items-center rounded-xl border border-zinc-800 bg-zinc-900 pt-3 active:bg-zinc-800"
      >
        <Ionicons name="chevron-back" size={16} color="#a1a1aa" />
        <Ionicons name="add-circle-outline" size={20} color="#a5b4fc" style={{ marginTop: 10 }} />
        {"장비추가".split("").map((ch, i) => (
          <Text key={i} className="text-xs font-semibold leading-4 text-zinc-400" style={i === 0 ? { marginTop: 6 } : undefined}>
            {ch}
          </Text>
        ))}
      </Pressable>
    );
  }

  const header = (
    <View className="mb-2 flex-row items-center px-1">
      <Text className="flex-1 text-sm font-semibold text-zinc-400">장비 추가</Text>
      {onToggleCollapsed && (
        <Pressable
          onPress={onToggleCollapsed}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? "장비 추가 펼치기" : "장비 추가 접기"}
          className="flex-row items-center rounded-lg px-2 py-1 active:bg-zinc-800"
        >
          <Text className="mr-1 text-xs text-zinc-500">{collapsed ? "펼치기" : "접기"}</Text>
          <Ionicons name={column ? "chevron-forward" : collapsed ? "chevron-up" : "chevron-down"} size={14} color="#a1a1aa" />
        </Pressable>
      )}
    </View>
  );

  // 화면 아래(가로)에서 접으면 제목 줄만
  if (collapsed) return header;

  const chipList = chips.map((c) => {
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
  });

  const cards = (
    <>
      {showCustom && (
        <>
          {/* 링크로 추가 */}
          <Pressable
            onPress={onAddLink}
            accessibilityRole="button"
            accessibilityLabel="링크로 제품 추가"
            className={`${column ? "" : "w-28 "}items-center justify-center rounded-xl border border-dashed border-indigo-400/60 bg-indigo-500/5 p-2 active:bg-indigo-500/15`}
            style={cardStyle}
          >
            <View className="h-16 w-full items-center justify-center">
              <Ionicons name="link" size={26} color="#a5b4fc" />
            </View>
            <Text className="mt-1.5 text-xs font-semibold text-indigo-200">링크로 추가</Text>
          </Pressable>

          {customProducts.map((p) => (
            <Pressable key={p.id} onPress={() => onPickCustom(p)} accessibilityLabel={`${p.name} 추가`} className={card} style={cardStyle}>
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
              <Text className="text-xs leading-5 text-zinc-500">제조사 공식 홈페이지의 제품 링크를{"\n"}붙여 넣어 책상에 올려 보세요.</Text>
            </View>
          )}
        </>
      )}

      {visible.map((entry) => (
        <Pressable key={entry.key} onPress={() => onPick(entry)} className={card} style={cardStyle}>
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
    </>
  );

  if (column) {
    // 오른쪽 세로 패널: 카테고리는 여러 줄로, 제품은 두 줄 격자로 세로 스크롤
    return (
      <View className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-2">
        {header}
        <View className="flex-row px-1 pb-2" style={{ flexWrap: "wrap", gap: 6 }}>
          {chipList}
        </View>
        <ScrollView key={filter} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 4, paddingBottom: 8 }}>
          {cards}
        </ScrollView>
      </View>
    );
  }

  return (
    <View>
      {header}

      {/* 카테고리 블록 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4, paddingBottom: 8 }}>
        {chipList}
      </ScrollView>

      <ScrollView
        key={filter} // 카테고리를 바꾸면 스크롤을 처음으로
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}
      >
        {cards}
      </ScrollView>
    </View>
  );
}
