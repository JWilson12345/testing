importScripts("https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js");

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyA88ORyr_9mU-lhTxL7fdp5uOiaI1frhAU",
  authDomain: "push-test-app-3cde4.firebaseapp.com",
  projectId: "push-test-app-3cde4",
  storageBucket: "push-test-app-3cde4.firebasestorage.app",
  messagingSenderId: "213929884030",
  appId: "1:213929884030:web:a48940dee282152278db2f"
});

const messaging = firebase.messaging();

// When a push arrives in the background, show it and attach a timestamp
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "New Challenge!";
  const body = payload?.notification?.body || "Tap to start your 1-hour challenge.";

  self.registration.showNotification(title, {
    body,
    data: {
      sentAt: Date.now()
    }
  });
});

// When user taps the notification, open the app and pass sentAt
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const sentAt = event.notification?.data?.sentAt || Date.now();
  const urlToOpen = `${self.location.origin}/?sentAt=${sentAt}`;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If already open, focus it + navigate
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(urlToOpen);
    })
  );
});
