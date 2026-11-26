"use strict";
/* ================= EXTRAS: guided break, artwork slots, Lottie, optional images ================= */

// ---- Guided voice break (overlay). Timing is owned by startBreak / breakTick in app.js ----
const BREAK_STEPS = [
  "Stop talking and relax your jaw.",
  "Take a few sips of water.",
  "Breathe in slowly through your nose, out through your lips.",
  "Roll your shoulders gently. Almost done."
];
let lastBgStep = -1;

function breathCycle() { return breakTotal <= 20 ? 5 : 10; }   // seconds per breath (faster in the short demo break)

function openBreakGuide() {
  breakOpen = true;
  lastBgStep = -1;
  const el = $("breakGuide");
  el.style.setProperty("--cycle", breathCycle() + "s");
  $("bgStep").setAttribute("aria-live", "polite");
  $("bgKicker").textContent = t("Voice break");
  el.hidden = false;
  setBackgroundInert(true);
  renderBreakGuide();
  $("bgEnd").focus({ preventScroll: true });
  lottieSlot("breath", $("breathLottie"), "img/lottie/breathe.json", true).then((a) => {
    if (!breakOpen) return;
    $("breath").classList.add("lottie-on");
    a.setSpeed(10 / breathCycle());              // the file is one 10 s breath
    a.goToAndPlay(0, true);
  }).catch(() => { /* reduced motion or file missing: the CSS ring stays */ });
}

function renderBreakGuide() {
  if (!breakOpen) return;
  const left = Math.max(0, breakLeftSec);
  const elapsed = breakTotal - left;
  const idx = Math.min(BREAK_STEPS.length - 1, Math.floor(elapsed / breakTotal * BREAK_STEPS.length));
  if (idx !== lastBgStep) {
    lastBgStep = idx;
    $("bgStep").textContent = t(BREAK_STEPS[idx]);
    document.querySelectorAll("#bgDots i").forEach((d, i) => d.classList.toggle("on", i <= idx));
  }
  const c = breathCycle();
  const phase = t(elapsed % c < c * 0.4 ? "Breathe in" : "Breathe out");
  if ($("bgPhase").textContent !== phase) $("bgPhase").textContent = phase;
  $("bgTime").textContent = t("{t} left", { t: fmtBreak(left) });
  $("bgLoad").textContent = t("Voice load {n}%", { n: Math.floor(state.loadPct) });
}

function closeBreakGuide() {
  if (!breakOpen) return;
  breakOpen = false;
  if (lottieAnims.breath) lottieAnims.breath.then((a) => a.pause()).catch(() => {});
  $("breakGuide").hidden = true;
  if (!introOpen && !document.querySelector(".sheet:not([hidden])")) setBackgroundInert(false);
}

// ---- Optional images (team photos, university logo): hide them quietly if the file is not there ----
document.addEventListener("error", (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.hasAttribute("data-optional")) return;
  if (img.dataset.altSrc && !img.dataset.triedAlt) { img.dataset.triedAlt = "1"; img.src = img.dataset.altSrc; return; }
  img.hidden = true;
}, true);

// ---- Artwork slots: any element with data-ill="name" shows img/illustrations/name.svg when that file exists,
// otherwise it keeps its built-in drawing. Drop files in, no code change needed (see docs/ILLUSTRATIONS.md).
const ILL_DIR = "img/illustrations/";
const illProbe = {};
function illExists(name) {
  if (!illProbe[name]) {
    illProbe[name] = new Promise((res) => {
      const i = new Image();
      i.onload = () => res(true);
      i.onerror = () => res(false);
      i.src = ILL_DIR + name + ".svg";
    });
  }
  return illProbe[name];
}
function applyIll(el) {
  const name = el.dataset.ill;
  el.querySelectorAll(":scope > .ill-art").forEach((n) => n.remove());
  el.classList.remove("has-art");
  illExists(name).then((ok) => {
    if (!ok || el.dataset.ill !== name) return;
    el.querySelectorAll(":scope > .ill-art").forEach((n) => n.remove());
    const img = document.createElement("img");
    img.className = "ill-art";
    img.alt = "";
    img.decoding = "async";
    img.src = ILL_DIR + name + ".svg";
    el.append(img);
    el.classList.add("has-art");
  });
}
document.querySelectorAll("[data-ill]").forEach(applyIll);

// ---- Lottie: the player (vendor/lottie_light.min.js) is only fetched the first time an animation is needed.
// Without it (reduced motion, offline first visit, missing file) the CSS fallbacks stay in place.
let lottiePromise = null;
const lottieAnims = {};
function loadLottie() {
  if (REDUCED_MOTION.matches) return Promise.reject(new Error("reduced motion"));
  if (!lottiePromise) {
    lottiePromise = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "vendor/lottie_light.min.js";
      s.onload = () => res(window.lottie);
      s.onerror = () => { lottiePromise = null; rej(new Error("lottie")); };
      document.head.append(s);
    });
  }
  return lottiePromise;
}
function lottieSlot(key, el, file, loop) {
  return loadLottie().then((lottie) => {
    if (!lottieAnims[key]) {
      lottieAnims[key] = new Promise((res, rej) => {
        const a = lottie.loadAnimation({ container: el, renderer: "svg", loop, autoplay: false, path: file });
        a.addEventListener("DOMLoaded", () => res(a));
        a.addEventListener("data_failed", () => { delete lottieAnims[key]; rej(new Error("lottie data")); });
      });
    }
    return lottieAnims[key];
  });
}
function playDone() {
  lottieSlot("done", $("doneArt"), "img/lottie/done.json", false).then((a) => {
    $("doneArt").classList.add("on");
    a.goToAndPlay(0, true);
  }).catch(() => { /* nothing to show */ });
}
