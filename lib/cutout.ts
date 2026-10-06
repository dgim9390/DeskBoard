import { Platform } from "react-native";
import { imageProxyUrl } from "./productLink";

/**
 * 제품 사진 배경 지우기(누끼). 웹·맥 앱 전용, 서버·AI 모델 없이 브라우저에서 바로 처리.
 *
 * 쇼핑몰·공식몰 제품 사진은 대부분 흰색(또는 한 가지 색) 배경이라,
 * 사진 가장자리에서 배경색을 알아내고 가장자리부터 이어진 같은 색 영역을 지운다.
 *  1) 가장자리 픽셀로 배경색과 잡음 정도를 구함 (배경이 여러 색이면 지우지 않음)
 *  2) 가장자리부터 배경색과 가까운 픽셀만 따라가며 지움 (제품 안쪽의 흰 부분은 남음)
 *  3) 경계는 부드럽게(반투명) 하고 배경색 번짐을 걷어냄
 *  4) 제품만 남게 여백을 잘라 WebP(투명)로 저장
 */

export interface CutoutResult {
  ok: boolean;
  /** 배경을 지운 사진 (data:image/webp 또는 png). 실패하면 없음 */
  dataUrl?: string;
  /** 실패 이유 (사용자에게 보여줄 문장) */
  reason?: string;
}

const MAX_SIDE = 640;

/** 투명 배경을 가진(배경을 지운) 사진인지 */
export const isCutout = (uri?: string) => !!uri && /^data:image\/(webp|png)/.test(uri);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load"));
    img.src = src;
  });
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export async function removeBackground(src: string): Promise<CutoutResult> {
  if (Platform.OS !== "web" || typeof document === "undefined") return { ok: false, reason: "배경 지우기는 웹과 맥 앱에서 쓸 수 있어요." };

  let img: HTMLImageElement;
  try {
    // 다른 사이트 사진은 픽셀을 읽을 수 없어(CORS) 링크 읽기 서버를 거쳐 받음
    img = await loadImage(src.startsWith("data:") ? src : imageProxyUrl(src));
  } catch {
    return { ok: false, reason: "사진을 불러오지 못했어요." };
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.max(1, Math.round(img.naturalWidth * scale));
  const H = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { ok: false, reason: "이 브라우저에서는 배경을 지울 수 없어요." };
  ctx.drawImage(img, 0, 0, W, H);

  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, W, H);
  } catch {
    return { ok: false, reason: "이 사진은 보안 설정 때문에 편집할 수 없어요." };
  }
  const px = data.data;
  const N = W * H;

  // ── 가장자리 픽셀 모으기 (2px 띠) ──
  const border: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) border.push(y * W + x);
    }
  }

  // 이미 투명 배경인 사진(PNG 누끼)은 여백만 자름
  const transparentBorder = border.filter((i) => px[i * 4 + 3] < 16).length / border.length;
  if (transparentBorder > 0.6) return finish(canvas, ctx, data, W, H);

  // ── 배경색: 가장자리에서 가장 흔한 색 (8단계로 묶어 세기) ──
  const bins = new Map<number, number[]>();
  for (const i of border) {
    const k = ((px[i * 4] >> 3) << 10) | ((px[i * 4 + 1] >> 3) << 5) | (px[i * 4 + 2] >> 3);
    const arr = bins.get(k);
    if (arr) arr.push(i);
    else bins.set(k, [i]);
  }
  let best: number[] = [];
  for (const arr of bins.values()) if (arr.length > best.length) best = arr;
  const bg = [0, 0, 0];
  for (const i of best) {
    bg[0] += px[i * 4];
    bg[1] += px[i * 4 + 1];
    bg[2] += px[i * 4 + 2];
  }
  bg[0] /= best.length;
  bg[1] /= best.length;
  bg[2] /= best.length;

  const dist = (i: number) => {
    const dr = px[i * 4] - bg[0];
    const dg = px[i * 4 + 1] - bg[1];
    const db = px[i * 4 + 2] - bg[2];
    return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11) * 1.7; // 밝기 가중 (사람 눈에 가깝게)
  };

  // ── 배경이 한 가지 색인지 확인 + 잡음 정도로 기준값 정하기 ──
  const bd = border.map(dist);
  const near = bd.filter((d) => d < 34);
  const uniform = near.length / border.length;
  if (uniform < 0.55) return { ok: false, reason: "배경이 여러 색이라 자동으로 지우지 못했어요. 흰 배경 사진이 가장 잘 돼요." };
  const mean = near.reduce((a, b) => a + b, 0) / near.length;
  const sd = Math.sqrt(near.reduce((a, b) => a + (b - mean) ** 2, 0) / near.length);
  const T = Math.min(42, Math.max(12, mean + sd * 3 + 8));

  /** 채도가 낮은(회색 계열) 픽셀: 그림자·반사는 대부분 무채색 */
  const neutral = (i: number) => {
    const r = px[i * 4];
    const g = px[i * 4 + 1];
    const b = px[i * 4 + 2];
    return Math.max(r, g, b) - Math.min(r, g, b) < 16;
  };

  // ── 가장자리부터 배경 따라가며 지우기 ──
  const D = new Float32Array(N);
  for (let i = 0; i < N; i++) D[i] = dist(i);
  const isBg = new Uint8Array(N);
  const queue = new Int32Array(N);
  let head = 0;
  let tail = 0;
  for (const i of border) {
    if (D[i] < T && !isBg[i]) {
      isBg[i] = 1;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % W;
    const y = (i - x) / W;
    const visit = (j: number) => {
      if (isBg[j]) return;
      // 배경색과 가깝거나, 배경에서 부드럽게 이어지는 무채색 그림자·반사(한 칸씩 조금만 변함)는 배경으로
      const soft = D[j] < T * 3 && Math.abs(D[j] - D[i]) < 2.5 && neutral(j);
      if (D[j] < T || soft) {
        isBg[j] = 1;
        queue[tail++] = j;
      }
    };
    if (x > 0) visit(i - 1);
    if (x < W - 1) visit(i + 1);
    if (y > 0) visit(i - W);
    if (y < H - 1) visit(i + W);
  }

  const fgCount = N - tail;
  if (fgCount < N * 0.01) return { ok: false, reason: "제품과 배경 색이 비슷해서 구분하지 못했어요." };
  if (tail < N * 0.03) return { ok: false, reason: "지울 배경을 찾지 못했어요." };

  // ── 어두운 제품이면 바닥 반사·그림자(밝은 회색)도 배경: 배경에 닿아 있는 밝은 무채색만 따라가며 지움 ──
  // (밝은 제품은 몸통도 밝은 회색이라 건드리지 않음)
  const luma = (i: number) => 0.3 * px[i * 4] + 0.59 * px[i * 4 + 1] + 0.11 * px[i * 4 + 2];
  const bgLuma = 0.3 * bg[0] + 0.59 * bg[1] + 0.11 * bg[2];
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < N; i++) if (!isBg[i]) (sum += luma(i)), cnt++;
  if (cnt && sum / cnt < 110 && bgLuma > 170) {
    head = 0;
    tail = 0;
    for (let i = 0; i < N; i++) if (isBg[i]) queue[tail++] = i;
    while (head < tail) {
      const i = queue[head++];
      const x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j >= 0 && j < N && !isBg[j] && neutral(j) && luma(j) >= bgLuma - 80) {
          isBg[j] = 1;
          queue[tail++] = j;
        }
      }
    }
  }

  // ── 갇힌 배경 지우기: 손잡이 사이처럼 제품·그림자에 둘러싸여 바깥과 끊긴 배경 ──
  // 배경색과 거의 똑같은(잡음 수준) 픽셀이 넓게(사진의 0.4% 이상) 모인 곳만. 흰 제품의 몸통은 음영이 있어 해당 안 됨
  removeEnclosedBackground(isBg, D, W, H, queue, Math.min(6, T * 0.5));

  // ── 본 제품만 남기기: 사진 속 따로 떨어진 작은 조각(부속품, 스위치, 글자 등)은 지움 ──
  keepMainParts(isBg, W, H, queue);

  // ── 투명도: 배경은 0, 경계(배경과 닿은 제품 픽셀)는 색 차이만큼 반투명 ──
  for (let i = 0; i < N; i++) {
    if (isBg[i]) {
      px[i * 4 + 3] = 0;
      continue;
    }
    const x = i % W;
    const y = (i - x) / W;
    const edge = (x > 0 && isBg[i - 1]) || (x < W - 1 && isBg[i + 1]) || (y > 0 && isBg[i - W]) || (y < H - 1 && isBg[i + W]);
    if (!edge) continue;
    const a = Math.max(0.25, smoothstep(T * 0.8, T * 2.4, D[i]));
    // 배경색이 섞인 경계 색을 걷어냄: 관측색 = a·제품색 + (1-a)·배경색
    for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.min(255, Math.max(0, (px[i * 4 + c] - (1 - a) * bg[c]) / a));
    px[i * 4 + 3] = Math.round(px[i * 4 + 3] * a);
  }

  return finish(canvas, ctx, data, W, H);
}

function removeEnclosedBackground(isBg: Uint8Array, D: Float32Array, W: number, H: number, queue: Int32Array, tol: number) {
  const N = W * H;
  const seen = new Uint8Array(N);
  const minArea = N * 0.004;
  for (let start = 0; start < N; start++) {
    if (isBg[start] || seen[start] || D[start] >= tol) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    seen[start] = 1;
    while (head < tail) {
      const i = queue[head++];
      const x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j >= 0 && j < N && !seen[j] && !isBg[j] && D[j] < tol) {
          seen[j] = 1;
          queue[tail++] = j;
        }
      }
    }
    if (tail >= minArea) for (let k = 0; k < tail; k++) isBg[queue[k]] = 1;
  }
}

/**
 * 배경이 아닌 픽셀을 이어진 덩어리로 나눠, 가장 큰 덩어리의 12% 미만인 조각은 배경으로 돌림.
 * (제품 사진에 함께 찍힌 부속품·로고·설명 글자 정리)
 */
function keepMainParts(isBg: Uint8Array, W: number, H: number, queue: Int32Array) {
  const N = W * H;
  const label = new Int32Array(N); // 0 = 아직, 그 외 덩어리 번호
  const sizes: number[] = [0];
  for (let start = 0; start < N; start++) {
    if (isBg[start] || label[start]) continue;
    const id = sizes.length;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    label[start] = id;
    while (head < tail) {
      const i = queue[head++];
      const x = i % W;
      const y = (i - x) / W;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const j = yy * W + xx;
          if (!isBg[j] && !label[j]) {
            label[j] = id;
            queue[tail++] = j;
          }
        }
      }
    }
    sizes.push(tail);
  }
  const largest = Math.max(...sizes);
  for (let i = 0; i < N; i++) if (label[i] && sizes[label[i]] < largest * 0.12) isBg[i] = 1;
}

/** 제품만 남게 여백을 자르고 투명 이미지로 저장 */
function finish(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, data: ImageData, W: number, H: number): CutoutResult {
  const px = data.data;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { ok: false, reason: "제품을 찾지 못했어요." };
  ctx.putImageData(data, 0, 0);
  const pad = 2;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(W - 1, x1 + pad);
  y1 = Math.min(H - 1, y1 + pad);
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext("2d")!.drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  // WebP(투명 지원, 작음). 지원하지 않는 브라우저는 PNG로 자동 대체됨
  return { ok: true, dataUrl: out.toDataURL("image/webp", 0.9) };
}

/**
 * 사진이 배경 지우기에 얼마나 알맞은지 점수 (가장자리가 한 가지 색, 특히 흰색일수록 높음).
 * 작은 크기로만 그려 보고 판단하므로 빠름. 불러오지 못하거나 너무 작으면 -1
 */
async function cleanScore(src: string): Promise<number> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(src.startsWith("data:") ? src : imageProxyUrl(src));
  } catch {
    return -1;
  }
  if (Math.min(img.naturalWidth, img.naturalHeight) < 220) return -1;
  const k = 112 / Math.max(img.naturalWidth, img.naturalHeight);
  const W = Math.max(8, Math.round(img.naturalWidth * k));
  const H = Math.max(8, Math.round(img.naturalHeight * k));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return -1;
  g.drawImage(img, 0, 0, W, H);
  let px: Uint8ClampedArray;
  try {
    px = g.getImageData(0, 0, W, H).data;
  } catch {
    return -1;
  }
  const border: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) border.push(y * W + x);
  const bins = new Map<number, number>();
  let bestKey = 0;
  let bestN = 0;
  for (const i of border) {
    const key = ((px[i * 4] >> 4) << 8) | ((px[i * 4 + 1] >> 4) << 4) | (px[i * 4 + 2] >> 4);
    const n = (bins.get(key) ?? 0) + 1;
    bins.set(key, n);
    if (n > bestN) {
      bestN = n;
      bestKey = key;
    }
  }
  const bg = [((bestKey >> 8) & 15) * 16 + 8, ((bestKey >> 4) & 15) * 16 + 8, (bestKey & 15) * 16 + 8];
  const dist = (i: number) => Math.hypot(px[i * 4] - bg[0], px[i * 4 + 1] - bg[1], px[i * 4 + 2] - bg[2]);
  const uniform = border.filter((i) => dist(i) < 30).length / border.length;
  const N = W * H;
  const isFg = new Uint8Array(N);
  let fg = 0;
  for (let i = 0; i < N; i++) if (dist(i) >= 30) (isFg[i] = 1), fg++;
  const fgRatio = fg / N;
  // 제품이 여러 개 찍힌 사진(색상별 모음 등)은 점수를 낮춤: 큰 덩어리가 2개 이상이면
  const sizes: number[] = [];
  let mainFill = 0; // 가장 큰 덩어리가 자기 테두리 상자를 채우는 비율 (제품 하나면 높고, 겹친 여러 개면 낮음)
  const seen = new Uint8Array(N);
  const stack: number[] = [];
  for (let s0 = 0; s0 < N; s0++) {
    if (!isFg[s0] || seen[s0]) continue;
    let n = 0;
    let x0 = W;
    let x1 = 0;
    let y0 = H;
    let y1 = 0;
    stack.push(s0);
    seen[s0] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      n++;
      const x = i % W;
      const y = (i - x) / W;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j >= 0 && j < N && isFg[j] && !seen[j]) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    if (!sizes.length || n > Math.max(...sizes)) mainFill = n / ((x1 - x0 + 1) * (y1 - y0 + 1));
    sizes.push(n);
  }
  sizes.sort((a, b) => b - a);
  const luma = 0.3 * bg[0] + 0.59 * bg[1] + 0.11 * bg[2];
  let score = uniform;
  if (luma > 225) score += 0.25; // 흰 배경 제품 사진
  if (fgRatio < 0.06 || fgRatio > 0.85) score -= 0.5; // 거의 비었거나 꽉 찬(확대) 사진
  if (W / H > 1.9 || H / W > 1.9) score -= 0.15; // 가로로 긴 배너
  if (sizes.length > 1 && sizes[1] > sizes[0] * 0.35) score -= 0.3; // 제품 여러 개
  score += mainFill * 0.3; // 제품 하나가 또렷한 사진 우대
  return score;
}

/** 파일 이름으로 본 우선순위: 제품 사진처럼 보이는 것 먼저, 배너·배경 사진은 뒤로 */
function rankCandidates(urls: string[]) {
  const rank = (u: string, i: number) => {
    const name = decodeURIComponent(u.split("/").pop() ?? "").toLowerCase();
    let r = i < 2 ? 0 : 2; // 맨 앞(제품 정보·대표 사진)은 그대로 먼저
    if (/(gallery|product|packshot|main|detail|front|zoom|thumb|item|goods)/.test(name)) r = Math.min(r, 1);
    if (/(hero|banner|background|lifestyle|visual|kv|bg[_-]|cover|promo)/.test(name)) r = 3;
    const [w, h] = (name.match(/(\d{2,4})x(\d{2,4})/) ?? []).slice(1).map(Number);
    if (w && h && (w / h > 1.9 || h / w > 1.9)) r += 1;
    return r;
  };
  return urls.map((u, i) => ({ u, r: rank(u, i), i })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.u);
}

/**
 * 사진 후보를 배경 지우기에 좋은 순서로 정렬 (앞쪽 후보부터 최대 limit개 검사).
 * 불러오지 못했거나 너무 작은 사진(로고·아이콘)은 빼고, 검사하지 않은 나머지는 뒤에 그대로 붙임.
 * best: 깔끔한 사진(점수 1 이상)이 있으면 그 주소
 */
export async function rankImages(urls: string[], limit = 16): Promise<{ ranked: string[]; best: string | null }> {
  if (Platform.OS !== "web" || typeof document === "undefined") return { ranked: urls, best: null };
  const ordered = rankCandidates(urls);
  const list = ordered.slice(0, limit);
  const scores: number[] = new Array(list.length).fill(-1);
  // 6장씩 나눠 받기
  for (let i = 0; i < list.length; i += 6) {
    const part = await Promise.all(list.slice(i, i + 6).map(cleanScore));
    part.forEach((v, j) => (scores[i + j] = v));
  }
  const scored = list.map((url, i) => ({ url, score: scores[i], i })).filter((x) => x.score >= 0);
  // 점수 순 (0.01 단위로 같으면 원래 순서 = 대표 사진에 가까운 것 먼저)
  const q = (x: number) => Math.round(x * 100);
  scored.sort((a, b) => q(b.score) - q(a.score) || a.i - b.i);
  const best = scored[0] && scored[0].score >= 1 ? scored[0].url : null;
  return { ranked: [...scored.map((x) => x.url), ...ordered.slice(limit)], best };
}

/** 내 컴퓨터의 사진 파일 고르기 → data URL (웹·맥 앱) */
export function pickImageFile(): Promise<string | null> {
  return new Promise((resolve) => {
    if (Platform.OS !== "web" || typeof document === "undefined") return resolve(null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > 15 * 1024 * 1024) return resolve(null);
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result !== "string") return resolve(null);
        // 큰 사진은 저장 공간을 많이 차지하므로 줄여서 보관
        try {
          const img = await loadImage(reader.result);
          const k = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
          const c = document.createElement("canvas");
          c.width = Math.round(img.naturalWidth * k);
          c.height = Math.round(img.naturalHeight * k);
          c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
          resolve(file.type === "image/jpeg" ? c.toDataURL("image/jpeg", 0.85) : c.toDataURL("image/webp", 0.9));
        } catch {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}
