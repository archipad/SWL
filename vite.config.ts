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
  optimizeDeps: {
    exclude: ['virtual:pwa-register'],
  },
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
        // L'assistant est une page HTML autonome. Sans cette exception,
        // le mode hors-ligne renvoie toute navigation vers l'application React.
        navigateFallbackDenylist: [/^\/SWL\/assistant(?:\/|$)/],
        runtimeCaching: [
          {
            urlPattern: /\/SWL\/cards\/.*\.(?:png|jpe?g|webp)$/i,
            // StaleWhileRevalidate (et non CacheFirst) : un visuel corrigé sur le site (ex. Boba Fett, cadrage/orientation) doit remplacer
            // l'ancienne copie mise en cache, au lieu de rester 90 jours sur l'appareil. Cache v2 : abandonne les copies périmées de la v1.
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'swl-card-images-v2',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Sans service worker, le <link rel="modulepreload"> ajouté par Vite est
    // utile. Ici, le service worker (VitePWA ci-dessus) précache déjà tous
    // les .js — le module intercepte alors les mêmes requêtes que le
    // préchargement, et Chrome les traite comme deux « mondes » différents
    // (avertissement console « cross-world service worker resource
    // mismatch » : le préchargement est fait pour rien, sans casser
    // l'appli). Le précache du service worker rend le préchargement inutile
    // de toute façon dès la deuxième visite — on le désactive donc.
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react-vendor';
          if (id.includes('/src/data/') || id.includes('\\src\\data\\')) return 'card-catalog';
        },
      },
    },
  },
})
