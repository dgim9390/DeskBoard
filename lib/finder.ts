import { FINDER_FILTERS, REAL_PRODUCTS, type FinderCategory, type RealProduct } from "@/data/products";

export const PRICE_BANDS = [
  { label: "10만 원 이하", min: 0, max: 100000 },
  { label: "10~30만 원", min: 100001, max: 300000 },
  { label: "30만 원 넘게", min: 300001, max: Infinity },
];

export interface FinderQuery {
  cat: FinderCategory;
  /** 조건 줄 순서대로 고른 태그들 (줄 안에서는 하나라도, 줄끼리는 모두 만족) */
  rows: string[][];
  /** PRICE_BANDS 순번들 */
  prices: number[];
  brands: string[];
}

/** 조건에 맞는 제품. 아무것도 안 고른 줄은 조건이 없는 것으로 봄 */
export function findProducts(q: FinderQuery, all: RealProduct[] = REAL_PRODUCTS): RealProduct[] {
  return all.filter(
    (p) =>
      p.cat === q.cat &&
      q.rows.every((tags) => tags.length === 0 || tags.some((t) => p.tags.includes(t))) &&
      (q.prices.length === 0 || q.prices.some((i) => p.price >= PRICE_BANDS[i].min && p.price <= PRICE_BANDS[i].max)) &&
      (q.brands.length === 0 || q.brands.includes(p.brand)),
  );
}

/** 태그를 사람이 읽는 말로 (예: "res:QHD" → "QHD") */
export function tagLabel(cat: FinderCategory, tag: string) {
  for (const row of FINDER_FILTERS[cat]) for (const o of row.options) if (o.tag === tag) return o.label;
  return null;
}
