/**
 * Have We Seen It? - Google Sheets backend
 *
 * Standalone script (not container-bound), so it opens the sheet by id. This
 * is why it needs the broad spreadsheets scope rather than currentonly: the
 * bound-script flow only works for Chrome's default Google account.
 *
 * Deploy: script.google.com > New project, paste this file, then
 *   Deploy > New deployment > Web app
 *   Execute as: Me     Who has access: Anyone
 *
 * Set the shared passphrase in Project Settings > Script Properties:
 *   TOKEN = <your passphrase>
 *
 * Notes on CORS: Apps Script cannot answer preflight OPTIONS requests, so the
 * client must send "simple" requests only: POST with Content-Type
 * text/plain;charset=utf-8 and no custom headers. The auth token and action
 * therefore travel inside the JSON body, never in a header.
 */

var SHEET_ID = '1hfmQVmX64QszxBXAWrvr97vHJVJ3738hJTOUUkmQNDs';
var SHEET_NAME = 'watched';

var HEADERS = [
  'id',
  'media_type',
  'tmdb_id',
  'title',
  'year',
  'poster_path',
  'date_watched',
  'fabio_watched',
  'haemin_watched',
  'fabio_rating',
  'haemin_rating',
  'notes',
  'added_at'
];

var cachedSpreadsheet = null;
var cachedTimeZone = null;

function doGet(e) {
  var params = (e && e.parameter) || {};

  // Reads only over GET. Allowing mutations here would mean the passphrase
  // travelling in a URL, and so into browser history and proxy logs.
  if (params.action && params.action !== 'list') {
    return json({ ok: false, error: 'post_required' });
  }
  return handle('list', params, params.token);
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'bad_json' });
  }
  return handle(body.action, body, body.token);
}

function handle(action, payload, token) {
  var expected = scriptToken();

  // The !expected guard matters: with the property unset, scriptToken() returns
  // null and a caller sending {"token": null} would pass a bare !== check,
  // because null !== null is false. A misconfiguration must fail closed.
  if (!expected || token !== expected) {
    return json({ ok: false, error: 'unauthorized' });
  }

  try {
    switch (action) {
      case 'list':
        return json({ ok: true, entries: listEntries() });
      case 'add':
        return json({ ok: true, entry: addEntry(payload.entry) });
      case 'update':
        return json({ ok: true, entry: updateEntry(payload.id, payload.patch) });
      case 'delete':
        deleteEntry(payload.id);
        return json({ ok: true });
      default:
        return json({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json({ ok: false, error: String((err && err.message) || err) });
  }
}

/* ---------- storage ---------- */

function spreadsheet() {
  if (!cachedSpreadsheet) {
    cachedSpreadsheet = SpreadsheetApp.openById(SHEET_ID);
  }
  return cachedSpreadsheet;
}

/**
 * Sheets stores a date at midnight in the SPREADSHEET's zone, not the script's,
 * so reads must be formatted in that same zone. Formatting in a fixed zone one
 * side or the other silently shifts every date by a day - and since updates
 * read-modify-write, the shift would compound on every save.
 */
function sheetTimeZone() {
  if (!cachedTimeZone) {
    cachedTimeZone = spreadsheet().getSpreadsheetTimeZone();
  }
  return cachedTimeZone;
}

function sheet() {
  var ss = spreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function listEntries() {
  var sh = sheet();
  if (sh.getLastRow() < 2) return [];

  var values = sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues();
  var entries = [];

  for (var i = 0; i < values.length; i++) {
    if (!values[i][0]) continue;
    entries.push(rowToEntry(values[i]));
  }
  return entries;
}

function addEntry(entry) {
  if (!entry || !entry.id) throw new Error('missing_id');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (findRow(entry.id) > 0) throw new Error('duplicate_id');

    var record = normalize(entry);
    record.added_at = new Date().toISOString();

    sheet().appendRow(entryToRow(record));
    return record;
  } finally {
    lock.releaseLock();
  }
}

function updateEntry(id, patch) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var row = findRow(id);
    if (row < 0) throw new Error('not_found');

    var sh = sheet();
    var current = rowToEntry(sh.getRange(row, 1, 1, HEADERS.length).getValues()[0]);

    for (var key in patch) {
      if (key === 'id' || key === 'added_at') continue;
      if (HEADERS.indexOf(key) >= 0) current[key] = patch[key];
    }

    var record = normalize(current);
    sh.getRange(row, 1, 1, HEADERS.length).setValues([entryToRow(record)]);
    return record;
  } finally {
    lock.releaseLock();
  }
}

function deleteEntry(id) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var row = findRow(id);
    if (row < 0) throw new Error('not_found');
    sheet().deleteRow(row);
  } finally {
    lock.releaseLock();
  }
}

/* ---------- helpers ---------- */

function scriptToken() {
  return PropertiesService.getScriptProperties().getProperty('TOKEN');
}

/** Returns the 1-based sheet row for an id, or -1. */
function findRow(id) {
  var sh = sheet();
  if (sh.getLastRow() < 2) return -1;

  var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function rowToEntry(row) {
  var entry = {};
  for (var i = 0; i < HEADERS.length; i++) {
    var value = row[i];
    entry[HEADERS[i]] = typeof value === 'string' ? unescapeFormula(value) : value;
  }
  return normalize(entry);
}

function entryToRow(entry) {
  var row = [];
  for (var i = 0; i < HEADERS.length; i++) {
    var value = entry[HEADERS[i]];
    if (value === null || value === undefined) value = '';
    row.push(typeof value === 'string' ? escapeFormula(value) : value);
  }
  return row;
}

/**
 * A cell whose value begins with = or + becomes a live formula in the owner's
 * sheet, which is a data-exfiltration route (IMPORTXML and friends) via any
 * string we did not author - a TMDB title, or a note. The apostrophe marks the
 * cell as text.
 *
 * Escape on write and unescape on read, so the marker never reaches the client:
 * Sheets keeps the apostrophe in the stored value rather than stripping it, and
 * "+1" is a real film title.
 */
function escapeFormula(value) {
  return /^[=+]/.test(value) ? "'" + value : value;
}

function unescapeFormula(value) {
  return /^'[=+]/.test(value) ? value.slice(1) : value;
}

/** Coerces sheet values (which come back as Date/number/string) into stable JSON types. */
function normalize(entry) {
  return {
    id: text(entry.id),
    media_type: text(entry.media_type) || 'movie',
    tmdb_id: num(entry.tmdb_id),
    title: text(entry.title),
    year: num(entry.year),
    poster_path: text(entry.poster_path),
    date_watched: dateString(entry.date_watched),
    fabio_watched: bool(entry.fabio_watched),
    haemin_watched: bool(entry.haemin_watched),
    fabio_rating: num(entry.fabio_rating),
    haemin_rating: num(entry.haemin_rating),
    notes: text(entry.notes),
    added_at: isDate(entry.added_at)
      ? entry.added_at.toISOString()
      : String(entry.added_at || '')
  };
}

function text(value) {
  return value === null || value === undefined ? '' : String(value);
}

function num(value) {
  if (value === '' || value === null || value === undefined) return null;
  var n = Number(value);
  return isNaN(n) ? null : n;
}

function bool(value) {
  return value === true || value === 'TRUE' || value === 'true';
}

/**
 * Values handed back by the Sheets service do not reliably pass `instanceof
 * Date`, so check the internal class instead. Getting this wrong silently
 * turns a date into its display string on the update path.
 */
function isDate(value) {
  return Object.prototype.toString.call(value) === '[object Date]' &&
    !isNaN(value.getTime());
}

/** Sheets may hand back a Date object for date_watched; we always store YYYY-MM-DD. */
function dateString(value) {
  if (!value) return '';
  if (isDate(value)) {
    return Utilities.formatDate(value, sheetTimeZone(), 'yyyy-MM-dd');
  }
  return String(value).slice(0, 10);
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
