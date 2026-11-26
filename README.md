# TalkLight

**Pause your voice, not your ideas.**

TalkLight is a voice wellbeing companion for people who talk for a living (teachers, university lecturers, trainers and presenters).
This repository is the **clickable web prototype**: visitors scan the poster QR code and try a guided 60-second demo on their own phone.

It tracks speaking **time and loudness only, never words**, estimates a "voice load" against a personal limit, and gives a silent reminder (screen glow, vibration, optional watch notification) before the voice gets tired.

A student project of the Entrepreneurship course at Carinthia University of Applied Sciences (CUAS).

## The demo flow

1. **Intro** (first visit): Monitor → Nudge → Rest, then pick a role and optionally run a 10-second *voice check*.
2. **Live**: tap *Simulate my workday*. A coach bubble anchored to the next control guides 4 steps: start → water nudge at 45% → silent reminder at 80% → *Take break* (guided breathing screen) → *Week* → summary.
3. **Summary**: peak load, breaks, water, "Would you use TalkLight?" and a **Contact us** button (opens a pre-filled GitHub issue, or an email if `CONTACT_EMAIL` is set; nothing is sent from the page).

Live also holds today's timeline (from Plan), the water tracker, the guided 2-minute voice rest, tips and the mic switch. Other screens: **Alerts** (watch preview, snooze, Lecture mode, watch notifications, Band teaser) · **Plan** (personal day, smart break windows, auto Lecture mode) · **Week** (trend vs baseline, schools & employers card, sample team view) · **Settings** (vibration, water nudges, voice check, language, About & team, privacy).
Language: English and German (auto-detected, switch with the flag buttons).
On desktop the app is shown in a phone frame next to a "scan to open on your phone" QR code generated from the current page URL.

### What the role changes

Teacher, University lecturer and Trainer & presenter differ in: personal limit and typical baseline (shown under the role chips), the week chart, the sample day in *Plan*, the avatar, and the wording of the tips. The **demo speed is deliberately identical** for all roles (80% after about 12 s) so every run behaves the same on stage.

## Files

| Path | What it is |
|---|---|
| `index.html` | Markup and SVG symbols (avatars, icons). |
| `css/app.css` | All styling. Brand tokens are at the top (`:root`). |
| `js/app.js` | Core logic: constants, state, simulation, alerts, mic, voice check, chart, router, sheets, intro, init. |
| `js/i18n.js` | `t()` and the German dictionary (`DE`). Static HTML is translated by exact English text. |
| `js/plan.js` | Personal day: events, break windows, auto Lecture mode. |
| `js/extras.js` | Guided break screen, optional-image fallback. |
| `sw.js` | Offline cache + alert notifications. Bump `CACHE` when you ship changes. |
| `manifest.webmanifest` | Makes the app installable ("Add to Home Screen"). |
| `fonts/` | Open Sauce Sans (SIL OFL), self-hosted. |
| `img/` | Logos and app icons. Optional team photos go in `img/team/`, see `docs/ASSETS.md`. |
| `vendor/qrcode.js` | MIT-licensed QR generator (desktop side panel only). |
| `tools/build_icons.py` | Builds `cup.svg`, `icon.svg`, `icon-maskable.svg` from the official `img/cup-white.svg`. PNG icons are screenshots of those SVGs. |
| `tools/og.html` | Source of `img/og-image.png`. |
| `_headers` | Cache and security headers for Netlify / Cloudflare Pages (ignored elsewhere). |
| `.github/workflows/pages.yml` | Checks the JS and deploys to GitHub Pages on every push to `main`. |

## Run it locally

The mic and notifications need a **secure origin** (HTTPS or `localhost`), so don't double-click the file.

```bash
python -m http.server 8000
```

Open http://localhost:8000. Add `?tour` to force the intro again.
Because of the service worker, a changed file may show up on the second reload. In dev tools, *Application → Service Workers → Unregister* gives a clean load.

## Deploy

It is a plain static site (no build step, no dependencies).

- **GitHub Pages (set up):** push to `main`, then *Settings → Pages → Source: GitHub Actions*. The workflow publishes to `https://<user>.github.io/<repo>/`. All paths are relative, so the sub-path works.
- **Cloudflare Pages / Netlify / Vercel:** connect the repo, no build command, publish directory = repo root. (`_headers` is picked up by Cloudflare Pages and Netlify.)
- **Netlify Drop:** drag the folder onto https://app.netlify.com/drop.

The URL behind the printed QR code must never change. Use a stable address (custom domain or a fixed site name) and test the printed code on two phones.

## Before going public

- Set a repository-local git identity (`git config user.name` / `user.email`) so personal or work addresses don't end up in the history.
- Add a `LICENSE` file if the team wants others to reuse the code. Until then, all rights are reserved. Fonts and the QR library keep their own licences, see `THIRD_PARTY_NOTICES.md`.
- Add the team photos in `img/team/` (see `docs/ASSETS.md`). Without them the About page shows initials. `img/og-image.png` is built from `tools/og.html`; its `og:image` URL in `index.html` points at the GitHub Pages address, update it if the site moves.
- `CONTACT_EMAIL` at the top of `js/app.js` is empty on purpose (no personal address in a public repo). While empty, "Contact us" opens a pre-filled issue on the GitHub repo. Put a shared team address there if you want email instead.

## Brand

Gradient `#0F64B7 → #64AAF2`, ink `#0B1B2B`, white and cool greys. Open Sauce Sans. Amber (warning) and coral (rest) appear only as alert states.

## Rules to keep (design constraints)

1. Static files only. No framework, no build step. The page makes no external requests. Icons are Lucide, copied into index.html as SVG symbols.
2. Nothing leaves the device. No backend, no login, no analytics. Only role, language, baseline level, switches and calendar entries are kept in `localStorage` (wrapped in try/catch) and can be deleted in Settings. "Contact us" is a plain link (GitHub issue or `mailto:`).
3. Never record audio. The mic code only reads a volume number (RMS) from an `AnalyserNode`.
4. No medical claims: say "voice wellbeing", "voice load", "voice strain", never "diagnose", "treat" or "cure".
5. The simulated workday is deterministic: no `Math.random()`, so every run behaves the same on stage.
6. Mobile-first, 360–430 px wide; tap targets ≥ 44 px; no horizontal scroll at 375 px.
7. Real-world figures are limited to "3–5 hrs/day typical speaking" and "41% of university teachers have a voice disorder (Azari et al., 2022)" (always labelled as a population figure). Everything else on screen is demo or sample data and must be labelled as such (e.g. the team view).
8. New user-visible text: write English in the HTML or in `t("…")`, then add the German to `DE` in `js/i18n.js`.

## How the model works

- `state.loadPct` is the single source of truth for the ring, tips, watch face and colours.
- All tuning constants are at the top of `js/app.js`. Every role reaches 80% at about 12 s and 100% at about 18 s after pressing Start. Re-check those timings if you change `DEMO_SECONDS_TO_LIMIT`, `SPEECH_PATTERN`, `STRETCH_*` or `PAUSE_RECOVERY`.
- Alerts fire once per upward crossing of 80% / 100% and re-arm 10 points below. They switch to the Alerts tab, show a screen glow, vibrate (Android, if enabled), announce via `aria-live`, and optionally send a phone notification. *Lecture mode* (manual, or automatic while a Plan event runs) and *Snooze* hold an alert; it fires when they end if the load is still above the line.
- A voice break lowers the load by `BREAK_DROP` of the limit. The demo break lasts 10 s (stands for 2 minutes), the guided rest on Live is the real 120 s.
- **Mic mode** reads only a live volume level. If a voice check was done, speaking louder than `LOUD_FACTOR` × your baseline adds extra load (`LOUD_MULT`).

## Platform notes

- Android Chrome: vibration and watch notifications work.
- iPhone: no vibration API (the screen glow is the fallback). Notifications only work for a web app added to the Home Screen (iOS 16.4+).

## Quick test checklist

- Fresh visit shows the intro; Skip and Start my demo both land on Live; the second visit skips the intro.
- Simulate: toast at ~7 s, amber + auto-switch to Alerts at ~12 s, coral at ~18 s; coach bubble advances 1/4 → 4/4 → Done.
- Take break opens the breathing screen, load falls by 35 points over 10 s, a toast confirms; Week → Summary shows the stats.
- Plan: *Use a sample day*, then *a meeting starts now* → Lecture mode switches on by itself; the 80% alert is held ("Held" tag) and fires when the meeting ends or auto mode is switched off.
- Flag buttons switch every screen; reload keeps the choice.
- Voice check: grant the mic, read the sentence, "Calibrated to your voice" appears; deny the mic: friendly message, demo still works.
- Check iPhone Safari, Android Chrome, desktop (phone frame + QR) and Reduce Motion (no ripples, static glow).
