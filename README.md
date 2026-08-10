# Have We Seen It?

A movie and TV tracker for two people, backed by a Google Sheet.

<img width="505" height="700" alt="image" src="https://github.com/user-attachments/assets/14ff6071-c1f5-4a8e-9a58-acb2fda8811b" />

Live at <https://fabioo2.github.io/haveweseenit/>

## How it works

Static React site on GitHub Pages, with a Google Apps Script web app as the
only backend. The script is the sole thing that touches the spreadsheet, and it
runs as the sheet's owner — so the sheet itself stays private.

```
browser ──POST (text/plain)──> Apps Script /exec ──> Google Sheet
   ├────GET ?action=public──> Apps Script /exec ──> script properties
   └────GET──> TMDB (search + posters)
```

A shared passphrase doubles as the API token. It is stored in `localStorage`
per device and checked server-side by the script. Every action that reads or
writes the sheet requires it; the single exception is the public page below.

**One URL, two pages.** The same link behaves differently depending on whether
the browser has the passphrase stored:

| | What you get |
| --- | --- |
| No passphrase stored | The public page: the titles either of them rated 9+, and nothing else |
| Passphrase stored | The full private list — every entry, ratings, notes, watchlist |

There is no separate address to share. `?shared` exists only so someone who
*is* signed in can look at the public page; a stranger never needs it, and
signing in from such a link drops you into the app rather than the preview.

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
site. The TMDB token is a free personal key. The script URL grants exactly what
the public page shows and nothing more: anyone who digs it out of the bundle
can read the 9+ snapshot, which is already public by design, but every other
action needs the passphrase, and that is never in the bundle.

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
[`src/lib/sheets.ts`](src/lib/sheets.ts). The public read is a bare `GET` with
no headers, which is preflight-free for the same reason.

Every response carries `schema_version`. Saving the file, cutting a version and
deploying it are three separate steps, and skipping any one of them silently
serves the previous code — so one request answers "is the code I just pasted
actually live?".

## The public page

Anyone without the passphrase gets a read-only page instead of a login prompt.

**What qualifies:** a title that *either* of them rated **9 or higher**. Not
both — a strong opinion from one person is a recommendation, and requiring
agreement would publish almost nothing. The headline score is therefore the
*higher* of the two, not the average: on a page promising 9+, averaging a 9
with a 6 would print 7.5. Both scores are shown on the badges regardless, so a
disagreement stays visible rather than being averaged away.

**What is published** — built in `publicEntry()` as a literal whitelist, never
by deleting keys off a row, so a column added later cannot leak by default:

```
id, media_type, tmdb_id, title, year, poster_path,
fabio_rating, haemin_rating, original_language, genres
```

`notes` and `date_watched` are **never** sent. They are not hidden by the
client — they do not leave the server. Neither do watched flags, seasons, the
watchlist, or anything rated 8 or below.

**How it stays fresh:** the payload is a snapshot in two script properties
(`PUBLIC_SNAPSHOT`, `PUBLIC_SNAPSHOT_AT`), rebuilt as a side effect of either
of them loading the app — off rows already in memory, and written only when
the qualifying list actually changed. So a public request reads one property
and never opens the spreadsheet, which is what keeps anonymous traffic off the
sheet's quota. The cost is staleness: if neither of them opens the app for a
week, the page is a week old. Only data they already chose to publish can go
stale, so this is a tradeoff rather than a risk.

**Where the auth boundary is:** `action=public` is dispatched inside `doGet`
*before* `handle()` is called. Everything past `handle()`'s token check stays
authenticated by construction, rather than that check growing an exception to
reason about. The same action sent over `POST` falls through to the guard and
is refused. The guard is `!expected || token !== expected` — the `!expected`
half matters, because a bare `!==` would let `{"token": null}` through when the
`TOKEN` property is unset. A misconfiguration must fail closed.

To take the page down without touching the frontend, set `PUBLIC_MIN_RATING`
above 10 and deploy a new version; it goes empty on the next request.

### Sheet schema

Tab `watched`, created automatically on first run:

| Column | Notes |
| --- | --- |
| `id` | `m-27205` / `t-1396` — `{media_type initial}-{tmdb_id}` |
| `media_type` | `movie` or `tv` |
| `tmdb_id`, `title`, `year`, `poster_path` | denormalised from TMDB at add time |
| `date_watched` | `YYYY-MM-DD`, empty while on the watchlist |
| `fabio_watched`, `haemin_watched` | booleans |
| `fabio_rating`, `haemin_rating` | 1–10, or empty |
| `notes`, `added_at` | `added_at` is set by the script |
| `fabio_seasons`, `haemin_seasons` | `1,2,3` — seasons that person has seen; empty for a movie |
| `original_language` | ISO 639-1 from TMDB, e.g. `ko` |
| `genres` | `Drama,Thriller` — names, not TMDB ids, so a read needs no lookup |

New columns are only ever **appended**. `HEADERS` order *is* the sheet's column
order, so inserting one in the middle would shift every existing row's values
one column right. The script rewrites a short header row on the next request,
which is what makes adding a column a paste-and-deploy with no migration.

Combined rating is **derived, not stored** — the average of whichever ratings
exist. Storing it would let an edit leave a stale value behind.

An entry with both `watched` flags false is a watchlist item. For a series,
ticking any season marks that person watched; clearing them all puts it back on
the watchlist.

## Deploying

Push to `main`. The workflow builds and publishes to Pages.

Required repo settings:

- **Settings → Pages → Source: GitHub Actions**
- **Settings → Secrets and variables → Actions**
  - secret `VITE_TMDB_TOKEN`
  - variable `VITE_SCRIPT_URL`

`base` in [`vite.config.ts`](vite.config.ts) must match the repo name.
