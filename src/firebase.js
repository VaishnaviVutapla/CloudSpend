import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBdWSIl6LzJ2YMNSsjBkfOSBOBdJVVyp5Q",
  authDomain: "cloudspend-49aec.firebaseapp.com",
  projectId: "cloudspend-49aec",
  storageBucket: "cloudspend-49aec.firebasestorage.app",
  messagingSenderId: "782279041722",
  appId: "1:782279041722:web:00db198c3cd4e7a2ec9883"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;