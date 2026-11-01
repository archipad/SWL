import compact from '../data/workshopCompactKeywords.json';
import type { WorkshopRule } from './cardWorkshop';

export type WorkshopTextMode = 'compact' | 'full';
/** Only the current keyword's marked parameters are substituted; other keywords keep their own X. */
export function workshopRulesForMode(rules: WorkshopRule[], mode: WorkshopTextMode): WorkshopRule[] {
  if (mode === 'full') return rules;
  return rules.map(rule => {
    const [id, rawValue] = rule.id.split(':');
    const entry = (compact.keywords as Record<string, {text:string;airText?:string;groundText?:string;actionText?:string}>)[id];
    if (!entry) return rule; // Never invent or truncate an unreviewed personal definition.
    const numeric = /^\d+$/.test(rawValue ?? '') ? rawValue : undefined;
    const values = [...new Set(rule.title.match(/\b\d+\b/g) ?? [])];
    // A shared keyword with several weapon values keeps X rather than silently choosing one.
    const x = values.length > 1 && rule.title.includes(' / ') ? 'X' : numeric ?? 'X';
    const y = rule.title.match(/Capacité\s+(\d+)/i)?.[1] ?? 'Y';
    const singular: Record<string,string> = {touches:'touche',critiques:'critique',blocs:'bloc',dés:'dé',figurines:'figurine',armes:'arme',Suppressions:'Suppression',Esquives:'Esquive',Blessures:'Blessure',Ioniques:'Ionique',Immobilisations:'Immobilisation',Surveillances:'Surveillance',Charges:'Charge',pions:'pion'};
    const template = id === 'autonome' && /Se déplacer|Viser|Esquiver|Récupérer/i.test(rule.title) && !/\d/.test(rule.title) ? entry.actionText ?? entry.text : id === 'sustentation' && /Aérienne/i.test(rule.title) && !/Terrestre/i.test(rule.title) ? entry.airText ?? entry.text : id === 'sustentation' && /Terrestre/i.test(rule.title) && !/Aérienne/i.test(rule.title) ? entry.groundText ?? entry.text : entry.text;
    const text = template.replaceAll('{X}', x).replaceAll('{Y}', y).replace(/\b1 (touches|critiques|blocs|dés|figurines|armes|Suppressions|Esquives|Blessures|Ioniques|Immobilisations|Surveillances|Charges|pions)\b/g, (_, word: string) => '1 ' + singular[word]).replace(/1 dé supplémentaires/g, '1 dé supplémentaire');
    return {...rule, text};
  });
}
