# Allineamento connettore "Ris 2.0" all'app R.I.S. (settembre 2026)

Base: `worker.js` di Drive `_sistema/` (modificato 28/09/2026). La patch va riportata lì; gate (172 test) e `pubblica.mjs` restano da eseguire in `_sistema/`.

## Cosa cambia (`worker-vacanze-entrate.patch`)
1. `EXPENSE_CATS`: tolta `'vacanze'`. Salvadanaio Vacanze fuori dalla spesa vera (era +345,60 → 5.209,68 invece di 4.864,08).
2. `computeEntrate`: escluse dalle entrate le categorie `vacanze`, `revolut`, `interno`, `investimento` (`CATEGORIE_NON_FLUSSO`); plusvalenze/P&L realizzato non più sommati (restano in `guadagnoInvestimenti`, solo informativo): titoli e dividendi stanno in Patrimonio.
3. `riepilogoPerCategoria`: scarta sempre le righe `vacanze` (spiega 2.970,33 = 3.720,33 − 750: gli stessi 345,60 contati come entrate).

## Test
`WORKER_JS=/percorso/worker.js node test-settembre-2026.mjs` — dati sintetici con i totali dello screenshot. Worker originale: FALLISCE (5.209,68). Con patch: uscite 4.864,08, entrate 2.599,73, entrate−uscite −2.264,35, nessuna riga Vacanze.

## NON verificato (servono i dati veri)
- Il test usa dati sintetici. Le entrate reali del connettore erano 5.450,87 "da lavoro": tolti i 345,60 Vacanze restano ~2.500 in più dell'app. Ipotesi: giroconti Revolut/interni (ora esclusi dalla patch). Da confrontare riga per riga con `dati-gestione-flussi-casa.json` prima di pubblicare.
- Esclusione di `revolut`/`interno` dalle entrate: scelta mia coerente col canone (spostamenti ≠ entrate); confermare con l'app.
- Punti 3 (giroconti, carte due facce, previsione di cassa), A (crash `Icons[item.icon]`, sta nel monolite HTML) e B–F/anomalie del brief: non toccati, il monolite e `collaudo/` non sono in questo repo.
