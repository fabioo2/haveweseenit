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
    // ~175 kB gzipped, cached after the first visit, and the weight is
    // structural (react-dom, Base UI, react-query, cmdk). Splitting it would
    // add loading states to a two-person app for no felt gain.
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
