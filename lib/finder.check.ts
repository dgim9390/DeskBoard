// 조건 검색 자체 점검: npx tsx lib/finder.check.ts (또는 ts-node). 실패하면 예외
import assert from "node:assert/strict";
import type { RealProduct } from "@/data/products";
import { findProducts, relaxations } from "./finder";

const P = (id: string, price: number, tags: string[], brand = "A"): RealProduct => ({ id, cat: "monitor", brand, name: id, kind: "monitor", width: 60, depth: 20, price, tags });
const all = [P("a", 150000, ["size:24", "res:FHD"]), P("b", 450000, ["size:27", "res:QHD"], "B"), P("c", 300000, ["size:27", "res:4K"])];
const ids = (r: RealProduct[]) => r.map((p) => p.id).join(",");
const q = (rows: string[][], prices: number[] = [], brands: string[] = []) => findProducts({ cat: "monitor", rows, prices, brands }, all);

assert.equal(ids(q([])), "a,b,c"); // 조건 없음 = 전부
assert.equal(ids(q([["size:27"]])), "b,c");
assert.equal(ids(q([["size:27"], ["res:QHD", "res:4K"]])), "b,c"); // 줄 안은 '또는'
assert.equal(ids(q([["size:27"], ["res:QHD"]])), "b"); // 줄끼리는 '그리고'
assert.equal(ids(q([], [1])), "a,c"); // 10~30만 원 (150000·300000 포함)
assert.equal(ids(q([], [2])), "b"); // 30만 원 넘게
assert.equal(ids(q([], [], ["B"])), "b");
// 27인치 + FHD 는 없음 → 크기를 빼면 a(24 FHD) 1개, 해상도를 빼면 b·c 2개
const r = relaxations({ cat: "monitor", rows: [["size:27"], ["res:FHD"]], prices: [], brands: [] }, all);
assert.deepEqual(r.map((x) => [x.kind === "row" ? x.index : x.kind, x.count]), [[1, 2], [0, 1]]);
console.log("finder ok");
