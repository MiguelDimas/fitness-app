import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";   // add

const firebaseConfig = {
  apiKey: "AIzaSyAFrp4BWVdebZXcTniVtec1_bC-wNRg5HM",
  authDomain: "fitness-app-ace42.firebaseapp.com",
  projectId: "fitness-app-ace42",
  storageBucket: "fitness-app-ace42.firebasestorage.app",
  messagingSenderId: "754268506091",
  appId: "1:754268506091:web:ec413bb148eecca33a7bae",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);   // add