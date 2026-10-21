/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** TMDB v4 API read access token. */
  readonly VITE_TMDB_TOKEN: string
  /** Apps Script web app URL, ending in /exec. */
  readonly VITE_SCRIPT_URL: string
  /** Display name for the first person. Defaults to "Person 1". */
  readonly VITE_PERSON_1_NAME?: string
  /** Display name for the second person. Defaults to "Person 2". */
  readonly VITE_PERSON_2_NAME?: string
}
