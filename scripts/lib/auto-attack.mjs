/* Pilote générique d'une attaque (22/09/2026), pour les audits qui doivent « jouer » le moteur
   réel sans connaître à l'avance les mots-clés/améliorations en jeu : à chaque étape, on lit
   stepIssue() (la même fonction que l'appli utilise pour griser/verrouiller le bouton « Étape
   suivante ») et on choisit une réponse par défaut sûre pour chaque type de blocage connu.
   Inspiré du pilote déjà utilisé par audit-keyword-surfacing.mjs (attackFlow), généralisé pour
   piloter n'importe quelle arme d'une liste importée plutôt qu'une seule carte de démonstration.

   Choix par défaut (documentés pour qui relit un rapport d'audit) :
   - Portée : la plus basse qui rend l'arme visée éligible.
   - Contrôle de Tir / conditions « Répondez Oui ou Non » : réponse OUI (exerce le bonus/la règle).
   - Contrôles de ciblage (Incognito, Discret…) qui POSENT une question : réponse NON (l'attaque
     continue) ; ceux qui BLOQUENT franchement : bouton de déblocage manuel (exerce ce mécanisme).
   - Couvert : aucun (le jet de couvert à 0 est toujours valide).
   - Dés : par défaut (mode 'blank'), remplis au total attendu via la case « vierge » -- 0 touche,
     0 critique, ce qui ne fait jamais de blessure et ne peut donc jamais exercer les mécaniques à
     seuil (Impact, Perforant, Létal, Primitif, Armure, Bouclier). Deux modes non vierges (voir
     scripts/audit-list-playthrough.mjs) :
       - 'max-attack' : jet d'ATTAQUE rempli entièrement en critiques, modificateurs optionnels
         (Impact, Armure, Boucliers actifs/annulés) remplis à leur maximum affiché -- de vraies
         blessures sont infligées et ces mécaniques s'exécutent pour de vrai. Défense vierge.
       - 'max-both' : comme 'max-attack', mais le jet de DÉFENSE est aussi rempli au maximum de
         blocages -- exerce le chemin « tout est bloqué malgré des critiques » (Coup de Chance,
         Tenir Bon, Déflexion qui forcent un résultat de défense).
   - Effets de carte proposés (panneau bleu) : chaque bouton disponible est cliqué une fois. */
const norm = (value) => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim()

/** Choisit, parmi les boutons de portée affichés, celui qui rend l'arme `weaponKey` sélectionnable. */
async function pickRangeFor(app, weaponKey) {
  const candidates = app.$$('[data-range]')
  for (const button of candidates) {
    await app.click(button)
    const toggle = app.$(`.weapon-toggle[data-key="${weaponKey}"]`)
    if (toggle && !toggle.disabled) return true
  }
  return false
}

/**
 * Rejoue une attaque déjà entamée (attaquant + défenseur choisis, écran de résolution affiché)
 * jusqu'à son terme (« Nouvelle attaque ») ou jusqu'à un blocage réel.
 * @param {object} app       instance rendue par openAssistant()
 * @param {object} [opts]
 * @param {string} [opts.weaponKey]   data-key de l'arme à utiliser en priorité à l'étape 1
 * @param {number} [opts.maxSteps]    garde-fou anti-boucle
 * @param {'blank'|'max-attack'|'max-both'} [opts.diceMode]   voir en-tête du fichier
 * @returns {Promise<{finished:boolean, stuck:string, seen:Record<string,string>, cardFxUsed:string[]}>}
 */
export async function autoResolveAttack(app, opts = {}) {
  const { weaponKey = null, maxSteps = 80, diceMode = 'blank' } = opts
  const seen = {}
  const cardFxUsed = []
  const add = (label, text) => { seen[label] = (seen[label] || '') + ' ' + text }
  const evalStr = (code) => { try { return app.window.eval(code) } catch { return null } }
  let previousIssue = null, repeats = 0
  for (let i = 0; i < maxSteps; i += 1) {
    if (!app.$('.resolve-center')) return { finished: false, stuck: 'écran de résolution absent (l’attaque a été interrompue ailleurs)', seen, cardFxUsed }
    const step = Number(evalStr('attackStep'))
    add('S' + (step + 1), app.text(app.$('.resolve-center')))
    const dialogText = app.$$('dialog').map((dialog) => app.text(dialog)).join(' ')
    if (dialogText) add('POPUP', dialogText)
    app.dismissDialogs()

    const issue = evalStr('typeof stepIssue==="function"?stepIssue():null')
    if (!issue) {
      // Aucun blocage : exploite une fois chaque effet de carte proposé (panneau bleu), puis avance.
      const fxButtons = app.$$('[data-card-fx]:not([disabled])')
      if (fxButtons.length) {
        const key = fxButtons[0].dataset.cardFx
        await app.click(fxButtons[0])
        cardFxUsed.push(key)
        continue
      }
      if (step >= 5) { await app.nextAttack(); return { finished: true, stuck: '', seen, cardFxUsed } }
      await app.nextAttack()
      continue
    }

    if (issue === previousIssue) repeats += 1; else { previousIssue = issue; repeats = 0 }
    if (repeats > 2) return { finished: false, stuck: 'aucune progression possible : ' + issue, seen, cardFxUsed }

    // --- Dispatch par motif du message, du plus spécifique au plus générique. ---
    if (/Sélectionnez la portée/.test(issue)) {
      const targetKey = weaponKey || app.$('.weapon-toggle[data-key]')?.dataset.key
      const ok = targetKey ? await pickRangeFor(app, targetKey) : false
      if (!ok) { const first = app.$('[data-range]'); if (first) await app.click(first); else return { finished: false, stuck: 'aucune portée proposée', seen, cardFxUsed } }
      continue
    }
    if (/Séparez les armes/.test(issue)) {
      for (const on of app.$$('.weapon-toggle').filter((button) => button.classList.contains('on') || app.text(button.closest('.weapon-choice')).includes('✓'))) await app.click(on)
      continue
    }
    if (/Sélectionnez au moins une arme/.test(issue)) {
      const toggle = (weaponKey && app.$(`.weapon-toggle[data-key="${weaponKey}"]`)) || app.$$('.weapon-toggle').find((button) => !button.disabled)
      if (!toggle || toggle.disabled) return { finished: false, stuck: 'l’arme visée n’est éligible à aucune portée proposée', seen, cardFxUsed }
      await app.click(toggle)
      continue
    }
    if (/arc de tir/.test(issue)) { const box = app.$('#fixedArcConfirmed'); if (box && !box.checked) { await app.click(box) } continue }
    if (/Encombrant a été vérifiée/.test(issue)) { const box = app.$('#cumbersomeConfirmed'); if (box && !box.checked) { await app.click(box) } continue }
    if (/Contrôle de Tir disponible/.test(issue)) { await app.click('[data-fire-control="true"]'); continue }
    if (/Choisissez le couvert observé/.test(issue)) { const none = app.$('[data-cover="none"]'); if (none) { await app.click(none); continue } }
    if (/Saisissez le jet de couvert/.test(issue)) { const confirm = app.$$('.phase-confirm').find((button) => /jet de couvert/i.test(app.text(button))); if (confirm) { await app.click(confirm); continue } }
    if (/Validez les modifications/.test(issue)) {
      if (diceMode === 'max-attack' || diceMode === 'max-both') {
        // Pousse Impact, Armure et Boucliers à leur maximum affiché plutôt que de les laisser à 0 :
        // sinon ces champs optionnels ne bloquent jamais et leur code n'est jamais vraiment exercé.
        let filled = false
        for (const id of ['activeShields', 'shieldHit', 'shieldCrit', 'impact', 'armor']) {
          const input = app.$('#' + id)
          if (input && Number(input.value) !== Number(input.max) && Number(input.max) > 0) { await app.setValue(id, input.max); filled = true }
        }
        if (filled) continue
      }
      const confirm = app.$('[data-phase-confirm="mods"]'); if (confirm) { await app.click(confirm); continue }
    }
    if (/Cible interdite/.test(issue)) {
      const unlock = app.$('[data-target-unlock]')
      if (unlock) { await app.click(unlock); continue }
      return { finished: false, stuck: 'cible interdite par une règle sans bouton de déblocage : ' + issue, seen, cardFxUsed }
    }
    if (/Contrôle de ciblage : répondez/.test(issue)) { const no = app.$$('[data-target-ask$=":no"]')[0]; if (no) { await app.click(no); continue } }
    if (/Répondez Oui ou Non/.test(issue)) {
      const pending = app.$$('[data-condition][data-value="true"]').find((button) => !button.classList.contains('on'))
      if (pending) { await app.click(pending); continue }
    }
    if (/Sabre Lancé/.test(issue)) {
      // Mécanique très spécifique (dés à recopier depuis une autre arme) : non pilotée ici, on annule le choix.
      const cancel = app.$('[data-card-fx-undo]')
      if (cancel) { await app.click(cancel); continue }
      return { finished: false, stuck: 'Sabre Lancé : saisie de dés spécifique non pilotée par cet audit', seen, cardFxUsed }
    }
    if (/jet saisi contient|réserve en contient/.test(issue)) {
      if (diceMode === 'max-attack' || diceMode === 'max-both') {
        const total = Number((issue.match(/réserve en contient (\d+)/) || [])[1])
        if (total) { await app.setValue('rollCrit', total); continue }
      }
      const all = app.$('[data-all-blank="roll"]'); if (all) { await app.click(all); continue }
    }
    if (/jet de défense saisi contient|doivent être lancés/.test(issue)) {
      if (diceMode === 'max-both') {
        const total = Number((issue.match(/mais (\d+) doivent être lancés/) || [])[1])
        if (total) { await app.setValue('defBlock', total); continue }
      }
      const all = app.$('[data-all-blank="def"]'); if (all) { await app.click(all); continue }
    }
    if (/Gardien doit saisir/.test(issue)) {
      // Le Gardien est une option (jamais activée par défaut ici) : si elle l'a été par un effet de carte, on la désactive plutôt que de deviner un jet.
      const none = app.$('[data-guardian-id=""]')
      if (none) { await app.click(none); continue }
    }
    if (/Coup de Chance|relances/.test(issue)) { evalStr('attackState.rerolled=0;attackState.defenseRerolled=0'); await app.nextAttack(); continue }

    return { finished: false, stuck: 'blocage non reconnu par l’audit : ' + issue, seen, cardFxUsed }
  }
  return { finished: false, stuck: 'trop d’itérations (boucle probable)', seen, cardFxUsed }
}

export { norm }
