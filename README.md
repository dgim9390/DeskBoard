<div align="center">

<img src="desktop/build/icon.png" width="96" alt="Deskterior" />

# Deskterior

**내 책상을 실제 크기로 꾸며 보는 데스크테리어 시뮬레이터**

[![Download .dmg](https://img.shields.io/badge/Download-.dmg-6366F1?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/dgim9390/deskterior/releases/latest)
[![Open Web](https://img.shields.io/badge/Web-바로_쓰기-18181B?style=for-the-badge&logo=vercel&logoColor=white)](https://deskterior-one.vercel.app)

[![Release](https://img.shields.io/github/v/release/dgim9390/deskterior?style=flat-square&color=6366F1&label=version)](https://github.com/dgim9390/deskterior/releases/latest)
![macOS](https://img.shields.io/badge/macOS-Apple_Silicon-000000?style=flat-square&logo=apple)
![Expo](https://img.shields.io/badge/Expo-React_Native-000020?style=flat-square&logo=expo)

<img src="docs/screenshot.png" width="720" alt="Deskterior 실행 화면" />

</div>

<br/>

## 설치

1. **[Releases](https://github.com/dgim9390/deskterior/releases/latest)** → **Assets** 에서 `Deskterior-x.x.x-arm64.dmg` 다운로드
2. `.dmg` 를 열고 **Deskterior** 를 **Applications** 폴더로 드래그
3. 응용 프로그램에서 실행

> [!NOTE]
> Apple Silicon 맥 전용이에요 (M1 ~ M5, A18 Pro 맥북 네오). 인텔 맥은 지원하지 않아요.

## 앱이 열리지 않을 때

개인 배포 앱이라 처음 한 번 macOS 보안 경고가 떠요. 아래처럼 허용하면 이후엔 바로 열려요.

1. 경고 창에서 **완료** 클릭 — *휴지통으로 이동은 누르지 마세요*
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

## 기능

- 📐 **실제 크기 배치** — 책상 크기(cm)에 맞춰 장비를 실제 비율로
- 🧊 **3D 보기** — 버튼 하나로 위에서 본 화면 ↔ 3D 전환, 돌려 보고 확대하기
- ✋ **자유 편집** — 드래그 · 크기 · 회전 · 순서 · 색상 · 복제 · 중앙 스냅
- ↩️ **되돌리기** — 실수해도 한 번에 되돌리기 · 다시하기
- ✨ **추천 셋업** — 개발자 · 미니멀 · 게이밍 등 완성된 책상으로 바로 시작
- 🔗 **링크로 제품 추가** — 제품 링크로 이름 · 사진 · 크기 불러오기 (맥 앱은 쿠팡도 OK)
- ✂️ **배경 자동 지우기** — 제품 사진의 흰 배경을 지워 책상 위에 자연스럽게
- 🧩 **결합** — 모니터 암, 노트북 받침대 · 수직 거치대
- 💡 **추천** — 내 책상에 맞춘 제품과 인기 아이템
- 💾 **셋업 저장** — 로그인하면 맥 · 웹 · 다른 기기와 동기화
- 🖼️ **이미지로 저장** — 내 책상을 PNG로 저장해서 공유

<details>
<summary><b>단축키</b></summary>

| 키 | 동작 |
| --- | --- |
| `⌘Z` / `⌘⇧Z` | 되돌리기 / 다시하기 |
| `⌘D` | 선택한 장비 복제 |
| `⌫` | 선택한 장비 삭제 |
| `←↑→↓` | 1cm 이동 (`⇧` 누르면 5cm) |
| `⌘S` | 셋업 저장 |
| `esc` | 선택 해제 |

</details>

> [!TIP]
> **쿠팡 링크는 맥 앱에서** 바로 불러와요 (웹에서는 쿠팡이 막아 두어서, 이름·크기를 입력하고 상품 사진을 저장해 **사진 올리기**로 넣으면 돼요).
> 그 밖에는 **제조사 공식 홈페이지** 링크가 가장 잘 불러와져요.

## 업데이트

앱을 켜면 새 업데이트를 알려 줘요 → **지금 적용** 한 번이면 끝. 다시 설치할 필요 없고, 셋업·로그인은 그대로예요.
큰 업데이트는 새 `.dmg` 를 Applications 에 드래그 → **대치** 하면 돼요 (삭제 불필요).

<details>
<summary><b>개발</b></summary>

<br/>

```bash
npm install && npx expo start        # w: 웹 · i: iOS 시뮬레이터
cd desktop && npm install && npm run dist   # 맥 앱 → desktop/release/*.dmg
```

`.env.example` → `.env` 에 Supabase 값 입력 · 스키마 `supabase/schema.sql` · 링크 읽기 `api/product-preview.js`

**Stack** · Expo (React Native, Expo Router) · NativeWind · Zustand · Reanimated · Supabase · Vercel · Electron

</details>
