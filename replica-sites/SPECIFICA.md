# Gestionale Rossati: specifica per ricrearlo (ChatGPT / Google Sites)

Da dare a ChatGPT insieme al file `gestionale-sorgente.html` (la pagina completa, ~220 KB, è la fonte di verità: ogni calcolo, testo e colore è lì).

## 0. Cosa è replicabile e cosa no
Google Sites NON esegue JavaScript proprio: accetta solo "Incorpora → Codice incorporato" (iframe HTML/CSS/JS statico, niente database condiviso, niente login, niente chiamate a Claude).
- **Replicabile in Sites:** tutta l'interfaccia, i calcoli (saldo, 90 giorni, palla di neve, mese), le schede, il drill-down, le ricerche, il personaggio (senza intelligenza). Dati o incollati nel codice (JSON) o letti da un Google Sheet pubblicato (CSV).
- **NON replicabile in Sites:** salvataggio condiviso in tempo reale (db), il personaggio che parla con Claude e scrive, gli agenti automatici (Presidente, Archivista, ecc.), i download automatici. Alternative: Google Sheet + Apps Script (web app) come "database" e ChatGPT/Gemini al posto di Claude.
Consiglio: se vuoi la copia identica e funzionante, usare Apps Script web app o hosting statico + Firebase, non Sites puro.

## 1. Stile (tema scuro, arancio)
Font titoli Archivo, voce Source Serif 4. Colori: sfondo #0D1318, superficie #131B22, testo #E7ECEA, grigio #8B979F, linee #232E36, accento arancio #E3834F (solido #C4542A), allarme #E08276, ok #4FBCA1, attenzione #D6A63F. Card in vetro (sfondo rgba(32,38,45,.58), bordo rgba(255,255,255,.07)). Mobile-first, 16px di margine, nessuno scroll orizzontale. Importi in formato italiano `1.234,56 €`, date `15 dic 2026`.

## 2. Schede (barra di navigazione)
1. **Home**: saluto, frase di direzione + "mossa", blocco **Oggi** (cose da fare: guasti agenti, domande in attesa, scadenze passate non pagate, scadenze entro 7 giorni, promemoria entro 3 giorni, pratiche da ricontrollare, scadenze senza motivo, "mese chiuso: metti da parte X"), **Controllo del mese**, **Prossimi 90 giorni**, impegni, pagate di recente.
2. **Movimenti**: per mese; clic su categoria → elenco righe → dettaglio riga. Filtri anno/mese.
3. **Finanze**: mutui, prestiti, finanziamenti (rata, giorno, debito residuo, rate rimaste, tasso, nota). Ogni voce si apre.
4. **Palla di neve** (chiusura): piano di chiusura debiti in ordine (paypal-tecnosell, fineco-2, intesa, fineco-1, green-fv per tasso), cursore "E se metto da parte… €/mese" 50-1000, salvadanaio.
5. **Investimenti** (borsa): titoli, quote, costo, prezzo, per intestatario (Cristiano, Alessandro, Giulia, famiglia).
6. **Nota spese** Eurofood: mese, anticipato, stato (liquidata/da fare), match scontrini-movimenti.
7. **Tavolo**: pratiche aperte degli agenti con domanda a Max e opzioni; contributi.
Più: **Cerca** (scadenze, mutui, pratiche, memoria, movimenti anche per importo), A−/A+ per il testo.

## 3. Regole che non vanno perse
- Ogni scadenza/rata mostra sempre il **motivo** ("per cosa è"); se manca: "Motivo non indicato" e compare in "senza motivo".
- Ogni totale mostra di cosa è fatto; ogni riga si apre (drill-down ovunque).
- Il saldo R3 da 7.200 € è coperto da titoli in borsa, non dal fido: non tocca il conto nei 90 giorni (campo `copertura`).
- Eurofood in ritardo: solo avviso, mai solleciti.
- Nessun pagamento/vendita/invio automatico: solo Max conferma.
- Timeline 90 giorni: parte dal saldo Fineco di oggi, aggiunge stipendi tipici (Eurofood giorno 30, Crisby giorno 20, mediana degli ultimi 6) e "altre entrate tipiche" (giorno 15), toglie scadenze non pagate, rate certe (prossime 4, senza doppioni con scadenze di pari importo ±0,02) e spesa viva giornaliera (mediana/30). Punto più basso + fido libero (fido 14.000 €).
- Impegni passati non pagati = allarme; pagata senza movimento collegato = "da guardare".
- Mese: risultato stimato = entrate − uscite fatte − impegni rimasti − spesa viva × giorni rimasti. Accantonamento = floor(max(0, entrate+rimborsi−uscite)/10)*10 quando il mese precedente è completo.

## 4. Modello dati (collezioni → campi)
- `movimenti/AAAA-MM` → `righe[]`: `d` data, `i` importo (− uscita), `t` descrizione, `k` categoria, `c` conto (F=Fineco, G=Carta Gold…), `s` stato ("c" contabile, "a" escluso), `y` tipo (`spesa_vera`, `entrata`, `investimento`, `dc`…).
- `scadenze/<id>`: `nome`, `data` AAAA-MM-GG, `importo`, `chi` (Massimiliano, Susi, Cristiano, Alessandro, Giulia, Casa), `motivo`, `pagata`, `pagataIl`, `importoPagato`, `modalita` (Fineco, Carta Gold, Revolut, Contanti, Bonifico da altro conto, Altro), `conto`, `mov` (chiave movimento collegato `data|importo*100|descr40`), `movData`, `copertura {fonte, importo, stato}`, `azione`, `da`.
- `finanziamenti/<id>`: `nome`, `attivo`, `capitale`, `debito`, `rata`, `giorno`, `firmato`, `rateTotali`, `ratePagateMovimenti`, `nota`.
- `config`: `cassa {data, saldo, fido}`, `piano-rate {ordine[], tassi{}, versamenti{AAAA-MM:€}, scenari[]}`, `casa` (schede), `memoria-fatti {fatti[], regole[]}`.
- `borsa/<chi>`: `righe[] {titolo, isin, quote, costo, prezzo, quoteVendita, prezzoVendita, incasso, chi}`.
- `notaspese/AAAA-MM`: `mese`, `anticipato`, `stato`.
- `pratiche/<id>`: `titolo`, `argomento`, `stato` (in_attesa_max, in_attesa_esterno, chiusa), `sintesi`, `controllaIl`, `contributi[] {agente, testo, confidenza, fonte, proposta, quando}`, `domanda {testo, opzioni[{label, azioni[]}]}`.
- `agenti`, `esecuzioni {agente, quando, esito OK|PARZIALE|FALLITO}`, `bacheca` (messaggi Max↔Presidente: da, a, testo, quando, stato), `registro`, `eventi`.
Dati di esempio: esportare dal Gestionale reale (non inclusi qui per riservatezza).

## 5. Il personaggio (mascotte "il Gestionale con gli occhi")
Cerchio arancio 62px in basso a destra, sempre presente: occhi che seguono il mouse, sbattono le palpebre ogni ~5 s, ondeggia; sopracciglia+bocca triste se ci sono guasti, sorriso se tutto ok; pallino di avviso. Parla da solo con un fumetto (benvenuto giornaliero, lunedì "mossa della settimana", nuove risposte del Presidente). Clic → chat con: chip rapidi, "pensa di più", dettato vocale, lettura risposte, allegato foto, contatore token.
Con un LLM (in Sites non c'è): strumenti `cerca`, `apri(scheda, voce)`, `aggiungi_scadenza`, `segna_pagata(id, modalità F/G/R/C/B/X)`, `registra_pagamento`, `ricorda`, `promemoria`, `scenario` (calcola i 90 giorni con spese/entrate/vendite extra), `proponi_motivo`, `proponi_messaggio`. **Mai scrive da solo**: mostra un riquadro con Conferma/No e poi "✓ Fatto + Annulla". Istruzioni di sistema complete nel sorgente (`MASC_INSTR`).

## 6. Prompt pronto per ChatGPT
"Ricrea l'app allegata (`gestionale-sorgente.html`) come pagina da incorporare in Google Sites. Vincoli: un solo file HTML/CSS/JS senza dipendenze esterne tranne i font Google; dati in un oggetto JSON in cima al file (struttura in SPECIFICA.md §4) oppure letti da un Google Sheet pubblicato in CSV; stessi colori, schede, calcoli e regole di SPECIFICA.md. Al posto di database e Claude: lettura sola, e il personaggio risponde con ricerca locale sui dati. Mantieni testi in italiano, importi `1.234,56 €`, mobile-first. Spiega i passi per incorporarlo (Inserisci → Incorpora → Codice incorporato) e dimmi cosa non funziona in Sites."
