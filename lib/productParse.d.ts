import type { ProductPreview } from "./productLink";

/** 제품 페이지 HTML → 미리보기 정보 (lib/productParse.js) */
export function parse(html: string, finalUrl: string): ProductPreview;
export function guessDimensions(text: string): ProductPreview["dimensions"];
