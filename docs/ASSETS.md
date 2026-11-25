# Assets: what exists, what would help

All optional. Drop files at the exact paths below and reload. **SVG is always better** for logos, icons and illustrations (sharp at any size, tiny files). PNG is fine when SVG is not possible: export at 2× the display size with a transparent background.

## Already in the repo

| File | Status |
|---|---|
| `img/logo.svg`, `img/logo-white.svg` | Team-provided logos. |
| `img/cuas-logo.jpg` | CUAS logo (JPG, white background, shown on a light card on the About page). |
| `img/icon*.png`, `img/icon.svg`, `favicon-32.png` | Generated app icons: gradient tile with a white cup. Replace with the official cup if you have a clean vector (see below). |
| `img/og-image.png` | Link preview, built from `tools/og.html`. |
| Intro illustrations, role avatars, watch | Drawn in code inside `index.html`. |

## Wanted: team photos (only if each person agrees to publish)

`img/team/lara-hedenig.jpg`, `hannah-raunig.jpg`, `negin-shahrokhi.jpg`, `zara-khan.jpg`, `nathanya-satriani.jpg`
Square JPG, 400×400 px, face centred, under 60 KB each. Shown as 48 px circles.

## Wanted: calendar app logos (optional)

`img/cal/google.svg`, `img/cal/outlook.svg`, `img/cal/apple.svg`: SVG (PNG 128×128 transparent is fine, then change the extension in `index.html`), square, official full-colour logo. Shown 26 px inside the Plan > Connect a calendar sheet. Until added, a letter badge is shown. Check each provider's brand guidelines before publishing.

## Wanted: illustrations that would lift the look most

Style: flat vector, rounded shapes, no outlines, in the palette below, same family as the poster's role icons (people with a soft pastel background circle). Transparent background.

| # | Illustration | Where it goes | Spec |
|---|---|---|---|
| 1 | Three intro scenes: **Monitor** (person speaking, soundwave), **Nudge** (wrist/phone with a soft glow), **Rest** (person with water glass / cup) | Intro slides 1–3 (`img/intro-1.svg`, `intro-2.svg`, `intro-3.svg`) | SVG, square 600×600 viewBox, fits inside a circle of 80% width. |
| 2 | Three role portraits: teacher, lecturer, call-centre agent | Role avatar on Live, role cards in setup (`img/role-teacher.svg`, `role-lecturer.svg`, `role-callcentre.svg`) | SVG, 240×240, head and shoulders, centred, works inside a circle. The poster icons would be perfect. |
| 3 | **Empty state**: empty calendar | Plan tab when there are no events (`img/empty-plan.svg`) | SVG, 320×200, light and friendly. |
| 5 | **Celebration / done** graphic | Summary sheet after the demo (`img/done.svg`) | SVG, 400×240, e.g. cup with sparkles. |

If a file is missing the app keeps using the code-drawn version, so you can add them one at a time and tell the developer, who then wires them up.

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
