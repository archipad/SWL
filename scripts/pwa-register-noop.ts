// Stand-in for 'virtual:pwa-register' used only by the single-file artifact
// build (vite.config.artifact.ts), which doesn't include vite-plugin-pwa.
export function registerSW(_opts?: unknown) {
  // no-op: no service worker in the artifact preview build
}
