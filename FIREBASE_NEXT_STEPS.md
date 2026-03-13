# Firebase Next Steps fuer FF360

## 1. Firebase-Projekt anlegen
- In der Firebase Console ein neues Projekt erstellen.
- Das Projekt auf den `Blaze`-Plan umstellen, wenn du Firestore produktiv nutzen willst.

## 2. Web-App registrieren
- Im Firebase-Projekt eine Web-App anlegen.
- Die Firebase-Konfiguration ist bereits in [firebase-init.js](/Users/jonasjessen/Library/Mobile%20Documents/com~apple~CloudDocs/FF360/FeuerwehrApp/firebase-init.js) hinterlegt.
- Wenn du spaeter ein anderes Projekt nutzt, dort diese Werte ersetzen:
  - `apiKey`
  - `authDomain`
  - `projectId`
  - `storageBucket`
  - `messagingSenderId`
  - `appId`

## 3. Authentication aktivieren
- In der Firebase Console `Authentication` oeffnen.
- Fuer den ersten Start mindestens diese Methode aktivieren:
  - `Email/Password`

Hinweis:
- Die aktuelle Cloud-Schicht ist jetzt auf `Email/Password` ausgelegt.
- Ohne echten Login bleiben die Cloud-Funktionen inaktiv; die lokale Speicherung laeuft weiter.

## 4. Firestore anlegen
- `Cloud Firestore` aktivieren.
- Eine passende Region waehlen.
- Zuerst kannst du zum Testen den Entwicklermodus nutzen, danach solltest du saubere Security Rules setzen.

## 5. Erste Firestore-Regeln setzen
Nutze mindestens eine Regel in dieser Richtung:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/appData/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Diese Regel sorgt dafuer, dass jeder Benutzer nur seine eigenen Daten unter `users/{uid}/appData/*` lesen und schreiben kann.

## 6. Hosting
- Wenn du die App ueber Firebase Hosting ausliefern willst, Hosting im Projekt aktivieren.
- Achte darauf, die App ueber HTTPS bereitzustellen, damit PWA, Service Worker und geraeteseitige APIs sauber funktionieren.

## 7. Was im Code bereits vorbereitet ist
- [firebase-init.js](/Users/jonasjessen/Library/Mobile%20Documents/com~apple~CloudDocs/FF360/FeuerwehrApp/firebase-init.js)
  - Initialisiert Firebase App, Auth und Firestore
- [cloud-sync.js](/Users/jonasjessen/Library/Mobile%20Documents/com~apple~CloudDocs/FF360/FeuerwehrApp/cloud-sync.js)
  - Enthält erste Lade-/Speicherfunktionen fuer Firestore
  - Brueckt lokale Speicher-Updates optional in die Cloud
- [index.html](/Users/jonasjessen/Library/Mobile%20Documents/com~apple~CloudDocs/FF360/FeuerwehrApp/index.html)
  - Behaelt lokale Speicherung als Primärpfad
  - Meldet lokale Aenderungen zusaetzlich an die Cloud-Schicht

## 8. Sinnvolle naechste technische Schritte
- Eine kleine Login-Oberflaeche in der App bauen, die `window.FF360Firebase.signInWithEmail(...)` nutzt
- Eine echte Benutzeranmeldung mit `Email/Password` ergaenzen
- Pro Modul gezielt entscheiden, welche LocalStorage-Keys spaeter in Firestore landen sollen
- Nicht die komplette App blind spiegeln, sondern zunaechst:
  - `settings`
  - `kameraden`
  - `fahrzeuge`
  - `termine`
  - `einsaetze`
- Fuer Live-Sync spaeter Snapshot-Listener pro Bereich einbauen
