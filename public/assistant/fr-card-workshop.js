/* Atelier « fiche FR communautaire » de la certification : retrouve la carte importée sur Legion HQ, vérifie sa concordance
   avec Tabletop Admiral, prépare la traduction (glossaire V2.6, mots-clés SWL, icônes) puis ouvre un ticket GitHub. Le
   workflow « Fiche FR communautaire » génère l'image (scripts/fr-cards), publie l'aperçu dans le ticket et l'intègre au
   site après « /valider-fiche-fr ». Rien n'est certifié ici : les données moteur restent à certifier ensuite. */
(function () {
  const STORAGE = 'swl-fr-card-workshop-v1'
  const SCRIPTS = { catalog: './legionhq-catalog.js?v=1', source: './auto-certification-source.js?v=3' }
  const SLOT_ICONS = { armament: 'armement', gear: 'equipement', doctrine: 'doctrine', clan: 'clan', training: 'entrainement', personnel: 'personnel', 'heavy weapon': 'arme-lourde', comms: 'communications', command: 'commandement', force: 'force', grenades: 'grenades', hardpoint: 'point-d-ancrage', ordnance: 'munitions', pilot: 'pilote', programming: 'programmation', crew: 'equipage', generator: 'generateur', 'squad leader': 'chef-d-escouade' }
  const FACTION_ICONS = { empire: 'empire', rebels: 'rebelles', republic: 'republique', separatists: 'separatistes', mercenary: 'mercenaires', mandalorians: 'mandaloriens' }
  const UNIT_TYPES = { trooper: 'Soldat', 'mandalorian trooper': 'Soldat Mandalorien', 'clone trooper': 'Soldat Clone', 'droid trooper': 'Soldat Droïde', 'heavy droid trooper': 'Soldat Droïde Lourd', 'creature trooper': 'Soldat Créature', 'emplacement trooper': 'Soldat en Position', 'wookiee trooper': 'Soldat Wookie', 'ground vehicle': 'Véhicule Terrestre', 'repulsor vehicle': 'Véhicule à Répulseurs', 'heavy trooper': 'Soldat Lourd' }
  const FACTION_FR = { rebels: 'Alliance Rebelle', empire: 'Empire Galactique' }
  const ICONS = ['suppr', 'incliner', 'action', 'soldat', 'courage', 'portee-1', 'portee-2', 'portee-3', 'rang-commandant', 'rang-agent', 'faction-empire', 'faction-rebelles', 'emplacement-armement', 'emplacement-equipement', 'emplacement-doctrine', 'emplacement-entrainement', 'emplacement-personnel', 'emplacement-arme-lourde']
  const loading = {}
  let drafts = {}
  try { drafts = JSON.parse(localStorage.getItem(STORAGE) || '{}') || {} } catch { drafts = {} }
  const save = () => { try { localStorage.setItem(STORAGE, JSON.stringify(drafts)) } catch {} }

  function load(name, rerender) {
    if (loading[name]) return
    loading[name] = true
    const script = document.createElement('script')
    script.src = SCRIPTS[name]
    script.onload = rerender
    script.onerror = () => { loading[name] = 'erreur'; rerender() }
    document.head.append(script)
  }
  const ready = (rerender) => {
    if (!window.SWL_LEGIONHQ_CATALOG) load('catalog', rerender)
    if (!window.SWL_AUTO_CERTIFICATION_SOURCE) load('source', rerender)
    return !!window.SWL_LEGIONHQ_CATALOG
  }

  const titleCase = (s) => String(s).toLowerCase().replace(/(^|[\s'’(-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase()).replace(/\b(De|Du|Des|La|Le|Les|Et|Ou|À|En|D'|L')\b/g, (w) => w.toLowerCase())
  const baseKw = (name) => String(name || '').replace(/^➦/, '').replace(/:.*$/, '').replace(/\s+X$/i, '').trim()

  function hqCandidates(ctx) {
    const label = ctx.norm(ctx.label)
    return (window.SWL_LEGIONHQ_CATALOG?.cards || []).filter((c) => c.type === ctx.kind && (ctx.norm(c.name + ' ' + (c.title || '')) === label || ctx.norm(c.name) === label))
  }
  function ttaCard(ctx) {
    const label = ctx.norm(ctx.label), cards = (window.SWL_AUTO_CERTIFICATION_SOURCE?.cards || []).filter((c) => c.kind === ctx.kind)
    const full = cards.filter((c) => ctx.norm(c.englishName + ' ' + (c.englishTitle || '')) === label)
    const pool = full.length ? full : cards.filter((c) => ctx.norm(c.englishName) === label)
    return pool.length === 1 ? pool[0] : pool.find((c) => ctx.decidedSourceId?.(ctx.kind, ctx.label) === c.sourceId) || null
  }

  // Mot-clé Legion HQ → libellé français (glossaire V2.6 puis nom du mot-clé SWL), avec sa valeur et ses icônes.
  function kwFr(ctx, keyword) {
    const name = keyword.name, value = keyword.value
    const base = baseKw(name).toUpperCase(), glossary = ctx.glossary().keywords || {}
    const entry = glossary[base] || glossary[base + ' X'] || Object.entries(glossary).find(([key]) => key.split(':')[0].trim() === base)?.[1]
    let fr = entry?.fr ? entry.fr.split(':')[0].replace(/\s+X$/, '').trim() : base
    const swl = (ctx.reference.keywords || []).find((k) => ctx.norm(baseKw(k.name)) === ctx.norm(fr))
    fr = swl ? baseKw(swl.name) : titleCase(fr)
    const action = /^action de carte/i.test(swl?.shortDefinition || '') ? '{action}' : ''
    if (/^mercenary$/i.test(baseKw(name))) {
      const list = String(value || '').toLowerCase() === 'all' ? ['empire', 'rebels', 'republic', 'separatists'] : String(value || '').toLowerCase().split(/[\s,]+/)
      return `Mercenaire : ${list.map((f) => FACTION_ICONS[f] ? `{faction-${FACTION_ICONS[f]}}` : f).join('')}`
    }
    if (/^equip$/i.test(baseKw(name))) return `${fr} : ${String(value || '').split(',').map((s) => s.trim().toLowerCase()).map((s) => SLOT_ICONS[s] ? `{emplacement-${SLOT_ICONS[s]}}` : s).join(', ')}`
    if (value === undefined || value === null || value === '') return action + fr
    if (/^\d+$/.test(String(value))) return `${action}${fr} ${value}`
    const translated = titleCase(ctx.translate(String(value)).output)
    return `${action}${fr} : ${translated}`
  }

  function requirementNames(req, out = []) {
    if (Array.isArray(req)) req.forEach((r) => requirementNames(r, out))
    else if (req && typeof req === 'object' && req.cardName) out.push(req.cardName)
    return out
  }
  const weaponKw = (ctx, w) => (w.keywords || []).map((k) => kwFr(ctx, k)).join(', ')

  function prefill(ctx, hq, tta) {
    const weaponKws = new Set((hq.weapons || []).flatMap((w) => (w.keywords || []).map((k) => ctx.norm(baseKw(k.name || k)))))
    const unitKws = (hq.keywords || []).filter((k) => !weaponKws.has(ctx.norm(baseKw(k.name))))
    const weapons = (hq.weapons || []).map((w) => ({ name: w.name, keywords: weaponKw(ctx, w) }))
    if (ctx.kind === 'upgrade') {
      const names = requirementNames(hq.requirements).map((n) => ctx.frenchName(n) || n)
      const restriction = names.length ? `**${names.join(' ou ')} uniquement.**` : ''
      const gains = unitKws.length ? `Cette unité gagne ${unitKws.map((k) => `**${kwFr(ctx, k)}**`).join(', ').replace(/, ([^,]*)$/, ' et $1')}.` : ''
      return { title: (hq.unique ? '•' : '') + (tta?.frenchName || ''), body: [restriction, gains].filter(Boolean).join('\n'), weapons }
    }
    if (ctx.kind === 'command') {
      const footer = hq.commander ? (ctx.frenchName(hq.commander) || hq.commander) : (FACTION_FR[hq.faction] || '')
      return { title: tta?.frenchName || '', units: '', body: '', footer }
    }
    return { name: tta?.frenchName || '', subtitle: tta?.frenchTitle || '', type: UNIT_TYPES[hq.subtype] || '', keywords: unitKws.map((k) => kwFr(ctx, k)), weapons }
  }

  function concordance(ctx, hq, tta) {
    const rows = [['Nom', ctx.norm(hq.name + ' ' + (hq.title || '')) === ctx.norm(ctx.label) || ctx.norm(hq.name) === ctx.norm(ctx.label), `${hq.name}${hq.title ? ' · ' + hq.title : ''}`]]
    if (!tta) return { rows, tta: false }
    if (ctx.kind === 'command') rows.push(['Pips', String(tta.pips) === String(hq.subtype), `TTA ${tta.pips ?? '?'} · HQ ${hq.subtype}`])
    else rows.push(['Coût', tta.points == null || hq.cost == null ? null : Number(tta.points) === Number(hq.cost), `TTA ${tta.points ?? '?'} · HQ ${hq.cost ?? '?'}`])
    const a = new Set((tta.keywords || []).map((k) => ctx.norm(baseKw(k?.name ?? k)))), b = new Set([...(hq.keywords || []), ...(hq.weapons || []).flatMap((w) => w.keywords || [])].map((k) => ctx.norm(baseKw(k.name ?? k))))
    const missing = [...a].filter((k) => !b.has(k)), extra = [...b].filter((k) => !a.has(k))
    if (!a.size) rows.push(['Mots-clés', null, 'Tabletop Admiral n’en liste aucun : non vérifiable'])
    else rows.push(['Mots-clés', !missing.length && !extra.length, missing.length || extra.length ? `TTA seul : ${missing.join(', ') || '—'} · HQ seul : ${extra.join(', ') || '—'}` : `${a.size} identique(s)`])
    return { rows, tta: true }
  }

  function draftFor(ctx) {
    const candidates = hqCandidates(ctx), tta = ttaCard(ctx)
    let d = drafts[ctx.card]
    if (!d || !candidates.some((c) => c.image === d.hqImage)) {
      const best = candidates.find((c) => tta && Number(c.cost) === Number(tta.points)) || candidates[0]
      if (!best) return null
      d = drafts[ctx.card] = { hqImage: best.image, fr: prefill(ctx, best, tta), use: 'passive', checked: false, sentAt: null }
      save()
    }
    return d
  }

  const esc = (ctx, s) => ctx.escapeHtml(s ?? '')
  function field(ctx, key, label, value, rows = 1) {
    return rows > 1
      ? `<label>${label}<textarea data-fr-field="${key}" rows="${rows}">${esc(ctx, value)}</textarea></label>`
      : `<label>${label}<input data-fr-field="${key}" value="${esc(ctx, value)}"></label>`
  }

  function render(ctx) {
    const head = `<section class="cert-detail fr-workshop"><header><div><small>FICHE FR COMMUNAUTAIRE · LEGION HQ</small><h2>${esc(ctx, ctx.label)}</h2></div><button class="secondary" id="backUnknownChoose">Retour</button></header>`
    if (!ready(ctx.rerender)) return `${head}<p class="notice">${loading.catalog === 'erreur' ? 'Catalogue Legion HQ indisponible : utilisez l’atelier manuel.' : 'Chargement du catalogue Legion HQ…'}</p></section>`
    const candidates = hqCandidates(ctx)
    if (!candidates.length) return `${head}<p class="notice">Aucune carte « ${esc(ctx, ctx.label)} » de ce type sur Legion HQ (catalogue du ${esc(ctx, window.SWL_LEGIONHQ_CATALOG.generated)}). Utilisez l’atelier manuel avec le visuel anglais.</p><button class="primary" id="frManualWorkshop">Atelier manuel</button></section>`
    const d = draftFor(ctx), hq = candidates.find((c) => c.image === d.hqImage), tta = ttaCard(ctx), check = concordance(ctx, hq, tta)
    const mark = (ok) => (ok === null ? '·' : ok ? '✓' : '⚠')
    const zones = ctx.kind === 'upgrade'
      ? field(ctx, 'title', 'Titre français (• si unique, retour à la ligne permis)', d.fr.title) + field(ctx, 'body', 'Texte français (restriction en **gras**, paragraphes = retour à la ligne)', d.fr.body, 7)
      : ctx.kind === 'command'
        ? field(ctx, 'title', 'Titre français', d.fr.title) + field(ctx, 'units', 'Effectif (ex. « 2 UNITÉS », « 1 {rang-agent} UNITÉ & 1 UNITÉ »)', d.fr.units) + field(ctx, 'body', 'Texte français', d.fr.body, 5) + field(ctx, 'footer', 'Pied de carte (porteur ou faction, vide pour une carte générique)', d.fr.footer)
        : field(ctx, 'name', 'Nom français', d.fr.name) + field(ctx, 'subtitle', 'Sous-titre français (si la carte en a un)', d.fr.subtitle) + field(ctx, 'type', 'Type d’unité', d.fr.type) + field(ctx, 'keywords', 'Mots-clés (une ligne par mot-clé)', (d.fr.keywords || []).join('\n'), 6)
    const weapons = (d.fr.weapons || []).map((w, i) => `<div class="fr-weapon"><b>Arme ${i + 1}</b>${field(ctx, `weapon-name-${i}`, 'Nom français', w.name)}${field(ctx, `weapon-kw-${i}`, 'Mots-clés', w.keywords)}</div>`).join('')
    return `${head}<div class="cert-card-layout"><div class="cert-card-visual"><div class="cert-hq-visual"><img src="${esc(ctx, hq.image)}" referrerpolicy="no-referrer" alt="Carte Legion HQ"><small>Visuel Legion HQ qui servira de fond à la fiche française.</small></div>${candidates.length > 1 ? `<div class="fr-variants"><strong>${candidates.length} cartes portent ce nom</strong>${candidates.map((c) => `<button type="button" class="${c.image === hq.image ? 'primary' : 'secondary'}" data-fr-variant="${esc(ctx, c.image)}">${esc(ctx, c.name)} · ${esc(ctx, c.subtype || '')}${c.cost != null ? ` · ${c.cost} pts` : ''}</button>`).join('')}</div>` : ''}</div>
<div class="cert-fields"><div class="fr-concordance"><strong>Concordance Legion HQ / Tabletop Admiral</strong>${check.rows.map(([k, ok, txt]) => `<p class="${ok === false ? 'warn' : ''}">${mark(ok)} <b>${k}</b> ${esc(ctx, txt)}</p>`).join('')}${check.tta ? '' : '<p class="warn">⚠ Carte absente des métadonnées Tabletop Admiral : comparez le visuel avec soin.</p>'}</div>
<p class="cert-help">Préremplissage : mots-clés traduits par l’index V2.6 et le glossaire SWL, noms français connus. Le texte des règles n’existe pas chez Legion HQ : recopiez-le en français d’après le visuel. Balisage : <code>**mot-clé**</code>, <code>__Étape__</code>, <code>{icône}</code>.</p>
<div class="fr-icons">${ICONS.map((icon) => `<button type="button" class="secondary" data-fr-icon="{${icon}}">{${icon}}</button>`).join('')}</div>
${zones}${weapons}${ctx.kind === 'upgrade' ? `<label>Utilisation de la carte<select data-fr-field="use">${[['passive', 'Passive'], ['exhaust', 'S’incline ↱'], ['discard', 'Supprimée ✖'], ['both', 'Les deux']].map(([v, t]) => `<option value="${v}" ${d.use === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>` : ''}
<label class="no-courage-choice"><input id="frChecked" type="checkbox" ${d.checked ? 'checked' : ''}> J’ai comparé le visuel Legion HQ à la carte de ma liste et relu la traduction.</label>
<button class="primary" id="frSendGithub">Lancer la création de la fiche sur GitHub</button>${d.sentAt ? `<p class="notice">Ticket ouvert le ${new Date(d.sentAt).toLocaleString('fr-FR')} : l’aperçu arrive dans le ticket ; commentez <code>/valider-fiche-fr</code> pour l’intégrer au site.</p>` : ''}
<p class="cert-help">GitHub génère l’image (texte anglais effacé, français superposé), publie l’aperçu dans le ticket, puis l’intègre au site après votre validation. Les dés, PV et mots-clés se certifient ensuite ici, comme toute carte.</p></div></div></section>`
  }

  function collect(ctx) {
    const d = drafts[ctx.card]
    if (!d) return null
    ctx.root.querySelectorAll('[data-fr-field]').forEach((el) => {
      const key = el.dataset.frField, value = el.value
      if (key === 'use') d.use = value
      else if (key === 'keywords') d.fr.keywords = value.split('\n').map((s) => s.trim()).filter(Boolean)
      else if (key.startsWith('weapon-')) { const [, part, index] = key.split('-'); d.fr.weapons[Number(index)][part === 'name' ? 'name' : 'keywords'] = value }
      else d.fr[key] = value
    })
    d.checked = !!ctx.root.querySelector('#frChecked')?.checked
    save()
    return d
  }

  function payload(ctx, d) {
    const tta = ttaCard(ctx), hq = hqCandidates(ctx).find((c) => c.image === d.hqImage)
    const clean = (s) => String(s || '').replace(/^•/, '').replace(/\s*\n\s*/g, ' ').trim()
    const nameFr = ctx.kind === 'unit' ? [d.fr.name, d.fr.subtitle].filter(Boolean).map(clean).join(', ') : clean(d.fr.title)
    const out = { schemaVersion: 1, kind: ctx.kind, englishName: ctx.label, nameFr, hqImage: d.hqImage, fr: d.fr }
    if (tta) out.ttaId = `${ctx.kind}:${tta.sourceId}`
    if (ctx.kind === 'upgrade') out.use = d.use
    if (ctx.kind === 'command') out.command = { pip: Number(hq.subtype) || 1, faction: hq.faction === 'rebels' ? 'rebelles' : hq.faction === 'empire' ? 'empire' : 'generique', requirement: clean(d.fr.footer) || 'Carte générique' }
    out.translationProof = { englishText: `${hq.name}${hq.title ? ' · ' + hq.title : ''} — mots-clés : ${(hq.keywords || []).map((k) => k.name + (k.value != null ? ' ' + k.value : '')).join(', ')}`, concordance: concordance(ctx, hq, tta).rows.map(([k, ok, t]) => `${k} ${ok === false ? '⚠' : '✓'} ${t}`).join(' | '), glossaryVersion: ctx.glossary().updatedAt || '' }
    return out
  }

  function bind(ctx) {
    const back = ctx.root.querySelector('#frManualWorkshop')
    if (back) back.onclick = () => ctx.openManual()
    let focused = null
    ctx.root.querySelectorAll('[data-fr-field]').forEach((el) => { el.onfocus = () => { focused = el }; el.onchange = () => collect(ctx) })
    ctx.root.querySelectorAll('[data-fr-icon]').forEach((b) => b.onclick = () => {
      const el = focused || ctx.root.querySelector('textarea[data-fr-field="body"]') || ctx.root.querySelector('[data-fr-field]')
      if (!el) return
      const pos = el.selectionStart ?? el.value.length
      el.value = el.value.slice(0, pos) + b.dataset.frIcon + el.value.slice(el.selectionEnd ?? pos)
      el.focus(); collect(ctx)
    })
    ctx.root.querySelectorAll('[data-fr-variant]').forEach((b) => b.onclick = () => { delete drafts[ctx.card]; const tta = ttaCard(ctx), hq = hqCandidates(ctx).find((c) => c.image === b.dataset.frVariant); drafts[ctx.card] = { hqImage: hq.image, fr: prefill(ctx, hq, tta), use: 'passive', checked: false, sentAt: null }; save(); ctx.rerender() })
    const send = ctx.root.querySelector('#frSendGithub')
    if (send) send.onclick = () => {
      const d = collect(ctx)
      if (!d.checked) { alert('Comparez d’abord le visuel Legion HQ et relisez la traduction (case à cocher).'); return }
      const p = payload(ctx, d)
      if (!p.nameFr) { alert('Le nom français est obligatoire.'); return }
      const title = `Fiche FR : ${ctx.label}`
      const body = `Fiche FR communautaire préparée dans l’atelier de la certification.\n\n- Carte : **${ctx.label}** (${ctx.kind})\n- Nom français : **${p.nameFr}**\n- Concordance : ${p.translationProof.concordance}\n\nLe workflow « Fiche FR communautaire » publie l’aperçu ci-dessous. Commentez \`/valider-fiche-fr\` pour l’intégrer au site, ou modifiez la fiche puis \`/apercu-fiche-fr\`.\n\n<!-- SWL_FR_CARD\n${JSON.stringify(p, null, 1)}\n-->\n`
      const url = `https://github.com/${ctx.repository}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
      if (url.length > 7800) { navigator.clipboard?.writeText(body).catch(() => {}); alert('Fiche copiée : collez-la dans le ticket qui s’ouvre.'); window.open(`https://github.com/${ctx.repository}/issues/new?title=${encodeURIComponent(title)}`, '_blank', 'noopener') }
      else window.open(url, '_blank', 'noopener')
      d.sentAt = Date.now(); save(); ctx.rerender()
    }
  }

  window.SWL_FR_WORKSHOP = { render, bind, collect, status: (card) => (drafts[card]?.sentAt ? 'Fiche FR envoyée sur GitHub' : drafts[card] ? 'Fiche FR en préparation' : null), payload }
})()
