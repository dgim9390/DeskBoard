import type { Category, ItemColor, ProductKind } from "@/store/useDeskStore";

/**
 * 조건 검색용 실제 제품 목록.
 * 사양·크기(cm)는 제조사·판매처 사양으로 대조함 (2026-11). 헤드폰·모니터 암은 공식 '책상 위 차지 면적'이 없어 대략값.
 * shortcut: 가격은 대략 가격대(원)만 — 실시간 가격 아님. 가격 정보를 보여 줄 일이 생기면 판매처 연동으로 바꿀 것
 * 크기: width = 가로, depth = 위에서 본 깊이(모니터는 받침대 포함), tall = 높이
 * tags: 조건 검색에 쓰는 "키:값" (예: "res:QHD"). 조건 정의는 FINDER_FILTERS
 */
export type FinderCategory = "monitor" | "keyboard" | "mouse" | "speaker" | "charger" | "headphones" | "arm";

export interface RealProduct {
  id: string;
  cat: FinderCategory;
  brand: string;
  name: string;
  kind: ProductKind;
  width: number;
  depth: number;
  tall?: number;
  price: number;
  color?: ItemColor;
  tags: string[];
}

export const FINDER_CATEGORY: Record<FinderCategory, { label: string; category: Category }> = {
  monitor: { label: "모니터", category: "monitor" },
  keyboard: { label: "키보드", category: "keyboard" },
  mouse: { label: "마우스", category: "mouse" },
  speaker: { label: "스피커", category: "accessory" },
  charger: { label: "무선 충전기", category: "accessory" },
  headphones: { label: "헤드폰", category: "accessory" },
  arm: { label: "모니터 암", category: "accessory" },
};

/** 종류별 조건: 같은 줄에서 여러 개 고르면 '또는', 줄끼리는 '그리고' */
export const FINDER_FILTERS: Record<FinderCategory, { label: string; options: { label: string; tag: string }[] }[]> = {
  monitor: [
    { label: "크기", options: [{ label: "24인치", tag: "size:24" }, { label: "27인치", tag: "size:27" }, { label: "32인치", tag: "size:32" }, { label: "34인치 이상", tag: "size:34+" }] },
    { label: "해상도", options: [{ label: "FHD", tag: "res:FHD" }, { label: "QHD", tag: "res:QHD" }, { label: "4K", tag: "res:4K" }] },
    { label: "주사율", options: [{ label: "60~100Hz", tag: "hz:60" }, { label: "144Hz 이상", tag: "hz:144" }] },
    { label: "패널", options: [{ label: "IPS", tag: "panel:IPS" }, { label: "VA", tag: "panel:VA" }] },
  ],
  keyboard: [
    { label: "배열", options: [{ label: "풀배열", tag: "layout:full" }, { label: "텐키리스", tag: "layout:tkl" }, { label: "75%·컴팩트", tag: "layout:compact" }] },
    { label: "연결", options: [{ label: "유선", tag: "conn:wired" }, { label: "무선", tag: "conn:wireless" }] },
    { label: "타건감", options: [{ label: "기계식", tag: "switch:mech" }, { label: "얇은 키(펜타그래프)", tag: "switch:low" }] },
  ],
  mouse: [
    { label: "용도", options: [{ label: "게임", tag: "use:game" }, { label: "사무·작업", tag: "use:office" }] },
    { label: "연결", options: [{ label: "유선", tag: "conn:wired" }, { label: "무선", tag: "conn:wireless" }] },
    { label: "모양", options: [{ label: "일반", tag: "shape:normal" }, { label: "버티컬", tag: "shape:vertical" }] },
  ],
  speaker: [
    { label: "형태", options: [{ label: "북쉘프", tag: "type:bookshelf" }, { label: "소형", tag: "type:compact" }, { label: "사운드바", tag: "type:bar" }] },
    { label: "연결", options: [{ label: "블루투스", tag: "conn:bt" }] },
  ],
  charger: [{ label: "형태", options: [{ label: "패드", tag: "type:pad" }, { label: "거치형·멀티", tag: "type:stand" }, { label: "맥세이프", tag: "type:magsafe" }] }],
  headphones: [
    { label: "기능", options: [{ label: "노이즈 캔슬링", tag: "anc:yes" }] },
    { label: "용도", options: [{ label: "게임", tag: "use:game" }, { label: "음악·일상", tag: "use:music" }] },
  ],
  arm: [{ label: "형태", options: [{ label: "싱글", tag: "type:single" }, { label: "듀얼", tag: "type:dual" }] }],
};

export const REAL_PRODUCTS: RealProduct[] = [
  // ── 모니터 ──
  { id: "lg-24mp400", cat: "monitor", brand: "LG", name: "24MP400", kind: "monitor", width: 54, depth: 19, price: 150000, tags: ["size:24", "res:FHD", "hz:60", "panel:IPS"] },
  { id: "dell-s2721dgf", cat: "monitor", brand: "Dell", name: "S2721DGF", kind: "monitor", width: 61.2, depth: 20, price: 450000, tags: ["size:27", "res:QHD", "hz:144", "panel:IPS"] },
  { id: "lg-27gp850", cat: "monitor", brand: "LG", name: "울트라기어 27GP850", kind: "monitor", width: 61.4, depth: 29.1, price: 420000, tags: ["size:27", "res:QHD", "hz:144", "panel:IPS"] },
  { id: "samsung-g5-27", cat: "monitor", brand: "삼성", name: "오디세이 G5 27 (C27G55T)", kind: "monitor", width: 61.7, depth: 27.3, price: 300000, tags: ["size:27", "res:QHD", "hz:144", "panel:VA"] },
  { id: "dell-u2723qe", cat: "monitor", brand: "Dell", name: "U2723QE", kind: "monitor", width: 61.1, depth: 18.5, price: 700000, tags: ["size:27", "res:4K", "hz:60", "panel:IPS"] },
  { id: "lg-32un650", cat: "monitor", brand: "LG", name: "32UN650", kind: "monitor", width: 71.4, depth: 22.7, price: 500000, tags: ["size:32", "res:4K", "hz:60", "panel:IPS"] },
  { id: "lg-34wq650", cat: "monitor", brand: "LG", name: "34WQ650 울트라와이드", kind: "ultrawide", width: 81.5, depth: 25.9, price: 450000, tags: ["size:34+", "res:FHD", "hz:60", "panel:IPS"] },
  { id: "lg-27up550n", cat: "monitor", brand: "LG", name: "27UP550N", kind: "monitor", width: 62.3, depth: 23.9, price: 300000, tags: ["size:27", "res:4K", "hz:60", "panel:IPS"] },
  { id: "lg-27qn600", cat: "monitor", brand: "LG", name: "27QN600", kind: "monitor", width: 61.4, depth: 20.9, price: 250000, tags: ["size:27", "res:QHD", "hz:60", "panel:IPS"] },
  { id: "lg-24gn600", cat: "monitor", brand: "LG", name: "울트라기어 24GN600", kind: "monitor", width: 54.1, depth: 18.1, price: 200000, tags: ["size:24", "res:FHD", "hz:144", "panel:IPS"] },
  { id: "lg-27gn800", cat: "monitor", brand: "LG", name: "울트라기어 27GN800", kind: "monitor", width: 61.4, depth: 22.5, price: 350000, tags: ["size:27", "res:QHD", "hz:144", "panel:IPS"] },
  { id: "samsung-s24c310", cat: "monitor", brand: "삼성", name: "S24C310", kind: "monitor", width: 54, depth: 21.7, price: 130000, tags: ["size:24", "res:FHD", "hz:60", "panel:IPS"] },
  { id: "dell-s3222dgm", cat: "monitor", brand: "Dell", name: "S3222DGM 커브드", kind: "monitor", width: 70.9, depth: 23.8, price: 400000, tags: ["size:32", "res:QHD", "hz:144", "panel:VA"] },
  { id: "lg-32gn600", cat: "monitor", brand: "LG", name: "울트라기어 32GN600", kind: "monitor", width: 71.5, depth: 22.5, price: 350000, tags: ["size:32", "res:QHD", "hz:144", "panel:VA"] },
  { id: "samsung-g5-34", cat: "monitor", brand: "삼성", name: "오디세이 G5 34 (C34G55T)", kind: "ultrawide", width: 80.7, depth: 27.3, price: 450000, tags: ["size:34+", "res:QHD", "hz:144", "panel:VA"] },
  { id: "lg-24mr400", cat: "monitor", brand: "LG", name: "24MR400", kind: "monitor", width: 54.1, depth: 20.1, price: 99000, tags: ["size:24", "res:FHD", "hz:60", "panel:IPS"] },
  { id: "dell-s2421hn", cat: "monitor", brand: "Dell", name: "S2421HN", kind: "monitor", width: 53.8, depth: 15.3, price: 150000, tags: ["size:24", "res:FHD", "hz:60", "panel:IPS"] },
  { id: "dell-s2722qc", cat: "monitor", brand: "Dell", name: "S2722QC", kind: "monitor", width: 61.2, depth: 17.5, price: 400000, tags: ["size:27", "res:4K", "hz:60", "panel:IPS"] },
  { id: "lg-32gr93u", cat: "monitor", brand: "LG", name: "울트라기어 32GR93U", kind: "monitor", width: 71.4, depth: 27.8, price: 800000, tags: ["size:32", "res:4K", "hz:144", "panel:IPS"] },
  { id: "lg-34gp63a", cat: "monitor", brand: "LG", name: "울트라기어 34GP63A", kind: "ultrawide", width: 80.9, depth: 31.2, price: 450000, tags: ["size:34+", "res:QHD", "hz:144", "panel:VA"] },

  // ── 키보드 ──
  { id: "logi-mx-keys-s", cat: "keyboard", brand: "로지텍", name: "MX Keys S", kind: "keyboard-full", width: 43, depth: 13.2, price: 150000, tags: ["layout:full", "conn:wireless", "switch:low"] },
  { id: "apple-magic-kb", cat: "keyboard", brand: "Apple", name: "매직 키보드", kind: "keyboard", width: 27.9, depth: 11.5, price: 130000, color: "white", tags: ["layout:compact", "conn:wireless", "switch:low"] },
  { id: "keychron-k8-pro", cat: "keyboard", brand: "키크론", name: "K8 Pro", kind: "keyboard", width: 35.8, depth: 13, price: 150000, tags: ["layout:tkl", "conn:wireless", "conn:wired", "switch:mech"] },
  { id: "keychron-q1-pro", cat: "keyboard", brand: "키크론", name: "Q1 Pro", kind: "keyboard", width: 32.8, depth: 14.5, price: 250000, tags: ["layout:compact", "conn:wireless", "conn:wired", "switch:mech"] },
  { id: "logi-g915-tkl", cat: "keyboard", brand: "로지텍", name: "G915 TKL", kind: "keyboard", width: 36.8, depth: 15, price: 250000, tags: ["layout:tkl", "conn:wireless", "switch:mech", "switch:low"] },
  { id: "logi-k380", cat: "keyboard", brand: "로지텍", name: "K380 멀티 디바이스", kind: "keyboard", width: 27.95, depth: 12.4, price: 40000, tags: ["layout:compact", "conn:wireless", "switch:low"] },
  { id: "logi-mx-keys-mini", cat: "keyboard", brand: "로지텍", name: "MX Keys Mini", kind: "keyboard", width: 29.6, depth: 13.2, price: 120000, tags: ["layout:compact", "conn:wireless", "switch:low"] },
  { id: "apple-magic-kb-numeric", cat: "keyboard", brand: "Apple", name: "매직 키보드 (숫자 키패드)", kind: "keyboard-full", width: 41.9, depth: 11.5, price: 170000, color: "white", tags: ["layout:full", "conn:wireless", "switch:low"] },
  { id: "keychron-k2-pro", cat: "keyboard", brand: "키크론", name: "K2 Pro", kind: "keyboard", width: 31.7, depth: 12.7, price: 150000, tags: ["layout:compact", "conn:wireless", "conn:wired", "switch:mech"] },
  { id: "logi-g413-se", cat: "keyboard", brand: "로지텍", name: "G413 SE", kind: "keyboard-full", width: 43.5, depth: 12.7, price: 70000, tags: ["layout:full", "conn:wired", "switch:mech"] },
  { id: "logi-pro-x-tkl", cat: "keyboard", brand: "로지텍", name: "PRO X TKL LIGHTSPEED", kind: "keyboard", width: 35.2, depth: 15, price: 250000, tags: ["layout:tkl", "conn:wireless", "switch:mech"] },
  { id: "keychron-v6", cat: "keyboard", brand: "키크론", name: "V6", kind: "keyboard-full", width: 44.8, depth: 14.1, price: 120000, tags: ["layout:full", "conn:wired", "switch:mech"] },
  { id: "leopold-fc750r", cat: "keyboard", brand: "레오폴드", name: "FC750R PD", kind: "keyboard", width: 36, depth: 14, price: 130000, tags: ["layout:tkl", "conn:wired", "switch:mech"] },
  { id: "logi-g915-x", cat: "keyboard", brand: "로지텍", name: "G915 X LIGHTSPEED", kind: "keyboard-full", width: 47.5, depth: 15, price: 330000, tags: ["layout:full", "conn:wireless", "switch:mech", "switch:low"] },
  { id: "logi-k120", cat: "keyboard", brand: "로지텍", name: "K120 유선 키보드", kind: "keyboard-full", width: 45, depth: 15.5, price: 15000, tags: ["layout:full", "conn:wired"] },

  // ── 마우스 ──
  { id: "logi-mx-master-3s", cat: "mouse", brand: "로지텍", name: "MX Master 3S", kind: "mouse", width: 8.4, depth: 12.5, price: 130000, tags: ["use:office", "conn:wireless", "shape:normal"] },
  { id: "logi-mx-anywhere-3s", cat: "mouse", brand: "로지텍", name: "MX Anywhere 3S", kind: "mouse", width: 6.5, depth: 10, price: 100000, tags: ["use:office", "conn:wireless", "shape:normal"] },
  { id: "apple-magic-mouse", cat: "mouse", brand: "Apple", name: "매직 마우스", kind: "mouse", width: 5.7, depth: 11.35, price: 100000, color: "white", tags: ["use:office", "conn:wireless", "shape:normal"] },
  { id: "logi-lift", cat: "mouse", brand: "로지텍", name: "Lift 버티컬", kind: "mouse-vertical", width: 7, depth: 10.8, price: 90000, tags: ["use:office", "conn:wireless", "shape:vertical"] },
  { id: "logi-gpro-superlight2", cat: "mouse", brand: "로지텍", name: "G PRO X SUPERLIGHT 2", kind: "mouse", width: 6.35, depth: 12.5, price: 200000, tags: ["use:game", "conn:wireless", "shape:normal"] },
  { id: "razer-da-v3-pro", cat: "mouse", brand: "레이저", name: "DeathAdder V3 Pro", kind: "mouse", width: 6.8, depth: 12.8, price: 200000, tags: ["use:game", "conn:wireless", "shape:normal"] },
  { id: "logi-g102", cat: "mouse", brand: "로지텍", name: "G102", kind: "mouse", width: 6.2, depth: 11.7, price: 25000, tags: ["use:game", "conn:wired", "shape:normal"] },
  { id: "logi-g304", cat: "mouse", brand: "로지텍", name: "G304 LIGHTSPEED", kind: "mouse", width: 6.2, depth: 11.7, price: 40000, tags: ["use:game", "conn:wireless", "shape:normal"] },
  { id: "logi-g502x", cat: "mouse", brand: "로지텍", name: "G502 X", kind: "mouse", width: 7.9, depth: 13.1, price: 100000, tags: ["use:game", "conn:wired", "shape:normal"] },
  { id: "logi-m650", cat: "mouse", brand: "로지텍", name: "Signature M650", kind: "mouse", width: 6.1, depth: 10.8, price: 40000, tags: ["use:office", "conn:wireless", "shape:normal"] },
  { id: "logi-mx-vertical", cat: "mouse", brand: "로지텍", name: "MX Vertical", kind: "mouse-vertical", width: 7.9, depth: 12, tall: 7.85, price: 130000, tags: ["use:office", "conn:wireless", "shape:vertical"] },
  { id: "razer-da-essential", cat: "mouse", brand: "레이저", name: "DeathAdder Essential", kind: "mouse", width: 7.3, depth: 12.7, price: 30000, tags: ["use:game", "conn:wired", "shape:normal"] },
  { id: "anker-vertical", cat: "mouse", brand: "앤커", name: "무선 버티컬 마우스", kind: "mouse-vertical", width: 6.3, depth: 12, tall: 7.5, price: 25000, tags: ["use:office", "conn:wireless", "shape:vertical"] },

  // ── 스피커 ──
  { id: "edifier-r1280t", cat: "speaker", brand: "에디파이어", name: "R1280T (한 쌍 중 1개)", kind: "speaker", width: 14.6, depth: 19.6, tall: 23.4, price: 130000, tags: ["type:bookshelf"] },
  { id: "edifier-r1280dbs", cat: "speaker", brand: "에디파이어", name: "R1280DBs (한 쌍 중 1개)", kind: "speaker", width: 14.6, depth: 19.6, tall: 23.4, price: 170000, tags: ["type:bookshelf", "conn:bt"] },
  { id: "audioengine-a2plus", cat: "speaker", brand: "오디오엔진", name: "A2+ (한 쌍 중 1개)", kind: "speaker", width: 10.2, depth: 13.3, tall: 15.2, price: 350000, tags: ["type:bookshelf", "type:compact", "conn:bt"] },
  { id: "creative-pebble-v3", cat: "speaker", brand: "크리에이티브", name: "Pebble V3 (한 쌍 중 1개)", kind: "speaker", width: 12.3, depth: 12, tall: 11.8, price: 45000, tags: ["type:compact", "conn:bt"] },
  { id: "creative-stage-se", cat: "speaker", brand: "크리에이티브", name: "Stage SE 사운드바", kind: "soundbar", width: 41, depth: 10.8, tall: 6.8, price: 70000, tags: ["type:bar", "conn:bt"] },
  { id: "razer-leviathan-v2x", cat: "speaker", brand: "레이저", name: "Leviathan V2 X 사운드바", kind: "soundbar", width: 40.1, depth: 7.1, tall: 7.6, price: 130000, tags: ["type:bar", "conn:bt"] },
  { id: "creative-stage-v2", cat: "speaker", brand: "크리에이티브", name: "Stage V2 사운드바 (서브우퍼 별도)", kind: "soundbar", width: 68, depth: 10, tall: 7.8, price: 120000, tags: ["type:bar", "conn:bt"] },
  { id: "edifier-mr4", cat: "speaker", brand: "에디파이어", name: "MR4 모니터 스피커 (한 쌍 중 1개)", kind: "speaker", width: 14, depth: 19.8, tall: 22.8, price: 130000, tags: ["type:bookshelf"] },
  { id: "audioengine-a5plus", cat: "speaker", brand: "오디오엔진", name: "A5+ (한 쌍 중 1개)", kind: "speaker", width: 18, depth: 20, tall: 27, price: 550000, tags: ["type:bookshelf"] },
  { id: "creative-pebble-plus", cat: "speaker", brand: "크리에이티브", name: "Pebble Plus 2.1 (위성 스피커 1개, 서브우퍼 별도)", kind: "speaker", width: 12.2, depth: 11.5, tall: 11.6, price: 60000, tags: ["type:compact"] },

  // ── 무선 충전기 ──
  { id: "apple-magsafe", cat: "charger", brand: "Apple", name: "맥세이프 충전기", kind: "wireless-charger", width: 5.6, depth: 5.6, price: 55000, color: "white", tags: ["type:magsafe", "type:pad"] },
  { id: "anker-313-pad", cat: "charger", brand: "앤커", name: "313 무선 충전 패드", kind: "wireless-charger", width: 10, depth: 10, price: 20000, tags: ["type:pad"] },
  { id: "anker-313-stand", cat: "charger", brand: "앤커", name: "313 무선 충전 스탠드", kind: "phone-stand", width: 8, depth: 6.8, tall: 11.4, price: 25000, tags: ["type:stand"] },
  { id: "belkin-3in1", cat: "charger", brand: "벨킨", name: "부스트차지 프로 3-in-1 (Qi2)", kind: "phone-stand", width: 11.8, depth: 11.8, tall: 12.2, price: 180000, color: "white", tags: ["type:stand", "type:magsafe"] },
  { id: "belkin-pad-15w", cat: "charger", brand: "벨킨", name: "부스트차지 15W 무선 충전 패드", kind: "wireless-charger", width: 9.5, depth: 9.5, price: 40000, tags: ["type:pad"] },
  { id: "samsung-p2400", cat: "charger", brand: "삼성", name: "15W 무선 충전 패드 (EP-P2400)", kind: "wireless-charger", width: 9.1, depth: 9.1, price: 40000, tags: ["type:pad"] },
  { id: "anker-maggo-3in1-stand", cat: "charger", brand: "앤커", name: "MagGo 3-in-1 무선 충전 스탠드 (Qi2)", kind: "phone-stand", width: 14, depth: 14, tall: 16.5, price: 160000, tags: ["type:stand", "type:magsafe"] },

  // ── 헤드폰 ──
  { id: "sony-wh1000xm5", cat: "headphones", brand: "소니", name: "WH-1000XM5", kind: "headphones", width: 17, depth: 19, price: 450000, tags: ["anc:yes", "use:music"] },
  { id: "apple-airpods-max", cat: "headphones", brand: "Apple", name: "에어팟 맥스", kind: "headphones", width: 17, depth: 19, price: 769000, color: "white", tags: ["anc:yes", "use:music"] },
  { id: "bose-qc-ultra", cat: "headphones", brand: "보스", name: "QC 울트라 헤드폰", kind: "headphones", width: 17, depth: 19, price: 500000, tags: ["anc:yes", "use:music"] },
  { id: "logi-g-pro-x2", cat: "headphones", brand: "로지텍", name: "G PRO X 2 게이밍 헤드셋", kind: "headphones", width: 18, depth: 20, price: 300000, tags: ["use:game"] },
  { id: "hyperx-cloud-2", cat: "headphones", brand: "하이퍼엑스", name: "Cloud II 게이밍 헤드셋", kind: "headphones", width: 18, depth: 20, price: 100000, tags: ["use:game"] },
  { id: "sony-wh-ch720n", cat: "headphones", brand: "소니", name: "WH-CH720N", kind: "headphones", width: 17, depth: 19, price: 150000, tags: ["anc:yes", "use:music"] },
  { id: "sony-wh-ch520", cat: "headphones", brand: "소니", name: "WH-CH520", kind: "headphones", width: 17, depth: 19, price: 60000, tags: ["use:music"] },
  { id: "razer-blackshark-v2-pro", cat: "headphones", brand: "레이저", name: "BlackShark V2 Pro 게이밍 헤드셋", kind: "headphones", width: 18, depth: 20, price: 230000, tags: ["use:game"] },
  { id: "steelseries-nova-7", cat: "headphones", brand: "스틸시리즈", name: "Arctis Nova 7 게이밍 헤드셋", kind: "headphones", width: 18, depth: 20, price: 220000, tags: ["use:game"] },

  // ── 모니터 암 ──
  { id: "ergotron-lx", cat: "arm", brand: "에르고트론", name: "LX 싱글 모니터 암", kind: "monitor-arm", width: 11, depth: 21, price: 250000, tags: ["type:single"] },
  { id: "camel-single", cat: "arm", brand: "카멜마운트", name: "싱글 가스 스프링 모니터 암", kind: "monitor-arm", width: 11, depth: 21, price: 50000, tags: ["type:single"] },
  { id: "camel-dual", cat: "arm", brand: "카멜마운트", name: "듀얼 가스 스프링 모니터 암", kind: "monitor-arm", width: 11, depth: 21, price: 90000, tags: ["type:dual"] },
  { id: "ergotron-lx-dual", cat: "arm", brand: "에르고트론", name: "LX 듀얼 모니터 암", kind: "monitor-arm", width: 11, depth: 21, price: 500000, tags: ["type:dual"] },
  { id: "huanuo-dual", cat: "arm", brand: "휴아노", name: "듀얼 가스 스프링 모니터 암", kind: "monitor-arm", width: 11, depth: 21, price: 70000, tags: ["type:dual"] },
  { id: "amazon-basics-single", cat: "arm", brand: "아마존 베이직", name: "싱글 모니터 암", kind: "monitor-arm", width: 11, depth: 21, price: 150000, tags: ["type:single"] },
];
