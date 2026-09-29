# Allineamento connettore "Ris 2.0" all'app R.I.S. (settembre 2026)

Base: `worker.js` di Drive `_sistema/` (modificato 28/09/2026). La patch va riportata lì; gate (172 test) e `pubblica.mjs` restano da eseguire in `_sistema/`.

## Cosa cambia (`worker-vacanze-entrate.patch`, applicabile con `patch worker.js < ...`)
1. `EXPENSE_CATS`: tolta `'vacanze'`. Salvadanaio Vacanze fuori dalla spesa vera (+345,60 → 5.222,65 invece di 4.877,05 sui dati reali).
2. `computeEntrate`: causa vera delle entrate 9.310,86. La cartella Entrate ha righe ma nessuna di settembre, quindi il worker cadeva sulle **entrate fisse dell'anagrafica** (3.320,87+1.300+430+400 = 5.450,87) e sommava le plusvalenze (3.859,99). Ora: righe della cartella Entrate del mese → altrimenti accrediti dei Movimenti → altrimenti fisse. Esclusi vacanze, revolut, interno, investimento e i movimenti sul conto Revolut; P&L realizzato non sommato (resta in `guadagnoInvestimenti`, solo informativo).
3. `riepilogoPerCategoria`: scarta sempre le righe `vacanze` (spiega 2.970,33 = 3.720,33 − 750).

## Verifica sui dati REALI (`dati-gestione-flussi-casa.json`, salvato 28/09 13:06; letto solo in scratch, non nel repo)
| | worker originale | worker patchato | app (telefono) |
|---|---|---|---|
| Entrate settembre | 9.310,86 | **2.599,73** ✔ | 2.599,73 |
| Spesa vera | 5.222,65 | 4.877,05 | 4.864,08 |
| Vacanze fra le spese | 345,60 | assente ✔ | assente |

Le entrate tornano al centesimo: 2.624,73 di accrediti sui Movimenti meno 25 di "Pagamento da parte di" sulla tasca Revolut.
Resta uno scarto di **12,97 sulla spesa vera** (4.877,05 = lo stesso numero della build precedente sul PC, quindi è la copia dati del 28/09). Sospetto: righe doppie tra "autorizzata" e "contabilizzata" — nel mese ci sono due righe spusu da 5,98 (una `abbonamento`, una `bolletta`) e due Netflix da 6,99, e 5,98 + 6,99 = 12,97. Da confermare sulla copia dati del telefono prima di toccare la logica dei doppioni.

## Test
`WORKER_JS=/percorso/worker.js node test-settembre-2026.mjs` — dati sintetici con i totali dello screenshot. Worker originale: FALLISCE (5.209,68). Con patch: uscite 4.864,08, entrate 2.599,73, entrate−uscite −2.264,35, nessuna riga Vacanze.

## Ancora aperto
- Gate da 172 test e `pubblica.mjs` in `_sistema/` (non in questo repo).
- Scarto 12,97 sulla spesa vera (sopra).
- Crash `Icons[item.icon]` (punto A) e voci B–F: nel monolite HTML, non disponibile qui.
- Punto 3 (giroconti, carte due facce, previsione di cassa) non confrontato riga per riga.
