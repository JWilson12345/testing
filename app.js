import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging.js";

// ---- 1) YOUR FIREBASE CONFIG (unchanged) ----
const firebaseConfig = {
  apiKey: "AIzaSyA88ORyr_9mU-lhTxL7fdp5uOiaI1frhAU",
  authDomain: "push-test-app-3cde4.firebaseapp.com",
  projectId: "push-test-app-3cde4",
  storageBucket: "push-test-app-3cde4.firebasestorage.app",
  messagingSenderId: "213929884030",
  appId: "1:213929884030:web:a48940dee282152278db2f"
};

const VAPID_KEY = "BFjdIfNLM0Y8If3k5MvNq9UFYnNmgMyO4ZTh58IXNn0ta_5OvTQvtLkKo8q1Bk74zZ8IpDNwgtHCuyNIkvmrmD8";

// ---- 2) CHALLENGES (edit later) ----
const CHALLENGES = [
  "100 push-ups",
  "100 squats",
  "Plank for 5 minutes total",
  "50 burpees",
  "Run/walk 2 km",
  "200 jumping jacks"
];

// ---- 3) STORAGE KEYS ----
const LS_KEY = "dailyChallenge.active"; // stores JSON
const ONE_HOUR_MS = 60 * 60 * 1000;

// ---- 4) UI ELEMENTS ----
const statusText = document.getElementById("statusText");
const challengeText = document.getElementById("challengeText");
const timerText = document.getElementById("timerText");
const startedText = document.getElementById("startedText");

const completeBtn = document.getElementById("completeBtn");
const failBtn = document.getElementById("failBtn");
const simulateBtn = document.getElementById("simulateBtn");
const clearBtn = document.getElementById("clearBtn");

const enableNotifBtn = document.getElementById("enableNotifBtn");
const notifHint = document.getElementById("notifHint");

// ---- 5) HELPERS ----
function pickRandomChallenge() {
  const i = Math.floor(Math.random() * CHALLENGES.length);
  return CHALLENGES[i];
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatLocalTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function loadActive() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveActive(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

function clearActive() {
  localStorage.removeItem(LS_KEY);
}

function setUIForNoChallenge() {
  statusText.textContent = "Waiting…";
  challengeText.textContent = "No active challenge yet.";
  timerText.textContent = "--:--:--";
  startedText.textContent = "—";
  completeBtn.disabled = true;
  failBtn.disabled = true;
}

function setUIForActive(active) {
  challengeText.textContent = active.challenge;
  startedText.textContent = formatLocalTime(active.startAt);

  completeBtn.disabled = active.status !== "active";
  failBtn.disabled = active.status !== "active";
}

function setStatusLabel(active) {
  if (!active) return;

  if (active.status === "completed") statusText.textContent = "Completed ✅";
  else if (active.status === "failed") statusText.textContent = "Failed ❌";
  else statusText.textContent = "Active (1 hour) ⏳";
}

function startNewChallenge(startAt) {
  const active = {
    challenge: pickRandomChallenge(),
    startAt,
    endAt: startAt + ONE_HOUR_MS,
    status: "active",
    completedAt: null
  };
  saveActive(active);
  render();
}

function completeChallenge() {
  const active = loadActive();
  if (!active || active.status !== "active") return;

  active.status = "completed";
  active.completedAt = Date.now();
  saveActive(active);
  render();
}

function failChallenge() {
  const active = loadActive();
  if (!active || active.status !== "active") return;

  active.status = "failed";
  saveActive(active);
  render();
}

// ---- 6) TIMER LOOP ----
let intervalId = null;

function renderTimer(active) {
  if (!active) return;

  if (active.status !== "active") {
    timerText.textContent = "00:00:00";
    return;
  }

  const now = Date.now();
  const left = active.endAt - now;

  if (left <= 0) {
    // auto-fail when time runs out
    active.status = "failed";
    saveActive(active);
    timerText.textContent = "00:00:00";
    render();
    return;
  }

  timerText.textContent = formatTime(left);
}

function render() {
  const active = loadActive();

  if (!active) {
    setUIForNoChallenge();
  } else {
    setUIForActive(active);
    setStatusLabel(active);
    renderTimer(active);
  }

  // ensure one interval
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    const a = loadActive();
    if (!a) {
      setUIForNoChallenge();
      return;
    }
    setStatusLabel(a);
    renderTimer(a);
  }, 250);
}

// ---- 7) START FROM NOTIFICATION CLICK (sentAt param) ----
// service-worker will open: /?sentAt=TIMESTAMP
function maybeStartFromSentAtParam() {
  const url = new URL(window.location.href);
  const sentAtStr = url.searchParams.get("sentAt");
  if (!sentAtStr) return;

  const sentAt = Number(sentAtStr);
  if (!Number.isFinite(sentAt) || sentAt <= 0) return;

  const active = loadActive();

  // If there is no challenge or this push is newer, start a new one
  if (!active || (active.startAt && sentAt > active.startAt)) {
    startNewChallenge(sentAt);
  }

  // Clean URL so it doesn't keep re-triggering on refresh
  url.searchParams.delete("sentAt");
  window.history.replaceState({}, "", url.toString());
}

// ---- 8) NOTIFICATION PERMISSION + TOKEN (same as before) ----
async function enableNotificationsFlow() {
  // Ask device permission first
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    notifHint.textContent = "Notifications not allowed on this device.";
    return;
  }

  // Register service worker
  const registration = await navigator.serviceWorker.register("service-worker.js");

  // Initialize Firebase + get token
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  console.log("FCM Token:", token);
  notifHint.textContent = "Notifications enabled ✅ (token printed in console)";
}

// ---- 9) WIRE BUTTONS ----
completeBtn.addEventListener("click", completeChallenge);
failBtn.addEventListener("click", failChallenge);

simulateBtn.addEventListener("click", () => {
  // simulate a push arriving "now"
  startNewChallenge(Date.now());
});

clearBtn.addEventListener("click", () => {
  clearActive();
  render();
});

enableNotifBtn.addEventListener("click", async () => {
  try {
    await enableNotificationsFlow();
  } catch (e) {
    console.error(e);
    notifHint.textContent = "Error enabling notifications (see console).";
  }
});

// ---- 10) INITIAL LOAD ----
render();
maybeStartFromSentAtParam();
