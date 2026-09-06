(function applyVerifiedReferenceCorrections() {
  const tags = window.SWL_REFERENCE?.tags;
  if (!tags) return;

  // Précis 1 appartient à la Lunette de Visée, pas à l'unité Stormtroopers.
  // Il ne s'applique donc que si cette amélioration figure dans l'import.
  if (Array.isArray(tags.stormtroopers)) {
    tags.stormtroopers = tags.stormtroopers.filter((tag) => tag.keywordId !== 'precis-x');
  }
})();
