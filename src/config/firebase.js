// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDeCh-6dbDOJMMQ9inquHtx_Wm2QDLZeM8",
    authDomain: "crm-updm.firebaseapp.com",
    projectId: "crm-updm",
    storageBucket: "crm-updm.firebasestorage.app",
    messagingSenderId: "572672543982",
    appId: "1:572672543982:web:a65905394a066d5b1477ff",
    measurementId: "G-DKSHLRWWL4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
