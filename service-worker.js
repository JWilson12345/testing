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

// Handle background push
messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);

  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body
    }
  );
});
