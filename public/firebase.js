// Firebase Configuration
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
    projectId: "YOUR_FIREBASE_PROJECT_ID",
    storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
    appId: "YOUR_FIREBASE_APP_ID"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Initialize Services
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();

// Email Domain Whitelist
export const ALLOWED_EMAIL_DOMAINS = ['school.edu']; // Update with your school domain(s)

// File Size Limits (5MB)
export const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB in bytes

// Current Semester
export const CURRENT_SEMESTER = 'Fall 2024';

console.log('[v0] Firebase initialized successfully');
