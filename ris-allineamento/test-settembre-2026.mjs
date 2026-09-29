// Test di accettazione: settembre 2026 nel connettore = app.
// Uso: WORKER_JS=/percorso/worker.js node test-settembre-2026.mjs   (default: ./worker.js)
// Dati SINTETICI che riproducono i totali dello screenshot dell'app del 29/09/2026 (nessun dato reale).
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const { eseguiToolVoce } = await import(pathToFileURL(path.resolve(process.env.WORKER_JS || './worker.js')).href);

let n = 0;
const mov = (data, descrizione, importo, categoria, extra = {}) =>
  ({ id: 'm' + (++n), data, descrizione, importo, categoria, conto: 'fineco', ...extra });
const movements = [
  // entrate vere: 2.599,73
  mov('2026-09-01', 'STIPENDIO CRISBY BANCA CREDITO COOP', 1487, 'spesa'),
  mov('2026-09-05', 'Bonifico in entrata', 456.40, 'altro'),
  mov('2026-09-08', 'Bonifico in entrata', 400, 'altro'),
  mov('2026-09-10', 'Bonifico in entrata', 200, 'altro'),
  mov('2026-09-12', 'Rimborso Libraccio', 52.38, 'altro'),
  mov('2026-09-15', 'Sconto canone', 3.95, 'altro'),
  // salvadanaio Vacanze: 53 coppie uscita+entrata, totale 345,60 (fuori da spesa ed entrate)
  ...Array.from({ length: 53 }, (_, i) => {
    const v = i < 52 ? 6.52 : 6.56; // 52*6.52 + 6.56 = 345.60
    const d = '2026-09-' + String((i % 26) + 1).padStart(2, '0');
    return [mov(d, 'Accredita EUR Vacanze da EUR', -v, 'vacanze'), mov(d, 'Accredita EUR Vacanze da EUR', v, 'vacanze')];
  }).flat(),
  // spesa vera: 4.864,08
  mov('2026-09-02', 'MIGROS', -1500, 'spesa'),
  mov('2026-09-03', 'Rata mutuo', -1249.98, 'mutuo'),
  mov('2026-09-04', 'Addebito carta', -1349.83, 'carta'),
  mov('2026-09-06', 'Utenze', -764.27, 'bolletta'),
  // non sono flussi: giroconto Revolut, titoli
  mov('2026-09-11', 'Giroconto Revolut', -500, 'revolut'),
  mov('2026-09-12', 'Dividendo', 120, 'investimento'),
  // tap carta di credito: non è spesa vera (seconda faccia)
  mov('2026-09-20', 'Tap Avis', -324.82, 'trasporti', { cartaCredito: true }),
];
const data = {
  period: { mese: 9, anno: 2026 }, movements, entrateMovements: [], incomes: {}, extraEntrate: [],
  plRealizzato: [{ data: '2026-09-09', fonte: 'fineco', pl: 3859.99 }], // plusvalenze: Patrimonio, non Entrate
};
const r2 = (x) => Math.round(x * 100) / 100;

const sit = await eseguiToolVoce('leggiSituazioneFinanziaria', {}, data);
assert.equal(r2(sit.canone.spesaVera), 4864.08, 'uscite (spesa vera)');
assert.equal(r2(sit.uscitePeriodo), 4864.08, 'uscitePeriodo');
assert.equal(r2(sit.entrateDelPeriodo), 2599.73, 'entrate');
assert.equal(r2(sit.canone.dopoLaSpesaVera), -2264.35, 'entrate meno uscite');
assert.ok(!('vacanze' in sit.speseSuddiviseXCategoria), 'nessuna riga Vacanze fra le spese');

const rie = await eseguiToolVoce('riepilogoPerCategoria', { mese: 9, anno: 2026 }, data);
const p = JSON.stringify(rie);
assert.ok(!/vacanze/i.test(p), 'nessuna riga Vacanze nel riepilogo per categoria');
console.log('OK: uscite 4.864,08 · entrate 2.599,73 · entrate-uscite -2.264,35 · niente Vacanze');
