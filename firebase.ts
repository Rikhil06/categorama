// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCxfDqTKaZAGo6pI-NfnqJyiHxqxyBtv14',
  authDomain: 'guessr-84aed.firebaseapp.com',
  databaseURL:
    'https://guessr-84aed-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'guessr-84aed',
  storageBucket: 'guessr-84aed.firebasestorage.app',
  messagingSenderId: '677557352287',
  appId: '1:677557352287:web:ef3c422c914d388029a8ea',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
