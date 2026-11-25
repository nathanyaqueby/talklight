"use strict";
/* ================= CONFIG ================= */
const REPO_URL = "https://github.com/nathanyaqueby/talklight";
// Optional team address. While empty, the "Contact us" buttons open a pre-filled GitHub issue instead.
const CONTACT_EMAIL = "";

/* ================= CONSTANTS ================= */
// Roles differ in personal limit, typical baseline, week chart, sample calendar day, avatar and tip wording.
// The demo speed is the same for every role on purpose, so every run behaves the same on stage.
const PROFILES = {
  teacher:    { label:"Teacher",            limitMin:240, baselineMin:190 },
  lecturer:   { label:"Lecturer & trainer", limitMin:210, baselineMin:160 },
  callcentre: { label:"Call-centre agent",  limitMin:300, baselineMin:260 }
};
const HISTORY = [ {day:"Mon",min:175}, {day:"Tue",min:210}, {day:"Wed",min:255}, {day:"Thu",min:190} ];
// Fri = today, from the live session

// ---- Load model tuning (minutes are SIMULATED minutes unless noted) ----
const TICK_MS = 100;                  // real-time tick
const DEMO_SECONDS_TO_LIMIT = 16.5;   // sim speed = limitMin / 16.5 sim-min per real second
const MAX_TICK_SEC = 0.25;            // cap one tick (e.g. phone was locked) so load never jumps
const PATTERN_REF_LIMIT = 240;        // pattern is written for the teacher, scaled by limitMin / 240
const STRETCH_MIN = 20;               // uninterrupted speaking longer than this (also scaled)...
const STRETCH_MULT = 1.3;             // ...adds load 1.3x faster
const PAUSE_RECOVERY = 0.3;           // load-min recovered per sim-min of pause
const LOUD_FACTOR = 2.2;              // mic mode: louder than 2.2x your baseline level...
const LOUD_MULT = 1.25;               // ...adds load 1.25x faster

// Fixed school day: 4 lessons of 45 min with 2-min changeovers, an 8-min break,
// then 8-min speaking bursts with 5-min pauses. Repeats after the last pause.
const SPEECH_PATTERN = [];
for (let i = 0; i < 4; i++) SPEECH_PATTERN.push(["speak", 45], ["pause", i === 3 ? 8 : 2]);
for (let i = 0; i < 12; i++) SPEECH_PATTERN.push(["speak", 8], ["pause", 5]);

// Expected timings after pressing Start (same for every role, checked with exact integration):
//   80% at 11.9 s, 100% at 17.9 s

const WARN_PCT = 80, LIMIT_PCT = 100, SCALE_MAX = 120;

// ---- Alerts ----
const REARM_GAP = 10;                         // re-arm a threshold 10 points below it (70 / 90)
const VIBE_WARN = [200, 100, 200];
const VIBE_REST = [300, 150, 300, 150, 300];
const BREAK_SECONDS = 10;                     // real seconds, stands for a 2-minute voice break
const REAL_REST_SECONDS = 120;                // the guided voice rest in real time
const BREAK_DROP = 0.35;                      // a break removes 35% of limitMin, spread over its length
const SNOOZE_MIN = 60;                        // sim speaking-minutes without new alerts (about 4 s of demo)
const PREVIEW_STEP_MS = 2000;                 // preview: warning, then rest after 2 s...
const PREVIEW_END_MS = 5000;                  // ...then back to the real state
const FLASH_MS = 1500;                        // reduced-motion solid card colour
const PULSE_MS = 1500;                        // full-screen glow when an alert fires
const ALERT_TEXT = {
  warning: "Voice load at 80%. Voice rest soon.",
  rest:    "Voice load at 100%. Take a 2-minute voice break and drink water."
};
const PREVIEW_PCT = { warning:"80%", rest:"100%" };

// ---- Water ----
const WATER_GOAL = 8;
const HYDRATION_PCT = 45;                     // one friendly water nudge per demo day

// ---- Mic: live volume level only ----
const MIC_SAMPLE_MS = 50;                     // how often the level is read
const MIC_CALIBRATE_MS = 2000;                // measure room noise first
const MIC_NOISE_FACTOR = 2.5;                 // threshold = max(0.01, noiseFloor x 2.5)
const MIC_MIN_THRESHOLD = 0.01;
const MIC_HOLD_MS = 300;                      // > 300 ms above = speaking, > 300 ms below = pause
const MIC_DECAY = 0.85;                       // level holds through short gaps between syllables
const MIC_FAIL = "Mic unavailable, using demo mode.";
const MIC_TEXT = { asking:"Waiting for mic permission…", calibrating:"Measuring room noise…", listening:"Listening · on-device" };

// ---- Voice check (baseline) ----
const BASELINE_MS = 10000;
const BASELINE_MIN_VOICED = 20;               // at least 1 s of clearly voiced samples

// ---- Watch mirroring (phone notifications) ----
const NOTIFY_FAIL = "Works on Android Chrome. Alerts still show here.";
const NOTIFY_TEXT = {
  warning: { title:"Voice rest soon",        body:"You're at 80% of your voice limit. Plan a short pause." },
  rest:    { title:"Time for a voice break", body:"2-min voice break + a few sips of water." }
};
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

// ---- Trend ----
const CHART_REFRESH_MS = 1000;                // live Friday dot redraws at most once per second
const DAY_NAMES = { Mon:"Monday", Tue:"Tuesday", Wed:"Wednesday", Thu:"Thursday", Fri:"Friday" };
const RING_LEN = 2 * Math.PI * 54;           // circumference of the load ring

// Tips: some wording depends on the role (key "all" = same for everyone)
const TIP_ICONS = { pause:"s-pause", water:"s-glass", mic:"s-wave", silent:"s-book" };
const TIP_TEXT = {
  pause:  { teacher:"Pause 2 min between lessons. Let your vocal folds rest.",
            lecturer:"Pause 2 min between sessions. Let your voice rest.",
            callcentre:"Take a sip and a quiet breath between calls. Let your voice rest." },
  water:  { all:"Sip water every 30 min. Hydrated folds vibrate more easily." },
  mic:    { teacher:"Use a mic or a gesture for attention instead of raising your voice.",
            lecturer:"Use the mic and let slides do the pointing instead of raising your voice.",
            callcentre:"Keep your headset volume low so you don't talk louder than needed." },
  silent: { teacher:"Switch to a silent task: reading, written exercise or group work.",
            lecturer:"Switch to a silent task: a short quiz or a discussion in pairs.",
            callcentre:"Switch to a silent task: written follow-ups, chat or admin work." }
};
const TIPS_BY_LEVEL = { calm:["pause","water","mic"], warning:["mic","pause","water"], rest:["silent","mic","water"] };
const STATE_TEXT  = { calm:"Healthy range", warning:"Early warning", rest:"Rest now" };
const WATCH_TEXT  = { calm:"All good", warning:"Voice rest soon", rest:"2-min voice break + water" };

// ---- Guided demo ----
const COACH_TEXT = [
  "",
  "Tap “Simulate my workday” to speed through a teaching day.",
  "Watch your voice load rise. At 80% you get a silent reminder.",
  "That was the silent reminder. Now tap “Take break”.",
  "Break done. See how your week compares to your baseline.",
  "That's the idea. Want your summary?"
];

/* ================= STATE ================= */
let state = { role:"teacher", running:false, speakingMin:0, loadMin:0, loadPct:0, peakPct:0,
              alertLevel:"calm", snoozeUntilMin:0, breaksTaken:0, water:0, micOn:false, quiet:false, loud:false,
              dayMin:0 };                     // simulated minutes since Start (speaking + pauses)
let settings = { vibrate:true, hydration:true, autoQuiet:true };
let baseline = null;                          // { level } from the voice check, volume only

// Position in the speech pattern
let seg = 0, segLeft = 0, stretchMin = 0;
let timerId = null, lastTickAt = 0;

// Alert arming (hysteresis), break, preview
let armed = { warning:true, rest:true };
let breakLeftSec = 0, breakTotal = BREAK_SECONDS, breakTimer = null, lastBreakAt = 0, breakOpen = false;
let preview = null, previewTimers = [], flashTimer = null, pulseTimer = null;
let hydrationShown = false, toastTimer = null;

// Mic: off -> asking -> calibrating -> listening
let micPhase = "off", mic = null, micToken = 0, micCalib = null;
let micSpeaking = false, micAboveMs = 0, micBelowMs = 0, micThreshold = MIC_MIN_THRESHOLD, micLevel = 0;
let notifyOn = false, notifyNoteKey = "", micNoteKey = "";
let lastChartAt = 0;

// UI
let currentTab = "live";
let coachStep = 1, coachHidden = false;
let introOpen = false, introStep = 0, introRole = "teacher", introSetupOnly = false;
let vc = null;                                // running voice check
let useChoice = "";
let lastFocus = null;

const $ = (id) => document.getElementById(id);

/* ================= STORAGE ================= */
// Role, language, baseline level, switches and calendar entries are kept in this browser only. Never sent anywhere.
const STORE_KEY = "talklight.v2";
let seen = false;                             // intro finished at least once on this device
function loadStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ seen, role:state.role, lang:LANG, baseline, settings, cal:calSrc,
      events:events.map(({ title, start, end }) => ({ title, start, end })) }));
  } catch (e) { /* private mode */ }
}
function clearStore() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } }

/* ================= SIMULATION ================= */
function patternScale() { return PROFILES[state.role].limitMin / PATTERN_REF_LIMIT; }
function isSpeaking() { return micPhase === "listening" ? micSpeaking : SPEECH_PATTERN[seg][0] === "speak"; }

// Advance the model by dtMin sim-minutes. Steps are split exactly at segment ends
// and at the stretch threshold, so results don't depend on tick timing.
function advance(dtMin) {
  const profile = PROFILES[state.role];
  const stretchLimit = STRETCH_MIN * patternScale();
  state.loud = micPhase === "listening" && !!baseline && micLevel > baseline.level * LOUD_FACTOR;
  while (dtMin > 1e-9) {
    const fromPattern = micPhase !== "listening";   // mic input replaces the speech pattern
    let step = fromPattern ? Math.min(dtMin, segLeft) : dtMin;
    if (isSpeaking()) {
      if (stretchMin < stretchLimit) step = Math.min(step, stretchLimit - stretchMin);
      const mult = (stretchMin >= stretchLimit ? STRETCH_MULT : 1) * (state.loud ? LOUD_MULT : 1);
      state.loadMin += step * mult;
      state.speakingMin += step;
      stretchMin += step;
    } else {
      state.loadMin -= step * PAUSE_RECOVERY;
      stretchMin = 0;
    }
    state.loadMin = Math.min(Math.max(state.loadMin, 0), profile.limitMin * SCALE_MAX / 100);
    state.dayMin += step;
    dtMin -= step;
    if (fromPattern) segLeft -= step;
    if (segLeft <= 1e-9) {
      seg = (seg + 1) % SPEECH_PATTERN.length;
      segLeft = SPEECH_PATTERN[seg][1] * patternScale();
    }
  }
  state.loadPct = state.loadMin / profile.limitMin * 100;
  state.peakPct = Math.max(state.peakPct, state.loadPct);
}

function tick() {
  const now = performance.now();
  const dtSec = Math.min((now - lastTickAt) / 1000, MAX_TICK_SEC);
  lastTickAt = now;
  if (breakLeftSec > 0) return;                 // the break owns the load while it runs
  advance(dtSec * PROFILES[state.role].limitMin / DEMO_SECONDS_TO_LIMIT);
  checkHydration();
  checkAlerts();
  render();
}

function startDemo() {
  if (state.running) return;
  state.running = true;
  lastTickAt = performance.now();
  timerId = setInterval(tick, TICK_MS);
  coachGo(2);
  render();
}
function pauseDemo() {
  state.running = false;
  clearInterval(timerId);
  timerId = null;
  render();
}
function resetSession() {
  pauseDemo();
  stopBreak();
  closeBreakGuide();
  clearPreview();
  hideToast();
  armed = { warning:true, rest:true };
  hydrationShown = false;
  Object.assign(state, { speakingMin:0, loadMin:0, loadPct:0, peakPct:0, dayMin:0, water:0,
                         alertLevel:"calm", snoozeUntilMin:0, breaksTaken:0 });
  seg = 0;
  segLeft = SPEECH_PATTERN[0][1] * patternScale();
  stretchMin = 0;
  coachStep = 1;
  render();
  if (micPhase === "listening") startDemo();     // keep listening after Reset / role change
}

function levelFor(pct) { return pct >= LIMIT_PCT ? "rest" : pct >= WARN_PCT ? "warning" : "calm"; }
function pad2(n) { return String(n).padStart(2, "0"); }
function fmtClock(min) { const m = Math.floor(min); return pad2(Math.floor(m / 60)) + ":" + pad2(m % 60); }
function fmtDur(min) { const m = Math.round(min); return Math.floor(m / 60) + "h " + pad2(m % 60) + "m"; }

function tipText(key) {
  const v = TIP_TEXT[key];
  return t(v[state.role] || v.all);
}
let lastTipsLevel = null;
function renderTips(level) {
  if (level === lastTipsLevel) return;          // only rebuild when the state or role/language changes
  lastTipsLevel = level;
  $("tips").innerHTML = TIPS_BY_LEVEL[level].map((key) =>
    `<li class="tip"><svg aria-hidden="true"><use href="#${TIP_ICONS[key]}"/></svg><span>${tipText(key)}</span></li>`
  ).join("");
}

let lastWater = -1;
function renderWater() {
  if (state.water === lastWater) return;
  lastWater = state.water;
  $("glasses").innerHTML = Array.from({ length: WATER_GOAL }, (_, i) => `<i class="glass${i < state.water ? " on" : ""}"></i>`).join("");
  $("waterCount").textContent = t("{n} of {max} glasses", { n:state.water, max:WATER_GOAL });
  $("waterBtn").disabled = state.water >= WATER_GOAL;
}

function renderBaseline() {
  $("calBadge").hidden = !baseline;
  $("baselineText").textContent = t(baseline
    ? "Saved on this device. In mic mode, speaking much louder than your normal level adds extra load. Volume only, nothing recorded."
    : "Not set yet. A 10-second check lets TalkLight learn your normal speaking volume. It reads volume only and records nothing.");
  $("baselineBtn").textContent = t(baseline ? "Redo voice check" : "Run voice check");
}

function renderRole() {
  const p = PROFILES[state.role];
  document.querySelectorAll(".chip[data-role]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.role === state.role)));
  $("avatarUse").setAttribute("href", "#av-" + state.role);
  $("avatarTitle").textContent = t(p.label);
  $("whoName").textContent = t(p.label);
  $("roleLine").textContent = t("Limit {limit} · baseline {base}", { limit:fmtDur(p.limitMin), base:fmtDur(p.baselineMin) });
}

// One source of truth: loadPct drives ring, number, Limit bar, tips and watch.
function render() {
  const profile = PROFILES[state.role];
  const pct = Math.floor(state.loadPct);         // floor: "80%" only shows once the state is really warning
  const level = levelFor(state.loadPct);
  state.alertLevel = level;
  $("app").dataset.state = level;
  $("timer").textContent = fmtClock(state.speakingMin);
  const micBusy = state.micOn && micPhase !== "listening";       // asking or calibrating
  $("startBtn").textContent = t(micBusy ? "Listening…" : state.running ? "Pause" : state.dayMin > 0 ? "Resume" : "Simulate my workday");
  $("startBtn").disabled = micBusy;
  renderMicPill();
  const speakingNow = state.running && breakLeftSec === 0 && isSpeaking();
  // Demo mode: bars bounce while speaking, flat otherwise. Mic mode: bars follow the live level.
  $("wave").classList.toggle("is-on", !state.micOn && speakingNow);
  $("wave").classList.toggle("is-quiet", !state.micOn && (state.running || breakLeftSec > 0) && !speakingNow);
  $("loadPct").textContent = pct + "%";
  $("stateText").textContent = t(STATE_TEXT[level]);
  const arc = $("ringArc");
  arc.style.strokeDashoffset = RING_LEN * (1 - Math.min(state.loadPct, 100) / 100);
  arc.style.opacity = pct < 1 ? 0 : 1;           // no stray round cap at 0%
  $("limitPct").textContent = pct + "%";
  $("meterFill").style.width = (Math.min(state.loadPct, SCALE_MAX) / SCALE_MAX * 100) + "%";
  $("meter").setAttribute("aria-valuenow", pct);
  $("limitLine").textContent = t("Speaking time {a} · Baseline {b}", { a:fmtDur(state.speakingMin), b:fmtDur(profile.baselineMin) });
  $("kBreaks").textContent = state.breaksTaken;
  $("kWater").textContent = state.water + "/" + WATER_GOAL;
  $("restBtn").disabled = breakLeftSec > 0;
  renderTips(level);
  renderWater();
  renderWatch();
  renderQuiet();
  renderCoach();
  renderBreakGuide();
  if (currentTab === "week" && performance.now() - lastChartAt >= CHART_REFRESH_MS) renderChart();
}

/* ================= ALERTS ================= */
function isSnoozed() { return state.speakingMin < state.snoozeUntilMin; }
function isQuiet() { return state.quiet || calQuiet; }        // Lecture mode: switched on by hand or by a running calendar event
function isMuted() { return isSnoozed() || isQuiet(); }

// Which alert is waiting to fire (armed and above its line), if any
function pendingAlert() {
  const pct = state.loadPct;
  if (armed.rest && pct >= LIMIT_PCT) return "rest";
  if (armed.warning && pct >= WARN_PCT) return "warning";
  return null;
}

// Fire once per upward crossing; re-arm only 10 points below the line.
function checkAlerts() {
  const pct = state.loadPct;
  if (pct < WARN_PCT - REARM_GAP) armed.warning = true;
  if (pct < LIMIT_PCT - REARM_GAP) armed.rest = true;
  const level = pendingAlert();
  if (!level || isMuted()) return;               // held, not lost: fires when snooze / lecture mode ends
  if (level === "rest") armed.rest = armed.warning = false; else armed.warning = false;
  fireAlert(level);
}

function checkHydration() {
  if (hydrationShown || !settings.hydration || state.loadPct < HYDRATION_PCT) return;
  hydrationShown = true;
  if (isQuiet()) return;
  showToast(t("Time for a sip of water."), t("Had a sip"), addWater);
}
function addWater() {
  if (state.water < WATER_GOAL) state.water++;
  hideToast();
  announce(t("Water logged. {n} of {max} glasses.", { n:state.water, max:WATER_GOAL }));
  render();
}

function vibrate(pattern) {
  if (!settings.vibrate) return;
  try { if (typeof navigator.vibrate === "function") navigator.vibrate(pattern); }
  catch (e) { /* no vibration API (iOS): the glow and ripple carry the alert */ }
}
function announce(msg) {
  const el = $("announcer");
  el.textContent = "";                           // clear first so a repeated message is read again
  setTimeout(() => { el.textContent = msg; }, 50);
}
function flashCard() {                           // only visible with reduced motion (see CSS)
  $("watchCard").classList.add("flash");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => $("watchCard").classList.remove("flash"), FLASH_MS);
}
function flashPulse() {                          // full-screen glow: the visual "vibration" for iPhone and desktop
  const el = $("pulse");
  el.classList.remove("on");
  void el.offsetWidth;
  el.classList.add("on");
  clearTimeout(pulseTimer);
  pulseTimer = setTimeout(() => el.classList.remove("on"), PULSE_MS);
}

function fireAlert(level) {
  clearPreview();
  hideToast();
  showTab("alerts");
  vibrate(level === "rest" ? VIBE_REST : VIBE_WARN);
  announce(t(ALERT_TEXT[level]));
  flashCard();
  flashPulse();
  sendWatchNotification(level);
  coachGo(3);
}

// Watch face: real state from loadPct, unless a preview is playing
function fmtBreak(sec) { const s = Math.ceil(sec - 1e-6); return Math.floor(s / 60) + ":" + pad2(s % 60); }
function renderWatch() {
  const level = preview || state.alertLevel;
  const breaking = breakLeftSec > 0;
  $("watchCard").dataset.state = level;
  $("watchPct").textContent = breaking ? fmtBreak(breakLeftSec)
                            : preview ? PREVIEW_PCT[level] : Math.floor(state.loadPct) + "%";
  $("watchSub").setAttribute("visibility", breaking ? "visible" : "hidden");
  $("watchBars").setAttribute("visibility", breaking ? "hidden" : "visible");
  $("watchStatus").textContent = t(WATCH_TEXT[level]);
  $("previewTag").hidden = !preview;
  $("snoozeTag").hidden = !isSnoozed();
  $("heldTag").hidden = !(isQuiet() && pendingAlert());
  $("breakBtn").disabled = breaking;
  $("breakBtn").textContent = breaking ? t("On break {t}", { t:fmtBreak(breakLeftSec) }) : t("Take break");
}

// Take break: guided countdown. Load falls smoothly by 35% of the limit, speaking is paused.
// The demo break is 10 s (stands in for 2 minutes); the guided rest on the Limit tab is the real 2 minutes.
function startBreak(total) {
  if (breakLeftSec > 0) return;
  clearPreview();
  hideToast();
  breakTotal = total || BREAK_SECONDS;
  breakLeftSec = breakTotal;
  lastBreakAt = performance.now();
  breakTimer = setInterval(breakTick, TICK_MS);
  announce(t("Voice break started. Take a few sips of water."));
  openBreakGuide();
  render();
}
function breakTick() {
  const now = performance.now();
  const dt = Math.min((now - lastBreakAt) / 1000, MAX_TICK_SEC, breakLeftSec);
  lastBreakAt = now;
  const profile = PROFILES[state.role];
  state.loadMin = Math.max(0, state.loadMin - profile.limitMin * BREAK_DROP * dt / breakTotal);
  state.loadPct = state.loadMin / profile.limitMin * 100;
  breakLeftSec -= dt;
  if (breakLeftSec <= 1e-6) {
    stopBreak();
    closeBreakGuide();
    state.breaksTaken++;
    announce(t("Break done. Voice load {n}%.", { n:Math.floor(state.loadPct) }));
    showToast(t("Nicely done. Voice load {n}%.", { n:Math.floor(state.loadPct) }));
    coachGo(4);
  }
  checkAlerts();                                 // lets thresholds re-arm as load falls
  render();
}
function stopBreak() {
  clearInterval(breakTimer);
  breakTimer = null;
  breakLeftSec = 0;
  lastTickAt = performance.now();                // simulation resumes without a jump
}
function endBreakEarly() {
  stopBreak();
  closeBreakGuide();
  render();
}

// Snooze: no new alerts for the next SNOOZE_MIN speaking minutes; colours stay live
function snooze() {
  state.snoozeUntilMin = state.speakingMin + SNOOZE_MIN;
  announce(t("Alerts snoozed."));
  render();
}

// Lecture mode: reminders are held (no buzz, no screen change) until it is switched off
function setQuiet(on) {
  state.quiet = on;
  if (!on) checkAlerts();                        // a held reminder fires now
  renderQuiet();
  render();
}
function renderQuiet() {
  ["quietToggle", "setQuiet"].forEach((id) => $(id).setAttribute("aria-checked", String(state.quiet)));
  const note = state.quiet ? t("Lecture mode is on. Reminders are held until you switch it off. Your load is still tracked.")
             : calQuiet ? t("Lecture mode is on automatically during “{title}”. Reminders are held until it ends.", { title:calTitle })
             : "";
  if ($("quietNote").textContent !== note) $("quietNote").textContent = note;
  $("quietNote").hidden = !note;
}

// Preview: warning, then rest after 2 s, on the watch only. Never touches loadPct or arming.
function previewAlert() {
  clearPreview();
  const show = (level) => {
    preview = level;
    vibrate(level === "rest" ? VIBE_REST : VIBE_WARN);
    announce(t("Preview. {s}.", { s:t(WATCH_TEXT[level]) }));
    flashCard();
    flashPulse();
    sendWatchNotification(level);
    renderWatch();
  };
  show("warning");
  previewTimers.push(setTimeout(() => show("rest"), PREVIEW_STEP_MS));
  previewTimers.push(setTimeout(() => { preview = null; renderWatch(); }, PREVIEW_END_MS));
}
function clearPreview() {
  previewTimers.forEach(clearTimeout);
  previewTimers = [];
  preview = null;
}

// Watch mirroring: a phone notification, which a paired watch (e.g. Fitbit) can mirror and vibrate for
function notifyToggle() {
  if (notifyOn) { setNotify(false); return; }
  if (!("serviceWorker" in navigator) || !("Notification" in window)) { setNotify(false, NOTIFY_FAIL); return; }
  const reg = navigator.serviceWorker.register("./sw.js");          // sw.js also handles notification taps
  const perm = new Promise((res) => {                                // asked inside the tap (old Safari: callback)
    const p = Notification.requestPermission(res);
    if (p) p.then(res, () => res("denied"));
  });
  Promise.all([reg, perm])
    .then(([, result]) => setNotify(result === "granted", result === "granted" ? "" : NOTIFY_FAIL))
    .catch(() => setNotify(false, NOTIFY_FAIL));
}
function setNotify(on, note) {
  notifyOn = on;
  notifyNoteKey = note || "";
  $("notifyToggle").setAttribute("aria-checked", String(on));
  $("notifyNote").textContent = note ? t(note) : "";
  $("notifyNote").hidden = !note;
}
function sendWatchNotification(level) {
  if (!notifyOn || Notification.permission !== "granted") return;
  const n = NOTIFY_TEXT[level];
  navigator.serviceWorker.ready
    .then((reg) => reg.showNotification(t(n.title), { body:t(n.body), icon:"img/icon-192.png", tag:"talklight-alert",
                                                      renotify:true, vibrate:[200, 100, 200] }))
    .catch(() => {});
}

/* ================= TOAST ================= */
function showToast(text, actLabel, onAct) {
  $("toastText").textContent = text;
  $("toastAct").hidden = !actLabel;
  $("toastAct").textContent = actLabel || "";
  $("toastAct").onclick = onAct || null;
  $("toast").hidden = false;
  announce(text);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 7000);
}
function hideToast() {
  clearTimeout(toastTimer);
  $("toast").hidden = true;
}

/* ================= MIC ================= */
// Reads ONLY a live volume level (RMS) from an AnalyserNode. No recording API is used:
// nothing is recorded, stored or sent. Each sample is reduced to one number and dropped.
async function openMic() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const md = navigator.mediaDevices;
  if (!window.isSecureContext || !md || !md.getUserMedia || !AC) throw new Error("unsupported");
  const ctx = new AC();                          // iOS: create + resume inside the tap, before any await
  ctx.resume().catch(() => {});
  let stream;
  try {
    stream = await md.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
    await ctx.resume();
  } catch (e) {                                  // denied, no mic, or blocked by the browser
    ctx.close().catch(() => {});
    throw e;
  }
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  const mute = ctx.createGain();                 // gain 0: Safari only processes nodes that reach the output,
  mute.gain.value = 0;                           // so the chain ends at the speakers but stays silent
  ctx.createMediaStreamSource(stream).connect(analyser);
  analyser.connect(mute);
  mute.connect(ctx.destination);
  const precise = typeof analyser.getFloatTimeDomainData === "function";
  const buf = precise ? new Float32Array(analyser.fftSize) : new Uint8Array(analyser.fftSize);
  return {
    ctx, stream,
    read() {                                     // one RMS number per call
      if (ctx.state !== "running") ctx.resume().catch(() => {});   // iOS can suspend it (calls, lock)
      if (precise) analyser.getFloatTimeDomainData(buf); else analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = precise ? buf[i] : (buf[i] - 128) / 128; sum += v * v; }
      return Math.sqrt(sum / buf.length);
    },
    close() { stream.getTracks().forEach((t) => t.stop()); ctx.close().catch(() => {}); }
  };
}

async function micStart() {
  const token = ++micToken;
  micPhase = "asking";
  $("micNote").hidden = true;
  renderMic();
  pauseDemo();                                   // the mic replaces the demo pattern
  let m;
  try { m = await openMic(); }
  catch (e) { if (token === micToken) micStop(MIC_FAIL); return; }
  if (token !== micToken) { m.close(); return; } // switched off while the permission prompt was open
  mic = m;
  mic.lastAt = performance.now();
  micCalib = { samples:[], endsAt:performance.now() + MIC_CALIBRATE_MS };
  micLevel = 0;
  micPhase = "calibrating";
  mic.timer = setInterval(micSample, MIC_SAMPLE_MS);
  renderMic();
}

function micSample() {
  const now = performance.now();
  const dt = now - mic.lastAt;
  mic.lastAt = now;
  const rms = mic.read();
  micLevel = Math.max(rms, micLevel * MIC_DECAY);  // peak hold: syllable gaps don't count as pauses
  drawMicWave(micLevel);
  if (micPhase === "calibrating") {
    micCalib.samples.push(rms);
    if (now >= micCalib.endsAt) {
      // noise floor = median of the 2 s, so a word spoken while measuring doesn't lift the threshold
      const sorted = micCalib.samples.slice().sort((a, b) => a - b);
      const floor = sorted[Math.floor(sorted.length / 2)] || 0;
      micThreshold = Math.max(MIC_MIN_THRESHOLD, floor * MIC_NOISE_FACTOR);
      micPhase = "listening";
      renderMic();
      startDemo();
    }
    return;
  }
  if (micLevel > micThreshold) { micAboveMs += dt; micBelowMs = 0; if (micAboveMs > MIC_HOLD_MS) micSpeaking = true; }
  else { micBelowMs += dt; micAboveMs = 0; if (micBelowMs > MIC_HOLD_MS) micSpeaking = false; }
}

function drawMicWave(rms) {
  if (REDUCED_MOTION.matches) return;            // reduced motion: bars stay still
  const level = breakLeftSec > 0 || (micPhase === "listening" && !state.running) ? 0 : Math.min(1, rms / (micThreshold * 4));
  const scale = "scaleY(" + (0.2 + 0.8 * level).toFixed(2) + ")";
  document.querySelectorAll("#wave rect").forEach((r) => { r.style.transform = scale; });
}

// Stops every track and closes the context. Only called by the toggle, visibility change or failure.
function micStop(note) {
  micToken++;
  if (mic) {
    clearInterval(mic.timer);
    mic.close();
    mic = null;
  }
  const wasOn = micPhase !== "off";
  micPhase = "off";
  micSpeaking = false; micAboveMs = micBelowMs = 0; state.loud = false;
  document.querySelectorAll("#wave rect").forEach((r) => { r.style.transform = ""; });
  micNoteKey = note || "";
  $("micNote").textContent = note ? t(note) : "";
  $("micNote").hidden = !note;
  renderMic();
  if (wasOn) pauseDemo(); else render();
}

function renderMic() {
  state.micOn = micPhase !== "off";
  $("micToggle").setAttribute("aria-checked", String(state.micOn));
  $("micPill").hidden = !state.micOn;
  render();
}
function renderMicPill() {                       // only touch the DOM when the text changes
  const listening = micPhase === "listening";
  const text = t(listening && !state.running ? "Paused · mic on" : MIC_TEXT[micPhase] || "");
  const voice = listening && state.running ? t(state.loud ? " · louder than your baseline" : micSpeaking ? " · voice detected" : " · quiet") : "";
  if ($("micPillText").textContent !== text) $("micPillText").textContent = text;
  if ($("micVoice").textContent !== voice) $("micVoice").textContent = voice;
}

/* ================= VOICE CHECK (baseline) ================= */
function vcSet(phase, html, btn) {
  $("vcheck").dataset.phase = phase;
  if (html) $("vcText").innerHTML = html;
  $("vcBtn").textContent = t(btn);
  $("vcBtn").disabled = phase === "ask" || phase === "run";
}
function vcIdleHtml() {
  return baseline ? t("<em>✓ Voice check saved.</em> You can run it again any time.")
    : t("Read aloud in your normal voice:") + "<br><em>" + t("“Good morning everyone, let’s open our books.”") + "</em>";
}
function vcReset() {
  cancelVoiceCheck();
  $("vcLevel").style.width = "0";
  $("vcProg").style.width = "0";
  vcSet("idle", vcIdleHtml(), baseline ? "Run the check again" : "Start 10-second check");
}
function cancelVoiceCheck() {
  if (!vc) return;
  clearInterval(vc.timer);
  if (vc.m) vc.m.close();
  vc = null;
}
async function startVoiceCheck() {
  if (vc) return;
  const run = vc = { m:null, timer:null, samples:[] };
  vcSet("ask", t("Waiting for mic permission…"), "Waiting…");
  let m;
  try { m = await openMic(); }
  catch (e) {
    if (vc === run) { vc = null; vcSet("fail", t("The mic isn’t available here. You can skip this and use the sample baseline."), "Try again"); }
    return;
  }
  if (vc !== run) { m.close(); return; }          // cancelled while the permission prompt was open
  run.m = m;
  const t0 = performance.now();
  vcSet("run", t("Read aloud: <em>“Good morning everyone, let’s open our books.”</em>"), "Listening…");
  run.timer = setInterval(() => {
    const rms = m.read();
    run.samples.push(rms);
    const el = performance.now() - t0;
    $("vcLevel").style.width = Math.min(100, rms * 600) + "%";
    $("vcProg").style.width = Math.min(100, el / BASELINE_MS * 100) + "%";
    $("vcBtn").textContent = t("Listening… {n} s", { n:Math.max(0, Math.ceil((BASELINE_MS - el) / 1000)) });
    if (el >= BASELINE_MS) finishVoiceCheck(run);
  }, MIC_SAMPLE_MS);
}
function finishVoiceCheck(run) {
  const samples = run.samples.slice().sort((a, b) => a - b);
  const floor = samples[Math.floor(samples.length * 0.1)] || 0;
  const voiced = samples.filter((v) => v > Math.max(MIC_MIN_THRESHOLD, floor * MIC_NOISE_FACTOR));
  cancelVoiceCheck();
  if (voiced.length < BASELINE_MIN_VOICED) {
    vcSet("fail", t("We didn’t hear you clearly. Try again a bit closer, or skip this step."), "Try again");
    return;
  }
  baseline = { level: voiced[Math.floor(voiced.length / 2)] };   // median level of your voiced speech
  saveStore();
  vcSet("done", t("<em>✓ Saved.</em> TalkLight now knows your normal speaking volume."), "Run the check again");
  render();
  renderBaseline();
}

/* ================= CHART ================= */
function renderChart() {
  lastChartAt = performance.now();
  const profile = PROFILES[state.role];
  const days = HISTORY.concat({ day:"Fri", min:Math.round(state.speakingMin), today:true });
  const peak = Math.max(profile.baselineMin, ...days.map((d) => d.min));
  const step = Math.max(60, Math.ceil(peak / 3 / 60) * 60);    // 3 gridlines on whole hours
  const top = step * 3;
  const L = 44, R = 316, T = 20, B = 160;
  const x = (i) => 70 + i * 58;
  const y = (v) => B - Math.min(v, top) / top * (B - T);
  const baseY = y(profile.baselineMin);
  const pts = days.map((d, i) => x(i) + "," + y(d.min)).join(" ");
  let svg = `<defs><linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#64AAF2" stop-opacity=".35"/><stop offset="1" stop-color="#64AAF2" stop-opacity="0"/></linearGradient></defs>`;
  for (let g = 1; g <= 3; g++) {
    svg += `<line class="grid" x1="${L}" y1="${y(g * step)}" x2="${R}" y2="${y(g * step)}"/>` +
           `<text x="${L - 6}" y="${y(g * step) + 4}" text-anchor="end">${g * step / 60}h</text>`;
  }
  svg += `<line class="ax" x1="${L}" y1="${B}" x2="${R}" y2="${B}"/>` +
         `<text x="${L - 6}" y="${B + 4}" text-anchor="end">0</text>` +
         `<polygon class="area" points="${x(0)},${B} ${pts} ${x(days.length - 1)},${B}"/>` +
         `<line class="base" x1="${L}" y1="${baseY}" x2="${R}" y2="${baseY}"/>` +
         `<text x="${L + 6}" y="${baseY - 6}">${t("Your baseline")}</text>` +
         `<polyline class="line" points="${pts}"/>`;
  days.forEach((d, i) => {
    const hot = d.today && d.min > profile.baselineMin;
    svg += `<circle class="dot${hot ? " hot" : ""}" cx="${x(i)}" cy="${y(d.min)}" r="5"/>` +
           `<text class="day" x="${x(i)}" y="${B + 18}" text-anchor="middle">${t(d.day)}</text>` +
           (d.today ? `<text class="tag-today" x="${x(i)}" y="${B + 33}" text-anchor="middle">${t("Today")}</text>` : "");
  });
  $("chart").innerHTML = svg;
  $("chart").setAttribute("aria-label", t("Speaking time this week: {list}. Your baseline {base}.", {
    list: days.map((d) => (d.today ? t("today") : t(d.day)) + " " + fmtDur(d.min)).join(", "),
    base: fmtDur(profile.baselineMin) }));
  $("baseLabel").textContent = t("Baseline {a}", { a:fmtDur(profile.baselineMin) });
  renderInsight(days, profile.baselineMin);
}

// Insight is calculated from the data: the day furthest above baseline
function renderInsight(days, baselineMin) {
  let best = null;
  days.forEach((d) => {
    const over = Math.round((d.min - baselineMin) / baselineMin * 100);
    if (over >= 1 && (!best || over > best.over)) best = { day:d.day, over };
  });
  $("insight").innerHTML = best
    ? `<strong>${t("{day} was {n}% above your baseline.", { day:t(DAY_NAMES[best.day]), n:best.over })}</strong> ${t("Plan a quieter block after lunch.")}`
    : `<strong>${t("You stayed within your baseline all week.")}</strong> ${t("Nice pacing.")}`;
}

/* ================= GUIDED DEMO ================= */
function coachGo(n) { if (n > coachStep) { coachStep = n; renderCoach(); } }
function renderCoach() {
  const show = !coachHidden && !introOpen;
  $("coach").hidden = !show;
  if (!show) return;
  $("coachStep").textContent = coachStep >= 5 ? t("Done") : coachStep + "/4";
  $("coachText").textContent = t(COACH_TEXT[coachStep]);
  $("coachAct").hidden = coachStep < 5;
  $("coachAct").textContent = t("Summary");
}

/* ================= ROUTER ================= */
function showTab(name) {
  currentTab = name;
  document.querySelectorAll(".screen").forEach((s) => { s.hidden = s.id !== "screen-" + name; });
  document.querySelectorAll(".tab").forEach((t) => {
    if (t.dataset.tab === name) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  });
  $("main").scrollTop = 0;
  if (name === "week") { renderChart(); if (coachStep >= 4) coachGo(5); }
  if (name === "plan") renderPlan();
}

function setRole(role) {
  state.role = role;
  lastTipsLevel = null;
  renderRole();
  resetSession();                               // new profile = fresh demo day
  renderChart();                                // redraw chart + insight for the new profile
  saveStore();
}

/* ================= SHEETS ================= */
function setBackgroundInert(on) {
  ["topbar", "coach", "main", "tabbar"].forEach((id) => { $(id).inert = on; });
}
function openSheet(id) {
  closeSheets(true);
  lastFocus = document.activeElement;
  const s = $(id);
  s.hidden = false;
  setBackgroundInert(true);
  requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add("open")));
  const first = s.querySelector("button, a");
  if (first) first.focus({ preventScroll:true });
}
function closeSheets(keepFocus) {
  const wasOpen = document.querySelector(".sheet:not([hidden])");
  document.querySelectorAll(".sheet").forEach((s) => { s.classList.remove("open"); s.hidden = true; });
  if (!introOpen && !breakOpen) setBackgroundInert(false);
  if (wasOpen && !keepFocus && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
}

function openSummary() {
  $("stats").innerHTML = [
    [Math.floor(state.peakPct) + "%", t("Peak voice load")],
    [String(state.breaksTaken), t(state.breaksTaken === 1 ? "Voice break taken" : "Voice breaks taken")],
    [state.water + "/" + WATER_GOAL, t("Glasses of water")],
    [fmtDur(state.speakingMin), t("Simulated speaking")]
  ].map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
  updateMailLinks();
  $("shareBtn").hidden = !(navigator.share || (navigator.clipboard && navigator.clipboard.writeText));
  openSheet("sheet-end");
}

/* ================= CONTACT (mailto only: nothing is sent from the page) ================= */
function contactHref(subject, body) {
  const q = "title=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  return CONTACT_EMAIL
    ? "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body)
    : REPO_URL + "/issues/new?" + q;
}
function updateMailLinks() {
  const general = contactHref(t("TalkLight: getting in touch"),
    t("Hi TalkLight team,\n\nI tried the demo and would like to get in touch.\n\nWould I use it: {use}\nMy role: {role}\n",
      { use:useChoice ? t(useChoice) : t("(not answered)"), role:t(PROFILES[state.role].label) }));
  ["contactLink2", "contactLink3", "contactLink4"].forEach((id) => { $(id).href = general; });
  $("contactLink").href = contactHref(t("TalkLight: enquiry from a school or team"),
    t("Hi TalkLight team,\n\nWe would like to talk about TalkLight for our school or team.\n\nOrganisation:\nNumber of people who talk for a living:\n"));
  ["contactLink", "contactLink2", "contactLink3", "contactLink4"].forEach((id) => {
    if (CONTACT_EMAIL) $(id).removeAttribute("target");
    else { $(id).target = "_blank"; $(id).rel = "noopener"; }
  });
  $("aboutMail").hidden = !CONTACT_EMAIL;
  if (CONTACT_EMAIL) $("aboutMail").textContent = t("Email: {mail}", { mail:CONTACT_EMAIL });
}

/* ================= LANGUAGE ================= */
function setLang(code) {
  setLangCode(code);
  document.querySelectorAll(".lang-seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === LANG)));
  $("setLangVal").textContent = LANG === "de" ? "Deutsch" : "English";
  // rebuild everything the app writes itself
  lastTipsLevel = null; lastWater = -1;
  renderRole(); renderBaseline(); renderPlan(); renderChart(); renderQuiet(); updateMailLinks(); render();
  if (!vc) vcReset();
  if ($("micPill").hidden === false) renderMicPill();
  if (!$("micNote").hidden) $("micNote").textContent = t(micNoteKey);
  if (!$("notifyNote").hidden) $("notifyNote").textContent = t(notifyNoteKey);
  introGo(introStep);
  saveStore();
}
function toggleLang() { setLang(LANG === "de" ? "en" : "de"); }

/* ================= INTRO ================= */
const SLIDE_COUNT = 4;
function introGo(n) {
  introStep = n;
  $("slides").style.transform = `translateX(${-n * 100}%)`;
  document.querySelectorAll("#slides .slide").forEach((s, i) => { s.inert = i !== n; });
  document.querySelectorAll("#dots i").forEach((d, i) => d.classList.toggle("on", i === n));
  const last = n === SLIDE_COUNT - 1;
  $("introNext").textContent = t(last ? (introSetupOnly ? "Done" : "Start my demo") : "Next");
  $("introSkip").hidden = last;
  $("dots").hidden = introSetupOnly;
}
function openIntro(setupOnly) {
  closeSheets(true);
  introSetupOnly = !!setupOnly;
  introOpen = true;
  introRole = state.role;
  syncRoleCards();
  $("slides").style.transition = "none";
  introGo(setupOnly ? SLIDE_COUNT - 1 : 0);
  requestAnimationFrame(() => { $("slides").style.transition = ""; });
  vcReset();
  $("intro").hidden = false;
  setBackgroundInert(true);
  renderCoach();
  $("introNext").focus({ preventScroll:true });
}
function finishIntro() {
  cancelVoiceCheck();
  const fresh = !introSetupOnly;
  introOpen = false;
  $("intro").hidden = true;
  if (!breakOpen) setBackgroundInert(false);
  const roleChanged = introRole !== state.role;
  seen = true;
  if (roleChanged) setRole(introRole);
  else if (fresh) resetSession();
  saveStore();
  coachHidden = false;
  showTab(fresh ? "live" : currentTab);
  render();
  renderBaseline();
}
function syncRoleCards() {
  document.querySelectorAll(".role-card").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.role === introRole)));
}

/* ================= SETTINGS ================= */
function setSetting(key, id, on) {
  settings[key] = on;
  $(id).setAttribute("aria-checked", String(on));
  saveStore();
}

/* ================= DESKTOP QR ================= */
// Shown next to the phone frame on desktop; built from the page's own URL.
function renderQR() {
  const box = $("qr");
  if (!box || typeof qrcode !== "function") return;
  try {
    const qr = qrcode(0, "M");
    qr.addData(location.href.split("#")[0].split("?")[0]);
    qr.make();
    box.innerHTML = qr.createSvgTag({ scalable:true, margin:0, cellSize:4 });
  } catch (e) { /* the panel just stays empty */ }
}

/* ================= INIT ================= */
document.querySelectorAll(".tab").forEach((tb) => tb.addEventListener("click", () => showTab(tb.dataset.tab)));
document.querySelectorAll(".chip[data-role]").forEach((c) => c.addEventListener("click", () => setRole(c.dataset.role)));
document.querySelectorAll(".role-card").forEach((c) => c.addEventListener("click", () => { introRole = c.dataset.role; syncRoleCards(); }));
document.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => closeSheets()));
document.querySelectorAll("#useChips .chip").forEach((c) => c.addEventListener("click", () => {
  useChoice = c.dataset.use;
  document.querySelectorAll("#useChips .chip").forEach((o) => o.setAttribute("aria-pressed", String(o === c)));
  updateMailLinks();
}));
$("previewBtn").addEventListener("click", previewAlert);
$("startBtn").addEventListener("click", () => (state.running ? pauseDemo() : startDemo()));
$("resetBtn").addEventListener("click", resetSession);
$("breakBtn").addEventListener("click", () => startBreak(BREAK_SECONDS));
$("restBtn").addEventListener("click", () => startBreak(REAL_REST_SECONDS));
$("bgEnd").addEventListener("click", endBreakEarly);
$("snoozeBtn").addEventListener("click", snooze);
$("waterBtn").addEventListener("click", addWater);
$("micToggle").addEventListener("click", () => (micPhase === "off" ? micStart() : micStop()));
$("notifyToggle").addEventListener("click", notifyToggle);
$("quietToggle").addEventListener("click", () => setQuiet(!state.quiet));
$("settingsBtn").addEventListener("click", () => openSheet("sheet-settings"));
$("setVibrate").addEventListener("click", () => setSetting("vibrate", "setVibrate", !settings.vibrate));
$("setHydration").addEventListener("click", () => setSetting("hydration", "setHydration", !settings.hydration));
$("setQuiet").addEventListener("click", () => setQuiet(!state.quiet));
$("setLang").addEventListener("click", toggleLang);
document.querySelectorAll(".lang-seg button").forEach((b) => b.addEventListener("click", () => { if (b.dataset.lang !== LANG) setLang(b.dataset.lang); }));
$("openAbout").addEventListener("click", () => openSheet("sheet-about"));
$("openPrivacy").addEventListener("click", () => openSheet("sheet-privacy"));
$("replayIntro").addEventListener("click", () => openIntro(false));
$("teamBtn").addEventListener("click", () => openSheet("sheet-team"));
$("resetData").addEventListener("click", () => {
  clearStore();
  baseline = null;
  events = [];
  calSrc = null;
  settings = { vibrate:true, hydration:true, autoQuiet:true };
  $("setVibrate").setAttribute("aria-checked", "true");
  $("setHydration").setAttribute("aria-checked", "true");
  closeSheets();
  renderBaseline();
  renderPlan();
  renderCalSource();
  updateCalQuiet();
  announce(t("Your settings on this device were deleted."));
});
$("baselineBtn").addEventListener("click", () => openIntro(true));
$("summaryBtn").addEventListener("click", openSummary);
$("coachX").addEventListener("click", () => { coachHidden = true; renderCoach(); });
$("coachAct").addEventListener("click", openSummary);
$("replayBtn").addEventListener("click", () => { closeSheets(true); resetSession(); showTab("live"); coachHidden = false; render(); });
$("shareBtn").addEventListener("click", () => {
  const url = location.href.split("#")[0].split("?")[0];
  if (navigator.share) navigator.share({ title:"TalkLight", text:t("Pause your voice, not your ideas."), url }).catch(() => {});
  else navigator.clipboard.writeText(url).then(() => announce(t("Link copied.")), () => {});
});
$("vcBtn").addEventListener("click", startVoiceCheck);
$("introNext").addEventListener("click", () => (introStep < SLIDE_COUNT - 1 ? introGo(introStep + 1) : finishIntro()));
$("introSkip").addEventListener("click", finishIntro);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheets(); });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (micPhase !== "off") micStop();
    cancelVoiceCheck();
    if (introOpen) vcReset();
  } else updateCalQuiet();                       // the clock may have moved on while the page was hidden
});

const saved = loadStore();
seen = !!saved.seen;
if (saved.role && PROFILES[saved.role]) state.role = saved.role;
if (saved.baseline && typeof saved.baseline.level === "number") baseline = saved.baseline;
if (saved.settings) settings = Object.assign(settings, saved.settings);
$("setVibrate").setAttribute("aria-checked", String(settings.vibrate));
$("setHydration").setAttribute("aria-checked", String(settings.hydration));
initPlan(saved);

const startLang = saved.lang || ((navigator.language || "en").toLowerCase().startsWith("de") ? "de" : "en");
setRole(state.role);
setLang(startLang);
renderQR();
updateCalQuiet();
if (!saved.seen || /[?&]tour\b/.test(location.search)) openIntro(false);
else { $("intro").hidden = true; render(); }

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => { /* offline mode is a bonus */ });
}
