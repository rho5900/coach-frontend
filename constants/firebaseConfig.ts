// constants/firebaseConfig.js
import { initializeApp } from "@firebase/app";
import { getFirestore } from "@firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCsWQyhoq-0LNb2AdT-cd7RiSCMvN3vPZE",
  authDomain: "coach-app-35e87.firebaseapp.com",
  projectId: "coach-app-35e87",
  storageBucket: "coach-app-35e87.appspot.com",
  messagingSenderId: "633917321078",
  appId: "1:633917321078:web:8408b43174ed7065c1d457"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };