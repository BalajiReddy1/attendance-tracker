import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDfsBHF5O-4eGOOvW1mGT_UL3DU1f5_Cj4",
  authDomain: "attendance-tracker-a9863.firebaseapp.com",
  projectId: "attendance-tracker-a9863",
  storageBucket: "attendance-tracker-a9863.appspot.com",
  messagingSenderId: "585269225041",
  appId: "1:585269225041:web:5913586699a7bdad60ba70",
  measurementId: "G-CPGJLBWZJK"
  // ...other config values
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);