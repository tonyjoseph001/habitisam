import { getFirestore, connectFirestoreEmulator, Firestore, initializeFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';

// Determine if we should use the emulator
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const emulatorEnv = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR;
const shouldConnectEmulator = emulatorEnv === 'true' || (emulatorEnv !== 'false' && isLocalhost);

// Initialize Cloud Firestore
// If Emulator: Use specific named instance to avoid lock issues + Long Polling
// If Production: Use default instance (undefined dbId) + Standard Settings (or Auto-detect)
const db = initializeFirestore(app, {
    experimentalForceLongPolling: shouldConnectEmulator, // Only force long polling for emulator
}, shouldConnectEmulator ? "habitisam-db" : undefined);

if (shouldConnectEmulator) {
    // Only connect if not already connected
    try {
        console.log("🔥 [Core] Attempting to connect to Emulator at 127.0.0.1:8080...");
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        console.log("🔥 [Core] Successfully connected to Firestore Emulator");
    } catch (e) {
        console.warn("🔥 [Core] Emulator connection warning:", e);
    }
} else {
    console.log("🌍 [Core] Connected to Production Firestore");
}

export { db };
