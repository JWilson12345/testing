import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getMessaging, getToken, deleteToken } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging.js";

/* ---------------- Firebase (unchanged) ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyA88ORyr_9mU-lhTxL7fdp5uOiaI1frhAU",
  authDomain: "push-test-app-3cde4.firebaseapp.com",
  projectId: "push-test-app-3cde4",
  storageBucket: "push-test-app-3cde4.firebasestorage.app",
  messagingSenderId: "213929884030",
  appId: "1:213929884030:web:a48940dee282152278db2f"
};

const VAPID_KEY = "BFjdIfNLM0Y8If3k5MvNq9UFYnNmgMyO4ZTh58IXNn0ta_5OvTQvtLkKo8q1Bk74zZ8IpDNwgtHCuyNIkvmrmD8";

/* ---------------- App data ---------------- */
const CHALLENGES = [
  "100 push-ups",
  "100 squats",
  "Plank for 5 minutes total",
  "50 burpees",
  "Run/walk 2 km",
  "200 jumping jacks"
];

const ONE_HOUR_MS = 60 * 60 * 1000;

const LS_ACTIVE = "deadline.active";
const LS_HISTORY = "deadline.history";
const LS_NOTIF_ENABLED = "deadline.notifEnabled";

/* ---------------- UI refs ---------------- */
const statusText = document.getElementById("statusText");
const challengeText = document.getElementById("challengeText");
const timerText = document.getElementById("timerText");
const startedText = document.getElementById("startedText");
const pbText = document.getElementById("pbText");

const completeBtn = document.getElementById("completeBtn");
const failBtn = document.getElementById("failBtn");

const simulateBtn = document.getElementById("simulateBtn");
const clearBtn = document.getElementById("clearBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const bellBtn = document.getElementById("bellBtn");

const historyEmpty = document.getElementById("historyEmpty");
const historyList = document.getElementById("historyList");
const searchInput = document.getElementById("searchInput");
const chips = Array.from(document.querySelectorAll(".chip"));

const pageChallenge = document.getElementById("page-challenge");
const pageHistory = document.getElementById("page-history");
const pageDev = document.getElementById("page-dev");
const tabbar = document.querySelector(".tabbar");
const tabs = Array.from(document.querySelectorAll(".tab"));

/* Modal */
const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalActions = document.getElementById("modalActions");
const modalCloseBtn = document.getElementById("modalCloseBtn");

/* ---------------- State ---------------- */
let historyFilter = "recent"; // recent | best
let searchTerm = "";

/* ---------------- Helpers ---------------- */
function now() { return Date.now(); }

function pickRandomChallenge() {
  return CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function clearKey(key) { localStorage.removeItem(key); }

function getActive() { return loadJSON(LS_ACTIVE, null); }
function setActive(v) { saveJSON(LS_ACTIVE, v); }
function clearActive() { clearKey(LS_ACTIVE); }

function getHistory() { return loadJSON(LS_HISTORY, []); }
function setHistory(v) { saveJSON(LS_HISTORY, v); }

function addToHistory(run) {
  const list = getHistory();
  list.unshift(run);
  setHistory(list);
}

function setStatusLabel(active) {
  if (!active) { statusText.textContent = "Waiting…"; return; }
  if (active.status === "active") statusText.textContent = "Active (1 hour) ⏳";
  else if (active.status === "completed") statusText.textContent = "Completed ✅";
  else statusText.textContent = "Failed ❌";
}

/* Time formatting:
   - under 1 hour -> mm:ss
   - else -> hh:mm:ss
*/
function fmtDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h <= 0) return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function fmtFullDate(ts) {
  // e.g. Wednesday, December 24, 2025
  return new Date(ts).toLocaleDateString(undefined, { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour:"2-digit", minute:"2-digit" });
}

function daysSince(ts) {
  const diff = now() - ts;
  return Math.max(0, Math.floor(diff / (24*60*60*1000)));
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------------- Modal helpers ---------------- */
function openModal(title, bodyHTML, actionsHTML = "") {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  modalActions.innerHTML = actionsHTML;
  modalOverlay.classList.remove("hidden");
  modalOverlay.setAttribute("aria-hidden", "false");
}
function closeModal() {
  modalOverlay.classList.add("hidden");
  modalOverlay.setAttribute("aria-hidden", "true");
  modalBody.innerHTML = "";
  modalActions.innerHTML = "";
}
modalCloseBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

/* ---------------- PB logic ---------------- */
function computePBIdByChallenge() {
  // returns Map(challenge -> runId) for the best completed run per challenge
  const history = getHistory();
  const map = new Map();

  for (const r of history) {
    if (r.status !== "completed") continue;

    const current = map.get(r.challenge);
    if (!current) {
      map.set(r.challenge, r);
      continue;
    }

    // Smaller duration = better PB
    if (r.durationMs < current.durationMs) map.set(r.challenge, r);
    // If tie, keep the newer one as PB (optional)
    else if (r.durationMs === current.durationMs && r.finishedAt > current.finishedAt) map.set(r.challenge, r);
  }

  const idMap = new Map();
  for (const [k, v] of map.entries()) idMap.set(k, v.id);
  return idMap;
}

function getPBForChallenge(name) {
  const history = getHistory().filter(r => r.challenge === name && r.status === "completed");
  if (history.length === 0) return null;
  history.sort((a,b) => a.durationMs - b.durationMs || b.finishedAt - a.finishedAt);
  return history[0];
}

/* ---------------- Core logic ---------------- */
function startNewChallenge(startAt) {
  const active = {
    challenge: pickRandomChallenge(),
    startAt,
    endAt: startAt + ONE_HOUR_MS,
    status: "active",
    finishedAt: null,
    durationMs: null
  };
  setActive(active);
  render();
}

function openResultModal(run) {
  // Center popup overview (same style as Details)
  const body = `
    <div class="kv"><div class="k">Challenge</div><div class="v">${escapeHTML(run.challenge)}</div></div>
    <div class="kv"><div class="k">Result</div><div class="v">${escapeHTML(run.status === "completed" ? "Completed" : "Failed")}</div></div>
    <div class="kv"><div class="k">Time</div><div class="v">${escapeHTML(fmtDuration(run.durationMs))}</div></div>
    <div class="kv"><div class="k">Date</div><div class="v">${escapeHTML(fmtFullDate(run.finishedAt))}</div></div>
  `;
  openModal("Details", body, `<button class="primary" id="okBtn">OK</button>`);
  document.getElementById("okBtn").addEventListener("click", closeModal);
}

function finishActive(status) {
  const active = getActive();
  if (!active || active.status !== "active") return;

  const finishedAt = now();
  const durationMs = Math.max(0, finishedAt - active.startAt);

  active.status = status;
  active.finishedAt = finishedAt;
  active.durationMs = durationMs;

  setActive(active);

  const run = {
    id: `${active.startAt}-${Math.random().toString(16).slice(2)}`,
    challenge: active.challenge,
    status: active.status,
    startAt: active.startAt,
    finishedAt: active.finishedAt,
    durationMs: active.durationMs
  };

  addToHistory(run);

  render();
  openResultModal(run);
}

function clearEverythingActiveOnly() {
  clearActive();
  render();
}

function clearAllHistory() {
  setHistory([]);
  renderHistory();
  renderPB();
}

/* ---------------- Timer loop ---------------- */
let timerInterval = null;

function tick() {
  const active = getActive();

  if (!active) {
    timerText.textContent = "--:--";
    return;
  }

  setStatusLabel(active);

  if (active.status !== "active") {
    timerText.textContent = "00:00";
    return;
  }

  const left = active.endAt - now();
  if (left <= 0) {
    finishActive("failed");
    return;
  }

  timerText.textContent = fmtDuration(left);
}

function ensureTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 250);
  tick();
}

/* ---------------- Render: Challenge ---------------- */
function renderPB() {
  const active = getActive();
  if (!active) {
    pbText.innerHTML = "";
    return;
  }

  const pb = getPBForChallenge(active.challenge);
  if (!pb) {
    pbText.innerHTML = "";
    return;
  }

  pbText.innerHTML = `
    <div class="pbTitle">Personal Best</div>
    <div class="pbTime">${escapeHTML(fmtDuration(pb.durationMs))}</div>
    <div class="pbDate">${escapeHTML(fmtFullDate(pb.finishedAt))}</div>
  `;
}

function renderChallenge() {
  const active = getActive();

  if (!active) {
    challengeText.textContent = "No active challenge yet.";
    startedText.textContent = "—";
    completeBtn.disabled = true;
    failBtn.disabled = true;
    statusText.textContent = "Waiting…";
    timerText.textContent = "--:--";
    pbText.innerHTML = "";
    return;
  }

  challengeText.textContent = active.challenge;
  startedText.textContent = `Started ${fmtTime(active.startAt)}`;

  completeBtn.disabled = active.status !== "active";
  failBtn.disabled = active.status !== "active";

  setStatusLabel(active);
  renderPB();
}

/* ---------------- Render: History ---------------- */
function groupByChallenge(list) {
  const map = new Map();
  for (const r of list) {
    if (!map.has(r.challenge)) map.set(r.challenge, []);
    map.get(r.challenge).push(r);
  }
  return map;
}

function getFilteredHistory() {
  let list = getHistory();

  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    list = list.filter(r => String(r.challenge).toLowerCase().includes(s));
  }

  if (historyFilter === "best") {
    const best = [];
    const grouped = groupByChallenge(list);
    for (const [challenge, runs] of grouped.entries()) {
      const completed = runs.filter(r => r.status === "completed");
      if (completed.length === 0) continue;
      completed.sort((a,b) => a.durationMs - b.durationMs || b.finishedAt - a.finishedAt);
      best.push(completed[0]);
    }
    best.sort((a,b) => a.durationMs - b.durationMs);
    return best;
  }

  return list; // recent
}

function renderHistory() {
  const list = getFilteredHistory();

  if (!list || list.length === 0) {
    historyEmpty.style.display = "block";
    historyList.innerHTML = "";
    return;
  }

  historyEmpty.style.display = "none";

  const pbIdMap = computePBIdByChallenge();
  historyList.innerHTML = renderGroups(groupByChallenge(list), pbIdMap);

  // attach info handlers
  historyList.querySelectorAll("[data-info-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-info-id");
      const run = getHistory().find(r => r.id === id);
      if (!run) return;
      openRunInfo(run);
    });
  });
}

function renderGroups(groupMap, pbIdMap) {
  const groups = Array.from(groupMap.entries()).sort((a,b) => a[0].localeCompare(b[0]));

  return groups.map(([challenge, runs]) => {
    const total = runs.length;
    const sortedRuns = [...runs].sort((a,b) => b.finishedAt - a.finishedAt);

    const body = sortedRuns.map(r => {
      const isGood = r.status === "completed";
      const badge = isGood ? "Done" : "Fail";
      const dur = fmtDuration(r.durationMs);

      const isPB = pbIdMap.get(r.challenge) === r.id;
      const rowClass = isPB ? "row pbRow" : "row";

      return `
        <div class="${rowClass}">
          <div class="rowLeft">
            <span class="badge ${isGood ? "good" : "bad"}">${badge}${isPB ? " • PB" : ""}</span>
            <div class="rowMain">
              <div class="rowTop">Time ${escapeHTML(dur)}</div>
            </div>
          </div>
          <button class="infoBtn" data-info-id="${escapeHTML(r.id)}" aria-label="Info">ⓘ</button>
        </div>
      `;
    }).join("");

    return `
      <div class="group">
        <div class="groupHead">
          <div class="groupTitle">${escapeHTML(challenge)}</div>
          <div class="groupMeta">${total}</div>
        </div>
        <div class="groupBody">${body}</div>
      </div>
    `;
  }).join("");
}

/* Details modal format (no times, date only) */
function openRunInfo(run) {
  const body = `
    <div class="kv"><div class="k">Challenge</div><div class="v">${escapeHTML(run.challenge)}</div></div>
    <div class="kv"><div class="k">Result</div><div class="v">${escapeHTML(run.status === "completed" ? "Completed" : "Failed")}</div></div>
    <div class="kv"><div class="k">Time</div><div class="v">${escapeHTML(fmtDuration(run.durationMs))}</div></div>
    <div class="kv"><div class="k">Date</div><div class="v">${escapeHTML(fmtFullDate(run.finishedAt))}</div></div>
  `;
  openModal("Details", body, `<button class="ghost" id="closeInfoBtn">Close</button>`);
  document.getElementById("closeInfoBtn").addEventListener("click", closeModal);
}

/* ---------------- Notifications popup ---------------- */
async function enableNotificationsFlow() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    saveJSON(LS_NOTIF_ENABLED, false);
    return { ok:false, msg:"Not allowed (check iPhone settings)." };
  }

  const reg = await navigator.serviceWorker.register("service-worker.js");

  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: reg
  });

  console.log("FCM Token:", token);
  saveJSON(LS_NOTIF_ENABLED, true);
  return { ok:true, msg:"Enabled ✅" };
}

async function disableNotificationsFlow() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    await deleteToken(messaging);

    for (const r of regs) await r.unregister();

    saveJSON(LS_NOTIF_ENABLED, false);
    return { ok:true, msg:"Disabled ✅" };
  } catch (e) {
    console.error(e);
    saveJSON(LS_NOTIF_ENABLED, false);
    return { ok:false, msg:"Couldn’t fully disable (see console)." };
  }
}

function openNotifModal() {
  const enabled = loadJSON(LS_NOTIF_ENABLED, false);

  const body = `
    <div class="kv"><div class="k">Status</div><div class="v">${enabled ? "Enabled" : "Disabled"}</div></div>
  `;

  const actions = `
    <button class="ghost" id="notifClose">Close</button>
    ${enabled
      ? `<button class="danger" id="notifDisable">Disable</button>`
      : `<button class="primary" id="notifEnable">Enable</button>`
    }
  `;

  openModal("Notifications", body, actions);

  document.getElementById("notifClose").addEventListener("click", closeModal);

  const enableBtn = document.getElementById("notifEnable");
  if (enableBtn) {
    enableBtn.addEventListener("click", async () => {
      enableBtn.disabled = true;
      const res = await enableNotificationsFlow();
      openModal("Notifications",
        `<div class="kv"><div class="k">Result</div><div class="v">${escapeHTML(res.msg)}</div></div>`,
        `<button class="primary" id="okBtn">OK</button>`
      );
      document.getElementById("okBtn").addEventListener("click", closeModal);
    });
  }

  const disableBtn = document.getElementById("notifDisable");
  if (disableBtn) {
    disableBtn.addEventListener("click", async () => {
      disableBtn.disabled = true;
      const res = await disableNotificationsFlow();
      openModal("Notifications",
        `<div class="kv"><div class="k">Result</div><div class="v">${escapeHTML(res.msg)}</div></div>`,
        `<button class="primary" id="okBtn2">OK</button>`
      );
      document.getElementById("okBtn2").addEventListener("click", closeModal);
    });
  }
}

/* ---------------- Start from notification click ---------------- */
function maybeStartFromSentAt() {
  const url = new URL(window.location.href);
  const sentAtStr = url.searchParams.get("sentAt");
  if (!sentAtStr) return;

  const sentAt = Number(sentAtStr);
  if (!Number.isFinite(sentAt) || sentAt <= 0) return;

  const active = getActive();
  if (!active || sentAt > active.startAt) {
    startNewChallenge(sentAt);
  }

  url.searchParams.delete("sentAt");
  window.history.replaceState({}, "", url.toString());
}

/* ---------------- Tabs ---------------- */
function setActiveTab(name) {
  pageChallenge.classList.toggle("hidden", name !== "challenge");
  pageHistory.classList.toggle("hidden", name !== "history");
  pageDev.classList.toggle("hidden", name !== "dev");

  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === name));
}

tabbar.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  setActiveTab(btn.dataset.tab);
});

/* ---------------- Wiring ---------------- */
completeBtn.addEventListener("click", () => finishActive("completed"));
failBtn.addEventListener("click", () => finishActive("failed"));

simulateBtn.addEventListener("click", () => startNewChallenge(now()));
clearBtn.addEventListener("click", () => clearEverythingActiveOnly());
clearHistoryBtn.addEventListener("click", () => clearAllHistory());

bellBtn.addEventListener("click", openNotifModal);

chips.forEach(c => {
  c.addEventListener("click", () => {
    chips.forEach(x => x.classList.toggle("active", x === c));
    historyFilter = c.dataset.filter;
    renderHistory();
  });
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim();
  renderHistory();
});

/* ---------------- Init ---------------- */
function render() {
  renderChallenge();
  renderHistory();
  ensureTimer();
}

render();
maybeStartFromSentAt();
setActiveTab("challenge");
