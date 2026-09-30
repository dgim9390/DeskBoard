<p align="center">
  <img src="desktop/build/icon.png" width="120" alt="Deskterior 아이콘" />
</p>

<h1 align="center">Deskterior</h1>

<p align="center">
  내 책상을 실제 크기로 꾸며 보는 데스크테리어 시뮬레이터<br/>
  모니터·키보드·노트북을 배치해 보고, 어울리는 제품을 추천받고, 사고 싶은 제품을 링크로 올려 보세요.
</p>

<p align="center">
  <a href="https://github.com/dgim9390/deskterior/releases/latest"><b>⬇️ macOS 앱 다운로드 (.dmg)</b></a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="https://deskterior-one.vercel.app"><b>🌐 설치 없이 웹에서 쓰기</b></a>
</p>

<p align="center">
  <img src="docs/screenshot.png" width="760" alt="Deskterior 실행 화면" />
</p>

---

## ⬇️ 다운로드 및 설치 (macOS)

1. **[최신 버전 다운로드 페이지](https://github.com/dgim9390/deskterior/releases/latest)** 로 이동해요.
2. 페이지 아래 **Assets** 에서 **`Deskterior-x.x.x-arm64.dmg`** 파일을 눌러 받아요.
3. 받은 **`.dmg` 파일을 더블클릭**해서 열어요.
4. 열린 창에서 **Deskterior 아이콘을 Applications(응용 프로그램) 폴더로 끌어다 놓아요.**
5. **응용 프로그램** 폴더(또는 Launchpad)에서 **Deskterior** 를 실행해요.

> 💻 **Apple Silicon 맥 전용** (M1 ~ M5 시리즈, A18 Pro 맥북 네오 등) · 인텔 맥에서는 실행되지 않아요.

---

## 🔓 앱이 열리지 않을 때

처음 실행하면 **"Apple에서 확인할 수 없습니다"** 경고가 뜨고 앱이 열리지 않을 수 있어요.
개인이 배포한 앱이라 Apple 개발자 서명이 없어서 뜨는 경고이고, **처음 한 번만** 아래처럼 허용하면 돼요.

1. 경고 창에서 **완료** 를 눌러 닫아요. (**휴지통으로 이동** 은 누르지 마세요)
2. **시스템 설정** 을 열어요. (화면 왼쪽 위 **Apple 메뉴** → 시스템 설정)
3. 왼쪽 목록에서 **개인정보 보호 및 보안** 을 눌러요.
4. 오른쪽 화면을 **제일 하단까지 스크롤** 해요.
5. `"Deskterior"이(가) 확인된 개발자가 아니기 때문에…` 문구 옆의 **"그래도 열기"** 를 눌러요.
6. **맥 로그인 비밀번호** (또는 Touch ID)를 입력해요.
7. 한 번 더 확인 창이 뜨면 **열기** 를 눌러요.

이후에는 다른 앱처럼 바로 열려요.

<details>
<summary><b>"손상되었기 때문에 열 수 없습니다" 가 뜨고 "그래도 열기" 버튼이 없다면</b></summary>

<br/>

**터미널** 앱을 열고 아래 한 줄을 붙여 넣은 뒤 Enter 를 누르고, 앱을 다시 열어 주세요.

```bash
xattr -dr com.apple.quarantine /Applications/Deskterior.app
```

앱을 Applications 가 아닌 다른 폴더에 두었다면 경로를 그 위치로 바꿔 주세요.

</details>

---

## 🔄 업데이트

- 앱을 켤 때 새 업데이트가 있으면 **"새 업데이트가 준비됐어요"** 가 떠요. **지금 적용** 을 누르면 바로 반영돼요. **다시 설치할 필요 없어요.**
- 메뉴 **Deskterior → 업데이트 확인…** 으로 직접 확인할 수도 있어요.
- 가끔 앱 자체가 바뀌는 큰 업데이트는 **"새 앱 버전이 나왔어요"** 알림이 떠요. 새 `.dmg` 를 받아 Applications 에 끌어다 놓고 **"대치"** 를 누르면 돼요. **기존 앱을 지울 필요는 없어요.**
- 업데이트해도 **저장한 셋업·로그인·내 제품은 그대로** 남아요.

> v1.1.0 이하를 쓰고 있다면 **최신 버전을 한 번만 직접 설치**해 주세요. 그 뒤로는 자동으로 업데이트돼요.

---

## ✨ 주요 기능

| | |
|---|---|
| 📐 **실제 크기 배치** | 책상 크기(cm)를 입력하고 모니터·키보드·노트북 등을 실제 비율로 배치 |
| ✋ **자유로운 편집** | 드래그 이동, 크기 조절, 회전, 앞/뒤 순서, 블랙/화이트 색상, 책상 중앙선 스냅 |
| 🔗 **링크로 제품 추가** | 사고 싶은 제품의 링크를 붙여 넣으면 이름·사진·크기를 불러와 책상에 올려 봐요 |
| 🧩 **결합** | 모니터 ↔ 모니터 암, 노트북 ↔ 노트북 받침대·수직 거치대 |
| 💡 **추천** | 지금 책상 구성에 맞춘 제품과 데스크테리어 인기 아이템 |
| 💾 **셋업 저장** | 이름 붙여 저장·불러오기, 로그인하면 맥 앱·웹·다른 기기와 동기화 |

### 🔗 링크로 제품 추가 팁

- **제조사 공식 홈페이지의 제품 링크**를 넣어 주세요. (예: 로지텍·애플·키크론·BenQ 공식몰 ✅)
- 쿠팡·네이버 스마트스토어 같은 쇼핑몰은 정보를 막아 두어 불러오지 못할 수 있어요. 이럴 땐 **이름과 크기를 직접 입력**하면 돼요.
- 페이지에서 찾은 크기는 추정값이라, 놓기 전에 한 번 확인해 주세요.

### 💾 로그인하면

이메일로 가입·로그인하면 저장한 셋업이 계정에 보관돼서, **맥 앱 · 웹 · 다른 기기** 어디서든 불러올 수 있어요.
로그인하지 않으면 그 기기에만 저장돼요.

---

## 🛠 개발

<details>
<summary>직접 빌드하기</summary>

<br/>

```bash
npm install
npx expo start          # w: 웹, i: iOS 시뮬레이터
```

- `.env.example` 을 복사해 `.env` 를 만들고 Supabase 값을 넣어요. DB 스키마는 `supabase/schema.sql`.
- 링크 읽기 서버: `api/product-preview.js` (Vercel 함수)

맥 앱 빌드:

```bash
cd desktop && npm install && npm run dist   # desktop/release/ 에 .dmg 생성
```

**기술 스택**: Expo (React Native, Expo Router) · NativeWind · Zustand · Reanimated / Gesture Handler · react-native-svg · Supabase · Vercel · Electron

</details>
