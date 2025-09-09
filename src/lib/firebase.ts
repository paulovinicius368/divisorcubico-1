// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

export { db, auth };
