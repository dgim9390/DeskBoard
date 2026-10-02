import { Platform } from "react-native";

// 불러오지 못한 외부 사진(쇼핑몰 CORS 등)은 투명 1px로 대신해 저장이 실패하지 않게
const TRANSPARENT_PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** 화면의 한 영역(웹 DOM)을 2배 해상도 PNG로 내려받기. 웹·맥 앱 전용 */
export async function exportNodeAsPng(node: unknown, opts: { backgroundColor: string; fileName: string }) {
  if (Platform.OS !== "web" || !node) throw new Error("unsupported");
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(node as HTMLElement, {
    pixelRatio: 2,
    backgroundColor: opts.backgroundColor,
    imagePlaceholder: TRANSPARENT_PX,
    skipFonts: true, // 아이콘 폰트 등 외부 글꼴은 저장 이미지에 필요 없음
    cacheBust: true,
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${opts.fileName}-${stamp}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
