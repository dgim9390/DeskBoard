const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// 맥 앱(desktop/)의 Electron 의존성과 빌드 결과물은 Expo 번들에서 제외
// (프로젝트 루트의 desktop/ 만 정확히 막음 — 라이브러리 안의 같은 이름 폴더는 건드리지 않음)
const desktopDir = path.join(__dirname, "desktop").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
config.resolver.blockList = [new RegExp(`^${desktopDir}[\\/\\\\].*`)];

module.exports = withNativeWind(config, { input: "./global.css" });
