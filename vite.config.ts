import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // The path the site is served from, e.g. /<repo-name>/ on GitHub Pages.
  // The deploy workflow sets it; locally it defaults to the root.
  base: loadEnv(mode, process.cwd(), '').BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  build: {
    // The private list is lazy-loaded (see App.tsx), so a public-page visitor
    // skips it. What remains in the entry chunk is structural (react-dom,
    // Base UI, react-query), cached after the first visit.
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
