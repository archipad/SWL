// Bandeau de mise à jour (27/09/2026) : sur iPad en appli (ajoutée à l'écran d'accueil), l'onglet
// reste ouvert des heures ou des jours sans jamais se recharger tout seul — le navigateur ne
// revérifie le service worker qu'au premier plan. On force cette vérification à chaque retour au
// premier plan et on laisse le joueur choisir le moment du rechargement (jamais en pleine partie
// sans le prévenir).
import { registerSW } from 'virtual:pwa-register'

export function initPwaUpdateBanner() {
  let bannerShown = false
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (bannerShown) return
      bannerShown = true
      showBanner(() => updateSW(true))
    },
    onRegistered(registration) {
      if (!registration) return
      const check = () => { registration.update().catch(() => {}) }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      window.addEventListener('pageshow', check)
    },
  })
}

function showBanner(onReload: () => void) {
  const bar = document.createElement('div')
  bar.setAttribute('role', 'status')
  bar.style.cssText = [
    'position:fixed', 'left:12px', 'right:12px', 'bottom:max(12px, env(safe-area-inset-bottom))',
    'z-index:9999', 'display:flex', 'align-items:center', 'gap:12px', 'padding:12px 16px',
    'border:1px solid var(--accent, #ff8c1a)', 'border-radius:10px',
    'background:var(--bg-raised, #1b1e29)', 'color:var(--text, #eef0f5)',
    'box-shadow:0 8px 24px rgba(0,0,0,.4)',
    'font:600 .95rem/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
  ].join(';')

  const label = document.createElement('span')
  label.style.cssText = 'flex:1 1 auto'
  label.textContent = 'Nouvelle version disponible.'

  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Recharger'
  button.style.cssText = [
    'flex:0 0 auto', 'min-height:40px', 'padding:0 16px', 'border-radius:8px', 'border:0', 'cursor:pointer',
    'background:var(--accent, #ff8c1a)', 'color:var(--t-accent-ink, #15100a)', 'font:700 .95rem inherit',
  ].join(';')
  button.onclick = () => { bar.remove(); onReload() }

  bar.append(label, button)
  document.body.appendChild(bar)
}
