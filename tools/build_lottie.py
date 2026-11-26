"""Builds the two small Lottie animations used by the app (img/lottie/*.json).

    python tools/build_lottie.py

They are plain vector shapes (no expressions, no images), so they stay tiny and play with lottie_light.
Replace the generated files with the artist's own After Effects exports (same file names) to restyle them.
See docs/ILLUSTRATIONS.md for the export rules.
"""
import json, os, math

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "img", "lottie")
os.makedirs(OUT, exist_ok=True)

WHITE = [1, 1, 1, 1]
BLUE = [15 / 255, 100 / 255, 183 / 255, 1]
SKY = [100 / 255, 170 / 255, 242 / 255, 1]


def static(v):
    return {"a": 0, "k": v}


def keys(frames, ease=(0.42, 0.0, 0.58, 1.0)):
    """frames: [(t, value)]. Eased keyframes (ease in/out) for a property."""
    out = []
    for i, (t, v) in enumerate(frames):
        k = {"t": t, "s": v if isinstance(v, list) else [v]}
        if i < len(frames) - 1:
            k["i"] = {"x": [ease[2]], "y": [ease[3]]}
            k["o"] = {"x": [ease[0]], "y": [ease[1]]}
        out.append(k)
    return {"a": 1, "k": out}


def linear(frames):
    out = []
    for i, (t, v) in enumerate(frames):
        k = {"t": t, "s": v if isinstance(v, list) else [v]}
        if i < len(frames) - 1:
            k["i"] = {"x": [1], "y": [1]}
            k["o"] = {"x": [0], "y": [0]}
        out.append(k)
    return {"a": 1, "k": out}


def transform(p=(0, 0), s=None, r=None, o=None):
    return {"ty": "tr", "p": static(list(p)), "a": static([0, 0]),
            "s": s or static([100, 100]), "r": r or static(0), "o": o or static(100)}


def ellipse(d, cx=0, cy=0):
    return {"ty": "el", "p": static([cx, cy]), "s": static([d, d])}


def fill(c, o=100):
    return {"ty": "fl", "c": static(c), "o": static(o), "r": 1}


def stroke(c, w, o=100):
    return {"ty": "st", "c": static(c), "o": static(o), "w": static(w), "lc": 2, "lj": 2}


def layer(name, shapes, pos, scale=None, rot=None, opacity=None, ip=0, op=300):
    return {"ty": 4, "nm": name, "ind": 1, "ip": ip, "op": op, "st": 0, "sr": 1, "ao": 0,
            "ks": {"o": opacity or static(100), "r": rot or static(0), "p": static(list(pos) + [0]),
                   "a": static([0, 0, 0]), "s": scale or static([100, 100, 100])},
            "shapes": [{"ty": "gr", "nm": name, "it": shapes + [transform()]}]}


def comp(name, w, h, frames, layers, fr=30):
    for i, l in enumerate(layers):
        l["ind"] = i + 1
    return {"v": "5.7.0", "fr": fr, "ip": 0, "op": frames, "w": w, "h": h, "nm": name, "ddd": 0, "assets": [], "layers": layers}


# ---------- breathe: one 10 s breath, in for 4 s, out for 6 s. The app sets the speed (10 s or 5 s) ----------
def breathe():
    W = 300
    c = W / 2
    inhale, total = 120, 300

    def pulse(lo, hi):
        return keys([(0, [lo, lo, 100]), (inhale, [hi, hi, 100]), (total, [lo, lo, 100])])

    layers = []
    # soft outer halo, ring, inner halo (back to front)
    layers.append(layer("halo-outer", [ellipse(260), fill(WHITE, 10)], (c, c), pulse(70, 100)))
    layers.append(layer("ring", [ellipse(236), stroke(WHITE, 3, 70)], (c, c), pulse(66, 98)))
    layers.append(layer("halo-inner", [ellipse(210), fill(WHITE, 16)], (c, c), pulse(62, 92)))
    # six dots orbiting slowly, breathing with the circle
    dots = [ellipse(9, math.cos(a) * 128, math.sin(a) * 128) for a in [i * math.pi / 3 for i in range(6)]]
    layers.append(layer("orbit", [g for d in dots for g in ({"ty": "gr", "it": [d, fill(WHITE, 70), transform()]},)],
                        (c, c), pulse(72, 100), rot=linear([(0, 0), (total, 360)])))
    return comp("breathe", W, W, total, layers)


# ---------- done: circle pops, check draws, sparkles burst ----------
def done():
    W = 200
    c = W / 2
    total = 75
    layers = []

    # sparkles: 8 dots flying out and fading
    for i in range(8):
        a = i * math.pi / 4 + math.pi / 8
        near, far = 52, 88 if i % 2 else 80
        col = SKY if i % 2 else BLUE
        l = layer(f"spark-{i}", [ellipse(8 if i % 2 else 6), fill(col)], (c, c), ip=12, op=total)
        l["ks"]["p"] = keys([(12, [c + math.cos(a) * near, c + math.sin(a) * near, 0]),
                             (42, [c + math.cos(a) * far, c + math.sin(a) * far, 0])], ease=(0.2, 0.6, 0.4, 1.0))
        l["ks"]["o"] = keys([(12, [100]), (30, [100]), (44, [0])])
        l["ks"]["s"] = keys([(12, [30, 30, 100]), (24, [100, 100, 100]), (44, [40, 40, 100])])
        layers.append(l)

    # check mark drawn with a trim path
    check = {"ty": "sh", "ks": static({"c": False, "v": [[-22, 2], [-6, 18], [24, -14]],
                                       "i": [[0, 0]] * 3, "o": [[0, 0]] * 3})}
    trim = {"ty": "tm", "s": static(0),
            "e": keys([(16, [0]), (34, [100])], ease=(0.3, 0, 0.2, 1)), "o": static(0), "m": 1}
    layers.append(layer("check", [check, trim, stroke(WHITE, 13)], (c, c + 2), ip=0, op=total))

    # badge pops with a small overshoot
    pop = keys([(0, [0, 0, 100]), (10, [112, 112, 100]), (16, [100, 100, 100])], ease=(0.3, 0, 0.3, 1))
    layers.append(layer("badge", [ellipse(100), fill(BLUE)], (c, c), pop, ip=0, op=total))
    # soft ring around it
    ring_s = keys([(6, [70, 70, 100]), (30, [130, 130, 100])], ease=(0.2, 0.6, 0.4, 1.0))
    ring_o = keys([(6, [60]), (30, [0])])
    layers.append(layer("pulse", [ellipse(100), stroke(SKY, 4)], (c, c), ring_s, opacity=ring_o, ip=6, op=total))
    # layers are listed top-first in Lottie: reverse so the badge is below the check
    layers.reverse()
    # after the reverse: [pulse, badge, check, sparks...] -> badge/pulse must be at the back, check above them
    order = {"pulse": 3, "badge": 2, "check": 1}
    layers.sort(key=lambda l: order.get(l["nm"], 0))
    return comp("done", W, W, total, layers)


def write(name, data):
    p = os.path.join(OUT, name + ".json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))
    print(name, os.path.getsize(p), "bytes")


if __name__ == "__main__":
    write("breathe", breathe())
    write("done", done())
