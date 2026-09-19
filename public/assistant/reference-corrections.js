/* Registre des corrections manuelles du référentiel — VIDE À DESSEIN.

   Historique : ce fichier retirait « Précis 1 » de l'unité Stormtroopers (et
   nettoyait le stockage local pour l'y supprimer aussi), au motif que Précis 1
   appartiendrait à la Lunette de Visée. C'était FAUX : les Stormtroopers ont
   Précis 1 sur leur carte Unité, et la Lunette de Visée en ajoute 1 (Précis 2
   avec l'amélioration), comme le donne en exemple la page « Mots-clés » de
   Legion Helper (legion.takras.net). Résultat : le moteur ignorait Précis pour
   les Stormtroopers (signalé le 19/09/2026). Supprimé le 19/09/2026.

   RÈGLE (voir docs/PROCESSUS-VERIFICATION.md) : aucune correction silencieuse.
   Une donnée de carte se corrige dans sa source certifiée (src/data/*.ts ou
   diceCertifications.json) après vérification sur la carte physique/visuelle,
   jamais par un patch appliqué au chargement. Si une correction temporaire est
   inévitable, elle s'écrit ici sous la forme
     { card, keywordId, action: 'remove'|'add', source: 'carte p.X / règle …', date }
   et le test scripts/test-assistant-contracts.mjs refuse toute correction sans
   source. Ce fichier ne modifie plus JAMAIS le stockage local de l'utilisateur. */
(function applyVerifiedReferenceCorrections() {
  const corrections = []
  const tags = window.SWL_REFERENCE?.tags
  if (!tags) return
  for (const correction of corrections) {
    if (!correction.source || !correction.date) continue
    const list = tags[correction.card] || (tags[correction.card] = [])
    if (correction.action === 'remove') tags[correction.card] = list.filter((tag) => tag.keywordId !== correction.keywordId)
    else if (correction.action === 'add' && !list.some((tag) => tag.keywordId === correction.keywordId)) list.push({ keywordId: correction.keywordId, value: correction.value })
  }
  window.SWL_REFERENCE_CORRECTIONS = corrections
})()
