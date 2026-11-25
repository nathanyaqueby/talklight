"""Builds the vector logo files in ../img from the Open Sauce Sans font (OFL) and a hand-drawn cup icon.

Run:  python tools/build_logo.py     (needs: pip install fonttools brotli)
Existing files are kept (so a hand-made or designer logo is never overwritten); add --force to regenerate them.
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "img"
INK, BLUE, SKY = "#0B1B2B", "#0F64B7", "#64AAF2"

GRADIENT = f'<linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="{BLUE}"/><stop offset="1" stop-color="{SKY}"/></linearGradient>'
FORCE = "--force" in sys.argv


def save(name, text):
    target = IMG / name
    if target.exists() and not FORCE:
        print("kept existing", name)
        return
    target.write_text(text, encoding="utf-8")


# Cup with a speech-bubble tail, three dots and steam (100 x 100 box)
def cup(stroke, dots, fill="none", steam=None, sw=5.5):
    steam = steam or stroke
    return (
        f'<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="{sw}">'
        f'<path d="M30 30c-4-5 4-8 0-14M46 30c-4-5 4-8 0-14M62 30c-4-5 4-8 0-14" stroke="{steam}"/>'
        f'<path d="M76 54c15-4 17 14-1.5 17" stroke="{stroke}"/>'
        f'<path d="M15 40 L79 41 C79 66 66 80 47 80 C40 80 34 78.5 30 76 L15 92 L21 68 C16 61 15 50 15 40 Z" fill="{fill}" stroke="{stroke}"/>'
        f'</g>'
        f'<g fill="{dots}"><circle cx="33" cy="59" r="4"/><circle cx="47" cy="60" r="4"/><circle cx="61" cy="60" r="4"/></g>'
    )


def text_paths(font, text, x0, baseline, size, tracking, kerns=None):
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = size / font["head"].unitsPerEm
    x, out = x0, []
    kerns = kerns or {}
    for i, ch in enumerate(text):
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
        out.append(pen.getCommands())
        x += gs[name].width * scale + tracking * size + kerns.get(text[i:i + 2], 0) * size
    return out, x


def main():
    font = TTFont(ROOT / "fonts" / "open-sauce-sans-700.woff2")
    size, base = 78, 78
    talk, x = text_paths(font, "Talk", 108, base, size, -0.045, {"Ta": -0.03, "al": -0.005})
    light, end = text_paths(font, "Light", x + 1, base, size, -0.045, {"Li": -0.005})
    width = round(end + 6)

    def logo(word, light_fill, icon):
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 100" role="img" aria-label="TalkLight">'
            f'<defs>{GRADIENT}</defs>{icon}'
            f'<path fill="{word}" d="{"".join(talk)}"/><path fill="{light_fill}" d="{"".join(light)}"/></svg>'
        )

    save("logo.svg", logo(INK, "url(#g)", cup(INK, INK)))
    save("logo-white.svg", logo("#FFFFFF", "#FFFFFF", cup("#FFFFFF", "#FFFFFF")))
    save("cup.svg",
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>{GRADIENT}</defs>{cup("url(#g)", "url(#g)")}</svg>')

    save("cup-white.svg",
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{cup("#FFFFFF", "#FFFFFF")}</svg>')

    # App icon: gradient tile with a white cup (the maskable version keeps the cup inside the safe zone)
    def tile(radius, inset):
        s = 100 - 2 * inset
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>{GRADIENT}</defs>'
            f'<rect width="100" height="100" rx="{radius}" fill="url(#g)"/>'
            f'<g transform="translate({inset} {inset}) scale({s / 100})">{cup("#FFFFFF", "#FFFFFF", sw=6)}</g></svg>'
        )

    save("icon.svg", tile(22, 11))
    save("icon-maskable.svg", tile(0, 19))
    print("logo width", width)


if __name__ == "__main__":
    main()
