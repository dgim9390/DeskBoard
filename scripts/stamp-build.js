// 웹 빌드(dist/) 후 실행: 화면 코드 전체의 지문(해시)을 index.html 에 새긴다.
// Expo는 지연 로딩 파일(3D 등)만 바뀌면 index.html 이 그대로라, 맥 앱이 새 화면을 알아채지 못한다.
// 코드가 바뀔 때만 값이 바뀌므로 같은 코드를 다시 배포해도 업데이트 알림이 뜨지 않음.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const dist = path.resolve(process.argv[2] || "dist");
const indexFile = path.join(dist, "index.html");
const hash = crypto.createHash("sha256");

function walk(dir) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p !== indexFile) {
      hash.update(path.relative(dist, p));
      hash.update(fs.readFileSync(p));
    }
  }
}
walk(dist);
const stamp = hash.digest("hex").slice(0, 16);

let html = fs.readFileSync(indexFile, "utf8").replace(/\s*<meta name="deskterior-build"[^>]*>/, "");
html = html.replace("</head>", `  <meta name="deskterior-build" content="${stamp}">\n</head>`);
fs.writeFileSync(indexFile, html);
console.log(`build stamp ${stamp}`);
