/** 회전된 사각형(중심 기준)이 차지하는 축정렬 반폭/반높이 */
export function halfExtents(w: number, h: number, rotDeg: number) {
  "worklet";
  const r = (rotDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return { ex: (w * c + h * s) / 2, ey: (w * s + h * c) / 2 };
}

/** 회전을 고려해 사각형이 (0,0)-(dw,dh) 영역 안에 들어오도록 좌상단(x,y)을 보정 */
export function clampInto(x: number, y: number, w: number, h: number, rotDeg: number, dw: number, dh: number) {
  "worklet";
  const { ex, ey } = halfExtents(w, h, rotDeg);
  const cx = Math.min(Math.max(x + w / 2, ex), Math.max(ex, dw - ex));
  const cy = Math.min(Math.max(y + h / 2, ey), Math.max(ey, dh - ey));
  return { x: cx - w / 2, y: cy - h / 2 };
}

export function normalizeDeg(d: number) {
  "worklet";
  let n = d % 360;
  if (n > 180) n -= 360;
  if (n <= -180) n += 360;
  return n;
}
