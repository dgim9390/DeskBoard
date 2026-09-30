// Deskterior macOS 앱 (Electron)
// Expo 웹 빌드(web/)를 앱 안에 넣고 app://deskterior 주소로 띄운다.
// file:// 로 열면 절대경로(/_expo/...)와 localStorage가 깨지므로 전용 프로토콜을 쓴다.
const { app, BrowserWindow, Menu, net, protocol, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const updater = require("./updater");

const SCHEME = "app";
const HOST = "deskterior";
const WEB_ROOT = path.join(__dirname, "web");
const STATE_FILE = () => path.join(app.getPath("userData"), "window-state.json");

// 일반 웹사이트처럼 동작하도록 권한 부여 (localStorage, fetch, 보안 컨텍스트)
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

const isFile = (f) => !!f && fs.existsSync(f) && fs.statSync(f).isFile();
const serveFile = (f) => net.fetch(pathToFileURL(f).toString());

function serveWebRoot() {
  protocol.handle(SCHEME, async (request) => {
    const { pathname } = new URL(request.url);
    const rel = decodeURIComponent(pathname).replace(/^\/+/, "");
    // 받아둔 최신 화면(있으면) → 앱에 들어 있는 화면 순서로 찾음. 각 폴더 밖 경로는 접근 금지
    const live = updater.getLiveDir();
    const roots = [live, WEB_ROOT].filter(Boolean);
    if (rel) {
      for (const root of roots) {
        const file = updater.safeJoin(root, rel);
        if (isFile(file)) return serveFile(file);
      }
      // 최신 화면이 나중에 부르는 정적 파일(아이콘·폰트 등)은 배포 주소에서 받아 저장
      const fetched = await updater.fetchMissingAsset(rel);
      if (fetched) return serveFile(fetched);
    }
    // 없는 경로(/recommend 등)는 앱 화면(index.html)으로 → 앱 안에서 라우팅
    return serveFile(path.join(live || WEB_ROOT, "index.html"));
  });
}

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE(), "utf8"));
  } catch {
    return { width: 1200, height: 860 };
  }
}

function saveWindowState(win) {
  try {
    if (!win.isMinimized() && !win.isFullScreen()) fs.writeFileSync(STATE_FILE(), JSON.stringify(win.getBounds()));
  } catch {
    /* 창 위치 저장 실패는 무시 */
  }
}

function createWindow() {
  const state = loadWindowState();
  const win = new BrowserWindow({
    ...state,
    minWidth: 420,
    minHeight: 700,
    title: "Deskterior",
    backgroundColor: "#09090b",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => {
    win.show();
    // 창이 뜬 뒤 조용히 업데이트 확인 (새 것이 있을 때만 알림)
    setTimeout(() => updater.checkForUpdates(win, WEB_ROOT), 3000);
  });
  win.on("close", () => saveWindowState(win));

  // 새 창/외부 링크는 앱 안이 아니라 기본 브라우저로
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(`${SCHEME}://${HOST}`)) {
      e.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL(`${SCHEME}://${HOST}/`);
  return win;
}

// macOS 기본 메뉴 (복사/붙여넣기, 새로고침, 창 닫기 등)
function buildMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: "about", label: "Deskterior 정보" },
        {
          label: "업데이트 확인…",
          click: () => {
            const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
            if (win) updater.checkForUpdates(win, WEB_ROOT, { manual: true });
          },
        },
        { type: "separator" },
        { role: "hide", label: "Deskterior 가리기" },
        { role: "hideOthers", label: "기타 가리기" },
        { role: "unhide", label: "모두 보기" },
        { type: "separator" },
        { role: "quit", label: "Deskterior 종료" },
      ],
    },
    { role: "editMenu" },
    {
      label: "보기",
      submenu: [{ role: "reload", label: "새로고침" }, { role: "togglefullscreen", label: "전체 화면" }, { type: "separator" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }],
    },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  updater.init();
  serveWebRoot();
  buildMenu();
  createWindow();
  // Dock 아이콘을 눌렀는데 창이 없으면 다시 열기 (macOS 관례)
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// macOS 외 플랫폼은 창을 닫으면 종료
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
