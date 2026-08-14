import { useState } from 'react';

const JSON_EXAMPLE = `{"listname":"Empire 1","points":992,"author":"Tabletop Admiral","numActivations":11,"armyFaction":"empire","battleForce":null,"commandCards":["Standing Orders"],"contingencies":[],"units":[{"name":"Darth Vader Dark Lord of the Sith","upgrades":["Saber Throw","Force Choke","Force Reflexes"],"loadout":[]},{"name":"Stormtroopers","upgrades":["DLT-19 Stormtrooper","Stormtrooper Specialist"],"loadout":[]}]}`;

const TEXT_EXAMPLE = `Alliance Rebelle
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
        <li>
          Sur Tabletop Admiral, exportez votre liste en <strong>JSON</strong> (le plus fiable — noms
          de cartes exacts) ou copiez la vue texte.
        </li>
        <li>Collez le résultat ci-dessous.</li>
        <li>Cliquez sur « Analyser » — le format (JSON ou texte) est détecté automatiquement.</li>
      </ol>
      <textarea
        className="import-textarea"
        placeholder="Collez ici le JSON ou l'export texte de votre liste…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
      />
      <div className="import-actions">
        <button type="button" className="btn btn-ghost" onClick={() => setText(JSON_EXAMPLE)}>
          Exemple JSON
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setText(TEXT_EXAMPLE)}>
          Exemple texte
        </button>
        <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={() => onParse(text)}>
          Analyser la liste
        </button>
      </div>
      <p className="import-note">
        Import JSON (recommandé) : reconnaît directement le format exporté par Tabletop Admiral —
        unités, améliorations, faction, points totaux, cartes Commandement. Import texte : le
        parseur reconnaît les lignes de section (Commandant, Corps, Forces Spéciales…) et les
        cartes au format « Nom (points) », avec ou sans puce ; les lignes non reconnues restent
        visibles pour vérification plutôt que d'être perdues.
      </p>
    </div>
  );
}
