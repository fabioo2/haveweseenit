import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Must match the GitHub Pages repo name, since the site is served from
  // https://<user>.github.io/haveweseenit/
  base: '/haveweseenit/',
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
})
