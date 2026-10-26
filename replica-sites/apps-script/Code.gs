/** Gestionale Rossati su Google Apps Script.
 *  Database = foglio "db" di questo Google Sheet (colonne: collezione, id, json spezzato in celle).
 *  Intelligenza = API OpenAI (chiave in Impostazioni progetto > Proprietà script: OPENAI_API_KEY).
 *  Pubblica come Web app: Esegui come "me", accesso "Solo io" (i dati sono finanziari). */

var SHEET = 'db', CH = 40000;
var MODELLI = { quick: 'gpt-4o-mini', 'default': 'gpt-4o', complex: 'gpt-4o' };

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Gestionale Rossati')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------- database ---------- */
function sh_() {
  var ss = SpreadsheetApp.getActive(), s = ss.getSheetByName(SHEET);
  if (!s) { s = ss.insertSheet(SHEET); s.appendRow(['collezione', 'id', 'json...']); }
  return s;
}
function rows_() { var s = sh_(), n = s.getLastRow(); return n < 2 ? [] : s.getRange(2, 1, n - 1, s.getLastColumn()).getValues(); }
function join_(r) { var t = ''; for (var i = 2; i < r.length; i++) t += (r[i] === '' ? '' : String(r[i])); return t; }
function chunks_(json) { var o = []; for (var i = 0; i < json.length; i += CH) o.push(json.slice(i, i + CH)); return o.length ? o : ['{}']; }
function bump_() { var p = PropertiesService.getScriptProperties(), v = String(Date.now()); p.setProperty('VER', v); return v; }

function api(op, a, b, c, d) {
  if (op === 'ver') return PropertiesService.getScriptProperties().getProperty('VER') || '0';
  if (op === 'list') return list_(a);
  if (op === 'write') return write_(a, b, c, d);
  if (op === 'llm') return llm_(a);
  throw new Error('operazione sconosciuta');
}
function list_(col) {
  var o = {}; rows_().forEach(function (r) { if (r[0] === col) { try { o[r[1]] = JSON.parse(join_(r)); } catch (e) {} } });
  return o;
}
function write_(op, col, id, data) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = sh_(), n = s.getLastRow(), at = -1, cur = {};
    if (n >= 2) { var ks = s.getRange(2, 1, n - 1, 2).getValues(); for (var i = 0; i < ks.length; i++) if (ks[i][0] === col && ks[i][1] === id) { at = i + 2; break; } }
    if (at > 0 && op !== 'set' && op !== 'delete') { try { cur = JSON.parse(join_(s.getRange(at, 1, 1, s.getLastColumn()).getValues()[0])); } catch (e) {} }
    if (op === 'delete') { if (at > 0) s.deleteRow(at); return bump_(); }
    if (op === 'set') cur = data;
    else Object.keys(data).forEach(function (k) { setPath_(cur, k, data[k]); });
    var parts = chunks_(JSON.stringify(cur)), row = [col, id].concat(parts);
    if (at < 0) { at = Math.max(2, n + 1); }
    if (row.length > s.getMaxColumns()) s.insertColumnsAfter(s.getMaxColumns(), row.length - s.getMaxColumns());
    s.getRange(at, 1, 1, s.getMaxColumns()).clearContent();
    s.getRange(at, 1, 1, row.length).setValues([row]);
    return bump_();
  } finally { lock.releaseLock(); }
}
function setPath_(o, path, val) {
  var p = path.split('.'), c = o;
  for (var i = 0; i < p.length - 1; i++) { if (typeof c[p[i]] !== 'object' || c[p[i]] === null) c[p[i]] = {}; c = c[p[i]]; }
  if (val && val.__delete__) delete c[p[p.length - 1]]; else c[p[p.length - 1]] = val;
}

/** Eseguire UNA volta dall'editor: legge "gestionale-dati.json" dal Drive e riempie il foglio db. */
function importaDati() {
  var f = DriveApp.getFilesByName('gestionale-dati.json');
  if (!f.hasNext()) throw new Error('Carica gestionale-dati.json su Drive (la tua cartella principale) e rilancia.');
  var all = JSON.parse(f.next().getBlob().getDataAsString()), s = sh_(), out = [], maxc = 3;
  Object.keys(all).forEach(function (col) { Object.keys(all[col]).forEach(function (id) {
    var parts = chunks_(JSON.stringify(all[col][id])); maxc = Math.max(maxc, 2 + parts.length); out.push([col, id].concat(parts)); }); });
  s.clear(); s.appendRow(['collezione', 'id', 'json...']);
  if (maxc > s.getMaxColumns()) s.insertColumnsAfter(s.getMaxColumns(), maxc - s.getMaxColumns());
  out.forEach(function (r) { while (r.length < maxc) r.push(''); });
  if (out.length) s.getRange(2, 1, out.length, maxc).setValues(out);
  bump_(); Logger.log('Importati %s documenti', out.length);
}

/* ---------- LLM (proxy OpenAI) ---------- */
function llm_(req) {
  var key = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!key) throw new Error('Manca OPENAI_API_KEY nelle proprietà script');
  var body = { model: MODELLI[req.tier] || MODELLI.quick, messages: req.messages };
  if (req.tools && req.tools.length) body.tools = req.tools;
  var r = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', { method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + key }, payload: JSON.stringify(body), muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error(r.getResponseCode() + ' ' + r.getContentText().slice(0, 300));
  return JSON.parse(r.getContentText()).choices[0].message;
}

/* ---------- agenti (versione Apps Script) ----------
 * Ogni agente = una voce di AGENTI: legge il suo prompt da config/prompt-agenti (o dal testo qui sotto),
 * ha strumenti LIMITATI (leggere dati, cercare mail/Drive, scrivere solo in pratiche/bacheca/esecuzioni/eventi,
 * creare eventi in calendario). Non invia mail, non paga, non vende: la regola è nel prompt e negli strumenti. */
var AGENTI = {
  presidente: { ora: [7, 41], prompt: 'Sei il Presidente del Tavolo di Max (Massimiliano Rossati). Ogni mattina: leggi bacheca (messaggi da max a gestionale con stato "nuovo") e rispondi con un documento in bacheca (da:"gestionale", a:"max"); leggi eventi con tipo "personaggio" e stato "nuovo": per le nuove scadenze future crea l\'evento in calendario (cal_crea) e riconcilia i pagamenti registrati a mano con i movimenti, poi metti l\'evento in stato "preso". Controlla scadenze passate non pagate e rate non viste e aprile pratiche con domanda per Max. Eurofood in ritardo: solo avvisi, mai solleciti. Mai pagare, vendere o inviare mail: solo proporre a Max. Scrivi sempre un riepilogo in esecuzioni.' },
  archivista: { ora: [7, 8], prompt: 'Sei l\'Archivista: cerca nel Drive e nelle mail nuovi documenti (contratti, bollette, scontrini) e segnala in pratiche/bacheca cosa manca o è nuovo. Non spostare né cancellare file.' },
  flussi: { ora: [8, 15], prompt: 'Sei l\'Agente Flussi: confronta scadenze non pagate e movimenti recenti, riconcilia abbinamenti probabili (importo entro 1%) come pratica con domanda per Max. Non segnare pagato da solo.' },
  controllo: { ora: [8, 7], giorno: 'domenica', prompt: 'Sei il Controllo Cervello: ogni domenica verifica coerenza di config/memoria-fatti, scadenze senza motivo, agenti FALLITI. Scrivi un riepilogo in esecuzioni.' }
};
var PERMESSI = { scrivibili: ['pratiche', 'bacheca', 'esecuzioni', 'eventi', 'registro', 'richieste'] };

function eseguiAgente(id) {
  var ag = AGENTI[id]; if (!ag) throw new Error('agente sconosciuto');
  var memo = list_('config')['memoria-fatti'] || {};
  var sys = ag.prompt + '\n\nRegole della famiglia (memoria condivisa):\n' + (memo.regole || []).join('\n') + '\n\nOggi: ' + Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyy-MM-dd') +
    '. Rispondi in italiano. Alla fine scrivi un riepilogo.';
  var tools = [
    t_('db_list', 'Elenca i documenti di una collezione (id e dati)', { col: { type: 'string' } }, ['col']),
    t_('db_scrivi', 'Scrive (merge) un documento in una collezione consentita: pratiche, bacheca, esecuzioni, eventi, registro, richieste', { col: { type: 'string' }, id: { type: 'string' }, dati: { type: 'object' } }, ['col', 'id', 'dati']),
    t_('mail_cerca', 'Cerca nelle mail (sola lettura): restituisce mittente, oggetto, data, anteprima', { q: { type: 'string' } }, ['q']),
    t_('drive_cerca', 'Cerca file nel Drive per nome', { nome: { type: 'string' } }, ['nome']),
    t_('cal_lista', 'Eventi del calendario nei prossimi N giorni', { giorni: { type: 'number' } }, ['giorni']),
    t_('cal_crea', 'Crea un evento di calendario a giornata intera', { titolo: { type: 'string' }, data: { type: 'string' }, note: { type: 'string' } }, ['titolo', 'data'])
  ];
  var msgs = [{ role: 'system', content: sys }, { role: 'user', content: 'Fai il tuo giro adesso.' }], testo = '', esito = 'OK', n = 0;
  try {
    for (var r = 0; r < 12; r++) {
      var m = llm_({ messages: msgs, tools: tools, tier: 'default' });
      if (m.content) testo = m.content;
      if (!m.tool_calls || !m.tool_calls.length) break;
      msgs.push({ role: 'assistant', content: m.content || null, tool_calls: m.tool_calls });
      m.tool_calls.forEach(function (tc) { var out; try { out = tool_(tc.function.name, JSON.parse(tc.function.arguments || '{}')); n++; } catch (e) { out = 'Errore: ' + e.message; }
        msgs.push({ role: 'tool', tool_call_id: tc.id, content: typeof out === 'string' ? out : JSON.stringify(out).slice(0, 12000) }); });
    }
  } catch (e) { esito = 'FALLITO'; testo = String(e.message); }
  var oggi = Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyy-MM-dd');
  write_('set', 'esecuzioni', id + '-' + oggi + '-' + Date.now() % 100000, { agente: id, quando: new Date().toISOString(), esito: esito, riepilogo: String(testo).slice(0, 1500), passi: n });
}
function t_(name, description, props, req) { return { type: 'function', 'function': { name: name, description: description, parameters: { type: 'object', properties: props, required: req } } }; }
function tool_(name, a) {
  if (name === 'db_list') return list_(a.col);
  if (name === 'db_scrivi') { if (PERMESSI.scrivibili.indexOf(a.col) < 0) throw new Error('collezione non scrivibile dagli agenti'); write_('update', a.col, a.id, a.dati); return 'scritto'; }
  if (name === 'mail_cerca') return GmailApp.search(a.q, 0, 10).map(function (t) { var m = t.getMessages()[0]; return { da: m.getFrom(), oggetto: m.getSubject(), data: m.getDate(), anteprima: m.getPlainBody().slice(0, 300) }; });
  if (name === 'drive_cerca') { var it = DriveApp.searchFiles("title contains '" + String(a.nome).replace(/'/g, '') + "'"), o = []; while (it.hasNext() && o.length < 10) { var f = it.next(); o.push({ nome: f.getName(), url: f.getUrl(), data: f.getLastUpdated() }); } return o; }
  if (name === 'cal_lista') { var fine = new Date(Date.now() + (a.giorni || 7) * 864e5); return CalendarApp.getDefaultCalendar().getEvents(new Date(), fine).map(function (e) { return { titolo: e.getTitle(), data: e.getStartTime() }; }); }
  if (name === 'cal_crea') { var d = new Date(a.data + 'T12:00:00'); CalendarApp.getDefaultCalendar().createAllDayEvent(a.titolo, d, { description: a.note || '' }); return 'evento creato'; }
  throw new Error('strumento sconosciuto');
}
function run_presidente() { eseguiAgente('presidente'); }
function run_archivista() { eseguiAgente('archivista'); }
function run_flussi() { eseguiAgente('flussi'); }
function run_controllo() { if (new Date().getDay() === 0) eseguiAgente('controllo'); }

/** Eseguire UNA volta: crea i giri automatici giornalieri (ora italiana, fuso del progetto = Europe/Rome). */
function creaTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  [['run_presidente', 7, 41], ['run_archivista', 7, 8], ['run_flussi', 8, 15], ['run_controllo', 8, 7]].forEach(function (x) {
    ScriptApp.newTrigger(x[0]).timeBased().everyDays(1).atHour(x[1]).nearMinute(x[2]).create(); });
}
