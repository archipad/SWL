import { DiceIcon } from '../lib/diceIcons';
import { ATTACK_DICE, DEFENSE_DICE, facePercent, type DiceDef, type DiceFace } from '../lib/diceStats';

function FaceCell({ face, sides }: { face: DiceFace; sides: number }) {
  return (
    <td className="dice-prob-cell">
      {face.type ? <DiceIcon type={face.type} /> : <span className="dice-prob-blank">Vierge</span>}
      <span className="dice-prob-count">{face.count}/{sides}</span>
      <span className="dice-prob-pct">{facePercent(face.count, sides)}</span>
    </td>
  );
}

function DiceTable({ dice }: { dice: DiceDef[] }) {
  return (
    <div className="dice-prob-table-wrap">
      <table className="dice-prob-table">
        <tbody>
          {dice.map((die) => (
            <tr key={die.id}>
              <th scope="row" className="dice-prob-name">
                <span className="dice-swatch" style={{ background: die.swatch }} aria-hidden="true" />
                {die.label}
              </th>
              {die.faces.map((face, i) => (
                <FaceCell key={i} face={face} sides={die.sides} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Probabilités des résultats de chaque dé, pris isolément (pas d'une
 * réserve complète — ça dépend des dés choisis pour l'attaque). Utile pour
 * évaluer en un coup d'œil les chances d'un jet, ex. avant de dépenser un
 * pion Viser ou de choisir d'attendre une meilleure ouverture.
 */
export function DiceProbabilities() {
  return (
    <details className="dice-probabilities no-print">
      <summary>Probabilités des dés</summary>
      <p className="import-note">
        Composition de chaque dé pris isolément — une réserve complète mélange plusieurs dés (et
        les relances, adrénalines, mots-clés changent tout), donc ces pourcentages ne sont pas la
        chance de réussir une attaque précise, juste un repère rapide sur un dé donné.
      </p>
      <h4 className="dice-prob-heading">Dés d'attaque</h4>
      <DiceTable dice={ATTACK_DICE} />
      <h4 className="dice-prob-heading">Dés de défense</h4>
      <DiceTable dice={DEFENSE_DICE} />
      <p className="dice-prob-footnote">
        <DiceIcon type="adr-atq" /> / <DiceIcon type="adr-def" /> (Adrénaline) ne sont pas des
        résultats en soi : elles se convertissent selon le mot-clé natif de l'unité, celui de
        l'arme utilisée, ou un pion dépensé — sinon elles restent vierges.
      </p>
    </details>
  );
}
