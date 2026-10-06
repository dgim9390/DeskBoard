// 서버가 읽지 못하는 쇼핑몰(쿠팡 등 봇 차단)을 맥 앱이 직접 여는 숨은 창.
// 실제 브라우저 엔진으로 사용자 컴퓨터에서 열기 때문에 사람이 보는 것과 같은 페이지를 받는다.
//  - 화면에 보이지 않고, 앱과 분리된 저장소(persist:page-reader) 사용 → 앱 로그인 정보와 섞이지 않음
//  - 사진·글꼴·영상은 받지 않아 빠르게, 새 창·다운로드는 모두 막음
//  - 공개 인터넷 주소만 (로컬·사설망 주소 차단)
const { BrowserWindow, session } = require("electron");
const dns = require("node:dns").promises;
const net = require("node:net");

const PARTITION = "persist:page-reader";
const LOAD_TIMEOUT_MS = 20000;
const SETTLE_TIMEOUT_MS = 8000;
const MAX_HTML = 4 * 1024 * 1024;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return /^(fc|fd|fe[89ab]|ff)/.test(v);
}

async function assertPublicUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("올바른 링크가 아니에요.");
  }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) throw new Error("http 또는 https 링크만 쓸 수 있어요.");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("이 주소는 불러올 수 없어요.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || /\.(localhost|local|internal)$/.test(host)) throw new Error("이 주소는 불러올 수 없어요.");
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (addrs.length === 0) throw new Error("사이트를 찾을 수 없어요. 링크를 확인해 주세요.");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("이 주소는 불러올 수 없어요.");
  return u.toString();
}

/** DNS 조회 없이 주소 모양만으로 판단 (http/https, localhost·사설 IP 아님) */
function isSafeLiteral(raw) {
  try {
    const u = new URL(raw);
    const h = u.hostname.replace(/^\[|\]$/g, "");
    if (!/^https?:$/.test(u.protocol)) return false;
    if (h === "localhost" || /\.(localhost|local|internal)$/.test(h)) return false;
    return !(net.isIP(h) && isPrivateIp(h));
  } catch {
    return false;
  }
}

let configured = false;
function readerSession() {
  const ses = session.fromPartition(PARTITION);
  if (!configured) {
    configured = true;
    // 일반 크롬처럼 보이도록 앱 이름·Electron 표시를 뺀 브라우저 정보
    ses.setUserAgent(ses.getUserAgent().replace(/\s?(Electron|deskterior-desktop|Deskterior)\/\S+/gi, ""));
    ses.webRequest.onBeforeRequest((details, cb) => {
      const block = ["image", "media", "font"].includes(details.resourceType);
      // 페이지 안에서 로컬·사설망으로 가는 요청도 막음 (data:·blob: 은 허용)
      const local = /^https?:/.test(details.url) && !isSafeLiteral(details.url);
      cb({ cancel: block || local });
    });
    ses.on("will-download", (e) => e.preventDefault());
    ses.setPermissionRequestHandler((_wc, _perm, done) => done(false));
  }
  return ses;
}

// 제품 정보(JSON-LD Product 또는 og:title)가 나타날 때까지 기다리는 스크립트
const READY_JS = `(() => {
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => /"Product"/.test(s.textContent));
  const og = document.querySelector('meta[property="og:title"]')?.content || "";
  return ld || (og && !/^null\\b/.test(og));
})()`;

// 접속 제한(403)·자동 접속 확인 페이지
const BLOCKED_JS = `(() => /error403|Access Denied|사용권한이 제한|사용권한이 없|captcha|자동입력 방지/i.test(document.documentElement.innerHTML.slice(0, 20000)))()`;

let queue = Promise.resolve();

/** 페이지를 열어 HTML을 돌려줌. 한 번에 하나씩 */
function readPage(rawUrl) {
  const job = queue.then(() => readOnce(rawUrl));
  queue = job.catch(() => {});
  return job;
}

async function readOnce(rawUrl) {
  const url = await assertPublicUrl(rawUrl);
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: { session: readerSession(), sandbox: true, contextIsolation: true, nodeIntegration: false, images: false, backgroundThrottling: false },
  });
  const wc = win.webContents;
  wc.setAudioMuted(true);
  wc.setWindowOpenHandler(() => ({ action: "deny" }));
  let status = 0;
  wc.on("did-navigate", (_e, _url, code) => {
    status = code;
  });
  // 리다이렉트로 로컬 주소로 가는 것 차단 (이벤트 안에서는 바로 판단해야 해서 주소 모양으로 확인)
  wc.on("will-redirect", (e, next) => {
    if (!isSafeLiteral(next)) e.preventDefault();
  });

  try {
    await Promise.race([
      wc.loadURL(url).catch(() => {}), // 일부 하위 요청 실패(ERR_ABORTED 등)는 무시하고 내용 확인
      new Promise((r) => setTimeout(r, LOAD_TIMEOUT_MS)),
    ]);
    if (status === 401 || status === 403 || status === 429) throw new Error("이 쇼핑몰이 접속을 막았어요. 잠시 후 다시 시도해 주세요.");
    if (status >= 400) throw new Error(`페이지를 불러오지 못했어요 (${status}).`);

    const until = Date.now() + SETTLE_TIMEOUT_MS;
    let ready = false;
    while (!ready && Date.now() < until) {
      ready = await wc.executeJavaScript(READY_JS).catch(() => false);
      if (!ready) await new Promise((r) => setTimeout(r, 400));
    }
    if (!ready) {
      // 봇 차단·오류 페이지(접속 제한 안내 등)는 제품 정보가 없으므로 이유를 알려줌
      const blocked = await wc.executeJavaScript(BLOCKED_JS).catch(() => false);
      if (blocked || status === 403) throw new Error("쇼핑몰이 잠시 접속을 막았어요. 1~2분 뒤 다시 시도하거나, 이름과 크기를 직접 입력해 주세요.");
      throw new Error("이 페이지에서 제품 정보를 찾지 못했어요. 상품 상세 페이지 링크인지 확인해 주세요.");
    }
    const html = await wc.executeJavaScript("document.documentElement.outerHTML");
    return { html: html.slice(0, MAX_HTML), finalUrl: wc.getURL() };
  } finally {
    win.destroy();
  }
}

module.exports = { readPage };
