import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyD87mfu_r1EcJHvp7Y5Ux0i0qWJX0EmU2Y",
  authDomain: "alertyapp-c7a9d.firebaseapp.com",
  projectId: "alertyapp-c7a9d",
  messagingSenderId: "407588305266",
  appId: "1:407588305266:web:d9c91bd41e65e4178c05eb",
});

export const firebaseApp = initializeApp(firebaseConfig);

import { getMessaging, getToken } from "firebase/messaging";
import { firebaseApp } from "./firebase";

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Permissão negada");
      return null;
    }

    const messaging = getMessaging(firebaseApp);

    const token = await getToken(messaging, {
      vapidKey: "BF0VcW0OJL53eGQszbRJiGDpw1miqV5GNP84LZy0P5YihV-qyBZpOAhx8ibm3nA2WuQYIN--Uo7qaJnIlWXYoTc",
    });

    console.log("FCM TOKEN:", token);
    return token;
  } catch (err) {
    console.error("Erro ao obter token", err);
    return null;
  }
};