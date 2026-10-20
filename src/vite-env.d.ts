/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** TMDB v4 API read access token. */
  readonly VITE_TMDB_TOKEN: string
  /** Apps Script web app URL, ending in /exec. */
  readonly VITE_SCRIPT_URL: string
}
