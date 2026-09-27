/* Bandeau de mise à jour (27/09/2026) : ces pages sont précachées par le service worker du site
   (voir vite.config.ts). Sur iPad en appli (écran d'accueil), l'onglet reste ouvert des heures ou
   des jours sans jamais se recharger tout seul, et le navigateur ne revérifie une nouvelle version
   qu'au premier plan. On force cette vérification à chaque retour au premier plan, et on laisse le
   joueur choisir le moment du rechargement plutôt que de recharger sans prévenir en pleine partie.
   Sans dépendance : ce script tourne tel quel dans ces pages HTML autonomes (pas de bundler ici). */
(function () {
  if (!('serviceWorker' in navigator)) return;

  function showBanner(onReload) {
    if (document.getElementById('swlUpdateBanner')) return;
    const bar = document.createElement('div');
    bar.id = 'swlUpdateBanner';
    bar.setAttribute('role', 'status');
    bar.style.cssText = [
      'position:fixed', 'left:12px', 'right:12px', 'bottom:max(12px, env(safe-area-inset-bottom, 0px))',
      'z-index:9999', 'display:flex', 'align-items:center', 'gap:12px', 'padding:12px 16px',
      'border:1px solid #7ee3ff', 'border-radius:10px',
      'background:rgba(8, 20, 32, .96)', 'color:#e8f3fa',
      'box-shadow:0 8px 24px rgba(0,0,0,.5), 0 0 20px rgba(66, 205, 255, .25)',
      'font:600 .95rem/1.3 "Rajdhani", system-ui, sans-serif',
    ].join(';');

    const label = document.createElement('span');
    label.style.cssText = 'flex:1 1 auto';
    label.textContent = 'Nouvelle version disponible.';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Recharger';
    button.style.cssText = [
      'flex:0 0 auto', 'min-height:40px', 'padding:0 16px', 'border-radius:8px', 'border:0', 'cursor:pointer',
      'background:linear-gradient(180deg, #23a6e4, #0d6fb3)', 'color:#fff', 'font:700 1rem inherit',
    ].join(';');
    button.onclick = function () { bar.remove(); onReload(); };

    bar.appendChild(label);
    bar.appendChild(button);
    document.body.appendChild(bar);
  }

  function watchRegistration(reg) {
    if (!reg) return;

    function onWaiting(worker) {
      showBanner(function () {
        worker.postMessage({ type: 'SKIP_WAITING' });
      });
    }

    if (reg.waiting && navigator.serviceWorker.controller) onWaiting(reg.waiting);

    reg.addEventListener('updatefound', function () {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', function () {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) onWaiting(worker);
      });
    });

    const recheck = function () { reg.update().catch(function () {}); };
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') recheck();
    });
    window.addEventListener('pageshow', recheck);
  }

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  navigator.serviceWorker.getRegistration().then(watchRegistration).catch(function () {});
})();
