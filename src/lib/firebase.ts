import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef",
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const storage = getStorage(app);

// Connect to emulator if on localhost
// Connect to emulator if on localhost, unless explicitly disabled via env var
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const emulatorEnv = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR;
const shouldConnectEmulator = emulatorEnv === 'true' || (emulatorEnv !== 'false' && isLocalhost);

if (shouldConnectEmulator) {
    // Only connect if not already connected (Firebase throws if connected twice)
    try {
        // Note: connectAuthEmulator requires the full URL including protocol
        connectAuthEmulator(auth, "http://127.0.0.1:9099");
        connectStorageEmulator(storage, "127.0.0.1", 9199); // Use 127.0.0.1 for consistency
        console.log("🔥 Connected to Auth & Storage Emulator");
    } catch (e) {
        // Ignore error if already connected
    }
}

export { app, auth, storage };
