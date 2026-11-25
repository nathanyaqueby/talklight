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
  $("exportBtn").hidden = planWindows().length === 0;
  renderCalSource();
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

/* ---------- Calendar sources (demo data + .ics import/export) ---------- */
let calSrc = null;                   // { k: "classes"|"google"|"outlook"|"apple"|"file", n: file name }
const SRC_TEXT = {
  classes: "Entrepreneurship classes (mock timetable)",
  google: "Google Calendar (demo data)",
  outlook: "Microsoft Outlook (demo data)",
  apple: "Apple Calendar (demo data)"
};

function renderCalSource() {
  let txt = t("Not connected. Add events by hand or connect a calendar.");
  if (calSrc) txt = calSrc.k === "file" ? t("Imported from {name}", { name: calSrc.n }) : t("Connected: {src}", { src: t(SRC_TEXT[calSrc.k] || "") });
  $("calSource").textContent = txt;
  $("calConnectBtn").lastChild.textContent = t(calSrc ? "Change calendar" : "Connect a calendar");
}

function calNote(msg) {
  $("calNote").textContent = msg ? t(msg.k, msg.v) : "";
  $("calNote").hidden = !msg;
}

function mockDay(kind) {
  const e = (title, h1, m1, h2, m2) => ({ title: t(title), start: h1 * 60 + m1, end: h2 * 60 + m2 });
  if (kind === "classes") {
    return [e("Entrepreneurship lecture", 9, 0, 10, 30), e("Business Model Canvas workshop", 10, 45, 12, 15),
            e("Pitch practice", 13, 30, 14, 15), e("Team meeting: TalkLight", 14, 30, 15, 30), e("Mentor call", 16, 0, 16, 30)];
  }
  if (kind === "google") {
    return [e("Team stand-up", 8, 30, 9, 0), e("Client workshop", 9, 15, 11, 0), e("Project review", 11, 15, 12, 0), e("Interview", 13, 0, 14, 0), e("Planning", 14, 15, 15, 15)];
  }
  if (kind === "outlook") {
    return [e("Weekly sync", 9, 0, 10, 0), e("Customer calls", 10, 15, 12, 0), e("Training session", 13, 0, 14, 30), e("1:1", 15, 0, 15, 30)];
  }
  return [e("Seminar", 8, 30, 10, 0), e("Office hours", 10, 15, 11, 0), e("Lecture", 11, 15, 12, 45), e("Department meeting", 14, 0, 15, 0)];
}

function useEvents(list, src) {
  events = list.slice(0, MAX_EVENTS).map((x) => ({ id: evId++, title: x.title, start: x.start, end: x.end }));
  calSrc = src;
  persistEvents();
  renderCalSource();
}

// ---- .ics parsing (runs on the device; the file is never uploaded) ----
function icsDate(val, params) {
  if (/VALUE=DATE(?!-)/i.test(params) || /^\d{8}$/.test(val)) return null;          // all-day events are skipped
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(val);
  if (!m) return null;
  const a = [+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)];
  return m[7] ? new Date(Date.UTC(...a)) : new Date(...a);
}
function icsUnescape(s) { return s.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim(); }

function parseICS(text) {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out = [];
  let cur = null, repeating = 0;
  for (const ln of lines) {
    if (ln === "BEGIN:VEVENT") { cur = {}; continue; }
    if (ln === "END:VEVENT") {
      if (cur && cur.start) {
        if (cur.rrule) repeating++;
        const end = cur.end || new Date(cur.start.getTime() + 60 * 60000);
        out.push({ title: cur.title || "", start: cur.start, end });
      }
      cur = null; continue;
    }
    if (!cur) continue;
    const i = ln.indexOf(":");
    if (i < 0) continue;
    const key = ln.slice(0, i), val = ln.slice(i + 1);
    const name = key.split(";")[0].toUpperCase(), params = key.slice(name.length);
    if (name === "SUMMARY") cur.title = icsUnescape(val);
    else if (name === "DTSTART") cur.start = icsDate(val, params);
    else if (name === "DTEND") cur.end = icsDate(val, params);
    else if (name === "RRULE") cur.rrule = true;
  }
  return { list: out, repeating };
}

function importICS(text, fileName) {
  const { list, repeating } = parseICS(text);
  const key = (d) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const todayKey = key(new Date());
  const days = [...new Set(list.map((x) => key(x.start)))].sort();
  if (!days.length) { calNote({ k: repeating ? "Only repeating events were found, and this prototype does not expand them." : "No events with a start time were found in this file." }); return; }
  const day = days.includes(todayKey) ? todayKey : days[0];
  const picked = list.filter((x) => key(x.start) === day).map((x) => ({
    title: (x.title || t("Meeting")).slice(0, 40),
    start: x.start.getHours() * 60 + x.start.getMinutes(),
    end: key(x.end) === day ? x.end.getHours() * 60 + x.end.getMinutes() : 23 * 60 + 59
  })).filter((x) => x.end > x.start && x.end < 24 * 60).sort((a, b) => a.start - b.start);
  if (!picked.length) { calNote({ k: "No events with a start time were found in this file." }); return; }
  useEvents(picked, { k: "file", n: fileName.slice(0, 40) });
  const shown = String(day);
  calNote(day === todayKey ? { k: "Loaded {n} events for today.", v: { n: Math.min(picked.length, MAX_EVENTS) } }
    : { k: "No events today in this file. Showing {n} events from {date}.", v: { n: Math.min(picked.length, MAX_EVENTS), date: shown.slice(6) + "." + shown.slice(4, 6) + "." + shown.slice(0, 4) } });
}

function planWindows() {
  const list = sortedEvents(), out = [];
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1].end, b = list[i].start;
    if (b - a >= GAP_MIN) out.push([a, b]);
  }
  return out;
}

function exportBreaks() {
  const w = planWindows();
  if (!w.length) { calNote({ k: "No break windows yet. Add at least two events with a gap between them." }); return; }
  const d = new Date(), ymd = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const at = (m) => ymd + "T" + pad2(Math.floor(m / 60)) + pad2(m % 60) + "00";
  const rows = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TalkLight//Prototype//EN", "CALSCALE:GREGORIAN"];
  w.forEach(([a, b], i) => {
    const len = Math.min(b - a, 15);
    rows.push("BEGIN:VEVENT", "UID:talklight-" + ymd + "-" + i + "@talklight", "DTSTAMP:" + stamp,
      "DTSTART:" + at(a), "DTEND:" + at(a + len), "SUMMARY:" + t("TalkLight: voice break"),
      "DESCRIPTION:" + t("Sip water and rest your voice."), "END:VEVENT");
  });
  rows.push("END:VCALENDAR");
  const blob = new Blob([rows.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "talklight-breaks.ics";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  calNote({ k: "Saved {n} break reminders as talklight-breaks.ics. Open the file to add them to your calendar.", v: { n: w.length } });
}

function initPlan(saved) {
  if (saved.cal && SRC_TEXT[saved.cal.k] || (saved.cal && saved.cal.k === "file" && typeof saved.cal.n === "string")) calSrc = { k: saved.cal.k, n: String(saved.cal.n || "").slice(0, 40) };
  renderCalSource();
  $("calConnectBtn").addEventListener("click", () => { calNote(null); openSheet("sheet-cal"); });
  document.querySelectorAll("#sheet-cal .prov").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.prov;
    useEvents(mockDay(k), { k });
    closeSheets();
    calNote({ k: "Loaded {n} demo events. This is sample data, not your real calendar.", v: { n: events.length } });
  }));
  $("icsBtn").addEventListener("click", () => $("icsFile").click());
  $("icsFile").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { closeSheets(); calNote({ k: "That file is too large (limit 2 MB)." }); return; }
    const r = new FileReader();
    r.onload = () => { closeSheets(); importICS(String(r.result), f.name); };
    r.onerror = () => { closeSheets(); calNote({ k: "The file could not be read." }); };
    r.readAsText(f);
  });
  $("exportBtn").addEventListener("click", exportBreaks);
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
    calSrc = null; renderCalSource(); calNote(null);
    persistEvents();
  });
  $("clearDayBtn").addEventListener("click", () => { events = []; calSrc = null; renderCalSource(); calNote(null); persistEvents(); });
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
