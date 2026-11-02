import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FINDER_CATEGORY, FINDER_FILTERS, REAL_PRODUCTS, type FinderCategory, type RealProduct } from "@/data/products";
import { findProducts, PRICE_BANDS, tagLabel } from "@/lib/finder";
import { fitsOnDesk, suggestPosition } from "@/lib/placement";
import { useDeskStore } from "@/store/useDeskStore";
import { buyUrl } from "./ProductListModal";
import { ProductImage } from "./ProductImage";

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
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

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** 다나와처럼 조건을 골라 실제 제품을 찾고, 바로 책상에 놓아 보는 화면 */
export function ProductFinder() {
  const router = useRouter();
  const desk = useDeskStore((s) => s.desk);
  const deskItems = useDeskStore((s) => s.deskItems);
  const style = useDeskStore((s) => s.profile.style);
  const [cat, setCat] = useState<FinderCategory>("monitor");
  const [rows, setRows] = useState<string[][]>([]);
  const [prices, setPrices] = useState<number[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [onlyFits, setOnlyFits] = useState(false);

  const filters = FINDER_FILTERS[cat];
  const allBrands = useMemo(() => [...new Set(REAL_PRODUCTS.filter((p) => p.cat === cat).map((p) => p.brand))], [cat]);
  const results = useMemo(() => {
    const found = findProducts({ cat, rows: filters.map((_, i) => rows[i] ?? []), prices, brands });
    return found.map((p) => ({ p, fits: fitsOnDesk(p.kind, { width: p.width, height: p.depth }, deskItems, desk) })).filter((r) => !onlyFits || r.fits);
  }, [cat, filters, rows, prices, brands, onlyFits, deskItems, desk]);

  const pickCat = (c: FinderCategory) => {
    setCat(c);
    setRows([]);
    setBrands([]);
  };
  const toggleTag = (row: number, tag: string) => setRows((r) => filters.map((_, i) => (i === row ? toggle(r[i] ?? [], tag) : r[i] ?? [])));

  const place = (p: RealProduct) => {
    const { desk: d, deskItems: items, addDeskItem } = useDeskStore.getState();
    const size = { width: p.width, height: p.depth };
    const color = p.color ?? (style === "white" || style === "black" ? style : undefined);
    addDeskItem({ name: `${p.brand} ${p.name}`, category: FINDER_CATEGORY[p.cat].category, kind: p.kind, ...size, tall: p.tall, price: p.price, color, ...suggestPosition(p.kind, size, items, d) });
    router.navigate("/"); // 시뮬레이터에서 바로 확인
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
        {(Object.keys(FINDER_CATEGORY) as FinderCategory[]).map((c) => (
          <Chip key={c} label={FINDER_CATEGORY[c].label} on={c === cat} onPress={() => pickCat(c)} />
        ))}
      </ScrollView>

      <View className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        {filters.map((f, i) => (
          <View key={f.label} className="mb-2 flex-row items-center" style={{ flexWrap: "wrap", rowGap: 6 }}>
            <Text className="mr-2 w-14 text-xs text-zinc-400">{f.label}</Text>
            {f.options.map((o) => (
              <Chip key={o.tag} label={o.label} on={!!rows[i]?.includes(o.tag)} onPress={() => toggleTag(i, o.tag)} />
            ))}
          </View>
        ))}
        <View className="mb-2 flex-row items-center" style={{ flexWrap: "wrap", rowGap: 6 }}>
          <Text className="mr-2 w-14 text-xs text-zinc-400">가격</Text>
          {PRICE_BANDS.map((b, i) => (
            <Chip key={b.label} label={b.label} on={prices.includes(i)} onPress={() => setPrices((p) => toggle(p, i))} />
          ))}
        </View>
        <View className="mb-2 flex-row items-center" style={{ flexWrap: "wrap", rowGap: 6 }}>
          <Text className="mr-2 w-14 text-xs text-zinc-400">브랜드</Text>
          {allBrands.map((b) => (
            <Chip key={b} label={b} on={brands.includes(b)} onPress={() => setBrands((x) => toggle(x, b))} />
          ))}
        </View>
        <View className="flex-row items-center">
          <Text className="mr-2 w-14 text-xs text-zinc-400">책상</Text>
          <Chip label="내 책상에 들어가는 것만" on={onlyFits} onPress={() => setOnlyFits((v) => !v)} />
        </View>
      </View>

      <Text className="mb-1 mt-4 px-1 text-sm font-semibold text-zinc-100">
        {FINDER_CATEGORY[cat].label} {results.length}개
      </Text>
      <Text className="mb-2 px-1 text-[11px] text-zinc-500">가격은 대략적인 가격대예요. 사양과 가격은 구매 전에 판매처에서 확인하세요.</Text>
      {results.length === 0 && <Text className="py-10 text-center text-sm text-zinc-500">조건에 맞는 제품이 없어요. 조건을 줄여 보세요.</Text>}
      <View style={{ gap: 10 }}>
        {results.map(({ p, fits }) => {
          const specs = p.tags.map((t) => tagLabel(p.cat, t)).filter(Boolean).join(" · ");
          return (
            <View key={p.id} className="flex-row rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <View className="mr-3 h-20 w-24 items-center justify-center rounded-xl bg-[#b98e63]">
                <ProductImage kind={p.kind} width={84} height={64} color={p.color} />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-zinc-500">{p.brand}</Text>
                <Text className="text-sm font-semibold text-zinc-100">{p.name}</Text>
                {!!specs && <Text className="mt-0.5 text-xs text-zinc-400">{specs}</Text>}
                <Text className="mt-0.5 text-xs text-zinc-500">
                  {p.width}×{p.depth}cm · 약 {Math.round(p.price / 10000)}만 원
                  {!fits && <Text className="text-amber-400"> · 책상에 빈자리가 부족해요</Text>}
                </Text>
                <View className="mt-2 flex-row" style={{ gap: 6 }}>
                  <Pressable onPress={() => place(p)} accessibilityRole="button" accessibilityLabel={`${p.name} 책상에 놓기`} className="flex-row items-center rounded-lg bg-indigo-500 px-2.5 py-1.5 active:bg-indigo-600">
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text className="ml-1 text-xs font-semibold text-white">책상에 놓기</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => Linking.openURL(buyUrl(`${p.brand} ${p.name}`))}
                    accessibilityRole="link"
                    accessibilityLabel={`${p.name} 쿠팡에서 찾기`}
                    className="flex-row items-center rounded-lg border border-zinc-700 px-2.5 py-1.5 active:bg-zinc-800"
                  >
                    <Ionicons name="cart-outline" size={14} color="#d4d4d8" />
                    <Text className="ml-1 text-xs text-zinc-300">쿠팡에서 찾기</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
