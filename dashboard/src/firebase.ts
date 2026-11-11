// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDxGYFaxrSjXOvD77EneaU9Qb4OFnbAzqU",
  authDomain: "tush-92e93.firebaseapp.com",
  projectId: "tush-92e93",
  storageBucket: "tush-92e93.firebasestorage.app",
  messagingSenderId: "873477457774",
  appId: "1:873477457774:web:ffd7ffdc9f26d4513ba37f",
  measurementId: "G-MW5L2GZMSE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);