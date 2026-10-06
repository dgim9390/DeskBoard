// Vercel 서버리스 함수: GET /api/image-proxy?url=<사진 주소>
// 쇼핑몰 사진은 다른 사이트(CORS)라 앱이 픽셀을 읽을 수 없어 배경을 지울 수 없다.
// 서버가 사진만 대신 받아 같은 출처처럼 넘겨준다. (주소 검사·크기 제한은 _lib/safeFetch.js)
const { FetchError, safeFetch } = require("./_lib/safeFetch");

// SVG는 스크립트를 품을 수 있어 제외
const IMAGE_TYPE = /^image\/(jpeg|jpg|png|webp|gif|avif)\b/i;

/** 실제 파일 앞부분으로 형식 확인 (사진이라고 표시하고 HTML을 주는 서버가 있음) */
function sniff(buf) {
  const hex = buf.subarray(0, 12).toString("hex");
  const ascii = buf.subarray(0, 12).toString("latin1");
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("89504e47")) return "image/png";
  if (ascii.startsWith("GIF8")) return "image/gif";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "image/webp";
  if (/^ftypavi[fs]$/.test(ascii.slice(4, 12))) return "image/avif";
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const target = typeof req.query?.url === "string" ? req.query.url.trim() : "";
  if (!target || target.length > 2048) return res.status(400).json({ error: "invalid_url", message: "사진 주소를 확인해 주세요." });

  try {
    const { buf } = await safeFetch(target, {
      accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
      type: IMAGE_TYPE,
      maxBytes: 8 * 1024 * 1024,
      timeoutMs: 8000,
      referer: true,
      wrongType: "사진 주소가 아닌 것 같아요.",
    });
    const real = sniff(buf);
    if (!real) throw new FetchError("wrong_type", "사진 주소가 아닌 것 같아요.", 422);
    res.setHeader("Content-Type", real);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");
    return res.status(200).send(buf);
  } catch (e) {
    const err = e instanceof FetchError ? e : new FetchError("fetch_failed", "사진을 불러오지 못했어요.", 500);
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
};
