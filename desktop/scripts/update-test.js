// 화면 업데이트 동작 시험 (개발용): DESKTERIOR_WEB_URL 로 가짜 최신 화면을 띄워 두고 실행
//  - userData 를 임시 폴더로 바꿔 설치된 앱 데이터에 영향 없음
//  - 업데이트 알림은 자동으로 "지금 적용"
const { app, dialog } = require("electron");
const path = require("node:path");
app.setPath("userData", process.env.TEST_USERDATA);
const answers = [];
dialog.showMessageBox = async (_w, opts) => {
  answers.push(opts.message);
  return { response: 0 };
};
app.on("browser-window-created", (_e, win) => {
  const titles = [];
  win.webContents.on("did-finish-load", () => titles.push(win.webContents.getTitle()));
  setTimeout(async () => {
    const title = await win.webContents.executeJavaScript("document.title");
    console.log("UPDATE-TEST " + JSON.stringify({ dialogs: answers, loads: titles, finalTitle: title }));
    app.exit(0);
  }, 14000);
});
setTimeout(() => app.exit(1), 30000);
require(path.join(__dirname, "..", "main.js"));
