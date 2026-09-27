/* Compagnon téléphone (27/09/2026) : page autonome, pensée pour un téléphone en mode portrait posé à côté
   de la table. Affiche en lecture seule le suivi de partie (round, points de victoire, unités restantes à
   jouer pour mon camp) déjà tenu par l'Assistant/le site, plus une recherche de mot-clé pour trancher un
   doute sans sortir l'iPad. Ne modifie jamais le suivi : toutes les écritures restent sur l'appareil qui
   fait tourner l'Assistant ou le site ; ce fichier ne fait que lire localStorage et le Gist de synchro.
   Réutilise game-hub.css (mêmes classes .gh-tracker/.gh-vp/.gh-round) pour rester visuellement identique
   à la page Partie de l'Assistant. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $('#app');

  const trackerKey = 'swl.game-tracker.v1';
  const unitStateKey = 'swl.assistant.unit-state.v1';
  const syncTokenKey = 'swl.sync.token.v1';
  const syncGistKey = 'swl.sync.gistId.v1';
  const syncFilename = 'legion-compagnon-lists.json';
  const gistDescription = 'legion-compagnon-sync — ne pas supprimer (utilisé par l’appli Legion Compagnon pour synchroniser vos listes entre appareils)';
  const sideKey = 'swl.phone.side.v1';
  const MAX_ROUND = 5;
  const BLANK_DECK = { suite: [], played: [], pendingId: null };

  const read = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } };
  const esc = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  const norm = value => (value || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function readTracker() {
    const stored = read(trackerKey, {}) || {};
    const deck = color => ({ ...BLANK_DECK, ...((stored.commandDecks || {})[color] || {}) });
    return { round: 1, p1Color: 'bleu', vpBleu: 0, vpRouge: 0, activatedUnitIds: [], ...stored, commandDecks: { bleu: deck('bleu'), rouge: deck('rouge') } };
  }
  const readList = side => read('swl.list.' + side + '.v1', null);
  const playerForColor = (tracker, color) => (tracker.p1Color === color ? 'p1' : 'p2');
  const armyLabel = (list, fallback) => (list && (list.listName || list.faction)) || fallback;

  function unitsLeft(playerId) {
    const list = readList(playerId);
    if (!list) return null;
    const states = read(unitStateKey, {});
    const tracker = readTracker();
    const activated = tracker.activatedUnitIds || [];
    const units = list.units || [];
    let total = 0, left = 0;
    units.forEach((unit, index) => {
      total++;
      const id = playerId + ':' + (unit.key || index);
      const state = states[id] || {};
      if (state.outOfAction) return;
      if (!activated.includes(id)) left++;
    });
    return { total, left };
  }

  let mySide = localStorage.getItem(sideKey) === 'rouge' ? 'rouge' : 'bleu';
  function setSide(color) { mySide = color; try { localStorage.setItem(sideKey, color); } catch (e) {} render(); }

  // ---------- Synchronisation (lecture seule) : même Gist que le site et l'Assistant. ----------
  let syncState = 'idle'; // idle | syncing | ok | error | disabled
  async function findGistId(token) {
    const cached = localStorage.getItem(syncGistKey);
    if (cached) return cached;
    for (let page = 1; page <= 5; page++) {
      const res = await fetch('https://api.github.com/gists?per_page=100&page=' + page, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error(String(res.status));
      const gists = await res.json();
      const found = gists.find(g => g.description === gistDescription);
      if (found) { try { localStorage.setItem(syncGistKey, found.id); } catch (e) {} return found.id; }
      if (gists.length < 100) break;
    }
    return null;
  }
  async function pullFromGist() {
    const token = localStorage.getItem(syncTokenKey);
    if (!token) { syncState = 'disabled'; return false; }
    syncState = 'syncing';
    try {
      const gistId = await findGistId(token);
      if (!gistId) { syncState = 'error'; return false; }
      const res = await fetch('https://api.github.com/gists/' + gistId, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error(String(res.status));
      const gist = await res.json();
      const remote = JSON.parse((gist.files && gist.files[syncFilename] && gist.files[syncFilename].content) || '{}');
      let changed = false;
      if (remote.listP1) { localStorage.setItem('swl.list.p1.v1', JSON.stringify(remote.listP1)); changed = true; }
      if (remote.listP2) { localStorage.setItem('swl.list.p2.v1', JSON.stringify(remote.listP2)); changed = true; }
      if (remote.gameTracker) { localStorage.setItem(trackerKey, JSON.stringify(remote.gameTracker)); changed = true; }
      if (remote.assistantUnitStates) { localStorage.setItem(unitStateKey, JSON.stringify(remote.assistantUnitStates)); changed = true; }
      syncState = 'ok';
      return changed;
    } catch (error) { console.warn('Synchronisation indisponible', error); syncState = 'error'; return false; }
  }

  // ---------- Recherche de mot-clé (glossaire déjà chargé par reference-data.js). ----------
  function keywordResults(query) {
    const keywords = (window.SWL_REFERENCE && window.SWL_REFERENCE.keywords) || [];
    const q = norm(query);
    if (!q) return [];
    return keywords.filter(k => norm(k.name).includes(q) || norm(k.id.replace(/-/g, ' ')).includes(q)).slice(0, 30);
  }

  // ---------- Musique d'ambiance : lecteur Spotify intégré (widget officiel Spotify, pas de fichier
  // audio hébergé ici — les musiques Star Wars sont protégées, seul Spotify a le droit de les diffuser).
  // Play/pause est le contrôle propre du lecteur Spotify ; on ne fait qu'y encapsuler la playlist choisie.
  const spotifyKey = 'swl.phone.spotify-playlist.v1';
  function parseSpotifyId(input) {
    const value = String(input || '').trim();
    const fromUrl = value.match(/playlist[\/:]([a-zA-Z0-9]+)/);
    if (fromUrl) return fromUrl[1];
    return /^[a-zA-Z0-9]{15,30}$/.test(value) ? value : '';
  }
  function musicHtml() {
    const saved = localStorage.getItem(spotifyKey) || '';
    const id = parseSpotifyId(saved);
    if (!id) {
      return `<section class="ph-card ph-music"><h1>🎵 MUSIQUE D’AMBIANCE</h1>
        <p>Collez le lien de votre playlist Spotify (bouton Partager → Copier le lien de la playlist) pour l’écouter ici, avec ses propres contrôles lecture/pause.</p>
        <label class="ph-token-field">Lien ou ID de playlist Spotify<input id="phSpotifyInput" type="text" inputmode="url" placeholder="https://open.spotify.com/playlist/…" autocomplete="off"></label>
        <button type="button" class="primary" id="phSpotifySave">Enregistrer</button></section>`;
    }
    return `<section class="ph-card ph-music"><div class="ph-music-head"><h1>🎵 MUSIQUE D’AMBIANCE</h1><button type="button" class="secondary" id="phSpotifyChange">Changer</button></div>
      <iframe class="ph-spotify-frame" src="https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Playlist Spotify"></iframe></section>`;
  }

  function pairingHtml() {
    return `<section class="ph-card ph-pairing"><h1>EN ATTENTE DE SYNCHRONISATION</h1>
      <p>Cet appareil n’a pas encore de partie à afficher. Sur un appareil déjà connecté, ouvrez Legion Compagnon → <b>Synchronisation entre appareils</b> → <b>Ajouter un appareil</b>, puis scannez le code ici — ou collez le même jeton ci-dessous.</p>
      <label class="ph-token-field">Jeton d’accès personnel GitHub<input id="phToken" type="text" placeholder="ghp_…" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <button type="button" class="primary" id="phActivate">Activer</button>
      <p class="ph-hint">Le jeton reste uniquement sur cet appareil ; il n’est envoyé qu’à api.github.com.</p>
      </section>`;
  }

  function trackerHtml(tracker) {
    const vp = color => {
      const playerId = playerForColor(tracker, color), list = readList(playerId);
      const label = armyLabel(list, color === 'bleu' ? 'Joueur bleu' : 'Joueur rouge');
      const mine = color === mySide;
      return `<article class="gh-vp ${color} ${mine ? 'ph-mine' : ''}" data-ph-side="${color}"><div><small><i class="gh-dot ${color}"></i>${color === 'bleu' ? 'BLEU' : 'ROUGE'}${mine ? ' · MON CAMP' : ''}</small><strong>${esc(label)}</strong></div><div class="gh-counter ph-vp-readonly"><b>${tracker['vp' + (color === 'bleu' ? 'Bleu' : 'Rouge')]}</b></div></article>`;
    };
    const myPlayerId = playerForColor(tracker, mySide), left = unitsLeft(myPlayerId);
    return `<section class="gh-tracker" aria-label="Suivi de partie">
        <article class="gh-round"><small>ROUND</small><div class="gh-counter ph-round-readonly"><b>${tracker.round}<i> / ${MAX_ROUND}</i></b></div></article>
        ${vp('bleu')}${vp('rouge')}
      </section>
      <section class="ph-left-card">
        <small>UNITÉS RESTANTES À JOUER${left ? '' : ' · aucune liste reçue pour ce camp'}</small>
        <b>${left ? left.left : '—'}</b>
        ${left ? `<span>${left.total} au total</span>` : ''}
      </section>`;
  }

  function syncNoteHtml() {
    const label = { idle: 'Synchronisation…', syncing: 'Synchronisation…', ok: 'Synchronisé', error: 'Synchronisation en erreur', disabled: 'Synchronisation non configurée' }[syncState] || '';
    return `<p class="ph-sync ph-sync-${syncState}"><i></i>${label}</p>`;
  }

  function render() {
    const tracker = readTracker();
    const hasAnyList = !!(readList('p1') || readList('p2'));
    app.innerHTML = `<header class="ph-top"><a class="ph-back" href="./" aria-label="Retour à l’Assistant">‹</a><strong>SUIVI DE PARTIE</strong><button type="button" class="ph-search-btn" data-ph-search aria-label="Chercher un mot-clé">🔎</button></header>`
      + (hasAnyList ? trackerHtml(tracker) : pairingHtml())
      + syncNoteHtml()
      + `<dialog class="ph-search-dialog"><header><input type="search" id="phKwInput" placeholder="Tapez : préc, arsenal, perfo…" autocomplete="off"><button type="button" class="secondary" data-ph-close-search>Fermer</button></header><div id="phKwResults" class="ph-kw-results"></div><div id="phKwDetail" class="ph-kw-detail" hidden></div></dialog>`;
    bind();
  }

  function bind() {
    app.querySelectorAll('[data-ph-side]').forEach(el => el.onclick = () => setSide(el.dataset.phSide));
    const searchBtn = $('[data-ph-search]', app);
    const dialog = $('.ph-search-dialog', app);
    if (searchBtn && dialog) searchBtn.onclick = () => { dialog.showModal(); $('#phKwInput', dialog).focus(); };
    const closeBtn = $('[data-ph-close-search]', app);
    if (closeBtn) closeBtn.onclick = () => dialog.close();
    if (dialog) dialog.onclick = event => { if (event.target === dialog) dialog.close(); };
    const input = $('#phKwInput', app);
    if (input) input.oninput = () => {
      const results = keywordResults(input.value);
      $('#phKwDetail', app).hidden = true;
      $('#phKwResults', app).innerHTML = results.length
        ? results.map(k => `<button type="button" data-ph-kw="${k.id}">${esc(k.name)}${k.hasValue ? ' <small>(valeur X)</small>' : ''}</button>`).join('')
        : (input.value ? '<p class="ph-kw-none">Aucun mot-clé ne correspond.</p>' : '<p class="ph-kw-none">Tapez le début d’un mot-clé…</p>');
      $('#phKwResults', app).querySelectorAll('[data-ph-kw]').forEach(btn => btn.onclick = () => {
        const keyword = (window.SWL_REFERENCE.keywords || []).find(k => k.id === btn.dataset.phKw);
        if (!keyword) return;
        const detail = $('#phKwDetail', app);
        detail.hidden = false;
        detail.innerHTML = `<strong>${esc(keyword.name)}</strong><p>${esc(keyword.definition || keyword.shortDefinition || '')}</p>`;
      });
    };
    const activate = $('#phActivate', app);
    if (activate) activate.onclick = async () => {
      const value = ($('#phToken', app).value || '').trim();
      if (!value) return;
      localStorage.setItem(syncTokenKey, value);
      localStorage.removeItem(syncGistKey);
      await pullFromGist();
      render();
    };
  }

  // Le panneau musique vit dans son propre conteneur, jamais reconstruit par render() (qui tourne
  // toutes les 5 s pour le suivi de partie) : ça couperait la lecture Spotify à chaque tirage.
  const musicSlot = document.getElementById('phMusicSlot');
  function renderMusic() {
    musicSlot.innerHTML = musicHtml();
    const save = $('#phSpotifySave', musicSlot);
    if (save) save.onclick = () => {
      const raw = $('#phSpotifyInput', musicSlot).value;
      if (!parseSpotifyId(raw)) return;
      localStorage.setItem(spotifyKey, raw);
      renderMusic();
    };
    const change = $('#phSpotifyChange', musicSlot);
    if (change) change.onclick = () => { localStorage.removeItem(spotifyKey); renderMusic(); };
  }

  // Ne jamais reconstruire la page pendant qu'une recherche est ouverte : ça fermerait le dialogue
  // et perdrait la saisie en cours. Les nouvelles données restent en attente dans localStorage.
  function rerenderUnlessSearching() {
    const dialog = $('.ph-search-dialog', app);
    if (dialog && dialog.open) return;
    render();
  }

  render();
  renderMusic();
  pullFromGist().then(() => rerenderUnlessSearching());
  setInterval(() => { pullFromGist().then(changed => { if (changed) rerenderUnlessSearching(); }); }, 5000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pullFromGist().then(changed => { if (changed) rerenderUnlessSearching(); }); });
  window.addEventListener('storage', event => { if ([trackerKey, unitStateKey, 'swl.list.p1.v1', 'swl.list.p2.v1'].includes(event.key)) rerenderUnlessSearching(); });
})();
