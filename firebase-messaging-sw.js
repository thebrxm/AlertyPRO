/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD87mfu_r1EcJHvp7Y5Ux0i0qWJX0EmU2Y",
  authDomain: "alertyapp-c7a9d.firebaseapp.com",
  projectId: "alertyapp-c7a9d",
  messagingSenderId: "407588305266",
  appId: "1:407588305266:web:d9c91bd41e65e4178c05eb",
});

const messaging = firebase.messaging();

// Notificação em background
messaging.onBackgroundMessage(function (payload) {
  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: "/icon.png", // opcional
    }
  );
});
