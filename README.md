<div align="center">

<img src="desktop/build/icon.png" width="96" alt="Deskterior" />

# Deskterior

**내 책상을 실제 크기로 꾸미고, 3D로 둘러보는 데스크테리어 시뮬레이터**

[![Download .dmg](https://img.shields.io/badge/Download-.dmg-6366F1?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/dgim9390/deskterior/releases/latest)
[![Open Web](https://img.shields.io/badge/Web-바로_쓰기-18181B?style=for-the-badge&logo=vercel&logoColor=white)](https://deskterior-one.vercel.app)

[![Release](https://img.shields.io/github/v/release/dgim9390/deskterior?style=flat-square&color=6366F1&label=version)](https://github.com/dgim9390/deskterior/releases/latest)
![macOS](https://img.shields.io/badge/macOS-Apple_Silicon-000000?style=flat-square&logo=apple)
![Expo](https://img.shields.io/badge/Expo-React_Native-000020?style=flat-square&logo=expo)
![three.js](https://img.shields.io/badge/3D-three.js-000000?style=flat-square&logo=threedotjs)

<img src="docs/screenshot.png" width="760" alt="맥북·27인치 모니터로 꾸민 데스크테리어 (2D)" />

</div>

<br/>

## 다운로드 · 설치

1. **[Releases](https://github.com/dgim9390/deskterior/releases/latest)** → **Assets** 에서 `Deskterior-x.x.x-arm64.dmg` 다운로드
2. `.dmg` 를 열고 **Deskterior** 를 **Applications** 폴더로 드래그
3. 응용 프로그램에서 **Deskterior** 실행

> [!NOTE]
> Apple Silicon 맥 전용이에요 (M1 ~ M5, A18 Pro 맥북 네오). 인텔 맥은 지원하지 않아요.
> 설치 없이 쓰려면 **[웹에서 바로 쓰기](https://deskterior-one.vercel.app)** 를 눌러 주세요.

## 앱이 열리지 않을 때

개인 배포 앱이라 처음 한 번 macOS 보안 경고가 떠요. 아래처럼 허용하면 그다음부터는 바로 열려요.

1. 경고 창에서 **완료** 클릭 (*휴지통으로 이동은 누르지 마세요*)
2. **시스템 설정** → **개인정보 보호 및 보안**
3. **제일 하단**으로 스크롤 → **그래도 열기** 클릭
4. **비밀번호** 입력 → **열기**

<details>
<summary><sub>"손상되었습니다" 가 뜨고 그래도 열기 버튼이 없다면</sub></summary>

<br/>

터미널에서 한 번 실행한 뒤 다시 열어 주세요.

```bash
xattr -dr com.apple.quarantine /Applications/Deskterior.app
```

</details>

## 업데이트

- **화면 업데이트**: 앱을 켜면 *새 업데이트가 준비됐어요* 알림이 떠요 → **지금 적용** 한 번이면 끝이에요. 메뉴 **Deskterior → 업데이트 확인…** 으로 직접 확인할 수도 있어요.
- **앱 업데이트**: 새 버전이 나오면 알려 줘요. 새 `.dmg` 를 받아 **Applications** 에 드래그 → **대치** 하면 돼요. 지우고 다시 설치할 필요 없어요.

저장한 셋업, 로그인, 내 제품은 업데이트해도 그대로 남아요.

## 기능

<img src="docs/screenshot-3d.png" width="760" alt="같은 책상을 3D로 본 모습 (저녁 조명)" />

**책상 꾸미기**
- 📐 **실제 크기 배치**: 책상 크기(cm)에 맞춰 장비를 실제 비율로 놓아요
- 🧊 **3D 보기**: 오른쪽 위 **3D** 버튼으로 위에서 본 화면 ↔ 3D 전환, 드래그로 돌리고 스크롤로 확대해요
- 🌙 **상판 · 조명**: 상판 6종(오크 · 월넛 · 메이플 · 화이트 · 블랙 · 콘크리트), 조명은 낮 · 저녁 · 밤
- ✋ **자유 편집**: 드래그 · 크기 · 회전 · 앞뒤 순서 · 색상 · 복제 · 중앙 맞춤
- 🧩 **결합**: 모니터 암, 노트북 받침대, 수직 거치대
- ↩️ **되돌리기**: 실수해도 한 번에 되돌리기 · 다시하기

**제품 넣기**
- 🔗 **링크로 추가**: 제품 페이지 링크로 이름 · 사진 · 크기(가로 × 깊이 × 높이)를 자동으로 불러와요
- ✂️ **배경 자동 지우기**: 흰 배경 제품 사진은 배경을 지워 제품만 책상에 올려요
- 🖼️ **사진 고르기 · 올리기**: 페이지의 다른 사진으로 바꾸거나, 내 컴퓨터의 사진을 올릴 수 있어요
- ✨ **추천 셋업 · 추천 제품**: 개발자 · 미니멀 · 게이밍 등 완성된 책상으로 시작하고, 내 책상에 맞는 제품을 추천받아요

**저장 · 공유**
- 💾 **셋업 저장**: 로그인하면 맥 앱 · 웹 · 다른 기기에서 같은 셋업을 불러와요
- 📸 **이미지로 저장**: 2D · 3D 화면을 그대로 PNG로 저장해요

> [!TIP]
> **링크로 추가할 때는 제조사 공식 홈페이지의 제품 링크**가 가장 잘 불러와져요 (로지텍 · 애플 · 키크론 · Xbox 등).
> **쿠팡 링크는 지원하지 않아요.** 쿠팡 · 네이버 스마트스토어 같은 쇼핑몰은 자동으로 읽는 것을 막아 두었어요. 이럴 땐 이름과 크기를 직접 넣고, 상품 사진을 저장해 **사진 올리기**로 넣어 주세요.

<details>
<summary><b>단축키</b></summary>

<br/>

| 키 | 동작 |
| --- | --- |
| `⌘Z` / `⌘⇧Z` | 되돌리기 / 다시하기 |
| `⌘D` | 선택한 장비 복제 |
| `⌫` | 선택한 장비 삭제 |
| `←` `↑` `→` `↓` | 1cm 이동 (`⇧` 누르면 5cm) |
| `⌘S` | 셋업 저장 |
| `esc` | 선택 해제 |

</details>

<details>
<summary><b>화면 구성</b></summary>

<br/>

- **시뮬레이터**: 책상 화면 + 오른쪽 **장비 추가** 패널 (접기 › 를 누르면 접혀서 책상이 넓어져요. 휴대폰에서는 아래에 있어요)
- **추천 기기**: 추천 셋업과 내 책상에 맞춘 추천 제품
- **내 셋업**: 저장한 셋업 불러오기 · 덮어쓰기 · 삭제

</details>

<details>
<summary><b>개발</b></summary>

<br/>

```bash
npm install && npx expo start              # w: 웹 · i: iOS 시뮬레이터
cd desktop && npm install && npm run dist  # 맥 앱 → desktop/release/*.dmg
```

- `.env.example` → `.env` 에 Supabase 값 입력, 스키마는 `supabase/schema.sql`
- 링크 읽기 `api/product-preview.js` · 사진 중계 `api/image-proxy.js` (Vercel 서버리스)
- 3D 보기 `lib/desk3d/` · 배경 지우기 `lib/cutout.ts`

**Stack** · Expo (React Native, Expo Router) · NativeWind · Zustand · Reanimated · three.js · Supabase · Vercel · Electron

</details>
