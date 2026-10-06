// Vercel 서버리스 함수: GET /api/product-preview?url=<제품 페이지 주소>
// 제품 페이지를 대신 읽어 이름·대표 사진·사이트·크기(설명에 적혀 있으면)를 JSON으로 돌려준다.
// (앱/브라우저가 다른 사이트를 직접 읽는 건 CORS로 막혀 있어 서버가 대신 읽음)
// 주소 검사(SSRF 방지)는 _lib/safeFetch.js, HTML 해석은 lib/productParse.js (맥 앱과 공유)
const { FetchError, isPrivateIp, assertPublicUrl, safeFetch } = require("./_lib/safeFetch");
const { parse, guessDimensions } = require("../lib/productParse");

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
    const { buf, type, finalUrl } = await safeFetch(target, {
      accept: "text/html,application/xhtml+xml",
      type: /html|xml/i,
      maxBytes: 2 * 1024 * 1024,
      timeoutMs: 8000,
      truncate: true,
      wrongType: "제품 페이지 링크가 아닌 것 같아요.",
    });
    const data = parse(decode(buf, type), finalUrl);
    if (!data.title && !data.image) {
      return res.status(422).json({ error: "no_product_info", message: "이 페이지에서 제품 정보를 찾지 못했어요. 직접 입력해 주세요." });
    }
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(data);
  } catch (e) {
    const err = e instanceof FetchError ? e : new FetchError("fetch_failed", "페이지를 불러오지 못했어요.", 500);
    const message =
      err.code === "blocked_by_site"
        ? "이 쇼핑몰은 자동으로 정보를 읽는 걸 막고 있어요. 제조사 공식 홈페이지의 제품 링크를 넣거나, 이름과 크기를 직접 입력해 주세요."
        : err.code === "fetch_failed" && err.status === 422
          ? `페이지를 ${err.message}`
          : err.message;
    return res.status(err.status).json({ error: err.code, message });
  }
};

// 로컬 테스트용
module.exports._internal = { parse, guessDimensions, isPrivateIp, assertPublicUrl };
