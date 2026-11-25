"""Builds cup.svg, icon.svg and icon-maskable.svg from the official cup (img/cup-white.svg).

Run:  python tools/build_icons.py
The PNG icons (icon-512/192/180, icon-maskable-512, favicon-32) are rendered from these SVGs in a browser:
open img/icon.svg / img/icon-maskable.svg at the target size and take a screenshot (see docs/ASSETS.md).
"""
import re
from pathlib import Path

IMG = Path(__file__).resolve().parent.parent / "img"
BLUE, SKY = "#0F64B7", "#64AAF2"
GRAD = (f'<linearGradient id="tl-g" x1="0" y1="1" x2="1" y2="0">'
        f'<stop offset="0" stop-color="{BLUE}"/><stop offset="1" stop-color="{SKY}"/></linearGradient>')

src = (IMG / "cup-white.svg").read_text(encoding="utf-8")
vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', src).group(1).split()]
defs = re.search(r"<defs>.*?</defs>", src, re.S).group(0)
body = src[src.index("</defs>") + len("</defs>"): src.rindex("</svg>")]
# the export contains a tiny stray teal dot (first group); keep only the cup itself
cut = body.index('<g clip-path="url(#9a28cea26e)">')
body = body[cut:]
defs = re.sub(r'<clipPath id="(0b9f92ce3a|9faafd9c82|3e74357153)">.*?</clipPath>', "", defs, flags=re.S)
defs = re.sub(r'<clipPath id="(a99389fab1|38b49400e6)">.*?</clipPath>', "", defs, flags=re.S)
w, h = vb[2], vb[3]


def cup(fill, size, x, y):
    s = size / max(w, h)
    ox, oy = x + (size - w * s) / 2, y + (size - h * s) / 2
    return f'<g transform="translate({ox:.2f} {oy:.2f}) scale({s:.4f})">{body.replace("#ffffff", fill)}</g>'


def svg(inner, view="0 0 100 100", extra=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}">{defs.replace("<defs>", "<defs>" + GRAD, 1)}{extra}{inner}</svg>'


# gradient cup on transparent background
(IMG / "cup.svg").write_text(svg(cup("url(#tl-g)", 100, 0, 0)), encoding="utf-8")
# app icon: gradient tile, white cup
tile = lambda r: f'<rect width="100" height="100" rx="{r}" fill="url(#tl-g)"/>'
(IMG / "icon.svg").write_text(svg(tile(22) + cup("#ffffff", 64, 18, 18)), encoding="utf-8")
(IMG / "icon-maskable.svg").write_text(svg(tile(0) + cup("#ffffff", 52, 24, 24)), encoding="utf-8")
print("written: cup.svg, icon.svg, icon-maskable.svg")
