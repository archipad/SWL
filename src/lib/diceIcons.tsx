import { Fragment } from 'react';

/**
 * Rendu des icônes de résultat de dé dans les définitions du glossaire.
 *
 * Les chaînes de src/data/keywords.ts contiennent des jetons texte
 * [TOUCHE] [CRITIQUE] [BLOC] [ADR-ATQ] [ADR-DEF] à la place des vrais
 * symboles imprimés sur les cartes (remplace un ancien rendu en caractères
 * Unicode approchés — ▼ ✹ ● ◆ ◇ — qui pouvait se lire de travers, cf.
 * l'historique dans keywords.ts). Les silhouettes utilisées ici (public/
 * icons/dice/*.png) sont détourées à partir des icônes du site fan
 * Codex-Xesh (https://thoutoum.github.io/Codex-Xesh/, licence MIT), indiqué
 * par l'utilisateur comme référence pour les bonnes formes officielles.
 */

export type DiceIconType = 'touche' | 'critique' | 'bloc' | 'adr-atq' | 'adr-def';

const DICE_ICON_META: Record<DiceIconType, { file: string; label: string }> = {
  touche: { file: 'hit.png', label: 'Touche' },
  critique: { file: 'crit.png', label: 'Critique' },
  bloc: { file: 'block.png', label: 'Bloc' },
  'adr-atq': { file: 'asurge.png', label: 'Adrénaline (attaque)' },
  'adr-def': { file: 'dsurge.png', label: 'Adrénaline (défense)' },
};

const TOKEN_TO_TYPE: Record<string, DiceIconType> = {
  '[TOUCHE]': 'touche',
  '[CRITIQUE]': 'critique',
  '[BLOC]': 'bloc',
  '[ADR-ATQ]': 'adr-atq',
  '[ADR-DEF]': 'adr-def',
};

const TOKEN_RE = /(\[(?:TOUCHE|CRITIQUE|BLOC|ADR-ATQ|ADR-DEF)\])/g;

/** Icône d'un résultat de dé, dessinée avec la vraie forme officielle. */
export function DiceIcon({ type }: { type: DiceIconType }) {
  const meta = DICE_ICON_META[type];
  const src = `${import.meta.env.BASE_URL}icons/dice/${meta.file}`;
  const style = { WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` } as const;
  return <span className="dice-icon" role="img" aria-label={meta.label} title={meta.label} style={style} />;
}

/**
 * Découpe un texte de définition contenant des jetons [TOUCHE] etc. en
 * fragments texte + <DiceIcon>, pour un affichage riche (glossaire, écran
 * Combat...).
 */
export function DefinitionText({ text }: { text: string }) {
  const parts = text.split(TOKEN_RE);
  return (
    <>
      {parts.map((part, i) => {
        const type = TOKEN_TO_TYPE[part];
        return type ? <DiceIcon key={i} type={type} /> : <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/**
 * Version texte simple (tooltip natif `title`, etc.) où une icône n'est pas
 * affichable : remplace chaque jeton par le mot qu'il désigne.
 */
export function stripDiceTokens(text: string): string {
  return text.replace(TOKEN_RE, (m) => DICE_ICON_META[TOKEN_TO_TYPE[m]].label);
}
