// Deskterior macOS 앱 (Electron)
// Expo 웹 빌드(web/)를 앱 안에 넣고 app://deskterior 주소로 띄운다.
// file:// 로 열면 절대경로(/_expo/...)와 localStorage가 깨지므로 전용 프로토콜을 쓴다.
const { app, BrowserWindow, Menu, net, protocol, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const SCHEME = "app";
const HOST = "deskterior";
const WEB_ROOT = path.join(__dirname, "web");
const STATE_FILE = () => path.join(app.getPath("userData"), "window-state.json");

// 일반 웹사이트처럼 동작하도록 권한 부여 (localStorage, fetch, 보안 컨텍스트)
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

function serveWebRoot() {
  protocol.handle(SCHEME, (request) => {
    const { pathname } = new URL(request.url);
    const rel = decodeURIComponent(pathname).replace(/^\/+/, "");
    const file = path.normalize(path.join(WEB_ROOT, rel));
    // web/ 밖의 파일은 접근 금지
    const inside = file.startsWith(WEB_ROOT + path.sep) || file === WEB_ROOT;
    const exists = inside && fs.existsSync(file) && fs.statSync(file).isFile();
    // 없는 경로(/recommend 등)는 앱 화면(index.html)으로 → 앱 안에서 라우팅
    return net.fetch(pathToFileURL(exists ? file : path.join(WEB_ROOT, "index.html")).toString());
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

  win.once("ready-to-show", () => win.show());
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
    { role: "appMenu" },
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
