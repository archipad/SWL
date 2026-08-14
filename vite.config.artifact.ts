import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Build variant used only to produce a single self-contained HTML file for
// preview (e.g. as a Claude Artifact). Not part of the normal app build —
// no PWA/service worker here, everything inlined, no external requests.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      'virtual:pwa-register': fileURLToPath(new URL('./scripts/pwa-register-noop.ts', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-artifact',
    emptyOutDir: true,
    cssCodeSplit: false,
  },
})
