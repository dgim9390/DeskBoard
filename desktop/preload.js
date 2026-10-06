// 앱 화면(웹)에서 쓸 수 있는 맥 앱 전용 기능. 꼭 필요한 것만 노출
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("deskterior", {
  /** 서버가 읽지 못하는 쇼핑몰(쿠팡 등) 페이지를 앱이 직접 열어 HTML을 받음 */
  readPage: (url) => ipcRenderer.invoke("deskterior:read-page", String(url)),
});
