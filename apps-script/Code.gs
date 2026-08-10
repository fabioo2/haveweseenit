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

/**
 * Bump on any change to HEADERS or the wire format. Echoed in every response,
 * including the unauthorized one, so a single request can answer "is the code I
 * just pasted actually the code that is live?" - saving the file, creating a
 * new version and deploying it are three separate steps, and skipping any one
 * of them fails silently by serving the previous version.
 */
var SCHEMA_VERSION = 3;

/**
 * The public "top picks" page. A title qualifies when EITHER person rated it
 * at least this high - a strong opinion from one of them is a recommendation,
 * and requiring both to have seen it would publish almost nothing.
 */
var PUBLIC_MIN_RATING = 9;

/** Guards the 9KB-per-property limit. Nowhere near binding at current size. */
var PUBLIC_MAX_ENTRIES = 30;

var PUBLIC_SNAPSHOT_KEY = 'PUBLIC_SNAPSHOT';
var PUBLIC_SNAPSHOT_AT_KEY = 'PUBLIC_SNAPSHOT_AT';

/**
 * Column order is the sheet's column order, so new fields are only ever
 * APPENDED. Inserting one in the middle would silently shift every existing
 * row's values one column to the right.
 */
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
  'added_at',
  'fabio_seasons',
  'haemin_seasons',
  'original_language',
  'genres'
];

var cachedSpreadsheet = null;
var cachedSheet = null;
var cachedTimeZone = null;

function doGet(e) {
  var params = (e && e.parameter) || {};

  // The one unauthenticated action, dispatched here rather than inside
  // handle(): everything past handle()'s token guard stays authenticated by
  // construction, instead of the guard growing an exception to reason about.
  // It reads a script property and never opens the spreadsheet, which is what
  // keeps anonymous traffic cheap. GET-only - a POST of the same action falls
  // through to the guard and is rejected, which is the correct fail-closed
  // answer for an action that never needs to be a POST.
  if (params.action === 'public') {
    return json(publicSnapshot());
  }

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
        var entries = listEntries();
        // The public page is refreshed as a side effect of either of them
        // opening the app, off rows already in memory. Never at the expense of
        // the private app: a Properties failure here must not fail the load.
        try {
          syncPublicSnapshot(entries);
        } catch (err) {
          // Deliberately swallowed - see above.
        }
        return json({ ok: true, entries: entries });
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

/**
 * Cached per execution: the header check below costs a read, and findRow /
 * listEntries / updateEntry each ask for the sheet within one request.
 */
function sheet() {
  if (cachedSheet) return cachedSheet;

  var ss = spreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  // A sheet created before a field was added is narrower than HEADERS, and
  // writing past the last column throws rather than growing the grid.
  var missing = HEADERS.length - sh.getMaxColumns();
  if (missing > 0) sh.insertColumnsAfter(sh.getMaxColumns(), missing);

  if (sh.getLastRow() === 0) {
    writeHeaderRow(sh);
    sh.setFrozenRows(1);
  } else if (!headerRowMatches(sh)) {
    // Safe precisely because columns are only ever appended: the existing rows
    // still line up, they just have empty cells under the new names.
    writeHeaderRow(sh);
  }

  cachedSheet = sh;
  return sh;
}

function writeHeaderRow(sh) {
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
}

function headerRowMatches(sh) {
  var current = sh.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  for (var i = 0; i < HEADERS.length; i++) {
    if (String(current[i]) !== HEADERS[i]) return false;
  }
  return true;
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

/* ---------- public snapshot ---------- */

/**
 * The payload served to anyone without the passphrase. Falls back to an empty
 * shelf rather than an error: a stranger should never meet a stack trace, and
 * "no snapshot yet" is a legitimate state until one of them next opens the app.
 */
function publicSnapshot() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty(PUBLIC_SNAPSHOT_KEY);
  var entries = [];

  if (raw) {
    try {
      entries = JSON.parse(raw);
    } catch (err) {
      entries = [];
    }
  }

  return {
    ok: true,
    generated_at: props.getProperty(PUBLIC_SNAPSHOT_AT_KEY) || '',
    entries: entries
  };
}

/**
 * Rebuilds the snapshot and stores it only when it actually changed, so a
 * normal page load costs a property read and nothing else.
 */
function syncPublicSnapshot(entries) {
  var next = JSON.stringify(buildPublicEntries(entries));
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(PUBLIC_SNAPSHOT_KEY) === next) return;

  props.setProperties({
    PUBLIC_SNAPSHOT: next,
    PUBLIC_SNAPSHOT_AT: new Date().toISOString()
  });
}

function buildPublicEntries(entries) {
  var picked = [];

  for (var i = 0; i < entries.length; i++) {
    if (qualifies(entries[i])) picked.push(publicEntry(entries[i]));
  }

  // By the score that earned the title its place, then by how well the other
  // one took it. Sorting on the average instead would rank a 9/6 below an 8/8
  // that does not belong on the page at all.
  picked.sort(function (a, b) {
    if (bestRating(a) !== bestRating(b)) return bestRating(b) - bestRating(a);
    if (averageRating(a) !== averageRating(b)) {
      return averageRating(b) - averageRating(a);
    }
    return String(a.title).localeCompare(String(b.title));
  });

  return picked.slice(0, PUBLIC_MAX_ENTRIES);
}

function qualifies(entry) {
  return bestRating(entry) >= PUBLIC_MIN_RATING;
}

function ratings(entry) {
  var given = [];
  if (entry.fabio_rating !== null) given.push(entry.fabio_rating);
  if (entry.haemin_rating !== null) given.push(entry.haemin_rating);
  return given;
}

function bestRating(entry) {
  var given = ratings(entry);
  var best = 0;
  for (var i = 0; i < given.length; i++) {
    if (given[i] > best) best = given[i];
  }
  return best;
}

function averageRating(entry) {
  var given = ratings(entry);
  if (!given.length) return 0;

  var total = 0;
  for (var i = 0; i < given.length; i++) total += given[i];
  return total / given.length;
}

/**
 * Built as a literal whitelist, never by deleting keys off a row: a column
 * added later must not become public merely because nobody remembered to
 * exclude it. Notes and watch dates are the two that must never appear here -
 * they are written in the expectation that only the two of them will read them.
 */
function publicEntry(entry) {
  return {
    id: entry.id,
    media_type: entry.media_type,
    tmdb_id: entry.tmdb_id,
    title: entry.title,
    year: entry.year,
    poster_path: entry.poster_path,
    fabio_rating: entry.fabio_rating,
    haemin_rating: entry.haemin_rating,
    original_language: entry.original_language,
    genres: entry.genres
  };
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
    // A season array collapses to "1,2,3". A single season lands in the cell as
    // the number 1, which seasonList() reads back just as happily.
    if (Array.isArray(value)) value = value.join(',');
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
  var mediaType = text(entry.media_type) || 'movie';

  return {
    id: text(entry.id),
    media_type: mediaType,
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
      : String(entry.added_at || ''),
    // Only a series has seasons. Dropping them for a movie keeps a stray value
    // from surviving in a column nothing on the client would ever show.
    fabio_seasons: mediaType === 'tv' ? seasonList(entry.fabio_seasons) : [],
    haemin_seasons: mediaType === 'tv' ? seasonList(entry.haemin_seasons) : [],
    // ISO 639-1 from TMDB. Empty for rows added before the column existed, and
    // the client renders those as "Unknown" rather than guessing English.
    original_language: text(entry.original_language).toLowerCase(),
    // Names, not TMDB's ids, so a read never needs the genre lookup tables and
    // the sheet stays readable if either of you opens it directly.
    genres: stringList(entry.genres)
  };
}

/** "Drama,Thriller" or the array the client patches with, either way a clean array. */
function stringList(value) {
  if (value === null || value === undefined || value === '') return [];

  var raw = Array.isArray(value) ? value : String(value).split(',');
  var names = [];

  for (var i = 0; i < raw.length; i++) {
    var name = String(raw[i]).trim();
    // indexOf rather than a {} used as a set: an inherited Object.prototype key
    // would make a genre literally named "constructor" dedupe itself away.
    if (!name || names.indexOf(name) >= 0) continue;
    names.push(name);
  }
  return names;
}

/**
 * Accepts what any of the three callers hand over: a "1,2,3" cell, a bare
 * number when only one season is stored, or the array the client patches with.
 * Always returns a sorted, deduped array of whole seasons from 1 up, so the
 * client can compare two of these index by index.
 */
function seasonList(value) {
  if (value === null || value === undefined || value === '') return [];

  var raw = Array.isArray(value) ? value : String(value).split(',');
  var seasons = [];

  for (var i = 0; i < raw.length; i++) {
    var n = Number(String(raw[i]).trim());
    if (!isFinite(n) || n < 1 || Math.floor(n) !== n) continue;
    if (seasons.indexOf(n) >= 0) continue;
    seasons.push(n);
  }

  seasons.sort(function (a, b) {
    return a - b;
  });
  return seasons;
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
  payload.schema_version = SCHEMA_VERSION;
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
