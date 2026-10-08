import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { imageProxyUrl } from "@/lib/productLink";
import type { DeskItem, DeskMaterial, DeskSize, Lighting } from "@/store/useDeskStore";
import { buildItem, monitorTop, supportTop, type MatOpts, type ModelCtx } from "./models";
import { artTexture, calendarTexture, clockTexture, deskTexture, floorTexture, labelTexture } from "./textures";

/**
 * 책상 3D 보기 (three.js, 웹·맥 앱 전용).
 * 단위 cm. 책상 윗면 가운데가 원점, 오른쪽 +x, 위 +y, 사용자 쪽(2D 화면 아래) +z.
 * 2D 배치를 그대로 옮겨 그리기만 하고(보기 전용), 클릭하면 그 제품을 선택한다.
 */

const DESK_THICK = 3;
const DESK_H = 73; // 바닥에서 상판 윗면까지

const MOOD: Record<Lighting, { bg: string; wall: string; floor: number; hemi: [string, string, number]; sun?: { color: string; power: number; pos: [number, number, number] }; exposure: number }> = {
  day: { bg: "#202024", wall: "#cfcac2", floor: 1, hemi: ["#ffffff", "#5b544c", 1.25], sun: { color: "#ffffff", power: 2.4, pos: [-0.5, 1.6, 1.1] }, exposure: 1 },
  evening: { bg: "#160f0c", wall: "#b59c88", floor: 0.8, hemi: ["#ffd9b8", "#3a281c", 0.8], sun: { color: "#ffb27a", power: 1.7, pos: [1.1, 0.8, 0.9] }, exposure: 1.05 },
  night: { bg: "#06070b", wall: "#6a6f80", floor: 0.55, hemi: ["#5a6a9c", "#0a0a10", 0.26], exposure: 1.2 },
};

export interface Desk3DState {
  desk: DeskSize;
  items: DeskItem[];
  selectedId: string | null;
}

export interface Desk3D {
  update(state: Desk3DState): void;
  resetView(): void;
  dispose(): void;
}

/** 회전한 제품의 책상 위 중심 좌표 (3D) */
const center = (i: DeskItem, desk: DeskSize) => ({ x: i.x + i.width / 2 - desk.width / 2, z: i.y + i.height / 2 - desk.depth / 2 });

/** 점 (px, pz)가 제품 i의 회전된 사각형 안에 있는지 */
function contains(i: DeskItem, desk: DeskSize, px: number, pz: number) {
  const c = center(i, desk);
  const r = (-i.rotation * Math.PI) / 180;
  const dx = px - c.x;
  const dz = pz - c.z;
  const lx = dx * Math.cos(r) - dz * Math.sin(r);
  const lz = dx * Math.sin(r) + dz * Math.cos(r);
  return Math.abs(lx) <= i.width / 2 && Math.abs(lz) <= i.height / 2;
}

export function createDesk3D(container: HTMLElement, opts: { onSelect: (id: string | null) => void }): Desk3D {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); // 이미지 저장용으로 그림 유지
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const el = renderer.domElement;
  el.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none";
  container.appendChild(el);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 6000);
  const controls = new OrbitControls(camera, el);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.maxPolarAngle = Math.PI * 0.47; // 책상 밑으로 내려가지 않게
  controls.minDistance = 25;
  controls.screenSpacePanning = true;

  // ── 공용 자원 (다시 그릴 때도 재사용) ──
  const matCache = new Map<string, THREE.Material>();
  const mat = (color: string, o: MatOpts = {}) => {
    const key = `${color}|${o.rough}|${o.metal}|${o.emissive}|${o.emissiveIntensity}|${o.side}`;
    let m = matCache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color,
        roughness: o.rough ?? 0.6,
        metalness: o.metal ?? 0,
        emissive: o.emissive ?? "#000000",
        emissiveIntensity: o.emissiveIntensity ?? 1,
        side: o.side ?? THREE.FrontSide,
      });
      m.userData.cached = true;
      matCache.set(key, m);
    }
    return m;
  };
  // 모니터·노트북·태블릿 화면: 꺼진 화면처럼 반들반들한 검은 유리
  const screenMat = new THREE.MeshStandardMaterial({ color: "#060608", roughness: 0.12, metalness: 0.2 });
  screenMat.userData.cached = true;
  const clockMat = new THREE.MeshBasicMaterial({ map: clockTexture() });
  clockMat.userData.cached = true;
  const artMat = new THREE.MeshStandardMaterial({ map: artTexture(), roughness: 0.5 });
  artMat.userData.cached = true;
  const calendarMat = new THREE.MeshStandardMaterial({ map: calendarTexture(), roughness: 0.8 });
  calendarMat.userData.cached = true;
  const labelCache = new Map<string, THREE.Material>();
  const photoCache = new Map<string, Promise<THREE.Texture | null>>();
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  let disposed = false;
  let dirty = true;

  const loadPhoto = (url: string) => {
    let p = photoCache.get(url);
    if (!p) {
      // 다른 사이트 사진은 CORS 때문에 링크 읽기 서버를 거쳐 받음
      const src = url.startsWith("data:") ? url : imageProxyUrl(url);
      p = loader
        .loadAsync(src)
        .then((t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          t.userData.shared = true; // 여러 번 다시 그려도 캐시에서 재사용
          return t;
        })
        .catch(() => null);
      photoCache.set(url, p);
    }
    return p;
  };

  // ── 방: 바닥·벽·책상 ──
  const room = new THREE.Group();
  const itemsGroup = new THREE.Group();
  const lights = new THREE.Group();
  scene.add(room, itemsGroup, lights);
  let selection: THREE.BoxHelper | null = null;

  const floorTex = floorTexture();
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 });
  const wallMat = new THREE.MeshStandardMaterial({ color: "#cfcac2", roughness: 0.95 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#e9e6e0", roughness: 0.7 });
  // 방: 책상 크기에 맞춘 작은 방 (바닥 + 뒤·양옆 벽). 벽은 안쪽 면만 그려서 밖에서 보면 투명
  const roomParts = new THREE.Group();
  room.add(roomParts);
  function buildRoom(desk: DeskSize) {
    disposeTree(roomParts, true);
    roomParts.clear();
    const W = Math.max(desk.width + 140, 260);
    const Dp = Math.max(desk.depth + 210, 280);
    const H = 240;
    const backZ = -desk.depth / 2 - 8;
    const floorY = -DESK_H;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, Dp), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, floorY, backZ + Dp / 2);
    floor.receiveShadow = true;
    floorTex.repeat.set(W / 170, Dp / 170);
    const wall = (w: number, x: number, z: number, rotY: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H), wallMat);
      m.position.set(x, floorY + H / 2, z);
      m.rotation.y = rotY;
      m.receiveShadow = true;
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, 7, 1.2), trimMat); // 걸레받이
      base.position.set(x, floorY + 3.5, z);
      base.rotation.y = rotY;
      base.translateZ(0.6);
      roomParts.add(m, base);
    };
    wall(W, 0, backZ, 0);
    wall(Dp, -W / 2, backZ + Dp / 2, Math.PI / 2);
    wall(Dp, W / 2, backZ + Dp / 2, -Math.PI / 2);
    roomParts.add(floor);
    return Dp;
  }
  let roomDepth = 280;

  let deskKey = "";
  let deskTop: THREE.Mesh | null = null;
  const deskParts = new THREE.Group();
  room.add(deskParts);

  function buildDesk(desk: DeskSize) {
    const key = `${desk.width}x${desk.depth}|${desk.material ?? "oak"}`;
    if (key === deskKey) return;
    deskKey = key;
    disposeTree(deskParts);
    deskParts.clear();
    const tex = deskTexture((desk.material ?? "oak") as DeskMaterial);
    const topMat = new THREE.MeshStandardMaterial({ map: tex.map, roughness: 0.62 - tex.sheen * 0.4, metalness: 0 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: tex.edge, roughness: 0.7 });
    deskTop = new THREE.Mesh(new THREE.BoxGeometry(desk.width, DESK_THICK, desk.depth), [edgeMat, edgeMat, topMat, edgeMat, edgeMat, edgeMat]);
    deskTop.position.y = -DESK_THICK / 2;
    deskTop.castShadow = deskTop.receiveShadow = true;
    deskParts.add(deskTop);
    // 다리와 프레임 (검은 금속)
    const legMat = mat("#1b1b1e", { rough: 0.4, metal: 0.7 });
    const legH = DESK_H - DESK_THICK;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(4.5, legH, 4.5), legMat);
        leg.position.set(sx * (desk.width / 2 - 5), -DESK_THICK - legH / 2, sz * (desk.depth / 2 - 5));
        leg.castShadow = leg.receiveShadow = true;
        deskParts.add(leg);
      }
    }
    const apron = new THREE.Mesh(new THREE.BoxGeometry(desk.width - 10, 6, 2), legMat);
    apron.position.set(0, -DESK_THICK - 3, -desk.depth / 2 + 6);
    deskParts.add(apron);
    roomDepth = buildRoom(desk);
  }

  // ── 조명 ──
  let moodKey: Lighting | null = null;
  const hemi = new THREE.HemisphereLight();
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  sun.shadow.radius = 4;
  scene.add(hemi, sun, sun.target);

  function applyMood(lighting: Lighting, desk: DeskSize) {
    const m = MOOD[lighting];
    scene.background = new THREE.Color(m.bg);
    scene.fog = new THREE.Fog(m.bg, 450, 900);
    renderer.toneMappingExposure = m.exposure;
    hemi.color.set(m.hemi[0]);
    hemi.groundColor.set(m.hemi[1]);
    hemi.intensity = m.hemi[2];
    wallMat.color.set(m.wall);
    floorMat.color.setScalar(m.floor);
    const span = Math.max(desk.width, desk.depth) / 2 + 60;
    sun.visible = !!m.sun;
    if (m.sun) {
      sun.color.set(m.sun.color);
      sun.intensity = m.sun.power;
      sun.position.set(m.sun.pos[0] * 150, m.sun.pos[1] * 150, m.sun.pos[2] * 150);
      const cam = sun.shadow.camera;
      cam.left = cam.bottom = -span;
      cam.right = cam.top = span;
      cam.near = 10;
      cam.far = 800;
      cam.updateProjectionMatrix();
    }
  }

  // ── 카메라: 의자에 앉은 눈높이에서 책상 전체가 보이게 ──
  let lastDesk: DeskSize | null = null;
  function resetView() {
    if (!lastDesk) return;
    // 가로는 책상 폭, 세로는 모니터 높이까지(약 60cm) 들어오는 거리 중 먼 쪽
    const tanV = Math.tan((camera.fov * Math.PI) / 360);
    const tanH = tanV * (camera.aspect || 1.5);
    const dist = Math.max((lastDesk.width * 0.56) / tanH, 62 / tanV);
    camera.position.set(0, dist * 0.5, dist * 0.87);
    controls.target.set(0, 10, -lastDesk.depth * 0.05);
    // 방 밖으로 너무 멀어지지 않게 (뒤로는 방 앞쪽 끝까지 정도)
    controls.maxDistance = Math.max(dist * 1.35, Math.min(dist * 2, roomDepth));
    controls.update();
    dirty = true;
  }

  // ── 제품 다시 그리기 ──
  let itemsKey = "";
  let selectedId: string | null = null;
  const itemObjects = new Map<string, THREE.Object3D>();

  function buildItems(desk: DeskSize, items: DeskItem[], lighting: Lighting) {
    const key = JSON.stringify([desk.width, desk.depth, lighting, items]);
    if (key === itemsKey) return;
    itemsKey = key;
    disposeTree(itemsGroup);
    itemsGroup.clear();
    itemObjects.clear();

    const ctx: ModelCtx = {
      lighting,
      mat,
      screen: screenMat,
      clock: clockMat,
      art: artMat,
      calendar: calendarMat,
      label: (text, dark) => {
        const k = `${text}|${dark}`;
        let m = labelCache.get(k);
        if (!m) {
          m = new THREE.MeshStandardMaterial({ map: labelTexture(text, dark), roughness: 0.7 });
          m.userData.cached = true;
          labelCache.set(k, m);
        }
        return m;
      },
      photo: (url, onReady) => {
        void loadPhoto(url).then((t) => {
          if (t && !disposed && itemsKey === key) {
            onReady(t);
            dirty = true;
          }
        });
      },
      shadowLights: { count: 0 },
    };

    // 받침(데스크 매트·모니터 받침대) 위에 놓인 제품은 그 높이만큼 올림. 받침끼리는 낮은 것 위에 높은 것
    const topOf = (i: DeskItem) => supportTop(i) ?? 0;
    const supports = items.filter((i) => supportTop(i) !== undefined).sort((a, b) => topOf(a) - topOf(b));
    const supportBase = new Map<string, number>();
    const restOn = (i: DeskItem, pool: DeskItem[]) => {
      const c = center(i, desk);
      let base = 0;
      for (const s of pool) if (s.id !== i.id && contains(s, desk, c.x, c.z)) base = Math.max(base, (supportBase.get(s.id) ?? 0) + topOf(s));
      return base;
    };
    for (const s of supports) supportBase.set(s.id, restOn(s, supports.filter((x) => topOf(x) < topOf(s))));
    const baseOf = (i: DeskItem) => supportBase.get(i.id) ?? restOn(i, supports);
    const monitors = items.filter((i) => i.kind === "monitor" || i.kind === "ultrawide");

    for (const item of items) {
      const obj = buildItem(ctx, item);
      const c = center(item, desk);
      obj.position.set(c.x, baseOf(item), c.z);
      obj.rotation.y = (-item.rotation * Math.PI) / 180;

      // 라이트바: 겹친 모니터 위에 올림
      if (item.kind === "light-bar" || item.kind === "webcam") {
        const host = monitors.find((m) => contains(m, desk, c.x, c.z));
        if (host) {
          const mc = center(host, desk);
          const t = monitorTop(host);
          const r = (-host.rotation * Math.PI) / 180;
          obj.position.set(mc.x + Math.sin(r) * t.z, baseOf(host) + t.y, mc.z + Math.cos(r) * t.z);
          obj.rotation.y = r;
        }
      }
      obj.traverse((o) => (o.userData.itemId = item.id));
      itemsGroup.add(obj);
      itemObjects.set(item.id, obj);
    }
    markSelection();
  }

  function markSelection() {
    if (selection) {
      scene.remove(selection);
      selection.geometry.dispose();
      (selection.material as THREE.Material).dispose();
      selection = null;
    }
    const obj = selectedId ? itemObjects.get(selectedId) : undefined;
    if (obj) {
      selection = new THREE.BoxHelper(obj, 0x818cf8);
      scene.add(selection);
    }
    dirty = true;
  }

  // ── 클릭으로 선택 (드래그로 돌린 건 무시) ──
  const ray = new THREE.Raycaster();
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    down = null;
    const rect = el.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(itemsGroup.children, true).find((h) => h.object.userData.itemId);
    opts.onSelect(hit ? (hit.object.userData.itemId as string) : null);
  };
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointerup", onUp);

  // ── 확대·축소: 트랙패드 핀치는 손가락 벌린 만큼, 스크롤·휠은 부드럽게. 포인터가 가리키는 곳을 향해 ──
  // (OrbitControls 기본 휠 확대는 핀치에 둔하고 항상 책상 가운데로만 다가감)
  const zoomAt = (factor: number, clientX: number, clientY: number) => {
    const offset = camera.position.clone().sub(controls.target);
    const len = offset.length();
    const next = THREE.MathUtils.clamp(len * factor, controls.minDistance, controls.maxDistance);
    const f = next / len;
    if (Math.abs(f - 1) < 1e-4) return;
    // 포인터 아래 점을 기준으로 카메라와 시점 중심을 함께 당기거나 밂 → 그 점이 포인터 아래에 그대로 남음
    const rect = el.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1), camera);
    // 기준점: 포인터가 가리키는 실제 표면(책상·제품·바닥), 없으면 시점 중심과 같은 깊이의 점
    const hit = ray.intersectObjects(scene.children, true).find((h) => (h.object as THREE.Mesh).isMesh);
    const viewDir = camera.getWorldDirection(new THREE.Vector3());
    const pivot = hit ? hit.point.clone() : ray.ray.at(len / Math.max(0.2, ray.ray.direction.dot(viewDir)), new THREE.Vector3());
    const target = controls.target.clone().sub(pivot).multiplyScalar(f).add(pivot);
    // 시점 중심이 방 밖으로 빠지지 않게 책상 근처로 제한
    if (lastDesk) {
      target.x = THREE.MathUtils.clamp(target.x, -lastDesk.width / 2 - 30, lastDesk.width / 2 + 30);
      target.z = THREE.MathUtils.clamp(target.z, -lastDesk.depth / 2 - 20, lastDesk.depth / 2 + 30);
    }
    target.y = THREE.MathUtils.clamp(target.y, 0, 60);
    controls.target.copy(target);
    camera.position.copy(target).add(offset.multiplyScalar(f));
    dirty = true;
  };
  let lastPinchWheel = 0;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopImmediatePropagation(); // OrbitControls 기본 휠 확대는 쓰지 않음
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    // 핀치(브라우저가 ctrl+휠로 보냄): 손가락 배율과 같게. 두 손가락 스크롤·마우스 휠: 한 칸(100)에 약 16%
    if (e.ctrlKey) lastPinchWheel = performance.now();
    zoomAt(Math.exp(THREE.MathUtils.clamp(dy, -200, 200) * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY);
  };
  // 사파리 핀치는 휠 대신 gesture 이벤트로 옴
  let gestureScale = 1;
  type GestureEv = Event & { scale: number; clientX: number; clientY: number };
  const onGestureStart = (e: Event) => {
    e.preventDefault();
    gestureScale = 1;
  };
  const onGestureChange = (e: Event) => {
    e.preventDefault();
    const g = e as GestureEv;
    if (performance.now() - lastPinchWheel < 300 || !g.scale) return; // ctrl+휠도 오는 브라우저는 그쪽으로 처리
    zoomAt(gestureScale / g.scale, g.clientX, g.clientY);
    gestureScale = g.scale;
  };
  el.addEventListener("wheel", onWheel, { passive: false, capture: true });
  el.addEventListener("gesturestart", onGestureStart);
  el.addEventListener("gesturechange", onGestureChange);

  // ── 크기 맞춤·그리기 ──
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const moved = controls.update();
    if (moved || dirty) {
      dirty = false;
      renderer.render(scene, camera);
    }
  };
  loop();

  return {
    update({ desk, items, selectedId: sel }) {
      const first = !lastDesk;
      const resized = lastDesk && (lastDesk.width !== desk.width || lastDesk.depth !== desk.depth);
      lastDesk = desk;
      const lighting = desk.lighting ?? "day";
      buildDesk(desk);
      if (lighting !== moodKey || resized || first) {
        moodKey = lighting;
        applyMood(lighting, desk);
      }
      buildItems(desk, items, lighting);
      if (sel !== selectedId) {
        selectedId = sel;
        markSelection();
      }
      if (first || resized) resetView();
      dirty = true;
    },
    resetView,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel, { capture: true });
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
      controls.dispose();
      disposeTree(scene);
      for (const m of [...matCache.values(), ...labelCache.values(), screenMat, clockMat, artMat, calendarMat]) disposeMaterial(m, true);
      for (const p of photoCache.values()) void p.then((t) => t?.dispose());
      floorTex.dispose();
      renderer.dispose();
      renderer.forceContextLoss(); // 2D↔3D를 여러 번 바꿔도 WebGL 컨텍스트가 쌓이지 않게
      el.remove();
    },
  };
}

function disposeMaterial(m: THREE.Material, force = false) {
  if (m.userData.cached && !force) return;
  const s = m as THREE.MeshStandardMaterial;
  // 사진 텍스처는 캐시가 관리하므로 여기서 지우지 않음 (상판·라벨 등 직접 만든 것만)
  if (force || !s.map?.userData.shared) s.map?.dispose?.();
  s.emissiveMap?.dispose?.();
  m.dispose();
}

/** 다시 그리기 전에 GPU 자원 정리 (캐시된 재질·사진은 남김) */
function disposeTree(root: THREE.Object3D, keepMaterials = false) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry && !mesh.geometry.userData.shared) mesh.geometry.dispose();
    if (keepMaterials) return;
    const m = mesh.material;
    if (Array.isArray(m)) m.forEach((x) => disposeMaterial(x));
    else if (m) disposeMaterial(m);
  });
}
