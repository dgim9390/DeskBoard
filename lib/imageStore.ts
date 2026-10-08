// 사진 보관함: 배경을 지운 사진·직접 올린 사진(data:image/…)을 IndexedDB에 따로 보관
// 기기 저장(localStorage, 약 5MB)에는 짧은 참조("localimg:…")만 남겨 제품 사진이 많아도 저장이 꽉 차지 않음
// 같은 사진은 여러 셋업에 쓰여도 한 번만 보관 (내용으로 만든 키)

const DB_NAME = "deskboard-images";
const STORE = "images";
export const REF_PREFIX = "localimg:";

/** 따로 보관할 만큼 큰 사진인지 (작은 아이콘 등은 그대로 둠) */
export const isStorableImage = (v: unknown): v is string => typeof v === "string" && v.length > 2048 && v.startsWith("data:image/");

export const imageStoreAvailable = () => typeof indexedDB !== "undefined";

// 같은 문자열의 키는 다시 계산하지 않음 (끌어 옮길 때마다 저장이 일어나므로)
const keyCache = new Map<string, string>();

/** 사진 내용으로 만든 짧은 키 (cyrb53 두 번 → 106비트) */
export function imageKey(dataUrl: string) {
  const hit = keyCache.get(dataUrl);
  if (hit) return hit;
  const h = (seed: number) => {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < dataUrl.length; i++) {
      const ch = dataUrl.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };
  const key = `${h(1)}${h(2)}-${dataUrl.length.toString(36)}`;
  keyCache.set(dataUrl, key);
  return key;
}

let dbPromise: Promise<IDBDatabase> | null = null;
function db() {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((e) => {
    dbPromise = null; // 다음에 다시 시도
    throw e;
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then(
    (d) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = d.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

/** 이미 보관함에 있는 키 (같은 사진을 다시 쓰지 않도록) */
const stored = new Set<string>();

/** 보관함에 없는 사진만 한 번에 기록 */
export async function putImages(images: Map<string, string>) {
  const missing = [...images].filter(([k]) => !stored.has(k));
  if (!missing.length) return;
  await run("readwrite", (s) => {
    for (const [k, v] of missing) s.put(v, k);
  });
  for (const [k] of missing) stored.add(k);
}

/** 키로 사진을 꺼냄. 없는 키는 결과에 빠짐 */
export async function getImages(keys: string[]) {
  const out = new Map<string, string>();
  if (!keys.length) return out;
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction(STORE, "readonly");
    const s = tx.objectStore(STORE);
    for (const k of keys) {
      const req = s.get(k);
      req.onsuccess = () => {
        if (typeof req.result === "string") {
          out.set(k, req.result);
          stored.add(k);
          keyCache.set(req.result, k);
        }
      };
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return out;
}

/** 더 이상 쓰지 않는 사진 정리 (keep에 없는 키 삭제) */
export async function pruneImages(keep: Set<string>) {
  const keys = ((await run("readonly", (s) => s.getAllKeys())) ?? []) as string[];
  const drop = keys.filter((k) => !keep.has(k));
  if (!drop.length) return;
  await run("readwrite", (s) => {
    for (const k of drop) s.delete(k);
  });
  for (const k of drop) stored.delete(k);
}

/** 저장할 데이터를 JSON으로: 큰 사진은 참조로 바꾸고 사진 목록을 함께 돌려줌 */
export function stringifyWithRefs(data: unknown) {
  const images = new Map<string, string>();
  const keep = new Set<string>(); // 이 데이터가 가리키는 모든 사진 키 (정리할 때 남길 것)
  const json = JSON.stringify(data, (_k, v) => {
    if (typeof v === "string" && v.startsWith(REF_PREFIX)) keep.add(v.slice(REF_PREFIX.length)); // 불러오지 못해 참조로 남아 있던 사진
    if (!isStorableImage(v)) return v;
    const key = imageKey(v);
    images.set(key, v);
    keep.add(key);
    return REF_PREFIX + key;
  });
  return { json, images, keep };
}

/** 저장된 JSON을 읽고 참조를 사진으로 되돌림. 보관함에서 사라진 사진은 비워 둠(기본 그림으로 표시)
 *  보관함을 아예 열지 못했으면 참조를 그대로 남겨, 다음 저장 때 사진을 잃지 않게 함 */
export async function parseWithRefs<T>(raw: string): Promise<T> {
  const keys = new Set<string>();
  raw.replace(/"localimg:([0-9a-z-]+)"/g, (_m, k: string) => (keys.add(k), ""));
  let images: Map<string, string> | null = new Map();
  if (keys.size) images = imageStoreAvailable() ? await getImages([...keys]).catch(() => null) : null;
  return JSON.parse(raw, (_k, v) => {
    if (typeof v !== "string" || !v.startsWith(REF_PREFIX) || !images) return v;
    return images.get(v.slice(REF_PREFIX.length));
  }) as T;
}
