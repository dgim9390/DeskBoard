// Vercel 서버리스 함수: GET /api/product-preview?url=<제품 페이지 주소>
// 제품 페이지를 대신 읽어 이름·대표 사진·사이트·크기(설명에 적혀 있으면)를 JSON으로 돌려준다.
// (앱/브라우저가 다른 사이트를 직접 읽는 건 CORS로 막혀 있어 서버가 대신 읽음)
//
// 보안(SSRF 방지): 사용자가 준 주소를 서버가 요청하므로
//  - http/https 만, 기본 포트만 허용
//  - DNS로 IP를 확인해 사설·로컬·링크로컬(클라우드 메타데이터 169.254.x) 대역 차단
//  - 리다이렉트는 직접 따라가며 매 단계 재검사 (최대 4회)
//  - 응답 크기 2MB, 시간 8초 제한, HTML만 처리
const dns = require("node:dns").promises;
const net = require("node:net");

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 4;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

class PreviewError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// ── 주소 검사 ─────────────────────────────────────────────
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7)); // IPv4-mapped
  return v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff");
}

async function assertPublicUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new PreviewError("invalid_url", "올바른 링크가 아니에요.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new PreviewError("invalid_url", "http 또는 https 링크만 쓸 수 있어요.");
  if (u.username || u.password) throw new PreviewError("invalid_url", "올바른 링크가 아니에요.");
  if (u.port && !["80", "443"].includes(u.port)) throw new PreviewError("blocked", "이 주소는 불러올 수 없어요.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new PreviewError("blocked", "이 주소는 불러올 수 없어요.");
  }
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (addrs.length === 0) throw new PreviewError("not_found", "사이트를 찾을 수 없어요. 링크를 확인해 주세요.");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new PreviewError("blocked", "이 주소는 불러올 수 없어요.");
  return u;
}

// ── 페이지 가져오기 ───────────────────────────────────────
async function fetchHtml(startUrl) {
  let url = await assertPublicUrl(startUrl);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(url, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = await assertPublicUrl(new URL(res.headers.get("location"), url).toString());
        continue;
      }
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        throw new PreviewError("blocked_by_site", "이 쇼핑몰은 자동으로 정보를 읽는 걸 막고 있어요. 이름과 크기를 직접 입력해 주세요.", 422);
      }
      if (!res.ok) throw new PreviewError("fetch_failed", `페이지를 불러오지 못했어요 (${res.status}).`, 422);
      const type = res.headers.get("content-type") || "";
      if (!/html|xml/i.test(type)) throw new PreviewError("not_html", "제품 페이지 링크가 아닌 것 같아요.", 422);

      // 크기 제한을 지키며 읽기
      const reader = res.body.getReader();
      const chunks = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        chunks.push(value);
        if (total > MAX_BYTES) {
          ctrl.abort();
          break;
        }
      }
      const buf = Buffer.concat(chunks);
      return { html: decode(buf, type), finalUrl: url.toString() };
    }
    throw new PreviewError("too_many_redirects", "페이지 이동이 너무 많아요.", 422);
  } catch (e) {
    if (e instanceof PreviewError) throw e;
    if (e.name === "AbortError") throw new PreviewError("timeout", "사이트 응답이 너무 느려요. 잠시 후 다시 시도해 주세요.", 504);
    throw new PreviewError("fetch_failed", "페이지를 불러오지 못했어요.", 422);
  } finally {
    clearTimeout(timer);
  }
}

// 한국 쇼핑몰 일부는 EUC-KR
function decode(buf, contentType) {
  const head = buf.subarray(0, 4096).toString("latin1");
  const label =
    (contentType.match(/charset=([\w-]+)/i) || [])[1] ||
    (head.match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1] ||
    "utf-8";
  try {
    return new TextDecoder(label.toLowerCase()).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

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
  const description = (ld && typeof ld.description === "string" && ld.description) || meta["og:description"] || meta["description"] || "";
  const offer = ld && (Array.isArray(ld.offers) ? ld.offers[0] : ld.offers);
  const price = Number((offer && (offer.price || offer.lowPrice)) || meta["product:price:amount"] || meta["og:price:amount"]) || null;
  const currency = (offer && offer.priceCurrency) || meta["product:price:currency"] || meta["og:price:currency"] || null;
  const brand = ld && ld.brand ? firstStr(ld.brand) : meta["product:brand"] || null;
  const host = new URL(finalUrl).hostname.replace(/^www\./, "");
  const siteName = meta["og:site_name"] || host;

  // 크기: JSON-LD 속성 → 설명 → 본문 순서로 찾기
  const ldProps = ld && Array.isArray(ld.additionalProperty) ? ld.additionalProperty.map((p) => `${p.name} ${p.value}`).join(" ") : "";
  const dimensions = guessDimensions(`${ldProps} ${description}`) || guessDimensions(textOf(html).slice(0, 200000));

  return {
    url: finalUrl,
    title: title ? cleanTitle(title, siteName, host) : null,
    image,
    siteName,
    brand,
    price,
    currency,
    description: description.slice(0, 300),
    dimensions, // { width, depth (cm), text } | null
  };
}

// ── 핸들러 ───────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // 웹(vercel), 로컬 개발(localhost), 맥 앱(app://) 모두에서 호출
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const target = typeof req.query?.url === "string" ? req.query.url.trim() : "";
  if (!target) return res.status(400).json({ error: "invalid_url", message: "링크를 입력해 주세요." });
  if (target.length > 2048) return res.status(400).json({ error: "invalid_url", message: "링크가 너무 길어요." });

  try {
    const { html, finalUrl } = await fetchHtml(target);
    const data = parse(html, finalUrl);
    if (!data.title && !data.image) {
      return res.status(422).json({ error: "no_product_info", message: "이 페이지에서 제품 정보를 찾지 못했어요. 직접 입력해 주세요." });
    }
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(data);
  } catch (e) {
    const err = e instanceof PreviewError ? e : new PreviewError("fetch_failed", "페이지를 불러오지 못했어요.", 500);
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
};

// 로컬 테스트용
module.exports._internal = { parse, guessDimensions, isPrivateIp, assertPublicUrl };
