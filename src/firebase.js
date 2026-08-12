import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCP8Wr1SPbkLLlhD3YqLRqaXaOvvGX9cmg",
  authDomain: "warcop-torneo.firebaseapp.com",
  projectId: "warcop-torneo",
  storageBucket: "warcop-torneo.firebasestorage.app",
  messagingSenderId: "416584000854",
  appId: "1:416584000854:web:e513fa5b4d56da4ade22f7",
  measurementId: "G-GMR48T2ZMZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);