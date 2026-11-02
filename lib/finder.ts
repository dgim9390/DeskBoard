import { FINDER_FILTERS, REAL_PRODUCTS, type FinderCategory, type RealProduct } from "@/data/products";
import type { Purpose } from "@/store/useDeskStore";

export const PURPOSE_LABEL: Record<Purpose, string> = { dev: "개발", design: "디자인·영상", game: "게임", work: "재택근무", study: "공부" };

/** 용도별로 잘 맞는 조건 (많이 맞을수록 위로) */
const PURPOSE_TAGS: Record<Purpose, string[]> = {
  dev: ["size:27", "res:QHD", "res:4K", "panel:IPS", "layout:tkl", "layout:compact", "switch:mech", "use:office", "shape:vertical", "anc:yes", "type:dual"],
  design: ["res:4K", "res:QHD", "panel:IPS", "size:27", "size:32", "use:office", "type:bookshelf", "use:music", "type:single"],
  game: ["hz:144", "use:game", "switch:mech", "layout:tkl", "layout:compact", "type:bar", "conn:wired"],
  work: ["use:office", "conn:wireless", "switch:low", "layout:full", "size:24", "size:27", "anc:yes", "type:pad", "type:stand", "type:magsafe"],
  study: ["size:24", "res:FHD", "conn:wireless", "switch:low", "use:office", "anc:yes", "type:compact", "type:pad"],
};

/** 용도에 맞는 순으로 정렬. pick: 가장 잘 맞는 제품들(맞는 조건이 하나 이상일 때만) */
export function rankForPurpose(list: RealProduct[], purpose?: Purpose) {
  if (!purpose) return list.map((p) => ({ p, pick: false }));
  const score = (p: RealProduct) => p.tags.filter((t) => PURPOSE_TAGS[purpose].includes(t)).length;
  const best = Math.max(0, ...list.map(score));
  return list
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s)
    .map(({ p, s }) => ({ p, pick: best > 0 && s === best }));
}

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

/** 결과가 없을 때: 고른 조건을 하나씩 빼 보고, 빼면 제품이 나오는 조건과 그때 개수 (많은 순) */
export type Relax = { kind: "row"; index: number; count: number } | { kind: "price"; count: number } | { kind: "brand"; count: number };
export function relaxations(q: FinderQuery, all: RealProduct[] = REAL_PRODUCTS): Relax[] {
  const out: Relax[] = [];
  q.rows.forEach((tags, index) => {
    if (!tags.length) return;
    const count = findProducts({ ...q, rows: q.rows.map((t, i) => (i === index ? [] : t)) }, all).length;
    if (count) out.push({ kind: "row", index, count });
  });
  if (q.prices.length) {
    const count = findProducts({ ...q, prices: [] }, all).length;
    if (count) out.push({ kind: "price", count });
  }
  if (q.brands.length) {
    const count = findProducts({ ...q, brands: [] }, all).length;
    if (count) out.push({ kind: "brand", count });
  }
  return out.sort((a, b) => b.count - a.count);
}
