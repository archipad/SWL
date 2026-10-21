/* Résolveur partagé de la certification automatique β (page bêta, audit, récupération des visuels, tests).
   Il ne lit que des données locales : métadonnées Tabletop Admiral (noms, titres, coûts, mots-clés), inventaire des visuels
   du dépôt et table explicite d'alias. Une adresse d'image distante n'est jamais un visuel disponible, et aucun rapprochement
   ambigu n'est fait en silence : il est signalé comme « ambigu » ou « proposé » pour la validation humaine. */
(function (root) {
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const fullEnglish = (card) => [card.englishName, card.englishTitle].filter(Boolean).join(' ')
  const fullFrench = (card) => (card.frenchName ? [card.frenchName, card.frenchTitle].filter(Boolean).join(' ') : null)
  const metaKind = (kind) => (kind === 'contingency' ? 'command' : kind)
  // Faction canonique : « Alliance Rebelle » (site), « rebel » (export Tabletop Admiral) et « Rebels » désignent la même faction.
  const FACTIONS = [['rebels', /rebel/], ['empire', /empire|imperial|imperiale/], ['republic', /republi/], ['separatists', /separat|confederation/], ['mercenary', /mercenar|shadow collective/], ['mandalorians', /mandalor/]]
  const factionOf = (value) => { const text = normalize(value); return text ? FACTIONS.find(([, pattern]) => pattern.test(text))?.[0] || text : null }
  const localSrc = (src) => (/^\.\.\/(cards|commandcards)\/[A-Za-z0-9._/-]+\.(jpe?g|png|webp)$/i.test(src || '') && !String(src).slice(3).includes('..') ? src : null)

  function create({ reference = {}, commandCards = [], catalog = [], inventory = {}, glossary = {}, cardKey }) {
    const keyOf = cardKey || ((name) => { let key = normalize(name); const seen = new Set(); while (reference.aliases?.[key] && !seen.has(key)) { seen.add(key); key = reference.aliases[key] } return key })
    const assets = inventory.assets || {}
    const aliases = inventory.aliases || { cards: {}, commands: {} }
    const cardFiles = new Set(inventory.localCardFiles || [])
    const commandFiles = new Set(inventory.localCommandFiles || [])
    const byKind = { unit: [], upgrade: [], command: [] }
    for (const card of catalog) byKind[card.kind]?.push(card)
    const titleCount = new Map()
    for (const card of catalog) { const key = `${card.kind}:${normalize(card.englishName)}`; if (!titleCount.has(key)) titleCount.set(key, new Set()); titleCount.get(key).add(normalize(card.englishTitle)) }
    const uniqueShortName = (card) => (titleCount.get(`${card.kind}:${normalize(card.englishName)}`)?.size || 0) === 1
    const frenchNameIndex = new Map()
    for (const [key, name] of Object.entries(reference.names || {})) { const n = normalize(name); if (!frenchNameIndex.has(n)) frenchNameIndex.set(n, []); frenchNameIndex.get(n).push(key) }
    const swlFile = (key) => { const file = String(reference.images?.[key] || '').split('/').pop(); return file && cardFiles.has(file) ? file : null }
    const commandKeys = (card) => new Set([card.id.replace(/-/g, ' '), keyOf(card.name), ...[...String(card.requirement || '').matchAll(/\(([^)]+)\)/g)].map((match) => keyOf(match[1]))])
    const commandById = new Map(commandCards.map((card) => [card.id, card]))
    // Décisions certifiées du dépôt (src/data/autoCertificationDecisions.json), communes à tous les appareils.
    const decisions = inventory.decisions || { variants: {}, validations: {} }
    const historical = inventory.historical || {}
    const hashes = inventory.hashes || {}
    const withHash = (visual) => (visual && !visual.sha256 && hashes[visual.src?.slice(3)] ? { ...visual, sha256: hashes[visual.src.slice(3)] } : visual)

    /** Décision de variante certifiée pour ce nom de liste ; une contrainte de faction n'est appliquée qu'à une liste de cette faction. */
    function variantDecision(name, kind, context = {}) {
      const decision = decisions.variants?.[`${metaKind(kind)}:${normalize(name)}`]
      if (!decision) return null
      if (decision.factions?.length) {
        const allowed = new Set(decision.factions.map(factionOf))
        if (!(context.factions || []).map(factionOf).some((faction) => faction && allowed.has(faction))) return null
      }
      return decision
    }

    /** Métadonnées d'une carte de liste : exacte (nom anglais complet), par nom français, décision certifiée, ambiguë ou introuvable. */
    function findMeta(name, kind, context = {}) {
      const pool = byKind[metaKind(kind)] || []
      const target = normalize(name), targetKey = keyOf(name)
      let options = pool.filter((card) => normalize(fullEnglish(card)) === target || keyOf(fullEnglish(card)) === targetKey)
      let certainty = 'exact'
      if (!options.length) { options = pool.filter((card) => fullFrench(card) && normalize(fullFrench(card)) === target); certainty = 'french' }
      // « GALAAR-90 Sniper Rifle (Armament) » : la précision désigne un emplacement, pas un nom ; plusieurs cartes restent ambiguës.
      const bare = String(name).replace(/\s*\([^)]*\)\s*$/, '')
      if (!options.length && bare !== name) { options = pool.filter((card) => normalize(fullEnglish(card)) === normalize(bare)); certainty = 'sans-precision' }
      // Amélioration renommée par l'import du site (« Cassian Andor Operative », « Chewbacca Upgrade ») : nom Tabletop Admiral d'origine.
      const collided = metaKind(kind) === 'upgrade' && Object.entries(reference.upgradeNameCollisions || {}).find(([, renamed]) => normalize(renamed) === target)
      if (!options.length && collided) { options = pool.filter((card) => normalize(fullEnglish(card)) === normalize(collided[0])); certainty = 'collision' }
      if (!options.length) return { meta: null, certainty: 'none', options: [] }
      if (options.length > 1) {
        // Doublons Tabletop Admiral (même nom et titre) : jamais de choix silencieux, sauf alias confirmé explicite.
        const confirmed = options.filter((card) => (card.kind === 'command' ? aliases.commands?.[card.sourceId] : aliases.cards?.[`${card.kind}:${card.sourceId}`])?.status === 'confirmed')
        if (confirmed.length === 1) return { meta: confirmed[0], certainty: 'alias', options }
        const decision = variantDecision(name, kind, context)
        const decided = decision && options.find((card) => card.sourceId === decision.sourceId)
        if (decided) return { meta: decided, certainty: 'decision', decision, options }
        return { meta: null, certainty: 'ambiguous', options }
      }
      return { meta: options[0], certainty, options }
    }

    const retrieved = (meta, lang) => {
      const asset = assets[`${meta.kind}:${meta.sourceId}:${lang}`]
      const src = asset && localSrc(`../cards/${asset.file}`)
      if (!src) return null
      const sourceLabel = asset.sourceType === 'amg-official' ? 'Ressource officielle AMG/Asmodee' : asset.sourceType === 'pdf-fr-local' ? 'Extrait d’un PDF français local' : 'Source externe autorisée'
      return { src, source: sourceLabel, origin: asset.pdfPage ? `${asset.pdfName || asset.sourceUrl}, page ${asset.pdfPage}` : asset.sourceUrl, sha256: asset.sha256, certainty: asset.identification?.status === 'a-controler' ? 'proposed' : 'certain', file: asset.file }
    }

    /** Visuel français local : alias explicite → public/cards / public/commandcards → PDF français extrait → introuvable. */
    function localFrench(meta) {
      if (meta.kind === 'command') {
        const alias = aliases.commands?.[meta.sourceId]
        const byAlias = alias && commandById.get(alias.localId)
        if (byAlias && commandFiles.has(`${byAlias.id}.jpg`)) return { src: localSrc(`../commandcards/${byAlias.id}.jpg`), source: 'Visuel déjà présent dans public/commandcards/', origin: `${byAlias.id}.jpg`, certainty: alias.status === 'confirmed' ? 'certain' : 'proposed', frenchName: byAlias.name, evidence: alias.evidence }
        const english = keyOf(meta.englishName), french = normalize(meta.frenchName)
        const matches = commandCards.filter((card) => (french && normalize(card.name) === french) || commandKeys(card).has(english))
        if (matches.length > 1) return { ambiguous: matches.map((card) => card.name) }
        if (matches.length === 1 && commandFiles.has(`${matches[0].id}.jpg`)) return { src: localSrc(`../commandcards/${matches[0].id}.jpg`), source: 'Visuel déjà présent dans public/commandcards/', origin: `${matches[0].id}.jpg`, certainty: 'certain', frenchName: matches[0].name }
        return retrieved(meta, 'fr')
      }
      const alias = aliases.cards?.[`${meta.kind}:${meta.sourceId}`]
      if (alias?.frenchVisual === false) return retrieved(meta, 'fr') // visuel du site qui n'est pas une carte française
      if (alias) { const file = swlFile(alias.localKey); if (file) return { src: localSrc(`../cards/${file}`), source: 'Visuel déjà présent dans public/cards/', origin: file, certainty: alias.status === 'confirmed' ? 'certain' : 'proposed', frenchName: alias.frenchName || reference.names?.[alias.localKey], evidence: alias.evidence } }
      const exactFile = swlFile(keyOf(fullEnglish(meta)))
      if (exactFile) return { src: localSrc(`../cards/${exactFile}`), source: 'Visuel déjà présent dans public/cards/', origin: exactFile, certainty: 'certain', frenchName: reference.names?.[keyOf(fullEnglish(meta))] }
      const keys = [...(fullFrench(meta) ? frenchNameIndex.get(normalize(fullFrench(meta))) || [] : [])]
      if (meta.englishTitle && uniqueShortName(meta)) keys.push(keyOf(meta.englishName))
      const files = [...new Set(keys.map((key) => [key, swlFile(key)]).filter(([, file]) => file).map(([key, file]) => `${key}|${file}`))]
      const distinct = [...new Set(files.map((entry) => entry.split('|')[1]))]
      if (distinct.length > 1) return { ambiguous: distinct }
      if (distinct.length === 1) { const key = files[0].split('|')[0]; return { src: localSrc(`../cards/${distinct[0]}`), source: 'Visuel déjà présent dans public/cards/', origin: distinct[0], certainty: 'certain', frenchName: reference.names?.[key] } }
      return retrieved(meta, 'fr')
    }

    /** Clé du référentiel SWL (données moteur) : alias explicite, nom anglais complet, nom français, nom court non ambigu. */
    function swlKey(meta) {
      if (!meta || meta.kind === 'command') return null
      const alias = aliases.cards?.[`${meta.kind}:${meta.sourceId}`]
      if (alias && (reference.weapons?.[alias.localKey] || reference.names?.[alias.localKey])) return { key: alias.localKey, via: alias.status === 'confirmed' ? 'alias explicite' : 'alias proposé', certain: alias.status === 'confirmed' }
      const has = (key) => !!(reference.weapons?.[key] || reference.names?.[key])
      // Amélioration homonyme d'une unité (« Cassian Andor », « Chewbacca ») : même table de collisions que le site.
      const collision = meta.kind === 'upgrade' && reference.upgradeNameCollisions?.[normalize(fullEnglish(meta))]
      if (collision && has(keyOf(collision))) return { key: keyOf(collision), via: 'collision amélioration/unité', certain: true }
      const english = keyOf(fullEnglish(meta))
      if (has(english)) return { key: english, via: 'nom anglais', certain: true }
      const french = fullFrench(meta) ? (frenchNameIndex.get(normalize(fullFrench(meta))) || []).filter(has) : []
      if (french.length === 1) return { key: french[0], via: 'nom français', certain: true }
      if (french.length > 1) return { ambiguous: french }
      if (meta.englishTitle && uniqueShortName(meta) && has(keyOf(meta.englishName))) return { key: keyOf(meta.englishName), via: 'nom court (variante unique)', certain: true }
      return null
    }

    const pdfEntry = (meta) => (inventory.pdf || []).find((entry) => (entry.nameEn && normalize(entry.nameEn) === normalize(fullEnglish(meta))) || (fullFrench(meta) && normalize(entry.nameFr) === normalize(fullFrench(meta)))) || null
    // Glossaire V2.6 : formes exactes (« IMMUNE: PIERCE ») ou génériques (« TEAMWORK: UNIT NAME », « COMPEL: RANK/UNIT TYPE »).
    // Une forme générique ne traduit que la base ; la précision propre à la carte reste à confirmer par le validateur.
    const stripValue = (name) => String(name).replace(/\s*\[X\]\s*$/i, '').replace(/\s+X$/i, '').trim()
    const GENERIC = /UNIT|RANK|NAME|TYPE|\//
    function frenchKeyword(keyword) {
      // « N/A » dans l'index V2.6 = pas de traduction ; la table explicite (terme de la carte française) prend alors le relais.
      const entries = Object.entries(glossary.keywords || {}).filter(([, value]) => value?.fr && !/^\s*n\/?a\s*$/i.test(value.fr))
      const explicit = Object.entries(aliases.keywordTranslations || {}).find(([english]) => normalize(stripValue(english)) === normalize(stripValue(keyword.name)))
      if (explicit) return { fr: explicit[1], partial: false }
      const name = stripValue(keyword.name)
      const exact = entries.find(([en]) => normalize(stripValue(en)) === normalize(name))
      if (exact) return { fr: exact[1].fr, partial: false }
      const [base, ...rest] = name.split(':'), qualifier = stripValue(rest.join(':').trim())
      // Base d'une entrée générique : avant « : », ou avant le premier mot-gabarit (« RETINUE UNIT/UNIT TYPE » → RETINUE).
      const genericBase = (text) => { const [head, ...tail] = String(text).split(':'); if (tail.length) return GENERIC.test(tail.join(':')) ? stripValue(head) : null; const words = stripValue(text).split(/\s+/); const at = words.findIndex((word) => /^(UNIT|NAME|TYPE|RANK|NOM|TYPE|RANG|UNITÉ)\b|\//i.test(word)); return at > 0 ? words.slice(0, at).join(' ') : null }
      const compactOf = (text) => normalize(text).replace(/ /g, '')
      const close = (a, b) => { const x = compactOf(a), y = compactOf(b); if (x === y) return 1; if (Math.min(x.length, y.length) < 6) return 0; let distance = 0; const row = Array.from({ length: y.length + 1 }, (_, i) => i); for (let i = 1; i <= x.length; i += 1) { let previous = row[0]; row[0] = i; for (let j = 1; j <= y.length; j += 1) { const temp = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (x[i - 1] === y[j - 1] ? 0 : 1)); previous = temp } } distance = row[y.length]; return 1 - distance / Math.max(x.length, y.length) }
      const scored = entries.map(([en, value]) => ({ value, base: genericBase(en) })).filter((entry) => entry.base).map((entry) => ({ ...entry, score: close(entry.base, base) })).filter((entry) => entry.score >= 0.9).sort((a, b) => b.score - a.score)
      if (!scored.length) return { fr: null, partial: false }
      const frenchBase = genericBase(scored[0].value.fr) || scored[0].value.fr.split(':')[0].trim()
      return { fr: qualifier ? `${frenchBase} : ${qualifier}` : frenchBase, partial: !!qualifier || scored[0].score < 1 }
    }

    /** États indépendants d'une carte (aucune donnée n'est inventée). */
    function status(meta) {
      if (!meta) return { metadata: false, en: null, fr: null, frAmbiguous: null, pdf: null, frenchName: null, keywords: [], newKeywords: [], translationComplete: false, ready: false }
      const en = withHash(retrieved(meta, 'en'))
      const french = localFrench(meta)
      const fr = french && !french.ambiguous ? withHash(french) : null
      const frenchName = fr?.frenchName || fullFrench(meta) || null
      const keywords = (meta.keywords || []).filter((keyword) => !/^\s*n\/?a\s*$/i.test(keyword.name || '')).map((keyword) => { const french = frenchKeyword(keyword); return { name: keyword.name, definition: keyword.definition, fr: french.fr, partial: french.partial } })
      const newKeywords = keywords.filter((keyword) => !keyword.fr)
      return { metadata: true, en, fr, frAmbiguous: french?.ambiguous || null, pdf: fr ? null : pdfEntry(meta), frenchName, keywords, newKeywords, translationComplete: !!frenchName && !newKeywords.length, ready: !!en && !!fr }
    }

    /** Quatre états d'une carte importée. Seule une carte « certifiée et inchangée » se passe de comparaison EN/FR :
        certification historique présente et inchangée depuis l'index (données, visuel français, définitions), identité
        Tabletop Admiral rattachée sans ambiguïté, aucun mot-clé Tabletop Admiral nouveau. */
    const STATE_LABEL = { certified: 'certifiée et inchangée', obsolete: 'certification devenue obsolète', incomplete: 'carte connue mais incomplète', new: 'carte réellement nouvelle' }
    function classify(name, kind, match) {
      const meta = match?.meta
      const out = (state, reasons, extra = {}) => ({ state, label: STATE_LABEL[state], reasons, ...extra })
      if (!meta) {
        if ((match?.options || []).length > 1) return out('incomplete', ['identité incertaine : plusieurs cartes Tabletop Admiral possibles'])
        return reference.names?.[keyOf(name)] || reference.images?.[keyOf(name)] ? out('incomplete', ['carte connue du site, absente des métadonnées Tabletop Admiral']) : out('new', ['carte absente des métadonnées et du référentiel SWL'])
      }
      if (meta.kind === 'command') {
        const french = localFrench(meta)
        return french && !french.ambiguous ? out('incomplete', ['carte de commandement connue (visuel français), sans certification historique']) : out('new', ['carte de commandement absente du paquet du site'])
      }
      const found = swlKey(meta)
      if (!found) return out('new', ['carte inconnue du référentiel SWL'])
      if (found.ambiguous || !found.certain) return out('incomplete', ['identité SWL incertaine'], { key: found.key || null })
      const entry = historical[found.key]
      if (!entry) return out('incomplete', ['certification complète absente'], { key: found.key })
      if (!entry.valid) return out('obsolete', entry.reasons, { key: found.key, historical: entry })
      const id = `${meta.kind}:${meta.sourceId}`
      if (entry.cardType !== meta.kind || !entry.tta?.[id]) return out('incomplete', ['identité Tabletop Admiral non rattachée à cette certification'], { key: found.key, historical: entry })
      const added = (meta.keywords || []).map((keyword) => keyword.name).filter((keyword) => keyword && !/^\s*n\/?a\s*$/i.test(keyword) && !entry.tta[id].includes(keyword))
      if (added.length) return out('obsolete', [`nouveau mot-clé Tabletop Admiral : ${added.join(', ')}`], { key: found.key, historical: entry })
      return out('certified', [], { key: found.key, historical: entry })
    }

    /** Une validation n'est valable que si les deux visuels ont gardé leur empreinte SHA-256. Le visuel anglais AMG « usage
        personnel » n'est pas publié : en ligne, son empreinte (jamais son chemin) vient de l'inventaire publié. */
    // Visuel anglais importé sur l'appareil (jamais publié) : seule son empreinte compte ; s'il a été supprimé après la
    // validation, l'empreinte retenue fait foi, et un autre fichier importé à sa place invalide la validation.
    function validationIntact(meta, state, entry, localEnglishSha256) {
      if (!meta || !entry) return false
      const s = state || status(meta)
      // Ordre : visuel affiché (publié ou AMG local), visuel importé sur l'appareil, empreinte AMG publiée, empreinte retenue.
      const english = s.en?.sha256 || localEnglishSha256 || (entry.englishSource === 'import-local' ? entry.englishSha256 : inventory.personalHashes?.[`${meta.kind}:${meta.sourceId}:en`])
      return !!english && !!s.fr?.sha256 && english === entry.englishSha256 && s.fr.sha256 === entry.frenchSha256
    }
    /** Validation publiée dans le dépôt (commune à tous les appareils). */
    function publishedValidation(meta, state, localEnglishSha256) {
      const entry = meta && decisions.validations?.[`${meta.kind}:${meta.sourceId}`]
      return entry ? { ...entry, intact: validationIntact(meta, state, entry, localEnglishSha256) } : null
    }

    return { findMeta, variantDecision, classify, publishedValidation, validationIntact, localFrench, swlKey, status, fullEnglish, fullFrench, normalize, keyOf }
  }

  root.SWL_AUTO_CERT_RESOLVER = { create, normalize, fullEnglish, fullFrench, localSrc, factionOf }
})(typeof window !== 'undefined' ? window : globalThis)
