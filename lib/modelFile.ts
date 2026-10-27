import { Platform } from "react-native";

/** 3D 모델 파일 크기 한도: 기기·계정 저장에 통째로 들어가므로 너무 크면 받지 않음 */
export const MODEL_MAX_MB = 10;

/** 3D 모델 파일(.glb) 고르기 → data URL. 취소하면 null, 너무 크거나 형식이 다르면 오류 문구 */
export function pickModelFile(): Promise<{ url?: string; error?: string } | null> {
  return new Promise((resolve) => {
    if (Platform.OS !== "web" || typeof document === "undefined") return resolve({ error: "3D 모델은 웹과 맥 앱에서 올릴 수 있어요" });
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".glb,model/gltf-binary";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (!/\.glb$/i.test(file.name)) return resolve({ error: ".glb 파일만 올릴 수 있어요" });
      if (file.size > MODEL_MAX_MB * 1024 * 1024) return resolve({ error: `${MODEL_MAX_MB}MB 이하의 파일만 올릴 수 있어요` });
      const reader = new FileReader();
      // 확장자로만 고른 파일은 형식이 비어 있을 수 있어 glb 형식으로 고정
      reader.onload = () => resolve(typeof reader.result === "string" ? { url: reader.result.replace(/^data:[^;]*;/, "data:model/gltf-binary;") } : null);
      reader.onerror = () => resolve({ error: "파일을 읽지 못했어요" });
      reader.readAsDataURL(file);
    };
    input.click();
  });
}
