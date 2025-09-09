// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "cube-splitter",
  "appId": "1:1094382799697:web:2ad2767ed2b2e8eced2170",
  "storageBucket": "cube-splitter.firebasestorage.app",
  "apiKey": "AIzaSyCC85AzAMKhgnSqj5LVz7Il56vbKW297NE",
  "authDomain": "cube-splitter.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "1094382799697"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn("Firestore persistence failed: Multiple tabs open.");
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn("Firestore persistence failed: Browser does not support persistence.");
    }
  });


export { db, auth };
