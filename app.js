import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging.js";

// Firebase configuration (YOUR project)
const firebaseConfig = {
  apiKey: "AIzaSyA88ORyr_9mU-lhTxL7fdp5uOiaI1frhAU",
  authDomain: "push-test-app-3cde4.firebaseapp.com",
  projectId: "push-test-app-3cde4",
  storageBucket: "push-test-app-3cde4.firebasestorage.app",
  messagingSenderId: "213929884030",
  appId: "1:213929884030:web:a48940dee282152278db2f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize messaging
const messaging = getMessaging(app);

// Register service worker
navigator.serviceWorker.register("service-worker.js")
  .then((registration) => {
    console.log("Service Worker registered");

    // Button click
    document.getElementById("notifyBtn").addEventListener("click", async () => {

      // Ask permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Notifications not allowed");
        return;
      }

      // Get device token
      const token = await getToken(messaging, {
        vapidKey: "BFjdIfNLM0Y8If3k5MvNq9UFYnNmgMyO4ZTh58IXNn0ta_5OvTQvtLkKo8q1Bk74zZ8IpDNwgtHCuyNIkvmrmD8",
        serviceWorkerRegistration: registration
      });

      console.log("FCM Token:", token);
      alert("Notifications enabled! Check console for token.");
    });
  })
  .catch(err => {
    console.error("Service Worker error:", err);
  });
