import type { DeskItem, DeskSize, ProductKind } from "@/store/useDeskStore";

interface Size {
  width: number;
  height: number;
}

/** 아래에 깔리는 제품: 다른 제품이 위에 올라가도 되므로 자리 차지로 보지 않음 */
const UNDERLAY: ProductKind[] = ["desk-mat", "mouse-pad", "monitor-riser"];
/** 일부러 다른 장비에 붙여 놓는 제품: 겹침 회피를 하지 않음 */
const ANCHORED: ProductKind[] = [...UNDERLAY, "wrist-rest", "light-bar", "monitor-arm", "soundbar", "laptop-stand", "laptop-vertical-stand"];

/** 추천 제품을 책상에 놓을 때의 자연스러운 위치(cm). 원하는 자리가 차 있으면 가장 가까운 빈 자리로 */
export function suggestPosition(kind: ProductKind, size: Size, items: DeskItem[], desk: DeskSize) {
  const preferred = preferredPosition(kind, size, items, desk);
  return ANCHORED.includes(kind) ? preferred : nearestFreeSpot(preferred, size, items, desk);
}

/** 원하는 자리에서 가장 가까운 빈 자리. 완전히 빈 곳이 없으면 다른 제품을 가장 적게 가리는 자리 */
function nearestFreeSpot(pref: { x: number; y: number }, size: Size, items: DeskItem[], desk: DeskSize) {
  const GAP = 1;
  const obstacles = items.filter((i) => !i.kind || !UNDERLAY.includes(i.kind));
  const overlap = (x: number, y: number) =>
    obstacles.reduce((sum, o) => {
      const ox = Math.min(x + size.width + GAP, o.x + o.width) - Math.max(x - GAP, o.x);
      const oy = Math.min(y + size.height + GAP, o.y + o.height) - Math.max(y - GAP, o.y);
      // 가려지는 비율로 계산: 작은 소품을 통째로 덮는 것보다 큰 장비 모서리에 살짝 걸치는 편이 나음
      return sum + (ox > 0 && oy > 0 ? (ox * oy) / (o.width * o.height) : 0);
    }, 0);
  const px = Math.min(Math.max(pref.x, 0), Math.max(0, desk.width - size.width));
  const py = Math.min(Math.max(pref.y, 0), Math.max(0, desk.depth - size.height));
  let best = { x: px, y: py };
  let bestCost = overlap(px, py);
  let bestD = 0;
  if (bestCost === 0) return best;
  const STEP = 2;
  for (let x = 0; x <= desk.width - size.width; x += STEP)
    for (let y = 0; y <= desk.depth - size.height; y += STEP) {
      const cost = overlap(x, y);
      const d = (x - px) ** 2 + (y - py) ** 2;
      if (cost < bestCost - 0.01 || (Math.abs(cost - bestCost) <= 0.01 && d < bestD)) {
        best = { x, y };
        bestCost = cost;
        bestD = d;
      }
    }
  return best;
}

function preferredPosition(kind: ProductKind, size: Size, items: DeskItem[], desk: DeskSize) {
  const centerX = (desk.width - size.width) / 2;
  const jitter = () => (Math.random() - 0.5) * 6;
  const monitor = items.find((i) => i.category === "monitor");
  const keyboard = items.find((i) => i.category === "keyboard");
  const mouse = items.find((i) => i.category === "mouse");
  const M = 3; // 책상 가장자리 여백
  const centerOn = (t: DeskItem) => ({ x: t.x + t.width / 2 - size.width / 2, y: t.y + t.height / 2 - size.height / 2 });

  switch (kind) {
    case "desk-mat":
      return { x: centerX, y: (desk.depth - size.height) / 2 + 4 };
    case "mouse-pad":
      return mouse ? centerOn(mouse) : { x: desk.width * 0.7, y: desk.depth * 0.5 };
    case "wrist-rest":
      // 키보드 바로 앞(사용자 쪽)
      if (keyboard) return { x: keyboard.x + keyboard.width / 2 - size.width / 2, y: keyboard.y + keyboard.height + 1 };
      return { x: centerX, y: desk.depth - size.height - 4 };
    case "light-bar":
    case "monitor-arm":
    case "monitor-riser":
      // 책상 뒤쪽 모서리, 모니터가 있으면 그 중앙
      return { x: monitor ? monitor.x + monitor.width / 2 - size.width / 2 : centerX, y: 0 };
    case "soundbar":
      // 모니터 바로 앞
      return monitor ? { x: monitor.x + monitor.width / 2 - size.width / 2, y: monitor.y + monitor.height } : { x: centerX, y: desk.depth * 0.3 };
    case "speaker":
    case "speaker-stand":
      // 모니터 오른쪽 옆
      return monitor ? { x: monitor.x + monitor.width + 2, y: monitor.y + 2 } : { x: desk.width - size.width - M, y: M };
    case "trackpad":
      return mouse ? { x: mouse.x + mouse.width + 3, y: mouse.y } : { x: desk.width * 0.7, y: desk.depth * 0.55 };
    case "macro-pad":
      return keyboard ? { x: keyboard.x - size.width - 3, y: keyboard.y } : { x: desk.width * 0.2, y: desk.depth * 0.55 };
    case "mic-arm":
      return { x: M, y: 0 };
    case "power-strip":
      return { x: desk.width - size.width - 10, y: 1 };
    case "plant":
    case "desk-organizer":
      return { x: M, y: M }; // 왼쪽 뒤 모서리
    case "humidifier":
    case "clock":
    case "headphone-stand":
    case "headphones":
      return { x: desk.width - size.width - M + jitter(), y: M }; // 오른쪽 뒤 모서리
    case "phone-stand":
    case "wireless-charger":
    case "tablet-stand":
      return { x: M + 2, y: desk.depth * 0.45 + jitter() }; // 왼쪽 옆
    case "mug":
      return { x: desk.width - size.width - 8, y: desk.depth * 0.6 };
    case "notebook-pad":
      return { x: M + 2, y: desk.depth - size.height - M };
    default:
      return { x: centerX + jitter(), y: (desk.depth - size.height) / 2 + jitter() };
  }
}
