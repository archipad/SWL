import { COMBAT_PITFALLS } from '../data/pitfalls';
import { DefinitionText } from '../lib/diceIcons';

/**
 * Rappels de règles fréquemment mal appliquées, indépendants de l'attaquant
 * et du défenseur choisis (contrairement aux interactions détectées
 * automatiquement, cf. lib/keywordInteractions.ts et les notes ⚡ injectées
 * dans le guide pas-à-pas) — pensé pour être consulté une fois en groupe,
 * pas à chercher à nouveau à chaque partie. Repliable comme les
 * probabilités de dés, pour ne pas alourdir l'écran par défaut.
 */
export function CombatPitfalls() {
  return (
    <details className="dice-probabilities combat-pitfalls no-print">
      <summary>Pièges de résolution fréquents</summary>
      <ul className="combat-pitfalls-list">
        {COMBAT_PITFALLS.map((p) => (
          <li key={p.id}>
            <strong>{p.title}</strong>
            <p><DefinitionText text={p.text} /></p>
          </li>
        ))}
      </ul>
    </details>
  );
}
