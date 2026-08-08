# Have We Seen It?

A movie-watch tracker for two people, backed by a Google Sheet.

Live at <https://fabioo2.github.io/haveweseenit/>

## How it works

Static React site on GitHub Pages, with a Google Apps Script web app as the
only backend. The script is the sole thing that touches the spreadsheet, and it
runs as the sheet's owner — so the sheet itself stays private.

```
browser ──POST (text/plain)──> Apps Script /exec ──> Google Sheet
   └────GET──> TMDB (search + posters)
```

A shared passphrase doubles as the API token. It is stored in `localStorage`
per device and checked server-side by the script; without it, every request is
rejected, so the list never loads for anyone who happens to find the URL.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill both values
npm run dev
```

| Variable | What it is |
| --- | --- |
| `VITE_TMDB_TOKEN` | TMDB "API Read Access Token" (the long `eyJ…` v4 bearer token) |
| `VITE_SCRIPT_URL` | Apps Script web app URL, ending in `/exec` |

Both end up readable in the built bundle — that's unavoidable for a static
site. Neither is worth much on its own: the TMDB token is a free personal key,
and the script URL is useless without the passphrase, which is never in the
bundle.

## The backend

[`apps-script/Code.gs`](apps-script/Code.gs) is the source of truth. It is a
**standalone** script (not container-bound) that opens the sheet by id, so it
needs the broad `spreadsheets` scope — the container-bound flow, which allows
the narrower `spreadsheets.currentonly`, only works for Chrome's default Google
account.

To change it: paste into the Apps Script editor, save, then
**Deploy → Manage deployments → edit → Version: New version**. Using "New
deployment" instead would mint a new URL and break `VITE_SCRIPT_URL`.

The script cannot answer CORS preflight requests, so every call from the client
must stay a *simple request*: `POST` with `Content-Type: text/plain`, no custom
headers, action and token inside the JSON body. See
[`src/lib/sheets.ts`](src/lib/sheets.ts).

### Sheet schema

Tab `watched`, created automatically on first run:

| Column | Notes |
| --- | --- |
| `id` | `m-27205` — `{media_type initial}-{tmdb_id}` |
| `media_type` | `movie` today; `tv` slots in here later with no migration |
| `tmdb_id`, `title`, `year`, `poster_path` | denormalised from TMDB at add time |
| `date_watched` | `YYYY-MM-DD`, empty while on the watchlist |
| `fabio_watched`, `haemin_watched` | booleans |
| `fabio_rating`, `haemin_rating` | 1–10, or empty |
| `notes`, `added_at` | `added_at` is set by the script |

Combined rating is **derived, not stored** — the average of whichever ratings
exist. Storing it would let an edit leave a stale value behind.

An entry with both `watched` flags false is a watchlist item.

## Deploying

Push to `main`. The workflow builds and publishes to Pages.

Required repo settings:

- **Settings → Pages → Source: GitHub Actions**
- **Settings → Secrets and variables → Actions**
  - secret `VITE_TMDB_TOKEN`
  - variable `VITE_SCRIPT_URL`

`base` in [`vite.config.ts`](vite.config.ts) must match the repo name.
