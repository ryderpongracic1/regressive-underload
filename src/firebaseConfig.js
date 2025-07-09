import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";  // Import Firestore

const firebaseConfig = {
  apiKey: "AIzaSyB8lVgglOn82R9w0XiCEvzWvdN9sGSrR34",
  authDomain: "regressive-underload.firebaseapp.com",
  projectId: "regressive-underload",
  storageBucket: "regressive-underload.appspot.com",
  messagingSenderId: "914004012798",
  appId: "1:914004012798:web:798d7b1ff175b24db4bfaf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);  // Export Firestore
