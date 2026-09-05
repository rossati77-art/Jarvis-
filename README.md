# Jarvis (app Android)

Un assistente personale per Android: il primo pezzo è un **tasto per parlare
direttamente con Claude**, sia dentro l'app sia da una **tile nelle
Impostazioni Rapide** del telefono (richiamabile da qualunque schermata con
un tocco). Il progetto è pensato per crescere con altre automazioni in
stile "Jarvis".

> Nota: questo repository contiene anche un'altra web app statica
> ("Gestione dei Flussi di Casa", `index.html` + `sw.js`, pubblicata su
> GitHub Pages) non collegata a questo progetto Android. Il codice
> dell'app Jarvis vive tutto sotto `app/`.

## Cosa fa oggi

- **Nell'app**: schermata di chat con Claude, con un grosso pulsante
  "Parla con Claude" (riconoscimento vocale) oppure un campo di testo.
  Le risposte di Claude vengono anche lette ad alta voce.
- **Tile Impostazioni Rapide**: aggiungi la tile "Parla con Claude" al
  pannello delle Impostazioni Rapide di Android (tira giù la tendina due
  volte, tocca l'icona a matita/modifica, trascina la tile Jarvis tra
  quelle attive). Un tocco sulla tile apre una piccola finestra
  trasparente che ascolta subito la domanda, la invia a Claude e legge
  la risposta ad alta voce.
- La tua chiave API Anthropic viene salvata sul dispositivo cifrata
  (`EncryptedSharedPreferences`), mai su un server terzo.

## Requisiti per compilare

Questo ambiente di lavoro non ha l'SDK Android installato, quindi il
codice non è stato compilato qui: va aperto con **Android Studio**
(Koala o successivo) oppure una CI con Android SDK configurato.

1. Apri la cartella del progetto con Android Studio.
2. Lascia che scarichi le dipendenze Gradle/AGP e l'SDK richiesto
   (`compileSdk 34`, `minSdk 26`).
3. Esegui l'app su un dispositivo/emulatore Android.
4. Alla prima apertura, vai in **Impostazioni** (icona ingranaggio in
   alto a destra) e incolla la tua chiave API Anthropic (da
   https://console.anthropic.com).
5. Concedi il permesso del microfono quando richiesto.

## Struttura del progetto

```
app/src/main/java/com/jarvis/assistant/
├── MainActivity.kt        # UI Compose: chat + impostazioni
├── VoiceActivity.kt        # Finestra trasparente aperta dalla tile
├── data/
│   ├── ClaudeApi.kt         # Chiamata alla Anthropic Messages API
│   └── SecurePrefs.kt       # Salvataggio cifrato di API key/modello
├── voice/
│   ├── SpeechToText.kt      # Wrapper su SpeechRecognizer
│   └── TextToSpeechHelper.kt
└── tile/
    └── JarvisTileService.kt # Tile per le Impostazioni Rapide
```

## Prossimi passi possibili

- Cronologia conversazioni persistente tra riavvii dell'app.
- Comandi rapidi (es. "leggi le notifiche", "imposta una sveglia").
- Wake word per l'attivazione vocale senza toccare nulla.
- Widget sulla home screen oltre alla tile.
