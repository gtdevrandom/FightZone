// firebase-config.js
// Remplacez les valeurs ci-dessous par celles fournies par Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "fightzone.firebaseapp.com",
  databaseURL: "https://fightzone-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fightzone",
  storageBucket: "fightzone.appspot.com",
  messagingSenderId: "123456...",
  appId: "1:123456..."
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();