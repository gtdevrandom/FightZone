// Configuration Firebase de ton application
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

// Initialisation de Firebase (Syntaxe Version 8)
firebase.initializeApp(firebaseConfig);

// On rend les services disponibles pour game.js
const database = firebase.database();
const auth = firebase.auth();
const analytics = firebase.analytics();
