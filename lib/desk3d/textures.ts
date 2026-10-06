import * as THREE from "three";
import { MATERIALS } from "@/components/DeskSurface";
import type { DeskMaterial } from "@/store/useDeskStore";

// 3D 보기에서 쓰는 그림(텍스처). 모두 캔버스에 직접 그려 외부 파일이 필요 없음

function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function toTexture(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** 책상 상판: 2D 상판과 같은 색·결 */
export function deskTexture(material: DeskMaterial = "oak") {
  const m = MATERIALS[material] ?? MATERIALS.oak;
  const [c, g] = canvas(2048, 1024);
  const grad = g.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, m.base[0]);
  grad.addColorStop(0.5, m.base[1]);
  grad.addColorStop(1, m.base[2]);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  const rnd = seeded(7);
  if (m.grain) {
    // 나뭇결: 가로로 흐르는 물결선
    for (let i = 0; i < 140; i++) {
      const y = rnd() * c.height;
      const d = () => (rnd() - 0.5) * 50;
      const dark = rnd() > 0.35;
      g.strokeStyle = dark ? m.grain.dark : m.grain.light;
      g.globalAlpha = (dark ? m.grain.darkOp : m.grain.lightOp) * (0.4 + rnd() * 0.8);
      g.lineWidth = 1 + rnd() * 4;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(c.width * 0.28, y + d(), c.width * 0.64, y + d(), c.width, y + d());
      g.stroke();
    }
  }
  if (m.speck) {
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = rnd() > 0.45 ? m.speck.dark : m.speck.light;
      g.globalAlpha = m.speck.op * (0.5 + rnd());
      g.beginPath();
      g.arc(rnd() * c.width, rnd() * c.height, 0.8 + rnd() * 2.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 1;
  return { map: toTexture(c), edge: m.edge, sheen: m.sheen ?? 0 };
}

/** 모니터·노트북 화면: 은은한 배경화면 */
export function screenTexture() {
  const [c, g] = canvas(512, 288);
  const bg = g.createLinearGradient(0, 0, c.width, c.height);
  bg.addColorStop(0, "#1e2a5a");
  bg.addColorStop(0.55, "#3a2e6e");
  bg.addColorStop(1, "#0f3a4a");
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  const blob = (x: number, y: number, r: number, color: string, a: number) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = a;
    g.fillStyle = rg;
    g.fillRect(0, 0, c.width, c.height);
  };
  blob(140, 90, 200, "#7c8cff", 0.55);
  blob(400, 210, 220, "#2dd4bf", 0.35);
  blob(330, 60, 160, "#f472b6", 0.25);
  g.globalAlpha = 1;
  // 메뉴 막대와 독
  g.fillStyle = "rgba(255,255,255,0.12)";
  g.fillRect(0, 0, c.width, 10);
  g.fillStyle = "rgba(255,255,255,0.18)";
  g.beginPath();
  g.roundRect(c.width / 2 - 90, c.height - 26, 180, 18, 6);
  g.fill();
  return toTexture(c);
}

/** 이름이 적힌 상자 윗면 */
export function labelTexture(text: string, dark: boolean) {
  const [c, g] = canvas(512, 256);
  g.fillStyle = dark ? "#2a2a2f" : "#e7e7ea";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = dark ? "#e4e4e7" : "#27272a";
  g.font = "600 44px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const t = text.length > 14 ? `${text.slice(0, 13)}…` : text;
  g.fillText(t, c.width / 2, c.height / 2);
  return toTexture(c);
}

/** 탁상시계 숫자판 */
export function clockTexture() {
  const [c, g] = canvas(256, 128);
  g.fillStyle = "#0b0b0d";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#ff8a5c";
  g.font = "700 72px Menlo, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("12:34", c.width / 2, c.height / 2 + 4);
  return toTexture(c);
}

/** 바닥: 은은한 원목 마루 */
export function floorTexture() {
  const [c, g] = canvas(1024, 1024);
  const rnd = seeded(3);
  const plank = 128;
  for (let y = 0; y < c.height; y += plank) {
    const offset = rnd() * c.width;
    for (let x = -offset; x < c.width; x += 600) {
      const l = 30 + rnd() * 10;
      g.fillStyle = `hsl(28, 18%, ${l}%)`;
      g.fillRect(x, y, 600, plank);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(x, y, 2, plank);
    }
    g.fillStyle = "rgba(0,0,0,0.3)";
    g.fillRect(0, y, c.width, 2);
  }
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
