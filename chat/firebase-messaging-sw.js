importScripts('https://www.gstatic.com/firebasejs/10.x.x/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.x.x/firebase-messaging-compat.js');
/*
const firebaseConfig = {
  apiKey: "AIzaSyBuOdufK2UCl9m6iZa35SUQSRF-9HZHcD8",
  authDomain: "chatroom4friends-522bd.firebaseapp.com",
  projectId: "chatroom4friends-522bd",
  storageBucket: "chatroom4friends-522bd.firebasestorage.app",
  messagingSenderId: "26805339142",
  appId: "1:26805339142:web:86ff21490be804a16eaf87",
  measurementId: "G-EXFX8QFGGF"
};
*/
firebase.initializeApp({firebaseConfig});
const messaging = firebase.messaging();

// This handles background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received: ', payload);
  const { title, body } = payload.notification;
  self.registration.showNotification(title, { body, icon: '/icon-192.png' });
});