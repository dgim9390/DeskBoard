// 사용자가 준 주소를 서버가 대신 받아오는 공용 함수 (api/ 안의 _ 로 시작하는 폴더는 Vercel 함수가 아님)
//
// 보안(SSRF 방지): 사용자가 준 주소를 서버가 요청하므로
//  - http/https 만, 기본 포트만 허용
//  - DNS로 IP를 확인해 사설·로컬·링크로컬(클라우드 메타데이터 169.254.x) 대역 차단
//  - 리다이렉트는 직접 따라가며 매 단계 재검사 (최대 4회)
//  - 응답 크기·시간 제한, 허용한 종류(HTML 또는 이미지)만 처리
const dns = require("node:dns").promises;
const net = require("node:net");

const MAX_REDIRECTS = 4;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

class FetchError extends Error {
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
    throw new FetchError("invalid_url", "올바른 링크가 아니에요.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new FetchError("invalid_url", "http 또는 https 링크만 쓸 수 있어요.");
  if (u.username || u.password) throw new FetchError("invalid_url", "올바른 링크가 아니에요.");
  if (u.port && !["80", "443"].includes(u.port)) throw new FetchError("blocked", "이 주소는 불러올 수 없어요.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FetchError("blocked", "이 주소는 불러올 수 없어요.");
  }
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (addrs.length === 0) throw new FetchError("not_found", "사이트를 찾을 수 없어요. 링크를 확인해 주세요.");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new FetchError("blocked", "이 주소는 불러올 수 없어요.");
  return u;
}

/**
 * 공개 주소만 받아오기.
 * @param {string} startUrl
 * @param {{ accept: string, type: RegExp, maxBytes: number, timeoutMs: number, wrongType: string, referer?: boolean, truncate?: boolean }} opts
 * @returns {Promise<{ buf: Buffer, type: string, finalUrl: string }>}
 */
async function safeFetch(startUrl, opts) {
  let url = await assertPublicUrl(startUrl);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const headers = { "User-Agent": UA, Accept: opts.accept, "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8" };
      // 이미지 서버 일부는 같은 사이트에서 온 요청만 허용 (핫링크 방지)
      if (opts.referer) headers.Referer = `${url.protocol}//${url.host}/`;
      const res = await fetch(url, { redirect: "manual", signal: ctrl.signal, headers });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = await assertPublicUrl(new URL(res.headers.get("location"), url).toString());
        continue;
      }
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        throw new FetchError("blocked_by_site", "이 사이트는 자동으로 정보를 읽는 걸 막고 있어요.", 422);
      }
      if (!res.ok) throw new FetchError("fetch_failed", `불러오지 못했어요 (${res.status}).`, 422);
      const type = res.headers.get("content-type") || "";
      if (!opts.type.test(type)) throw new FetchError("wrong_type", opts.wrongType, 422);

      // 크기 제한을 지키며 읽기
      const reader = res.body.getReader();
      const chunks = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        chunks.push(value);
        if (total > opts.maxBytes) {
          ctrl.abort();
          // HTML은 앞부분(제목·대표 사진 정보가 있는 곳)만 있어도 충분
          if (opts.truncate) break;
          throw new FetchError("too_large", "파일이 너무 커요.", 413);
        }
      }
      return { buf: Buffer.concat(chunks), type, finalUrl: url.toString() };
    }
    throw new FetchError("too_many_redirects", "페이지 이동이 너무 많아요.", 422);
  } catch (e) {
    if (e instanceof FetchError) throw e;
    if (e.name === "AbortError") throw new FetchError("timeout", "사이트 응답이 너무 느려요. 잠시 후 다시 시도해 주세요.", 504);
    throw new FetchError("fetch_failed", "불러오지 못했어요.", 422);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { FetchError, isPrivateIp, assertPublicUrl, safeFetch };
