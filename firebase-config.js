// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCJ-N_nexROudL48v6voYzwLjp00DELJRk",
  authDomain: "fightzoneio.firebaseapp.com",
  databaseURL: "https://fightzoneio-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fightzoneio",
  storageBucket: "fightzoneio.firebasestorage.app",
  messagingSenderId: "699148011620",
  appId: "1:699148011620:web:7f38a3c8811251dcb57771",
  measurementId: "G-15RQQKCKDX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const auth = firebase.auth();
