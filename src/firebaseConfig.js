import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";  // Import Firestore
import { getStorage } from "firebase/storage"; // Import Storage if needed

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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
export { auth, db, storage };
