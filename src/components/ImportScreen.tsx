import { useState } from 'react';

const EXAMPLE = `Alliance Rebelle
Commandant
Leia Organa (100)
- Amour désespéré (5)
Corps
Rebel Troopers (44)
- Rebel Trooper Sergeant (7)
- Z-6 Trooper (16)
Forces Spéciales
Fenn Rau (60)
Total : 227/800`;

interface Props {
  onParse: (text: string) => void;
}

export function ImportScreen({ onParse }: Props) {
  const [text, setText] = useState('');

  return (
    <div className="import-screen">
      <h2>Importer une liste d'armée</h2>
      <ol className="import-steps">
        <li>Ouvrez votre liste sur Tabletop Admiral (ou un autre créateur de listes).</li>
        <li>Choisissez la vue texte de la liste, puis copiez le texte.</li>
        <li>Collez-le ci-dessous et cliquez sur « Analyser ».</li>
      </ol>
      <textarea
        className="import-textarea"
        placeholder="Collez ici l'export texte de votre liste…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
      />
      <div className="import-actions">
        <button type="button" className="btn btn-ghost" onClick={() => setText(EXAMPLE)}>
          Voir un exemple
        </button>
        <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={() => onParse(text)}>
          Analyser la liste
        </button>
      </div>
      <p className="import-note">
        Le format d'export varie selon les sites : le parseur reconnaît les lignes de section
        (Commandant, Corps, Forces Spéciales…), les unités et améliorations au format
        « Nom (points) », avec ou sans puce. Les lignes non reconnues restent visibles pour
        vérification plutôt que d'être perdues.
      </p>
    </div>
  );
}
