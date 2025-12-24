import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging.js";

// ---------------- Firebase (unchanged) ----------------
const firebaseConfig = {
  apiKey: "AIzaSyA88ORyr_9mU-lhTxL7fdp5uOiaI1frhAU",
  authDomain: "push-test-app-3cde4.firebaseapp.com",
  projectId: "push-test-app-3cde4",
  storageBucket: "push-test-app-3cde4.firebasestorage.app",
  messagingSenderId: "213929884030",
  appId: "1:213929884030:web:a48940dee282152278db2f"
};

const VAPID_KEY = "BFjdIfNLM0Y8If3k5MvNq9UFYnNmgMyO4ZTh58IXNn0ta_5OvTQvtLkKo8q1Bk74zZ8IpDNwgtHCuyNIkvmrmD8";

// ---------------- App data ----------------
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
const LS_HISTORY = "deadline.history"; // array of runs

// ---------------- UI refs ----------------
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
const notifHint = document.getElementById("notifHint");

const historyEmpty = document.getElementById("historyEmpty");
const historyList = document.getElementById("historyList");

// pages
const pageChallenge = document.getElementById("page-challenge");
const pageHistory = document.getElementById("page-history");
const pageDev = document.getElementById("page-dev");

// tabbar
const tabbar = document.querySelector(".tabbar");
const tabs = Array.from(document.querySelectorAll(".tab"));

// ---------------- Helpers ----------------
function now() { return Date.now(); }

function pickRandomChallenge() {
  return CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
}

function fmtHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function fmtLocal(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function clearKey(key) {
  localStorage.removeItem(key);
}

function getActive() {
  return loadJSON(LS_ACTIVE, null);
}

function setActive(active) {
  saveJSON(LS_ACTIVE, active);
}

function clearActive() {
  clearKey(LS_ACTIVE);
}

function getHistory() {
  return loadJSON(LS_HISTORY, []);
}

function setHistory(list) {
  saveJSON(LS_HISTORY, list);
}

function addToHistory(run) {
  const list = getHistory();
  list.unshift(run); // newest first
  setHistory(list);
}

function getPBForChallenge(name) {
  const history = getHistory().filter(r => r.challenge === name && r.status === "completed");
  if (history.length === 0) return null;
  history.sort((a,b) => a.durationMs - b.durationMs);
  return history[0];
}

function setStatusLabel(active) {
  if (!active) {
    statusText.textContent = "Waiting…";
    return;
  }
  if (active.status === "active") statusText.textContent = "Active (1 hour) ⏳";
  else if (active.status === "completed") statusText.textContent = "Completed ✅";
  else statusText.textContent = "Failed ❌";
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------------- Core logic ----------------
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

function finishActive(status) {
  const active = getActive();
  if (!active || active.status !== "active") return;

  const finishedAt = now();
  const durationMs = Math.max(0, finishedAt - active.startAt);

  active.status = status; // "completed" or "failed"
  active.finishedAt = finishedAt;
  active.durationMs = durationMs;

  setActive(active);

  addToHistory({
    id: `${active.startAt}-${Math.random().toString(16).slice(2)}`,
    challenge: active.challenge,
    status: active.status,
    startAt: active.startAt,
    finishedAt: active.finishedAt,
    durationMs: active.durationMs
  });

  render();
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

// ---------------- Timer loop ----------------
let timerInterval = null;

function tick() {
  const active = getActive();

  if (!active) {
    timerText.textContent = "--:--:--";
    return;
  }

  setStatusLabel(active);

  if (active.status !== "active") {
    timerText.textContent = "00:00:00";
    return;
  }

  const left = active.endAt - now();

  if (left <= 0) {
    finishActive("failed");
    return;
  }

  timerText.textContent = fmtHMS(left);
}

function ensureTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 250);
  tick();
}

// ---------------- Render ----------------
function renderPB() {
  const active = getActive();
  if (!active) {
    pbText.textContent = "";
    return;
  }

  const pb = getPBForChallenge(active.challenge);
  if (!pb) {
    pbText.textContent = "";
    return;
  }

  pbText.textContent = `PB: ${fmtHMS(pb.durationMs)} (finished ${new Date(pb.finishedAt).toLocaleTimeString()})`;
}

function renderChallenge() {
  const active = getActive();

  if (!active) {
    challengeText.textContent = "No active challenge yet.";
    startedText.textContent = "—";
    completeBtn.disabled = true;
    failBtn.disabled = true;
    pbText.textContent = "";
    statusText.textContent = "Waiting…";
    timerText.textContent = "--:--:--";
    return;
  }

  challengeText.textContent = active.challenge;
  startedText.textContent = `Started: ${fmtLocal(active.startAt)}`;

  completeBtn.disabled = active.status !== "active";
  failBtn.disabled = active.status !== "active";

  setStatusLabel(active);
  renderPB();
}

function renderHistory() {
  const list = getHistory();

  if (!list || list.length === 0) {
    historyEmpty.style.display = "block";
    historyList.innerHTML = "";
    return;
  }

  historyEmpty.style.display = "none";

  historyList.innerHTML = list.map((r) => {
    const badge = r.status === "completed" ? "Completed" : "Failed";
    const duration = fmtHMS(r.durationMs);
    const finished = new Date(r.finishedAt).toLocaleString();

    return `
      <div class="historyItem">
        <div class="historyTop">
          <div class="historyName">${escapeHTML(r.challenge)}</div>
          <div class="badge">${badge}</div>
        </div>
        <div class="historyMeta">
          <div>Time: ${duration}</div>
          <div>Finished: ${escapeHTML(finished)}</div>
        </div>
      </div>
    `;
  }).join("");
}

function render() {
  renderChallenge();
  renderHistory();
  ensureTimer();
}

// ---------------- Start from notification click ----------------
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

// ---------------- Notifications permission ----------------
async function enableNotificationsFlow() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    notifHint.textContent = "Notifications not allowed on this device.";
    return;
  }

  const registration = await navigator.serviceWorker.register("service-worker.js");

  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  console.log("FCM Token:", token);
  notifHint.textContent = "Notifications enabled ✅ (token printed in console)";
}

// ---------------- Tabs (reliable) ----------------
function setActiveTab(name) {
  pageChallenge.classList.toggle("hidden", name !== "challenge");
  pageHistory.classList.toggle("hidden", name !== "history");
  pageDev.classList.toggle("hidden", name !== "dev");

  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === name));
}

// One click handler for the whole bar (super reliable)
tabbar.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  setActiveTab(btn.dataset.tab);
});

// ---------------- Wire actions ----------------
completeBtn.addEventListener("click", () => finishActive("completed"));
failBtn.addEventListener("click", () => finishActive("failed"));

simulateBtn.addEventListener("click", () => startNewChallenge(now()));
clearBtn.addEventListener("click", clearEverythingActiveOnly);
clearHistoryBtn.addEventListener("click", clearAllHistory);

bellBtn.addEventListener("click", async () => {
  try {
    await enableNotificationsFlow();
  } catch (e) {
    console.error(e);
    notifHint.textContent = "Error enabling notifications (see console).";
  }
});

// ---------------- Init ----------------
render();
maybeStartFromSentAt();
setActiveTab("challenge");
