(function applyKeywordSections() {
  const keywords = window.SWL_REFERENCE?.keywords;
  if (!Array.isArray(keywords)) return;

  const activation = new Set([
    'aguerri', 'cible-x', 'tacticien-x', 'observateur-x', 'operationnel-x',
    'defense-x', 'distraire', 'generateur-x', 'mettre-a-couvert-x', 'preste-x',
    'recharger-x', 'regenerer-x', 'reparation-x', 'restauration', 'traiter-x',
  ]);
  const sections = {
    'charge': ['autre', 'attaque'],
    'implacable': ['autre', 'attaque'],
    'surveillance-x': ['autre', 'attaque'],
    'fumee-x': ['autre', 'attaque', 'défense'],
    'discret': ['autre', 'défense'],
    'accomplir-la-mission': ['autre', 'attaque', 'défense'],
    'duelliste': ['attaque', 'défense'],
    'exemplaire': ['attaque', 'défense'],
    'maitrise-de-lataru': ['attaque', 'défense'],
    'maitrise-du-vaapad': ['attaque', 'défense'],
    'tenir-bon': ['attaque', 'défense'],
    'transport-x': ['autre', 'attaque', 'défense'],
    'non-combattant': ['attaque', 'défense'],
    'indifferent': ['autre', 'défense'],
    'les-mandaloriens-sont-plus-forts-ensemble': ['attaque', 'défense'],
  };

  function classify(keyword) {
    if (activation.has(keyword.id)) keyword.impact = 'autre';
    if (sections[keyword.id]) keyword.displaySections = sections[keyword.id];
    return keyword;
  }

  keywords.forEach(classify);

  // Met aussi à niveau les données déjà enregistrées sur l'appareil.
  try {
    const stored = JSON.parse(localStorage.getItem('swl.keywords.v1') || 'null');
    if (Array.isArray(stored)) {
      stored.forEach(classify);
      localStorage.setItem('swl.keywords.v1', JSON.stringify(stored));
    }
  } catch {
    // Une donnée locale illisible sera ignorée par l'assistant comme auparavant.
  }
})();
