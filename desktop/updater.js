// DeskBoard 맥 앱 업데이트
//
// 1) 화면(웹) 업데이트 — 다시 설치 없이 적용
//    배포 사이트의 최신 화면(index.html + 참조 파일)을 받아 userData/web-live/<해시>/ 에 저장하고,
//    사용자가 "지금 적용"을 누르거나 다음 실행 때 그 화면으로 연다.
//    앱 주소(app://deskterior)는 그대로라 저장한 셋업·로그인이 유지된다.
//    - 받는 곳은 고정된 배포 주소(https)뿐
//    - 필수 파일(js/css)이 하나라도 실패하면 적용하지 않음
//    - 실행 중인 화면에 새 파일을 섞지 않음 (새로고침/재실행 때 통째로 교체)
//    - 앱 자체가 업데이트되면(버전이 바뀌면) 예전에 받은 화면은 버림
//
// 2) 앱 자체 업데이트 알림
//    GitHub 최신 릴리스가 지금 앱보다 새 버전이면 한 번 알려 주고 다운로드 페이지를 연다.
//    (Apple 개발자 서명이 없어 자동 교체는 불가 → 새 앱을 Applications에 덮어쓰기)
const { app, dialog, net, shell } = require("electron");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// 개발 중에만 다른 주소로 시험할 수 있게 허용 (배포된 앱은 항상 고정 주소)
const REMOTE = (!app.isPackaged && process.env.DESKTERIOR_WEB_URL) || "https://deskboard-one.vercel.app"; // 예전 주소(deskterior-one)는 이 주소로 넘겨줌
const RELEASES_API = "https://api.github.com/repos/dgim9390/DeskBoard/releases/latest";
const RELEASES_PAGE = "https://github.com/dgim9390/DeskBoard/releases/latest";

const liveRoot = () => path.join(app.getPath("userData"), "web-live");
const stateFile = () => path.join(liveRoot(), "state.json");
const promptFile = () => path.join(app.getPath("userData"), "update-prompt.json");

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** root 안의 파일 경로 (밖으로 나가는 경로는 null) */
function safeJoin(root, rel) {
  const file = path.normalize(path.join(root, rel));
  return file.startsWith(root + path.sep) ? file : null;
}

/** 이번 실행에서 쓸 "받아둔 최신 화면" 폴더. 없으면 null (앱에 들어 있는 화면 사용) */
function initialLiveDir() {
  const s = readJson(stateFile());
  if (!s || s.appVersion !== app.getVersion()) return null;
  const dir = path.join(liveRoot(), s.dir);
  return fs.existsSync(path.join(dir, "index.html")) ? dir : null;
}

let liveDir = null; // 지금 화면에 쓰는 폴더
let pendingDir = null; // 받아 두었지만 아직 적용 안 한 폴더

function init() {
  liveDir = initialLiveDir();
}

const getLiveDir = () => liveDir;

/** 받아둔 새 화면으로 전환 (창을 새로고침하기 직전에 호출) */
function applyPending() {
  if (pendingDir) {
    liveDir = pendingDir;
    pendingDir = null;
  }
}

/** 배포 주소에서 파일 하나를 받아 dir 에 저장. HTML이 와야 할 자리가 아닌데 HTML이 오면(없는 파일 → index.html) 실패 */
async function download(rel, dir) {
  const target = safeJoin(dir, rel);
  if (!target) return null;
  const res = await net.fetch(`${REMOTE}/${rel}`, { cache: "no-store" });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") || "";
  if (!/\.html?$/.test(rel) && /text\/html/i.test(type)) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buf);
  return target;
}

/**
 * 실행 중 필요한데 받아둔 화면 폴더에 없는 파일(나중에 불러오는 아이콘·폰트 등)을 받아 저장.
 * 파일명에 내용 해시가 들어 있는 정적 파일만 대상.
 */
async function fetchMissingAsset(rel) {
  if (!liveDir || !/^(_expo|assets)\//.test(rel)) return null;
  try {
    return await download(rel, liveDir);
  } catch {
    return null;
  }
}

function currentHash(bundledDir) {
  const dir = pendingDir || liveDir || bundledDir;
  try {
    return sha(fs.readFileSync(path.join(dir, "index.html"), "utf8"));
  } catch {
    return null;
  }
}

/** 새 화면이 있으면 받아 두고 true. (적용은 applyPending + 새로고침) */
async function checkWebUpdate(bundledDir) {
  try {
    const res = await net.fetch(`${REMOTE}/index.html`, { cache: "no-store" });
    if (!res.ok) return false;
    const html = await res.text();
    if (!/_expo\/static\/js\//.test(html)) return false; // 우리 앱 화면이 아니면 무시
    const hash = sha(html);
    if (hash === currentHash(bundledDir)) return false;

    const dir = path.join(liveRoot(), hash);
    fs.rmSync(dir, { recursive: true, force: true });
    const refs = [...new Set([...html.matchAll(/(?:src|href)="\/([^"#?]+)"/g)].map((m) => m[1]))];
    for (const rel of refs) {
      const ok = await download(rel, dir).catch(() => null);
      // 화면을 그리는 js/css 가 빠지면 적용하지 않음 (아이콘 등은 실행 중에 받음)
      if (!ok && /\.(js|css)$/.test(rel)) {
        fs.rmSync(dir, { recursive: true, force: true });
        return false;
      }
    }
    fs.writeFileSync(path.join(dir, "index.html"), html);
    fs.writeFileSync(stateFile(), JSON.stringify({ dir: hash, appVersion: app.getVersion(), savedAt: Date.now() }));
    pendingDir = dir;

    // 지금 쓰는 것·새로 받은 것 외의 예전 화면은 정리
    for (const name of fs.readdirSync(liveRoot())) {
      const p = path.join(liveRoot(), name);
      if (name !== "state.json" && p !== dir && p !== liveDir) fs.rmSync(p, { recursive: true, force: true });
    }
    return true;
  } catch {
    return false; // 오프라인 등: 조용히 넘어감
  }
}

const newer = (a, b) => {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
};

/** GitHub 최신 릴리스 버전 (없거나 실패하면 null) */
async function latestAppVersion() {
  try {
    const res = await net.fetch(RELEASES_API, { headers: { Accept: "application/vnd.github+json", "User-Agent": "DeskBoard" } });
    if (!res.ok) return null;
    const { tag_name: tag } = await res.json();
    return typeof tag === "string" ? tag.replace(/^v/, "") : null;
  } catch {
    return null;
  }
}

async function promptAppUpdate(win, version, { force = false } = {}) {
  const prompted = readJson(promptFile());
  if (!force && prompted && prompted.version === version) return; // 같은 버전은 한 번만 알림
  fs.writeFileSync(promptFile(), JSON.stringify({ version }));
  const { response } = await dialog.showMessageBox(win, {
    type: "info",
    buttons: ["다운로드 페이지 열기", "나중에"],
    defaultId: 0,
    cancelId: 1,
    message: `새 앱 버전 ${version}이 나왔어요`,
    detail: `지금 버전: ${app.getVersion()}\n\n받은 .dmg를 열어 DeskBoard를 Applications 폴더에 끌어다 놓고 "대치"를 누르면 돼요. 기존 앱을 지울 필요는 없고, 저장한 셋업과 로그인은 그대로 남아요.`,
  });
  if (response === 0) shell.openExternal(RELEASES_PAGE);
}

async function promptWebUpdate(win) {
  const { response } = await dialog.showMessageBox(win, {
    type: "info",
    buttons: ["지금 적용", "나중에"],
    defaultId: 0,
    cancelId: 1,
    message: "새 업데이트가 준비됐어요",
    detail: "지금 적용하면 화면이 새로고침돼요. 저장한 셋업과 로그인은 그대로 남아요.\n'나중에'를 누르면 다음에 앱을 열 때 적용돼요.",
  });
  if (response === 0) {
    applyPending();
    win.webContents.reloadIgnoringCache();
  }
}

/**
 * 업데이트 확인. 시작할 때는 조용히(새 것이 있을 때만 알림),
 * 메뉴에서 직접 누르면 결과를 항상 알려줌(manual).
 */
async function checkForUpdates(win, bundledDir, { manual = false } = {}) {
  const latest = await latestAppVersion();
  if (latest && newer(latest, app.getVersion())) {
    await promptAppUpdate(win, latest, { force: manual });
    return;
  }
  const hasWeb = await checkWebUpdate(bundledDir);
  if (hasWeb || pendingDir) return promptWebUpdate(win); // 앞서 받아 두고 '나중에'를 누른 것 포함
  if (manual) {
    await dialog.showMessageBox(win, {
      type: "info",
      buttons: ["확인"],
      message: "최신 버전이에요",
      detail: `앱 버전 ${app.getVersion()}${latest ? "" : "\n(인터넷에 연결돼 있지 않으면 확인할 수 없어요)"}`,
    });
  }
}

module.exports = { init, getLiveDir, fetchMissingAsset, checkForUpdates, applyPending, safeJoin };
