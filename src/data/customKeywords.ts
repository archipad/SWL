import type { KeywordDef } from '../types';
import customKeywordsJson from './customKeywords.json';

export interface CustomKeywordEntry extends KeywordDef {
  englishName: string;
  trigger: 'setup' | 'command' | 'activation' | 'movement' | 'attack' | 'defense' | 'end-round' | 'passive';
  automation: 'automatic' | 'required-question' | 'informative';
  sourceUrl: string;
  rulesVersion: string;
  verifiedAt: string;
  /** Les quatre contrôles humains de l'atelier (traduction, définition, comportement, source). */
  checks?: { translation: boolean; definition: boolean; behavior: boolean; source: boolean };
}

export const CUSTOM_KEYWORDS: CustomKeywordEntry[] = Object.values(customKeywordsJson as Record<string, CustomKeywordEntry>);
