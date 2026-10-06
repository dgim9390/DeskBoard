// 제품 페이지 HTML에서 이름·대표 사진·사이트·크기(설명에 적혀 있으면)를 뽑는 해석기.
// 서버(api/product-preview.js)와 맥 앱(쿠팡처럼 서버 접속을 막는 쇼핑몰은 앱이 직접 페이지를 엶)이 함께 씀.
// 브라우저·Node 공통: 문자열과 URL만 사용

// ── HTML 해석 ────────────────────────────────────────────
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

function metaMap(html) {
  const map = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const key = (tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i) || [])[1];
    const val = (tag.match(/\bcontent\s*=\s*"([^"]*)"/i) || tag.match(/\bcontent\s*=\s*'([^']*)'/i) || [])[1];
    if (key && val && !(key.toLowerCase() in map)) map[key.toLowerCase()] = decodeEntities(val.trim());
  }
  return map;
}

// JSON-LD 안의 Product 객체 찾기 (@graph, 배열 포함)
function findJsonLdProduct(html) {
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const stack = [data];
    while (stack.length) {
      const x = stack.pop();
      if (!x || typeof x !== "object") continue;
      if (Array.isArray(x)) stack.push(...x);
      else {
        const t = x["@type"];
        if (t === "Product" || (Array.isArray(t) && t.includes("Product"))) return x;
        if (x["@graph"]) stack.push(x["@graph"]);
      }
    }
  }
  return null;
}

const firstStr = (v) => (Array.isArray(v) ? firstStr(v[0]) : v && typeof v === "object" ? v.url || v.name || null : v || null);

function textOf(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");
}

/**
 * 크기 추정: "360 x 140 x 40 mm", "W 36cm × D 14cm", "가로 36cm 세로 14cm" 등.
 * 위에서 본 면적이 필요하므로 앞의 두 값(가로·깊이)을 쓴다. 결과는 cm.
 */
function guessDimensions(text) {
  const num = "(\\d{1,4}(?:[.,]\\d{1,2})?)";
  const toCm = (v, unit) => {
    const n = parseFloat(String(v).replace(",", "."));
    return unit.toLowerCase() === "mm" ? n / 10 : unit.toLowerCase() === "m" ? n * 100 : n;
  };
  const ok = (w, d) => w >= 1 && d >= 1 && w <= 300 && d <= 300;

  // 1) 360 x 140 (x 40) mm / cm
  const re1 = new RegExp(`${num}\\s*(mm|cm)?\\s*[x×X*]\\s*${num}\\s*(mm|cm)?(?:\\s*[x×X*]\\s*${num}\\s*(mm|cm)?)?`, "g");
  for (const m of text.matchAll(re1)) {
    const unit = m[2] || m[4] || m[6];
    if (!unit) continue; // 단위 없는 숫자는 해상도(2560x1440) 등일 수 있어 제외
    const vals = [m[1], m[3], m[5]].filter(Boolean).map((v) => toCm(v, unit));
    const [w, d] = footprint(vals);
    if (ok(w, d)) return { width: round(w), depth: round(d), text: m[0].trim() };
  }
  // 2) 가로 36cm ... 세로/깊이 14cm
  const w = text.match(new RegExp(`(?:가로|너비|폭|width|W)\\s*[:：]?\\s*${num}\\s*(mm|cm)`, "i"));
  const d = text.match(new RegExp(`(?:세로|깊이|depth|D)\\s*[:：]?\\s*${num}\\s*(mm|cm)`, "i"));
  if (w && d) {
    const wc = toCm(w[1], w[2]);
    const dc = toCm(d[1], d[2]);
    if (ok(wc, dc)) return { width: round(wc), depth: round(dc), text: `${w[0]} / ${d[0]}` };
  }
  return null;
}
const round = (n) => Math.round(n * 10) / 10;

/**
 * 치수 2~3개 중 위에서 본 면적(가로·깊이) 고르기.
 * 쇼핑몰마다 순서가 달라서(아마존은 두께×가로×세로 등), 셋 중 유독 작은 값(두께·높이)은 빼고
 * 나머지 둘을 쓴다. 큰 값을 가로로.
 *  - 키보드 2.05×43×13.2 → 43×13.2   - 모니터 61.5×22×45 → 61.5×22 (22가 유독 작지 않으므로 앞의 둘)
 */
function footprint(vals) {
  if (vals.length < 3) return [Math.max(vals[0], vals[1]), Math.min(vals[0], vals[1])];
  const sorted = [...vals].sort((a, b) => a - b);
  const pair = sorted[0] < sorted[1] * 0.35 ? vals.filter((_, i) => i !== vals.indexOf(sorted[0])) : vals.slice(0, 2);
  return [Math.max(...pair), Math.min(...pair)];
}

function absolutize(src, base) {
  if (!src) return null;
  try {
    const u = new URL(src, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.protocol = "https:"; // https 사이트·앱에서 http 사진은 차단되므로 올려서 사용 (대부분의 이미지 서버가 지원)
    return u.toString();
  } catch {
    return null;
  }
}

/** "Amazon.com: 제품명", "제품명 | 쿠팡", "제품명 - 사이트" 에서 사이트 이름 떼기 */
function cleanTitle(title, siteName, host) {
  let t = title.replace(/\s+/g, " ").trim().replace(/^amazon(\.[a-z.]+)?\s*[:|\-–]\s*/i, "");
  const site = [siteName, host, host.split(".")[0]].filter(Boolean).map((x) => x.toLowerCase());
  const parts = t.split(/\s+[|\-–:]\s+/);
  while (parts.length > 1 && site.some((x) => parts[parts.length - 1].toLowerCase().includes(x))) parts.pop();
  return parts.join(" - ").slice(0, 200);
}

/**
 * 페이지 안의 제품 사진 후보들. 대표 사진(og:image)이 홍보용 합성 이미지인 경우가 많아
 * 흰 배경 제품 사진을 고를 수 있도록 페이지 전체(속성·스크립트 속 JSON 포함)에서 사진 주소를 모은다.
 * 순서: JSON-LD 제품 사진 → 대표 사진 → 페이지에 나온 순서
 */
const IMG_URL = /(?:https?:)?\/\/[^\s"'<>()\\]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>()\\]*)?(?=["'\s<>)\\,]|$)/gi;
const NOT_PRODUCT = /(logo|icon|sprite|badge|favicon|avatar|banner|flag|payment|rating|star|arrow|btn|button|placeholder|loading|blank|pixel|spacer|emoji|social|footer|header)/i;

function imageCandidates(html, ldImages, primary, base) {
  const out = [];
  const seen = new Set();
  const add = (raw) => {
    const u = absolutize(raw, base);
    if (!u || out.length >= 60) return;
    const key = u.replace(/^https?:/, "").split("#")[0];
    const path = key.split("?")[0];
    if (seen.has(key) || seen.has(path)) return;
    if (NOT_PRODUCT.test(path.split("/").pop() || "")) return;
    // 파일 이름에 크기가 적혀 있으면(…_30x30) 작은 아이콘은 제외
    const dims = (u.match(/(\d{2,4})x(\d{2,4})/) || []).slice(1).map(Number);
    if (dims.length === 2 && Math.max(dims[0], dims[1]) < 200) return;
    seen.add(key);
    seen.add(path);
    out.push(u);
  };
  for (const x of ldImages) add(x);
  if (primary) add(primary);
  const text = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&");
  for (const m of text.matchAll(IMG_URL)) add(m[0]);
  return out;
}

// 오픈마켓: 본문에 다른 상품(추천·광고) 정보가 섞여 있어 크기는 제품 정보에서만 찾음
const MARKETPLACES = /(^|\.)(coupang\.com|smartstore\.naver\.com|brand\.naver\.com|11st\.co\.kr|gmarket\.co\.kr|auction\.co\.kr|ssg\.com|lotteon\.com)$/i;

/** 제품 페이지 HTML → 이름·대표 사진·사이트·크기 */
function parse(html, finalUrl) {
  const meta = metaMap(html);
  const ld = findJsonLdProduct(html);
  const titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];

  const title = (ld && ld.name) || meta["og:title"] || meta["twitter:title"] || (titleTag && decodeEntities(titleTag.trim())) || null;
  const imgAttr = (re) => (html.match(re) || [])[1];
  const image = absolutize(
    firstStr(ld && ld.image) ||
      meta["og:image"] || meta["og:image:url"] || meta["twitter:image"] ||
      imgAttr(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)/i) ||
      imgAttr(/<img[^>]+id=["']landingImage["'][^>]+data-old-hires=["']([^"']+)/i) || // 아마존
      imgAttr(/<img[^>]+id=["']landingImage["'][^>]+src=["']([^"']+)/i),
    finalUrl,
  );
  const ldImages = ld ? (Array.isArray(ld.image) ? ld.image : [ld.image]).map(firstStr).filter(Boolean) : [];
  const images = imageCandidates(html, ldImages, image, finalUrl);
  const description = (ld && typeof ld.description === "string" && ld.description) || meta["og:description"] || meta["description"] || "";
  const offer = ld && (Array.isArray(ld.offers) ? ld.offers[0] : ld.offers);
  const price = Number((offer && (offer.price || offer.lowPrice)) || meta["product:price:amount"] || meta["og:price:amount"]) || null;
  const currency = (offer && offer.priceCurrency) || meta["product:price:currency"] || meta["og:price:currency"] || null;
  const brand = ld && ld.brand ? firstStr(ld.brand) : meta["product:brand"] || null;
  const host = new URL(finalUrl).hostname.replace(/^www\./, "");
  const siteName = meta["og:site_name"] || host;

  // 크기: JSON-LD 속성 → 설명 → 본문 순서로 찾기
  const ldProps = ld && Array.isArray(ld.additionalProperty) ? ld.additionalProperty.map((p) => `${p.name} ${p.value}`).join(" ") : "";
  const marketplace = MARKETPLACES.test(host);
  const dimensions =
    guessDimensions(`${ldProps} ${description} ${title || ""}`) || (marketplace ? null : guessDimensions(textOf(html).slice(0, 200000)));

  return {
    url: finalUrl,
    title: title ? cleanTitle(title, siteName, host) : null,
    image,
    images, // 사진 후보 (image 포함)
    siteName,
    brand,
    price,
    currency,
    description: description.slice(0, 300),
    dimensions, // { width, depth (cm), text } | null
  };
}

module.exports = { parse, guessDimensions };
