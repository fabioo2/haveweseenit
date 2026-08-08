/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** TMDB v4 API Read Access Token. Public once built — see README. */
  readonly VITE_TMDB_TOKEN: string
  /** Apps Script web app URL, ending in /exec. */
  readonly VITE_SCRIPT_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
