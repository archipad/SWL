import { usePersistentState } from './storage';
import { canonicalCardKey } from './cardNames';

/** Dernier choix d'armes (indices) + nombre de figurines par arme, pour une carte donnée. */
export interface WeaponPref {
  selected: number[];
  counts: Record<number, number>;
}

const STORAGE_KEY = 'swl.weapon-prefs.v1';

/**
 * Retient, par carte (unité ou amélioration), le dernier choix d'armes fait
 * dans le Combat interactif — armes cochées + nombre de figurines par arme
 * — pour ne pas avoir à tout reconfigurer à chaque "Nouveau combat" avec la
 * même unité. Persisté en localStorage, indépendant du combat en cours
 * (clé = nom canonique de la carte, pas l'attaquant/défenseur du moment).
 */
export function useWeaponPreferences() {
  const [prefs, setPrefs] = usePersistentState<Record<string, WeaponPref>>(STORAGE_KEY, {});

  const getPref = (cardName: string): WeaponPref | undefined => prefs[canonicalCardKey(cardName)];

  const savePref = (cardName: string, pref: WeaponPref) => {
    setPrefs((prev) => ({ ...prev, [canonicalCardKey(cardName)]: pref }));
  };

  return { getPref, savePref };
}
