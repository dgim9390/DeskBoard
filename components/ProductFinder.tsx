import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FINDER_CATEGORY, FINDER_FILTERS, REAL_PRODUCTS, type FinderCategory, type RealProduct } from "@/data/products";
import { findProducts, PRICE_BANDS, PURPOSE_LABEL, rankForPurpose, relaxations, tagLabel } from "@/lib/finder";
import { fitsOnDesk, suggestPosition } from "@/lib/placement";
import { useDeskStore, type Purpose } from "@/store/useDeskStore";
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-2 flex-row items-center" style={{ flexWrap: "wrap", rowGap: 6 }}>
      <Text className="mr-2 w-14 text-xs text-zinc-400">{label}</Text>
      {children}
    </View>
  );
}

/** 용도 → 종류 → 조건 순으로 골라 실제 제품을 찾고, 바로 책상에 놓아 보는 화면 */
export function ProductFinder() {
  const router = useRouter();
  const desk = useDeskStore((s) => s.desk);
  const deskItems = useDeskStore((s) => s.deskItems);
  const purpose = useDeskStore((s) => s.profile.purpose);
  const setProfile = useDeskStore((s) => s.setProfile);
  const [moreOpen, setMoreOpen] = useState(false);
  const [cat, setCat] = useState<FinderCategory>("monitor");
  const [rows, setRows] = useState<string[][]>([]);
  const [prices, setPrices] = useState<number[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [onlyFits, setOnlyFits] = useState(false);

  const filters = FINDER_FILTERS[cat];
  const allBrands = useMemo(() => [...new Set(REAL_PRODUCTS.filter((p) => p.cat === cat).map((p) => p.brand))], [cat]);
  const query = useMemo(() => ({ cat, rows: filters.map((_, i) => rows[i] ?? []), prices, brands }), [cat, filters, rows, prices, brands]);
  const found = useMemo(
    () =>
      findProducts(query).map((p) => ({
        p,
        fits: fitsOnDesk(p.kind, { width: p.width, height: p.depth }, deskItems, desk),
      })),
    [query, deskItems, desk],
  );
  const fitting = onlyFits ? found.filter((r) => r.fits) : found;
  const results = rankForPurpose(
    fitting.map((r) => r.p),
    purpose,
  ).map((r) => ({ ...r, fits: fitting.find((f) => f.p === r.p)!.fits }));
  // 결과가 없으면: 어떤 조건을 빼면 제품이 나오는지
  const relax = useMemo(() => (results.length ? [] : relaxations(query)), [results.length, query]);

  const pickCat = (c: FinderCategory) => {
    setCat(c);
    setRows([]);
    setBrands([]);
  };
  const toggleTag = (row: number, tag: string) => setRows((r) => filters.map((_, i) => (i === row ? toggle(r[i] ?? [], tag) : (r[i] ?? []))));

  const place = (p: RealProduct) => {
    const { desk: d, deskItems: items, addDeskItem } = useDeskStore.getState();
    const size = { width: p.width, height: p.depth };
    addDeskItem({
      name: `${p.brand} ${p.name}`,
      category: FINDER_CATEGORY[p.cat].category,
      kind: p.kind,
      ...size,
      tall: p.tall,
      price: p.price,
      color: p.color,
      ...suggestPosition(p.kind, size, items, d),
    });
    router.navigate("/"); // 시뮬레이터에서 바로 확인
  };

  return (
    <View>
      <Text className="mb-2 px-1 text-base font-bold text-zinc-100">어디에 쓰세요?</Text>
      <View className="mb-4 flex-row px-1" style={{ flexWrap: "wrap", rowGap: 6 }}>
        {(Object.keys(PURPOSE_LABEL) as Purpose[]).map((k) => (
          <Chip key={k} label={PURPOSE_LABEL[k]} on={purpose === k} onPress={() => setProfile({ purpose: purpose === k ? undefined : k })} />
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
        {(Object.keys(FINDER_CATEGORY) as FinderCategory[]).map((c) => (
          <Chip key={c} label={FINDER_CATEGORY[c].label} on={c === cat} onPress={() => pickCat(c)} />
        ))}
      </ScrollView>

      <View className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 pb-1">
        {filters.map((f, i) => (
          <Row key={f.label} label={f.label}>
            {f.options.map((o) => (
              <Chip key={o.tag} label={o.label} on={!!rows[i]?.includes(o.tag)} onPress={() => toggleTag(i, o.tag)} />
            ))}
          </Row>
        ))}
        <Row label="가격">
          {PRICE_BANDS.map((b, i) => (
            <Chip key={b.label} label={b.label} on={prices.includes(i)} onPress={() => setPrices((p) => toggle(p, i))} />
          ))}
        </Row>
        {/* 브랜드·책상 조건은 자주 안 써서 접어 둠 (골라 둔 게 있으면 펼침) */}
        {moreOpen || brands.length > 0 || onlyFits ? (
          <>
            <Row label="브랜드">
              {allBrands.map((b) => (
                <Chip key={b} label={b} on={brands.includes(b)} onPress={() => setBrands((x) => toggle(x, b))} />
              ))}
            </Row>
            <Row label="책상">
              <Chip label="내 책상에 들어가는 것만" on={onlyFits} onPress={() => setOnlyFits((v) => !v)} />
            </Row>
          </>
        ) : (
          <Pressable onPress={() => setMoreOpen(true)} accessibilityRole="button" className="mb-2 flex-row items-center self-start py-1">
            <Text className="text-xs text-zinc-400">브랜드 · 책상 크기 조건</Text>
            <Ionicons name="chevron-down" size={12} color="#a1a1aa" style={{ marginLeft: 4 }} />
          </Pressable>
        )}
      </View>

      <Text className="mb-1 mt-4 px-1 text-sm font-semibold text-zinc-100">
        {FINDER_CATEGORY[cat].label} {results.length}개
      </Text>
      <Text className="mb-2 px-1 text-[11px] text-zinc-500">가격은 대략적인 가격대예요. 사양과 가격은 구매 전에 판매처에서 확인하세요.</Text>
      {results.length === 0 && (
        <View className="items-center py-8">
          <Text className="text-sm text-zinc-400">조건에 딱 맞는 제품이 없어요</Text>
          {(relax.length > 0 || (onlyFits && found.length > 0)) && <Text className="mt-1 text-xs text-zinc-500">이 조건을 빼면 이런 제품이 있어요</Text>}
          <View className="mt-3 flex-row justify-center" style={{ flexWrap: "wrap", rowGap: 6 }}>
            {onlyFits && found.length > 0 && <Chip label={`'내 책상에 들어가는 것만' 끄기 · ${found.length}개`} on={false} onPress={() => setOnlyFits(false)} />}
            {relax.map((r) => {
              const label = r.kind === "row" ? filters[r.index].label : r.kind === "price" ? "가격" : "브랜드";
              const clear = () => (r.kind === "row" ? setRows((x) => x.map((t, i) => (i === r.index ? [] : t))) : r.kind === "price" ? setPrices([]) : setBrands([]));
              return <Chip key={`${r.kind}-${label}`} label={`${label} 조건 빼기 · ${r.count}개`} on={false} onPress={clear} />;
            })}
          </View>
        </View>
      )}
      <View style={{ gap: 10 }}>
        {results.map(({ p, fits, pick }) => {
          const specs = p.tags
            .map((t) => tagLabel(p.cat, t))
            .filter(Boolean)
            .join(" · ");
          return (
            <View key={p.id} className="flex-row rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <View className="mr-3 h-20 w-24 items-center justify-center rounded-xl bg-[#b98e63]">
                <ProductImage kind={p.kind} width={84} height={64} color={p.color} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-[11px] text-zinc-500">{p.brand}</Text>
                  {pick && purpose && (
                    <View className="ml-1.5 rounded-full bg-indigo-500/20 px-1.5 py-px">
                      <Text className="text-[10px] font-bold text-indigo-300">{PURPOSE_LABEL[purpose]}용 추천</Text>
                    </View>
                  )}
                </View>
                <Text className="text-sm font-semibold text-zinc-100">{p.name}</Text>
                {!!specs && <Text className="mt-0.5 text-xs text-zinc-400">{specs}</Text>}
                <Text className="mt-0.5 text-xs text-zinc-500">
                  {p.width}×{p.depth}cm · 약 {Math.round(p.price / 10000)}만 원{!fits && <Text className="text-amber-400"> · 책상에 빈자리가 부족해요</Text>}
                </Text>
                <View className="mt-2 flex-row" style={{ gap: 6 }}>
                  <Pressable
                    onPress={() => place(p)}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.name} 책상에 놓기`}
                    className="flex-row items-center rounded-lg bg-indigo-500 px-2.5 py-1.5 active:bg-indigo-600"
                  >
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
