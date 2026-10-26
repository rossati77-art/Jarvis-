# Installazione completa: Gestionale Rossati su Google (Sheets + Apps Script + Sites)

Risultato: la stessa app, con dati salvati in un Google Sheet, personaggio che parla e scrive (con OpenAI), agenti che girano da soli ogni mattina, incorporata nel tuo Google Sites. ~30 minuti.

## Cosa contiene la cartella
- `apps-script/Code.gs`: backend (database su foglio, proxy OpenAI, agenti, trigger).
- `apps-script/appsscript.json`: impostazioni (fuso Roma, accesso solo tu, permessi).
- `apps-script/shim.js` + `build.js`: collegano la pagina al backend (sostituiscono l'archivio e l'IA di Claude). `index.html` è già generato.
- `gestionale-sorgente.html`: pagina originale. `SPECIFICA.md`: descrizione funzionale.

## Passi
1. **Dati**: nel Gestionale Claude, in fondo alla Home, tocca **«Esporta tutti i dati»**: scarica `gestionale-dati.json` (tutto l'archivio, compresi movimenti, scadenze, borsa). Caricalo in **Google Drive, nella cartella principale** (non in sottocartelle). Il file contiene i tuoi dati finanziari: non darlo a nessuno e non metterlo su GitHub.
2. **Foglio**: crea un Google Sheet vuoto "Gestionale Rossati db". Menu **Estensioni → Apps Script**.
3. **Codice**: in Apps Script:
   - incolla il contenuto di `Code.gs` al posto di `Codice.gs`;
   - **+ → HTML**, nome `index`, incolla tutto `apps-script/index.html`;
   - Impostazioni progetto → spunta «Mostra il file manifest appsscript.json» e incolla `appsscript.json`.
4. **Chiave OpenAI**: platform.openai.com → API keys → crea chiave (serve credito prepagato). In Apps Script: Impostazioni progetto → **Proprietà script** → `OPENAI_API_KEY` = la chiave. Modelli usati: `gpt-4o-mini` (veloce) e `gpt-4o` (pensa di più), cambiabili in `MODELLI`.
5. **Importa**: nell'editor scegli la funzione `importaDati` → Esegui → autorizza i permessi (Drive, Gmail in sola lettura, Calendario). Controlla il foglio `db`: devono comparire le righe.
6. **Agenti**: esegui `creaTrigger` una volta. Da domani: Presidente 7:41, Archivista 7:08, Flussi 8:15, Controllo (domenica) 8:07. Per provarne uno subito esegui `run_presidente` e guarda il foglio (collezione `esecuzioni`).
7. **Pubblica**: Distribuisci → Nuova distribuzione → tipo **App web** → Esegui come: **me** → Chi ha accesso: **Solo io** → Distribuisci. Copia l'URL `.../exec`. Aprilo: devi vedere il Gestionale con i tuoi dati.
8. **Sites**: nel tuo Google Sites: Inserisci → **Incorpora** → scheda **Per URL** → incolla l'URL `.../exec` → Inserisci → ridimensiona a tutta pagina → Pubblica. Con «Solo io» lo vedi solo tu loggato (giusto, sono dati finanziari). Per far vedere a Susi aggiungila come utente dello Sheet e cambia l'accesso in «Chiunque abbia un Account Google» solo se vuoi condividere i dati.
9. **Aggiornamenti della pagina**: modifica `gestionale-sorgente.html`, `cd apps-script && node build.js`, incolla il nuovo `index.html` e Distribuisci → Gestisci distribuzioni → nuova versione.

## Cosa è identico e cosa cambia rispetto a Claude
- Identico: tutte le schede, calcoli, drill-down, cerca, 90 giorni, Palla di neve, personaggio con occhi (umore, voce, scenari «e se…», aggiunge scadenze/segna pagato solo dopo il tuo tocco, annulla), esporta dati.
- Cambia: l'IA è OpenAI invece di Claude (le risposte possono differire; i costi sono sulla tua chiave OpenAI); gli agenti sono 4 giri semplici in Apps Script (Presidente, Archivista, Flussi, Controllo) al posto della rete di ~20 agenti Claude; le risposte reali dei vecchi agenti restano nello storico importato.
- Limite Apps Script: ogni esecuzione max 6 minuti; il foglio regge bene qualche migliaio di documenti (i movimenti sono 1 documento per mese).
- Regole non negoziabili nei prompt degli agenti: mai pagare/vendere/inviare mail da soli; Eurofood in ritardo = solo avviso.

## Se vuoi che lo faccia ChatGPT
Dagli questa cartella e questo prompt: «Guidami passo per passo nella `GUIDA-INSTALLAZIONE.md`. Non cambiare il codice senza dirmelo; se un passo dà errore, chiedimi il messaggio esatto e correggi Code.gs o shim.js.» Per modifiche alla pagina deve sempre ripartire da `gestionale-sorgente.html` e rigenerare con `build.js`.
