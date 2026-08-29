import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Served as a GitHub Pages *project* site (https://<owner>.github.io/SWL/),
// so every asset needs this subpath prefix. Override with BASE_PATH if the
// deployment target ever changes (custom domain, org/user site, etc.).
const base = process.env.BASE_PATH ?? '/SWL/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Legion Compagnon',
        short_name: 'Legion',
        description:
          "Aide de jeu pour Star Wars: Legion — import de liste, glossaire des mots-clés et fiches imprimables.",
        theme_color: '#12141c',
        background_color: '#12141c',
        display: 'standalone',
        // 'any' plutôt que 'portrait' : sur iPad, l'onglet Combat (attaquant/
        // défenseur côte à côte) profite du mode paysage — un verrouillage
        // portrait l'aurait empêché une fois l'appli installée en PWA.
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
      },
    }),
  ],
})
