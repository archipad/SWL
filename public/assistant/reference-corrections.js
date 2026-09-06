(function applyVerifiedReferenceCorrections() {
  const tags = window.SWL_REFERENCE?.tags;
  if (!tags) return;

  // Précis 1 appartient à la Lunette de Visée, pas à l'unité Stormtroopers.
  // Il ne s'applique donc que si cette amélioration figure dans l'import.
  if (Array.isArray(tags.stormtroopers)) {
    tags.stormtroopers = tags.stormtroopers.filter((tag) => tag.keywordId !== 'precis-x');
  }

  // Les versions précédentes pouvaient avoir copié le référentiel dans le
  // stockage du navigateur. Nettoyer aussi cette copie évite de conserver
  // l'ancienne attribution après une mise à jour du site.
  try {
    const stored = JSON.parse(localStorage.getItem('swl.card-tags.v1'));
    if (stored && Array.isArray(stored.stormtroopers)) {
      stored.stormtroopers = stored.stormtroopers.filter((tag) => tag.keywordId !== 'precis-x');
      localStorage.setItem('swl.card-tags.v1', JSON.stringify(stored));
    }
  } catch {
    // Une donnée locale invalide sera ignorée par l'assistant lui-même.
  }
})();
