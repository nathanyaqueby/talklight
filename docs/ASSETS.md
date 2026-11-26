# Assets: what exists, what would help

All optional. Drop files at the exact paths below and reload. **SVG is always better** for logos, icons and illustrations (sharp at any size, tiny files). PNG is fine when SVG is not possible: export at 2× the display size with a transparent background.

## Already in the repo

| File | Status |
|---|---|
| `img/logo.svg`, `img/logo-white.svg` | Team-provided logos. |
| `img/cuas-logo.png` | CUAS logo (PNG, transparent background, About page). |
| `img/icon*.png`, `img/icon.svg`, `favicon-32.png` | Generated app icons: gradient tile with a white cup. Replace with the official cup if you have a clean vector (see below). |
| `img/og-image.png` | Link preview, built from `tools/og.html`. |
| Intro illustrations, role avatars, watch | Drawn in code inside `index.html` (fallbacks for the artwork slots). |
| UI icons | Lucide (ISC), inlined in `index.html`. |
| `img/lottie/*.json` | Two generated animations, see ILLUSTRATIONS.md. |

## Wanted: team photos (only if each person agrees to publish)

`img/team/lara-hedenig.jpg`, `hannah-raunig.jpg`, `negin-shahrokhi.jpg`, `zara-khan.jpg`, `nathanya-satriani.jpg`
Square JPG, 400×400 px, face centred, under 60 KB each. Shown as 48 px circles.

## Calendar logos (done)

`img/cal/google.webp`, `outlook.webp`, `apple.svg`, `cu_logo.svg` are shown in Plan > Connect a calendar. Square or near-square, transparent background works best; WebP is fine (all current browsers).

## Illustrations and animations

See **[ILLUSTRATIONS.md](ILLUSTRATIONS.md)** for the full brief (file names, sizes, colours, SVG and Lottie rules). In short: 3 intro scenes, 3 role portraits and 1 empty-state graphic as SVG in `img/illustrations/`, plus optional Lottie replacements in `img/lottie/`. Missing files fall back to the built-in drawings.

## Palette for everything

Blue `#0F64B7`, light blue `#64AAF2`, the gradient between them, ink `#0B1B2B`, white, light greys `#F3F7FB` / `#DCE6F0`, tint `#EAF3FD`.
Amber `#F29900 → #FFC94D` and coral `#D7373F → #FF7A6B` only for warning / rest states.

## Icon specs (so you can swap the generated ones)

| File | Size | Notes |
|---|---|---|
| `img/icon-512.png`, `icon-192.png`, `icon-180.png` | 512, 192, 180 px | Square, full-bleed gradient tile (iOS rounds the corners itself), cup in white. |
| `img/icon-maskable-512.png` | 512 px | Keep the cup inside the centre 60%. |
| `img/favicon-32.png` | 32 px | The cup only reads well if very bold. |
| `img/icon.svg` | any | Vector version of the tile, used by modern browsers. |

PNG is fine for all of these; SVG only matters for `icon.svg` and the logos.
