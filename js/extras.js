"use strict";
/* ================= EXTRAS: guided break, optional images ================= */

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
