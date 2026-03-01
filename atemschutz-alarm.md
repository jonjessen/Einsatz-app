# Atemschutzüberwachung: Globaler Alarm

## Verhalten
- Die Alarmüberwachung läuft global über `AtemschutzUeberwachungService` und den permanenten Alarm-Ticker.
- Wenn eine Rückmeldung fällig/überfällig/kritisch wird, aktiviert sich der globale Alarmzustand.
- Bei Alarm:
  - Dauerton (Loop) über `assets/sounds/asue_alarm.wav` (Fallback: WebAudio-Puls)
  - Rotes Vollbild-Flackern (bleibt sichtbar, solange Alarm aktiv)
  - Persistentes Alarm-Banner am oberen Rand
  - Globaler ASÜ-Schnellzugriff über dem Gefahrenbutton
  - Im Banner: `Ton pausieren` schaltet nur den Ton aus (kein Quittieren)
  - Nach `Ton pausieren` wird die Eingabe `Rückmeldung fällig` direkt geöffnet und liegt über dem roten Flackern.

## Quittierung und Reset
- `Alarm quittieren` ist pro Trupp möglich.
- Globaler Ton stoppt, wenn kein unsilenced Alarm mehr aktiv ist.
- Globaler Alarmzustand bleibt sichtbar, solange mindestens ein Trupp fällig ist.
- `Timer zurücksetzen` setzt die nächste Rückmeldung sofort neu.

## Hintergrund
- Bei bestehender Notification-Berechtigung wird im Hintergrund eine Alarm-Notification mit Tag `asue-global-alarm` gesendet.
- Beim Zurückkehren in die App wird der Alarmzustand sofort neu berechnet und UI/Audio aktualisiert.
- Audio wird beim Start stumm vorinitialisiert (Priming), damit der Alarmton später ohne zusätzlichen Alarmzeitpunkt-Klick starten kann.
