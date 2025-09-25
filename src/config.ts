import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Replace with the config object from your Firebase Console settings
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);