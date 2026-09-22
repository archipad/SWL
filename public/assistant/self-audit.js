/* Audit de partie complète, PILOTÉ DANS LE NAVIGATEUR (22/09/2026) : version de
   scripts/audit-list-playthrough.mjs qui tourne directement dans cette page, pour être
   déclenchée depuis l'écran d'import (src/components/ImportCompatibilityReport.tsx) sans
   terminal ni build. N'existe et n'agit QUE si l'URL contient ?selfaudit=1 (chargée dans un
   cadre caché par la page d'import, ou consultable directement pour un contrôle manuel).
   Le pilotage (portée, contrôle de tir, contrôles de ciblage, dés, couvert, modificateurs)
   reprend exactement la même logique que scripts/lib/auto-attack.mjs -- si l'une évolue,
   l'autre doit suivre. Rejoue :
     1. La fiche de chaque unité (et de ses améliorations) des deux camps actuellement
        chargés : chaque mot-clé imprimé doit être visible sur la fiche.
     2. Une attaque complète pour chaque arme de chaque unité, contre chaque unité adverse,
        dans les deux sens, jusqu'à l'écran final ou un blocage réel.
     3. Les actions de fiche disponibles sans configuration préalable, une fois chacune.
   Aucune donnée n'est modifiée de façon durable : la page qui déclenche cet audit (dans un
   cadre caché) est responsable de sauvegarder puis restaurer le stockage local autour de son
   exécution -- voir ImportCompatibilityReport.tsx. */
(() => {
  const params = new URLSearchParams(location.search)
  if (params.get('selfaudit') !== '1') return

  const errors = []
  window.addEventListener('error', (event) => errors.push(String(event.message)))
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)]
  const text = (element) => (element?.textContent || '').replace(/\s+/g, ' ').trim()
  const settle = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms))
  const click = async (target) => {
    const element = typeof target === 'string' ? $(target) : target
    if (!element) throw new Error('élément introuvable : ' + target)
    element.click()
    await settle()
  }
  const dismissDialogs = () => $$('dialog').forEach((dialog) => dialog.remove())
  const nextAttack = async () => { await click('#nextAttack'); dismissDialogs(); await settle(60) }

  const findings = []
  const say = (level, scope, message) => { findings.push({ level, scope, message }); log(`${level === 'error' ? '✗' : '⚠'} [${scope}] ${message}`) }

  const logLines = []
  const logPanel = () => $('#selfAuditLog')
  const log = (line) => { logLines.push(line); const panel = logPanel(); if (panel) { panel.textContent = logLines.join('\n'); panel.scrollTop = panel.scrollHeight } }
  const render = (extra = '') => {
    root.innerHTML = `<section class="self-audit"><span class="kicker">AUDIT AUTOMATIQUE</span><h1>Contrôle de la liste en cours</h1><p>Rejoue les fiches et toutes les attaques possibles. Ne fermez pas cet onglet.</p>${extra}<pre id="selfAuditLog"></pre></section>`
    logPanel().textContent = logLines.join('\n')
  }
  render()

  // --- Pilote générique d'une attaque (identique à scripts/lib/auto-attack.mjs, en direct plutôt que via eval). ---
  async function pickRangeFor(weaponKey) {
    for (const button of $$('[data-range]')) {
      await click(button)
      const toggle = $(`.weapon-toggle[data-key="${weaponKey}"]`)
      if (toggle && !toggle.disabled) return true
    }
    return false
  }
  async function autoResolveAttack({ weaponKey = null, maxSteps = 80 } = {}) {
    const cardFxUsed = []
    let previousIssue = null, repeats = 0
    for (let i = 0; i < maxSteps; i += 1) {
      if (!$('.resolve-center')) return { finished: false, stuck: 'écran de résolution absent', cardFxUsed }
      dismissDialogs()
      const issue = stepIssue()
      if (!issue) {
        const fxButtons = $$('[data-card-fx]:not([disabled])')
        if (fxButtons.length) { const key = fxButtons[0].dataset.cardFx; await click(fxButtons[0]); cardFxUsed.push(key); continue }
        if (attackStep >= 5) { await nextAttack(); return { finished: true, stuck: '', cardFxUsed } }
        await nextAttack()
        continue
      }
      if (issue === previousIssue) repeats += 1; else { previousIssue = issue; repeats = 0 }
      if (repeats > 2) return { finished: false, stuck: 'aucune progression possible : ' + issue, cardFxUsed }

      if (/Sélectionnez la portée/.test(issue)) {
        const targetKey = weaponKey || $('.weapon-toggle[data-key]')?.dataset.key
        const ok = targetKey ? await pickRangeFor(targetKey) : false
        if (!ok) { const first = $('[data-range]'); if (first) await click(first); else return { finished: false, stuck: 'aucune portée proposée', cardFxUsed } }
        continue
      }
      if (/Séparez les armes/.test(issue)) { for (const on of $$('.weapon-toggle').filter((button) => button.classList.contains('on'))) await click(on); continue }
      if (/Sélectionnez au moins une arme/.test(issue)) {
        const toggle = (weaponKey && $(`.weapon-toggle[data-key="${weaponKey}"]`)) || $$('.weapon-toggle').find((button) => !button.disabled)
        if (!toggle || toggle.disabled) return { finished: false, stuck: 'l’arme visée n’est éligible à aucune portée proposée', cardFxUsed }
        await click(toggle)
        continue
      }
      if (/arc de tir/.test(issue)) { const box = $('#fixedArcConfirmed'); if (box && !box.checked) await click(box); continue }
      if (/Encombrant a été vérifiée/.test(issue)) { const box = $('#cumbersomeConfirmed'); if (box && !box.checked) await click(box); continue }
      if (/Contrôle de Tir disponible/.test(issue)) { await click('[data-fire-control="true"]'); continue }
      if (/Choisissez le couvert observé/.test(issue)) { const none = $('[data-cover="none"]'); if (none) { await click(none); continue } }
      if (/Saisissez le jet de couvert/.test(issue)) { const confirm = $$('.phase-confirm').find((button) => /jet de couvert/i.test(text(button))); if (confirm) { await click(confirm); continue } }
      if (/Validez les modifications/.test(issue)) { const confirm = $('[data-phase-confirm="mods"]'); if (confirm) { await click(confirm); continue } }
      if (/Cible interdite/.test(issue)) {
        const unlock = $('[data-target-unlock]')
        if (unlock) { await click(unlock); continue }
        return { finished: false, stuck: 'cible interdite par une règle sans bouton de déblocage : ' + issue, cardFxUsed }
      }
      if (/Contrôle de ciblage : répondez/.test(issue)) { const no = $$('[data-target-ask$=":no"]')[0]; if (no) { await click(no); continue } }
      if (/Répondez Oui ou Non/.test(issue)) { const pending = $$('[data-condition][data-value="true"]').find((button) => !button.classList.contains('on')); if (pending) { await click(pending); continue } }
      if (/Sabre Lancé/.test(issue)) { const cancel = $('[data-card-fx-undo]'); if (cancel) { await click(cancel); continue } return { finished: false, stuck: 'Sabre Lancé : saisie de dés spécifique non pilotée par cet audit', cardFxUsed } }
      if (/jet saisi contient|réserve en contient/.test(issue)) { const all = $('[data-all-blank="roll"]'); if (all) { await click(all); continue } }
      if (/jet de défense saisi contient|doivent être lancés/.test(issue)) { const all = $('[data-all-blank="def"]'); if (all) { await click(all); continue } }
      if (/Gardien doit saisir/.test(issue)) { const none = $('[data-guardian-id=""]'); if (none) { await click(none); continue } }
      if (/Coup de Chance|relances/.test(issue)) { attackState.rerolled = 0; attackState.defenseRerolled = 0; await nextAttack(); continue }
      return { finished: false, stuck: 'blocage non reconnu par l’audit : ' + issue, cardFxUsed }
    }
    return { finished: false, stuck: 'trop d’itérations (boucle probable)', cardFxUsed }
  }

  // --- Orchestration (fiches, matrice d'attaques, actions de fiche). ---
  function engineSafe(key) {
    const p = window.SWL_REFERENCE.weapons[key]
    if (!p) return false
    return (p.weapons || []).every((w) => w.verifiedAgainstCard) && (!p.defenseColor || p.defenseVerifiedAgainstCard) && (!p.unitStats || p.unitStats.verifiedAgainstCard)
  }
  const keywordNames = Object.fromEntries((window.SWL_REFERENCE.keywords || []).map((keyword) => [keyword.id, keyword.name]))
  const shortName = (id) => norm((keywordNames[id] || id).split(':')[0].replace(/\s+X\b.*$/i, ''))
  const sideUnits = (sideId) => entries.filter((entry) => entry.army === sideId && entry.occurrence === 1)
  const resetToPicker = async () => { attackState = null; attackStep = 0; attacker = null; defender = null; stage = 1; stageWipe = true; pick('attacker'); await settle() }

  async function run() {
    const sideIds = [...new Set(entries.map((entry) => entry.army))]
    if (sideIds.length < 2) { say('error', 'listes', 'Deux camps sont nécessaires pour dérouler des attaques (une seule liste chargée).'); return finish() }

    const allCards = new Map()
    for (const entry of entries) for (const name of [entry.unit.name, ...(entry.unit.upgrades || []).map((upgrade) => upgrade.name)]) allCards.set(name, cardKey(name))
    const unsafe = [...allCards.entries()].filter(([, key]) => !engineSafe(key))
    if (unsafe.length) {
      say('error', 'certification', `${unsafe.length} carte(s) sans dés/défense/courage certifiés : ${unsafe.map(([name]) => name).join(', ')}`)
      log('Corrigez ces cartes dans l’écran « Certification des cartes », puis relancez l’audit.')
      return finish()
    }
    log('Certification : toutes les cartes utilisées sont certifiées. Poursuite de l’audit.')

    log('\n--- Fiches d’unité : chaque mot-clé imprimé doit apparaître sur la fiche ---')
    let sheetsChecked = 0
    for (const sideId of sideIds) {
      selectedArmy = sideId
      pick('attacker')
      await settle()
      for (const entry of sideUnits(sideId)) {
        await click($(`.unit-tile[data-id="${entry.id}"]`))
        dismissDialogs()
        if (!$('.overview')) { say('error', 'fiche', `${entry.unit.name} : la fiche d’unité ne s’est pas affichée`); continue }
        sheetsChecked += 1
        const sheetText = norm(text(root))
        for (const name of [entry.unit.name, ...(entry.unit.upgrades || []).map((upgrade) => upgrade.name)]) {
          for (const tag of (window.SWL_REFERENCE.tags[cardKey(name)] || [])) {
            if (!sheetText.includes(shortName(tag.keywordId))) say('error', 'placement', `${entry.unit.name} : le mot-clé « ${keywordNames[tag.keywordId] || tag.keywordId} » (carte ${name}) n’apparaît pas sur la fiche`)
          }
        }
        await click('#back')
      }
    }
    log(`${sheetsChecked} fiche(s) contrôlée(s).`)

    log('\n--- Attaques : chaque arme, contre chaque unité adverse, dans les deux sens ---')
    let attacksRun = 0, attacksBlocked = 0, attacksWithNewErrors = 0
    const cardFxSeen = new Set()
    for (const [attackerSide, defenderSide] of [[sideIds[0], sideIds[1]], [sideIds[1], sideIds[0]]]) {
      selectedArmy = attackerSide
      pick('attacker')
      await settle()
      for (const entry of sideUnits(attackerSide)) {
        const cards = [entry.unit.name, ...(entry.unit.upgrades || []).map((upgrade) => upgrade.name)]
        const weapons = cards.flatMap((card) => (profileFor(card)?.weapons || []).map((weapon, index) => ({ card, key: norm(card) + ':' + index, name: weapon.name, variable: weapon.dice === 'variable' })))
        if (!weapons.length) { say('warning', 'armes', `${entry.unit.name} : aucune arme exploitable par le moteur`); continue }
        for (const weapon of weapons) {
          if (weapon.variable) { say('warning', 'armes', `${entry.unit.name} / ${weapon.name} : réserve variable, non pilotée par cet audit`); continue }
          for (const target of sideUnits(defenderSide)) {
            await click($(`.unit-tile[data-id="${entry.id}"]`))
            dismissDialogs()
            await click('#next')
            await click($(`.unit-tile[data-id="${target.id}"]`))
            dismissDialogs()
            if (!$('.resolve-center')) { say('error', 'attaque', `${entry.unit.name} → ${target.unit.name} : l’écran de résolution ne s’est pas ouvert`); await resetToPicker(); continue }
            const errorsBefore = errors.length
            const result = await autoResolveAttack({ weaponKey: weapon.key })
            attacksRun += 1
            const newErrors = errors.slice(errorsBefore)
            if (newErrors.length) { attacksWithNewErrors += 1; say('error', 'erreur', `${entry.unit.name} (${weapon.name}) → ${target.unit.name} : ${newErrors.join(' | ')}`) }
            if (!result.finished) { attacksBlocked += 1; say('error', 'blocage', `${entry.unit.name} (${weapon.name}) → ${target.unit.name} : ${result.stuck}`) }
            for (const key of result.cardFxUsed) cardFxSeen.add(key)
            await resetToPicker()
          }
        }
      }
      log(`  … ${attacksRun} attaque(s) rejouée(s)`)
    }
    log(`${attacksRun} attaque(s) rejouée(s), ${attacksBlocked} blocage(s), ${attacksWithNewErrors} avec une erreur JavaScript, ${cardFxSeen.size} effet(s) de carte exercé(s).`)

    log('\n--- Actions de fiche disponibles immédiatement ---')
    let actionsRun = 0
    for (const sideId of sideIds) {
      selectedArmy = sideId
      pick('attacker')
      await settle()
      for (const entry of sideUnits(sideId)) {
        await click($(`.unit-tile[data-id="${entry.id}"]`))
        dismissDialogs()
        if (!$('.overview')) { await resetToPicker(); continue }
        for (let guard = 0; guard < 15; guard += 1) {
          const button = $$('[data-kw-apply-action]:not([disabled])')[0] || $$('[data-card-fx]:not([disabled])')[0]
          if (!button) break
          const label = button.dataset.kwApplyAction || button.dataset.cardFx
          const errorsBefore = errors.length
          await click(button)
          actionsRun += 1
          const newErrors = errors.slice(errorsBefore)
          if (newErrors.length) say('error', 'action-fiche', `${entry.unit.name} : l’action « ${label} » a provoqué une erreur : ${newErrors.join(' | ')}`)
        }
        await click('#back')
      }
    }
    log(`${actionsRun} action(s) de fiche exercée(s).`)
    await resetToPicker()
    return finish()
  }

  function finish() {
    const errorCount = findings.filter((f) => f.level === 'error').length
    const warningCount = findings.filter((f) => f.level === 'warning').length
    const summaryText = errorCount ? `ÉCHEC : ${errorCount} problème(s) bloquant(s), ${warningCount} avertissement(s).` : `OK : 0 erreur, 0 blocage (${warningCount} avertissement(s) non bloquant(s)).`
    log('\n' + '='.repeat(60) + '\n' + summaryText)
    render(`<p class="${errorCount ? 'self-audit-fail' : 'self-audit-ok'}"><strong>${summaryText}</strong></p>${!errorCount ? '' : '<p class="self-audit-help">Le détail complet est listé ci-dessous.</p>'}`)
    if (window.parent !== window) { try { window.parent.postMessage({ source: 'swl-self-audit', done: true, errorCount, warningCount, findings }, location.origin) } catch { /* origine différente : rien à faire, le rapport reste affiché ici */ } }
    return { errorCount, warningCount, findings }
  }

  run().catch((error) => { say('error', 'audit', 'Erreur inattendue de l’audit lui-même : ' + (error?.message || error)); finish() })
})()
