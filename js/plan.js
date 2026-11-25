"use strict";
/* ================= PLAN (personal day) =================
   Events are typed in by the user and kept only in this browser. TalkLight does not read a real calendar.
   Uses globals from app.js at call time: $, state, settings, saveStore, openSheet, closeSheets, checkAlerts, ... */
const MAX_EVENTS = 20;
const GAP_MIN = 10;                 // a gap of 10+ min between events counts as a break window
const LONG_BLOCK_MIN = 90;          // 90+ min of back-to-back events counts as a long stretch
const DEMO_MEETING_MIN = 5;
const CAL_TICK_MS = 15000;

let events = [];                    // { id, title, start, end } (minutes since midnight)
let evId = 1;
let calQuiet = false, calTitle = "";

function hm(min) { return pad2(Math.floor(min / 60)) + ":" + pad2(min % 60); }
function parseHM(s) { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ""); return m ? +m[1] * 60 + +m[2] : null; }
function nowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
function sortedEvents() { return events.slice().sort((a, b) => a.start - b.start); }
function currentEvent() { const n = nowMin(); return sortedEvents().find((e) => n >= e.start && n < e.end) || null; }

function sampleEvents(role) {
  const out = [];
  const add = (title, h, m, len) => out.push({ title, start: h * 60 + m, end: h * 60 + m + len });
  if (role === "lecturer") {
    add(t("Lecture"), 9, 0, 90); add(t("Seminar"), 10, 45, 45); add(t("Workshop"), 13, 0, 90); add(t("Office hours"), 15, 0, 30);
  } else if (role === "callcentre") {
    add(t("Call block"), 8, 0, 105); add(t("Call block"), 10, 0, 105); add(t("Call block"), 12, 30, 105); add(t("Team meeting"), 14, 30, 30);
  } else {
    add(t("Lesson {n}", { n: 1 }), 8, 0, 45); add(t("Lesson {n}", { n: 2 }), 8, 55, 45);
    add(t("Lesson {n}", { n: 3 }), 10, 0, 45); add(t("Lesson {n}", { n: 4 }), 10, 55, 45); add(t("Parents' evening"), 17, 0, 60);
  }
  return out;
}

// Break windows (gaps) and long stretches (merged events with gaps under GAP_MIN)
function planInsights() {
  const list = sortedEvents();
  if (!list.length) return [t("Add events to see break suggestions.")];
  const longs = [], windows = [];
  let bStart = list[0].start, bEnd = list[0].end;
  const closeBlock = () => { if (bEnd - bStart >= LONG_BLOCK_MIN) longs.push([bStart, bEnd]); };
  for (let i = 1; i < list.length; i++) {
    const gap = list[i].start - bEnd;
    if (gap >= GAP_MIN) { windows.push([bEnd, list[i].start]); closeBlock(); bStart = list[i].start; bEnd = list[i].end; }
    else bEnd = Math.max(bEnd, list[i].end);
  }
  closeBlock();
  const out = longs.map(([a, b]) => t("{a}–{b} has {dur} of speaking without a real pause. Plan a short break.", { a: hm(a), b: hm(b), dur: fmtDur(b - a) }))
    .concat(windows.map(([a, b]) => t("Good break window {a}–{b} ({m} min): sip water and rest your voice.", { a: hm(a), b: hm(b), m: b - a })));
  return out.length ? out.slice(0, 4) : [t("No long stretches without a pause. Nice planning.")];
}

function renderPlan() {
  const ul = $("eventList");
  ul.textContent = "";
  const cur = currentEvent();
  sortedEvents().forEach((ev) => {
    const li = document.createElement("li");
    li.className = "event" + (cur && cur.id === ev.id ? " now" : "");
    const time = document.createElement("span"); time.className = "ev-time"; time.textContent = hm(ev.start) + "–" + hm(ev.end);
    const title = document.createElement("span"); title.className = "ev-title"; title.textContent = ev.title;
    const del = document.createElement("button");
    del.type = "button"; del.className = "ev-del"; del.dataset.id = ev.id;
    del.setAttribute("aria-label", t("Delete {title}", { title: ev.title }));
    del.innerHTML = '<svg aria-hidden="true"><use href="#i-close"/></svg>';
    li.append(time, title, del);
    ul.append(li);
  });
  $("eventEmpty").hidden = events.length > 0;
  $("clearDayBtn").disabled = !events.length;
  const ins = $("planInsights");
  ins.textContent = "";
  planInsights().forEach((s) => { const li = document.createElement("li"); li.textContent = s; ins.append(li); });
  $("autoQuietToggle").setAttribute("aria-checked", String(settings.autoQuiet));
  renderNow();
}

function renderNow() {
  const n = nowMin(), cur = currentEvent();
  const next = sortedEvents().find((e) => e.start > n);
  let text;
  if (cur) text = t("Now: {title} until {end}", { title: cur.title, end: hm(cur.end) });
  else if (next) text = t("Next: {title} at {start}", { title: next.title, start: hm(next.start) });
  else text = events.length ? t("All events are done for today.") : t("Nothing planned right now.");
  $("nowText").textContent = text;
  $("nowCard").classList.toggle("live", !!cur);
}

// Lecture mode while an event is running (if enabled). Runs every 15 s and after every edit.
function updateCalQuiet() {
  const cur = currentEvent();
  const q = !!settings.autoQuiet && !!cur;
  const was = calQuiet;
  calQuiet = q;
  calTitle = cur ? cur.title : "";
  if (was && !q) checkAlerts();                  // a held reminder fires now
  renderQuiet();
  if (currentTab === "plan") renderNow();
  render();
}

function persistEvents() { saveStore(); renderPlan(); updateCalQuiet(); }

function addEvent(title, start, len) {
  const end = start + len;
  events.push({ id: evId++, title: title || t("Meeting"), start, end });
  persistEvents();
}

function openEventSheet() {
  const d = new Date();
  const m = Math.ceil((d.getHours() * 60 + d.getMinutes() + 1) / 5) * 5;
  $("evTitle").value = "";
  $("evStart").value = hm(Math.min(m, 23 * 60 + 55));
  $("evLen").value = "45";
  $("evNote").hidden = true;
  openSheet("sheet-event");
  $("evTitle").focus({ preventScroll: true });
}

function saveEventFromForm() {
  const start = parseHM($("evStart").value);
  const len = +$("evLen").value;
  const fail = (msg) => { $("evNote").textContent = t(msg); $("evNote").hidden = false; };
  if (start == null) return fail("Please choose a start time.");
  if (start + len >= 24 * 60) return fail("That would run past midnight. Choose a shorter length.");
  if (events.length >= MAX_EVENTS) return fail("You can add up to 20 events.");
  addEvent($("evTitle").value.trim().slice(0, 40), start, len);
  closeSheets();
}

function demoMeeting() {
  if (events.length >= MAX_EVENTS) return;
  const s = Math.min(nowMin(), 24 * 60 - DEMO_MEETING_MIN - 1);
  addEvent(t("Quick meeting"), s, DEMO_MEETING_MIN);
}

function initPlan(saved) {
  if (Array.isArray(saved.events)) {
    events = saved.events.filter((e) => e && typeof e.title === "string" && Number.isInteger(e.start) && Number.isInteger(e.end)
      && e.start >= 0 && e.end > e.start && e.end < 24 * 60).slice(0, MAX_EVENTS)
      .map((e) => ({ id: evId++, title: e.title.slice(0, 40), start: e.start, end: e.end }));
  }
  $("addEventBtn").addEventListener("click", openEventSheet);
  $("evSave").addEventListener("click", saveEventFromForm);
  $("evTitle").addEventListener("keydown", (e) => { if (e.key === "Enter") saveEventFromForm(); });
  $("sampleDayBtn").addEventListener("click", () => {
    events = sampleEvents(state.role).map((e) => Object.assign(e, { id: evId++ }));
    persistEvents();
  });
  $("clearDayBtn").addEventListener("click", () => { events = []; persistEvents(); });
  $("demoMeetingBtn").addEventListener("click", demoMeeting);
  $("eventList").addEventListener("click", (e) => {
    const b = e.target.closest(".ev-del");
    if (!b) return;
    events = events.filter((ev) => String(ev.id) !== b.dataset.id);
    persistEvents();
  });
  $("autoQuietToggle").addEventListener("click", () => {
    settings.autoQuiet = !settings.autoQuiet;
    saveStore();
    renderPlan();
    updateCalQuiet();
  });
  setInterval(updateCalQuiet, CAL_TICK_MS);
}
