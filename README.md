<p align="center">
  <img src="desktop/build/icon.png" width="128" alt="Deskterior 아이콘" />
</p>

<h1 align="center">Deskterior</h1>

<p align="center">책상 위 장비를 실제 크기로 배치해 보고, 어울리는 제품을 추천받는 데스크테리어 시뮬레이터</p>

<p align="center">
  <a href="https://github.com/dgim9390/deskterior/releases/latest"><b>⬇️ macOS 앱 다운로드</b></a>
  &nbsp;·&nbsp;
  <a href="https://deskterior-one.vercel.app"><b>🌐 웹에서 바로 쓰기</b></a>
</p>

---

## 다운로드 (macOS)

1. [**Releases**](https://github.com/dgim9390/deskterior/releases/latest)에서 `Deskterior-x.x.x-arm64.dmg`를 받습니다.
2. `.dmg`를 열고 **Deskterior**를 **Applications** 폴더로 끌어다 놓습니다.
3. 처음 실행할 때 **"확인되지 않은 개발자"** 또는 **"손상되었습니다"** 경고가 뜨면
   **시스템 설정 → 개인정보 보호 및 보안 → "그래도 열기"** 를 누릅니다.
   버튼이 없으면 터미널에서 아래를 한 번 실행한 뒤 다시 엽니다.
   ```bash
   xattr -dr com.apple.quarantine /Applications/Deskterior.app
   ```

> Apple Silicon(M1 이후) 맥 전용입니다. Apple 개발자 서명이 없는 개인 배포 앱이라 첫 실행 시 경고가 뜹니다.

## 주요 기능

- **실제 크기 배치**: 책상 크기(cm)를 입력하고 모니터·키보드·노트북 등을 실제 비율로 배치
- **자유로운 편집**: 드래그 이동, 크기 조절, 회전, 앞/뒤 순서, 블랙/화이트 색상, 중앙선 스냅
- **결합**: 모니터 암 ↔ 모니터, 노트북 받침대·수직 거치대 ↔ 노트북
- **추천**: 현재 책상 구성에 맞춘 제품과 데스크테리어 인기 아이템
- **셋업 저장**: 이름 붙여 저장/불러오기, 이메일 로그인 시 웹·맥 앱·다른 기기와 동기화

## 개발

```bash
npm install
npx expo start          # w: 웹, i: iOS 시뮬레이터
```

`.env.example`을 복사해 `.env`를 만들고 Supabase 값을 넣습니다. DB 스키마는 `supabase/schema.sql`.

맥 앱 빌드:

```bash
cd desktop && npm install && npm run dist   # desktop/release/ 에 .dmg 생성
```

**기술 스택**: Expo (React Native, Expo Router) · NativeWind · Zustand · Reanimated/Gesture Handler · react-native-svg · Supabase · Electron
