import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCFXJ9CarNxjnU74wPPukDb31zzs11_GAA",
  authDomain: "ff-360-8f932.firebaseapp.com",
  projectId: "ff-360-8f932",
  storageBucket: "ff-360-8f932.firebasestorage.app",
  messagingSenderId: "436899695433",
  appId: "1:436899695433:web:9e7ad29a1f248e54c3e898"
};

function hasRealFirebaseConfig(config) {
  return Object.values(config).every((value) => typeof value === "string" && value.trim() && !value.startsWith("REPLACE_WITH_"));
}

let firebaseState = {
  enabled: false,
  app: null,
  auth: null,
  db: null,
  currentUser: null,
  configError: "Firebase-Konfiguration fehlt."
};

function publishFirebaseState() {
  window.FF360Firebase = {
    ...firebaseState,
    config: FIREBASE_CONFIG,
    hasRealConfig: hasRealFirebaseConfig(FIREBASE_CONFIG),
    getCurrentUid() {
      return firebaseState.currentUser && firebaseState.currentUser.uid ? firebaseState.currentUser.uid : null;
    },
    isSignedIn() {
      return !!(firebaseState.currentUser && firebaseState.currentUser.uid);
    },
    async signInWithEmail(email, password) {
      if (!firebaseState.enabled || !firebaseState.auth) {
        throw new Error(firebaseState.configError || "Firebase Auth ist nicht initialisiert.");
      }
      const cleanEmail = String(email || "").trim();
      const cleanPassword = String(password || "");
      if (!cleanEmail || !cleanPassword) {
        throw new Error("E-Mail und Passwort sind erforderlich.");
      }
      const result = await signInWithEmailAndPassword(firebaseState.auth, cleanEmail, cleanPassword);
      return result.user;
    },
    async registerWithEmail(email, password) {
      if (!firebaseState.enabled || !firebaseState.auth) {
        throw new Error(firebaseState.configError || "Firebase Auth ist nicht initialisiert.");
      }
      const cleanEmail = String(email || "").trim();
      const cleanPassword = String(password || "");
      if (!cleanEmail || !cleanPassword) {
        throw new Error("E-Mail und Passwort sind erforderlich.");
      }
      const result = await createUserWithEmailAndPassword(firebaseState.auth, cleanEmail, cleanPassword);
      return result.user;
    },
    async signOut() {
      if (!firebaseState.enabled || !firebaseState.auth) return;
      await signOut(firebaseState.auth);
    }
  };
}

async function initFirebase() {
  if (!hasRealFirebaseConfig(FIREBASE_CONFIG)) {
    publishFirebaseState();
    console.info("FF360 Firebase: Platzhalter-Konfiguration aktiv. Cloud-Dienste bleiben deaktiviert.");
    return;
  }

  try {
    const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    const db = initializeFirestore(app, {
      localCache: persistentLocalCache({}),
      experimentalAutoDetectLongPolling: true
    });

    firebaseState = {
      enabled: true,
      app,
      auth,
      db,
      currentUser: auth.currentUser || null,
      configError: null
    };
    publishFirebaseState();

    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (error) {
      console.info("FF360 Firebase: Auth-Persistenz konnte nicht auf LOCAL gesetzt werden.", error);
    }

    onAuthStateChanged(auth, (user) => {
      firebaseState.currentUser = user || null;
      publishFirebaseState();
      window.dispatchEvent(new CustomEvent("ff360:firebase-auth-changed", {
        detail: { user: user || null }
      }));
    });

    window.dispatchEvent(new CustomEvent("ff360:firebase-ready", {
      detail: { app, auth, db }
    }));
  } catch (error) {
    firebaseState = {
      enabled: false,
      app: null,
      auth: null,
      db: null,
      currentUser: null,
      configError: String(error && error.message ? error.message : error)
    };
    publishFirebaseState();
    console.error("FF360 Firebase konnte nicht initialisiert werden.", error);
  }
}

publishFirebaseState();
initFirebase();
