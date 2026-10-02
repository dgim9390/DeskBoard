// SVG 아이콘 → 1024px PNG (투명 배경) 렌더링
// 사용: npx electron build/render-icon.js [입력.svg] [출력.png]
//       인자를 생략하면 build/icon.svg → build/icon.png
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const args = process.argv.slice(2).filter((a) => !a.startsWith("-") && a !== __filename && !a.endsWith("render-icon.js"));
const input = path.resolve(args[0] ?? path.join(__dirname, "icon.svg"));
const output = path.resolve(args[1] ?? path.join(__dirname, "icon.png"));

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const svg = fs.readFileSync(input, "utf8");
  const win = new BrowserWindow({ width: 1024, height: 1024, show: false, transparent: true, frame: false, webPreferences: { offscreen: true } });
  win.webContents.setZoomFactor(1);
  const html = `<html><body style="margin:0;background:transparent">${svg}</body></html>`;
  await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 300));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
  fs.writeFileSync(output, img.resize({ width: 1024, height: 1024 }).toPNG());
  console.log(`rendered ${path.basename(input)} → ${output}`);
  app.quit();
});
