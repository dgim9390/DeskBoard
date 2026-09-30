// 앱을 띄워 화면이 제대로 나오는지 확인하고 스크린샷을 남긴 뒤 종료 (패키징 전 점검용)
const { app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const out = process.env.SMOKE_SHOT || path.join(__dirname, "..", "smoke.png");

app.on("browser-window-created", (_e, win) => {
  win.webContents.once("did-finish-load", async () => {
    await new Promise((r) => setTimeout(r, 3000));
    const result = await win.webContents.executeJavaScript(`({
      origin: location.origin,
      title: document.title,
      loginButton: !!document.querySelector('[aria-label="로그인"]'),
      saveButton: !!document.querySelector('[aria-label="현재 배치 저장"]'),
      picker: document.body.innerText.includes("장비 추가"),
      localStorage: (() => { try { localStorage.setItem("__t", "1"); return localStorage.getItem("__t") === "1"; } catch (e) { return String(e); } })(),
    })`);
    console.log("SMOKE " + JSON.stringify(result));
    const img = await win.webContents.capturePage();
    fs.writeFileSync(out, img.toPNG());
    app.quit();
  });
});

require("../main.js");
