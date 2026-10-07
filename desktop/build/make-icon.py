#!/usr/bin/env python3
"""DeskBoard 앱 아이콘 생성기 → build/icon.svg

3D 좌표(x: 오른쪽, y: 앞쪽, z: 위쪽, 단위는 대략 mm)를 아이소메트릭으로 투영해
책상·모니터·키보드·마우스를 그린다. 보이는 면은 윗면(z), 앞면(+y), 오른쪽 면(+x).
렌더링: npx electron build/render-icon.js   (build/icon.svg → build/icon.png)
사용: python3 build/make-icon.py [출력.svg]
"""
import math
import sys
from pathlib import Path

COS, SIN = math.cos(math.radians(30)), math.sin(math.radians(30))
OX, OY = 512, 600  # 장면 원점(책상 윗면 가운데)의 화면 위치


def P(x, y, z=0):
    """3D → 화면 좌표"""
    return (OX + (x - y) * COS, OY + (x + y) * SIN - z)


def poly(points, fill, extra=""):
    pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in points)
    return f'<polygon points="{pts}" fill="{fill}" {extra}/>'


def box(x0, x1, y0, y1, z0, z1, top, front, right, top_extra=""):
    """직육면체의 보이는 세 면 (오른쪽 → 앞 → 윗면 순서로 그려야 겹침이 맞음)"""
    return "\n".join(
        [
            poly([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], right),
            poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], front),
            poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], top, top_extra),
        ]
    )


def hull(points):
    """볼록 껍질 (마우스 옆면 실루엣용)"""
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


out = []

# ── 책상 ─────────────────────────────────────────────
W, D, T, LEG = 220, 120, 30, 95  # 반폭, 반깊이, 상판 두께, 다리 길이
LEG_C, LEG_F, LEG_R = "#26262c", "#1b1b20", "#0f0f12"
# 다리: 왼쪽 앞 · 오른쪽 뒤 · 오른쪽 앞 (뒤에 있는 것부터)
for lx, ly in [(-W + 12, D - 12), (W - 12, -D + 12), (W - 12, D - 12)]:
    out.append(box(lx - 10, lx + 10, ly - 10, ly + 10, -T - LEG, -T, LEG_C, LEG_F, LEG_R))
# 상판
out.append(box(-W, W, -D, D, -T, 0, "url(#wood)", "#a3734a", "#7a5232"))
# 상판 위: 나뭇결 + 화면 빛 (윗면으로 자름)
top_face = [P(-W, -D), P(W, -D), P(W, D), P(-W, D)]
out.append(f'<clipPath id="deskTop">{poly(top_face, "#000")}</clipPath>')
grain = []
for gy in (-70, -10, 50, 95):
    (x1, y1), (x2, y2) = P(-W, gy), P(W, gy + 6)
    grain.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#7a4f2b" stroke-opacity="0.16" stroke-width="3"/>')
gx, gy = P(0, 10)
out.append(
    f'<g clip-path="url(#deskTop)">{"".join(grain)}'
    f'<ellipse cx="{gx:.1f}" cy="{gy:.1f}" rx="250" ry="120" fill="url(#screenGlow)"/></g>'
)
# 상판 앞 모서리 하이라이트
(a, b), (c, d), (e, f) = P(-W, D), P(W, D), P(W, -D)
out.append(f'<polyline points="{a:.1f},{b:.1f} {c:.1f},{d:.1f} {e:.1f},{f:.1f}" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="3" stroke-linejoin="round"/>')

# ── 모니터 ──────────────────────────────────────────
# 받침 · 넥 (화면 뒤)
out.append(box(-58, 58, -112, -40, 0, 6, "#24242c", "#121217", "#0b0b0e"))
out.append(box(-11, 11, -86, -74, 6, 80, "#3a3a44", "#2a2a33", "#1a1a20"))
# 본체 (앞면 = y -60)
out.append(box(-150, 150, -72, -60, 72, 252, "#3a3a45", "#17171e", "#0d0d12"))
# 화면 (앞면에서 살짝 안쪽)
scr = [P(-138, -60, 240), P(138, -60, 240), P(138, -60, 86), P(-138, -60, 86)]
out.append(poly(scr, "url(#screen)"))
# 화면 반사광
out.append(poly([P(-138, -60, 240), P(-10, -60, 240), P(-104, -60, 86), P(-138, -60, 86)], "#fff", 'opacity="0.14"'))

# ── 키보드 ──────────────────────────────────────────
KX0, KX1, KY0, KY1 = -128, 92, 22, 76
out.append(box(KX0, KX1, KY0, KY1, 0, 9, "#2a2a32", "#16161b", "#0e0e12"))
rows = [
    [1] * 14,
    [1] * 14,
    [1.5] + [1] * 12 + [1.5],
    [2] + [1] * 11 + [2],
    [1.4, 1.4, 1.4, 6.2, 1.4, 1.4, 1.4],  # 스페이스바 줄 (맨 앞)
]
gap = 2.4
inner_x0, inner_x1 = KX0 + 6, KX1 - 6
inner_y0, inner_y1 = KY0 + 5, KY1 - 5
row_h = (inner_y1 - inner_y0) / len(rows)
for r, row in enumerate(rows):
    y0 = inner_y0 + r * row_h + gap / 2
    y1 = y0 + row_h - gap
    unit = (inner_x1 - inner_x0) / sum(row)
    x = inner_x0
    for w in row:
        x0, x1 = x + gap / 2, x + w * unit - gap / 2
        # 키캡: 앞면(옅은 두께) + 윗면
        out.append(poly([P(x0, y1, 9), P(x1, y1, 9), P(x1, y1, 12), P(x0, y1, 12)], "#1c1c23"))
        out.append(poly([P(x0, y0, 12), P(x1, y0, 12), P(x1, y1, 12), P(x0, y1, 12)], "#4a4a58" if w == 1 else "#3c3c48"))
        x += w * unit

# ── 마우스 ──────────────────────────────────────────
MCX, MCY, MRX, MRY = 130, 50, 15, 23


def mouse_ring(z, k=1.0):
    return [P(MCX + MRX * k * math.cos(t), MCY + MRY * k * math.sin(t), z) for t in [i * math.pi / 24 for i in range(48)]]


base, top = mouse_ring(0), mouse_ring(11, 0.86)
out.append(poly(hull(base + top), "#17171d"))  # 옆면 실루엣
out.append(poly(top, "url(#mouseTop)"))
# 좌우 버튼 구분선 + 휠 (앞쪽 = 모니터 쪽 = -y)
(l1, l2), (l3, l4) = P(MCX, MCY - MRY * 0.86, 11), P(MCX, MCY - 2, 11)
out.append(f'<line x1="{l1:.1f}" y1="{l2:.1f}" x2="{l3:.1f}" y2="{l4:.1f}" stroke="#0c0c10" stroke-width="2.5"/>')
out.append(poly([P(MCX - 2, MCY - 14, 12), P(MCX + 2, MCY - 14, 12), P(MCX + 2, MCY - 6, 12), P(MCX - 2, MCY - 6, 12)], "#818cf8"))

scene = "\n    ".join(out)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <!-- 배경: 검정 바탕 + 위쪽에서 들어오는 빛 + 가장자리 어둡게 -->
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2c2c32"/>
      <stop offset="0.55" stop-color="#121215"/>
      <stop offset="1" stop-color="#050506"/>
    </linearGradient>
    <radialGradient id="spot" cx="0.5" cy="0.42" r="0.55">
      <stop offset="0" stop-color="#4b4b55" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#4b4b55" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="rim" cx="0.3" cy="0.08" r="0.7">
      <stop offset="0" stop-color="#fff" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="floor" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#000" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e8c59c"/>
      <stop offset="1" stop-color="#c7976a"/>
    </linearGradient>
    <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a5b4fc"/>
      <stop offset="0.5" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
    <radialGradient id="screenGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#a5b4fc" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#a5b4fc" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mouseTop" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#5a5a68"/>
      <stop offset="1" stop-color="#2a2a33"/>
    </radialGradient>
  </defs>

  <!-- macOS 아이콘 영역: 824px 둥근 사각형 -->
  <rect x="100" y="100" width="824" height="824" rx="185" fill="url(#bg)"/>
  <rect x="100" y="100" width="824" height="824" rx="185" fill="url(#spot)"/>
  <rect x="100" y="100" width="824" height="824" rx="185" fill="url(#rim)"/>
  <rect x="101.5" y="101.5" width="821" height="821" rx="184" fill="none" stroke="#fff" stroke-opacity="0.1" stroke-width="3"/>

  <g transform="translate(512 512) scale(0.92) translate(-512 -565)">
    <ellipse cx="512" cy="862" rx="320" ry="62" fill="url(#floor)"/>
    {scene}
  </g>
</svg>
'''

# 사용: python3 build/make-icon.py [출력.svg]   (생략하면 build/icon.svg)
target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("icon.svg")
target.write_text(svg)
print("wrote", target)
