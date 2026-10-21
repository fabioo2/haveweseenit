# Backend (Google Apps Script)

[`Code.gs`](Code.gs) is a Google Apps Script web app and the only thing that
reads or writes the spreadsheet. It runs as the sheet's owner, so the sheet
itself stays private.

```
browser ──POST (text/plain)──> Apps Script /exec ──> Google Sheet
   ├────GET ?action=public──> Apps Script /exec ──> script properties
   └────GET──> TMDB (search + posters)
```

## Setup and deploying changes

1. Create a standalone project at [script.google.com](https://script.google.com) and paste in `Code.gs`.
2. In **Project Settings → Script Properties**, add:
   - `TOKEN`: the shared passphrase
   - `SHEET_ID`: the spreadsheet's id, from its URL (`docs.google.com/spreadsheets/d/<id>/edit`)
3. Keep the spreadsheet's sharing set to *Restricted*; the script reads it as you.
4. **Deploy → New deployment → Web app**, executing as yourself, with access for anyone.

To update an existing deployment, use **Deploy → Manage deployments → Edit →
Version: New version**. "New deployment" creates a new URL and breaks
`VITE_SCRIPT_URL`. Every response includes `schema_version`, so you can check
that the version you just deployed is the one serving requests.

The script is standalone rather than bound to the sheet, so it needs the
`spreadsheets` scope instead of `spreadsheets.currentonly`.

## API

Apps Script can't answer CORS preflight requests, so the client only sends
"simple" requests: `POST` with `Content-Type: text/plain` and no custom
headers. The action and token travel in the JSON body.

| Action | Method | Auth |
| --- | --- | --- |
| `list`, `add`, `update`, `delete` | POST | Passphrase |
| `public` | GET | None |

## Authentication

The passphrase doubles as the API token. The client stores it in
`localStorage`, and the script compares it with the `TOKEN` script property on
every authenticated request. The check fails closed: if `TOKEN` is unset, every
request is rejected. If `SHEET_ID` is unset, authenticated requests return
`sheet_id_missing`. Authenticated actions are POST-only, so the passphrase
never appears in a URL.

## Public page

`GET ?action=public` returns the titles either person rated **9 or higher**.
It is served before the token check, and the response is built from an explicit
whitelist of fields:

```
id, media_type, tmdb_id, title, year, poster_path,
person1_rating, person2_rating, original_language, genres
```

Notes, watch dates, watched flags, seasons and the watchlist are never sent.

The payload is a snapshot stored in script properties (`PUBLIC_SNAPSHOT`,
`PUBLIC_SNAPSHOT_AT`). It is rebuilt whenever the private list is loaded, and
only written when it changes, so public requests never open the spreadsheet.
To take the page down, set `PUBLIC_MIN_RATING` above 10 and deploy a new version.

## Sheet schema

The `watched` tab is created on first run.

| Column | Notes |
| --- | --- |
| `id` | `m-27205` / `t-1396`: media type initial and TMDB id |
| `media_type` | `movie` or `tv` |
| `tmdb_id`, `title`, `year`, `poster_path` | Copied from TMDB when added |
| `date_watched` | `YYYY-MM-DD`; empty while on the watchlist |
| `person1_watched`, `person2_watched` | Booleans |
| `person1_rating`, `person2_rating` | 1–10, or empty |
| `notes` | Free text |
| `added_at` | Set by the script |
| `person1_seasons`, `person2_seasons` | e.g. `1,2,3`; empty for movies |
| `original_language` | ISO 639-1, e.g. `ko` |
| `genres` | e.g. `Drama,Thriller` |

New columns must be **appended**: `HEADERS` order is the column order, so
inserting a column would shift existing data. Text starting with `=`, `+`, `-`
or `@` is stored with a leading apostrophe so Sheets never treats it as a formula.
