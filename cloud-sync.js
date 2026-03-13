import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const APP_DATA_DOCS = Object.freeze({
  fahrzeuge: "fahrzeuge",
  kameraden: "kameraden",
  termine: "termine",
  einsaetze: "einsaetze",
  settings: "settings",
  localState: "localState"
});

const STORAGE_KEY_TO_APP_DATA_DOC = Object.freeze({
  darkMode: APP_DATA_DOCS.settings,
  einsatz_log: APP_DATA_DOCS.einsaetze,
  einsatz_kraefte_v1: APP_DATA_DOCS.kameraden,
  lage_dashboard_v1: APP_DATA_DOCS.einsaetze,
  social_generator_v1: APP_DATA_DOCS.einsaetze
});

function getFirebaseRuntime() {
  return window.FF360Firebase || null;
}

function getCurrentUid() {
  const runtime = getFirebaseRuntime();
  return runtime && typeof runtime.getCurrentUid === "function" ? runtime.getCurrentUid() : null;
}

function getAppDataDocRef(uid, docId) {
  const runtime = getFirebaseRuntime();
  if (!runtime || !runtime.db) {
    throw new Error("Firestore ist nicht initialisiert.");
  }
  return doc(runtime.db, "users", uid, "appData", docId);
}

function resolveDocIdForStorageKey(storageKey) {
  return STORAGE_KEY_TO_APP_DATA_DOC[storageKey] || APP_DATA_DOCS.localState;
}

async function ensureAuthenticatedUser() {
  const runtime = getFirebaseRuntime();
  if (!runtime || !runtime.enabled) {
    throw new Error(runtime && runtime.configError ? runtime.configError : "Firebase ist deaktiviert.");
  }
  if (runtime.getCurrentUid()) return runtime.getCurrentUid();
  throw new Error("Kein Firebase-Benutzer angemeldet. Bitte zuerst per E-Mail/Passwort anmelden.");
}

async function saveAppDataDocument(docId, payload, options = {}) {
  const uid = await ensureAuthenticatedUser();
  const ref = getAppDataDocRef(uid, docId);
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const data = {
    ...safePayload,
    updatedAt: serverTimestamp(),
    source: options.source || "ff360-web"
  };
  await setDoc(ref, data, { merge: options.merge !== false });
  return { uid, docId };
}

async function loadAppDataDocument(docId) {
  const uid = await ensureAuthenticatedUser();
  const snapshot = await getDoc(getAppDataDocRef(uid, docId));
  return snapshot.exists() ? snapshot.data() : null;
}

async function loadAllPreparedDocuments() {
  const uid = await ensureAuthenticatedUser();
  const runtime = getFirebaseRuntime();
  const snap = await getDocs(collection(runtime.db, "users", uid, "appData"));
  const result = {};
  snap.forEach((item) => {
    result[item.id] = item.data();
  });
  return result;
}

async function queueLocalStateWrite(storageKey, rawValue, metadata = {}) {
  const runtime = getFirebaseRuntime();
  if (!runtime || !runtime.enabled) return { skipped: true, reason: "firebase-disabled" };
  const docId = resolveDocIdForStorageKey(storageKey);
  const payload = {
    localKeys: {
      [storageKey]: {
        value: rawValue,
        mode: metadata.mode || "real",
        scoped: !!metadata.scoped,
        savedAt: new Date().toISOString()
      }
    }
  };
  try {
    return await saveAppDataDocument(docId, payload, { merge: true, source: "local-storage-bridge" });
  } catch (error) {
    console.warn(`FF360 Cloud-Sync: Speichern von ${storageKey} fehlgeschlagen.`, error);
    return { skipped: true, reason: "write-failed", error };
  }
}

async function queueLocalStateDelete(storageKey, metadata = {}) {
  const runtime = getFirebaseRuntime();
  if (!runtime || !runtime.enabled) return { skipped: true, reason: "firebase-disabled" };
  const docId = resolveDocIdForStorageKey(storageKey);
  const payload = {
    deletedKeys: {
      [storageKey]: {
        mode: metadata.mode || "real",
        scoped: !!metadata.scoped,
        deletedAt: new Date().toISOString()
      }
    }
  };
  try {
    return await saveAppDataDocument(docId, payload, { merge: true, source: "local-storage-bridge" });
  } catch (error) {
    console.warn(`FF360 Cloud-Sync: Löschen von ${storageKey} fehlgeschlagen.`, error);
    return { skipped: true, reason: "delete-failed", error };
  }
}

function subscribeToDocument(docId, onData, onError) {
  const uid = getCurrentUid();
  if (!uid) {
    if (typeof onError === "function") {
      onError(new Error("Kein angemeldeter Firebase-Benutzer vorhanden."));
    }
    return () => {};
  }
  return onSnapshot(
    getAppDataDocRef(uid, docId),
    (snapshot) => {
      if (typeof onData === "function") {
        onData(snapshot.exists() ? snapshot.data() : null);
      }
    },
    (error) => {
      if (typeof onError === "function") onError(error);
    }
  );
}

window.FF360CloudSync = {
  APP_DATA_DOCS,
  ensureAuthenticatedUser,
  loadAppDataDocument,
  loadAllPreparedDocuments,
  saveAppDataDocument,
  queueLocalStateWrite,
  queueLocalStateDelete,
  subscribeToDocument,
  async saveFahrzeuge(data) {
    return saveAppDataDocument(APP_DATA_DOCS.fahrzeuge, { data }, { merge: true });
  },
  async saveKameraden(data) {
    return saveAppDataDocument(APP_DATA_DOCS.kameraden, { data }, { merge: true });
  },
  async saveTermine(data) {
    return saveAppDataDocument(APP_DATA_DOCS.termine, { data }, { merge: true });
  },
  async saveEinsaetze(data) {
    return saveAppDataDocument(APP_DATA_DOCS.einsaetze, { data }, { merge: true });
  },
  async saveSettings(data) {
    return saveAppDataDocument(APP_DATA_DOCS.settings, { data }, { merge: true });
  }
};

window.addEventListener("ff360:firebase-ready", () => {
  console.info("FF360 Cloud-Sync: Firebase bereit. Lokale Datenhaltung bleibt aktiv; Cloud-Bridge ist vorbereitet.");
});
