import { useState } from 'react';
import type { CardTagLibrary, KeywordDef } from '../types';
import { slugifyKeywordId } from '../lib/useKeywordLibrary';

interface Props {
  keywords: KeywordDef[];
  tagLibrary: CardTagLibrary;
  onUpsert: (kw: KeywordDef) => void;
  onRemove: (id: string) => void;
  onResetDefaults: () => void;
  onRemoveCardTag: (cardNameKey: string, keywordId: string) => void;
}

const CATEGORY_LABELS: Record<KeywordDef['category'], string> = {
  unité: "Mots-clés d'unité",
  arme: "Mots-clés d'armes",
  carte: 'Mots-clés de cartes Amélioration et Commandement',
  autre: 'Autre',
};

const IMPACT_LABELS: Record<KeywordDef['impact'], string> = {
  attaque: 'Attaque',
  défense: 'Défense',
  autre: 'Autre',
};

function KeywordEditor({ kw, onSave, onCancel }: { kw: KeywordDef; onSave: (kw: KeywordDef) => void; onCancel: () => void }) {
  const [name, setName] = useState(kw.name);
  const [definition, setDefinition] = useState(kw.definition);
  const [category, setCategory] = useState(kw.category);
  const [impact, setImpact] = useState(kw.impact);
  const [hasValue, setHasValue] = useState(kw.hasValue);

  return (
    <form
      className="keyword-editor"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...kw, name: name.trim() || kw.name, definition: definition.trim(), category, impact, hasValue });
      }}
    >
      <label className="field">
        Nom
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        Définition
        <textarea value={definition} onChange={(e) => setDefinition(e.target.value)} rows={3} />
      </label>
      <div className="field-row">
        <label className="field">
          Section du livret
          <select value={category} onChange={(e) => setCategory(e.target.value as KeywordDef['category'])}>
            {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Impact
          <select value={impact} onChange={(e) => setImpact(e.target.value as KeywordDef['impact'])}>
            {Object.entries(IMPACT_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
        <label className="field field-inline">
          <input type="checkbox" checked={hasValue} onChange={(e) => setHasValue(e.target.checked)} />
          Valeur X
        </label>
      </div>
      <div className="tag-editor-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}

export function LibraryScreen({ keywords, tagLibrary, onUpsert, onRemove, onResetDefaults, onRemoveCardTag }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('');
  const [groupBy, setGroupBy] = useState<'impact' | 'category'>('impact');

  const byId = new Map(keywords.map((k) => [k.id, k]));
  const filtered = keywords
    .filter((k) => k.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  const groups =
    groupBy === 'impact'
      ? (['attaque', 'défense', 'autre'] as const).map((id) => ({
          id, label: IMPACT_LABELS[id], items: filtered.filter((k) => k.impact === id),
        }))
      : (['unité', 'arme', 'carte', 'autre'] as const).map((id) => ({
          id, label: CATEGORY_LABELS[id], items: filtered.filter((k) => k.category === id),
        }));
  const grouped = groups.filter((g) => g.items.length > 0);

  const cardEntries = Object.entries(tagLibrary).filter(([, tags]) => tags.length > 0);

  return (
    <div className="library-screen no-print">
      <h2>Glossaire complet</h2>
      <p className="import-note">
        Corrigez ou complétez librement ces définitions — vos modifications sont sauvegardées sur
        cet appareil. Ce ne sont pas des extraits du livret officiel : vérifiez la carte en cas de doute.
      </p>
      <p className="icon-legend">
        <strong>▼</strong> Bloc · <strong>✹</strong> Critique · <strong>●</strong> Touche ·{' '}
        <strong>◆</strong> Adrénaline (attaque) · <strong>◇</strong> Adrénaline (défense) ·{' '}
        <strong>①②③</strong> portée/distance
      </p>
      <div className="library-toolbar">
        <input placeholder="Filtrer…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button type="button" className="btn btn-ghost" onClick={() => setCreating(true)}>+ Ajouter</button>
        <button type="button" className="btn btn-ghost" onClick={onResetDefaults}>Réinitialiser les valeurs par défaut</button>
      </div>
      <div className="library-toolbar">
        <span className="group-by-label">Grouper par :</span>
        <button type="button" className={groupBy === 'impact' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setGroupBy('impact')}>
          Impact (attaque/défense)
        </button>
        <button type="button" className={groupBy === 'category' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setGroupBy('category')}>
          Section du livret
        </button>
      </div>

      {creating && (
        <KeywordEditor
          kw={{ id: '', name: '', hasValue: false, category: 'autre', impact: 'autre', definition: '', custom: true }}
          onSave={(kw) => { onUpsert({ ...kw, id: slugifyKeywordId(kw.name) }); setCreating(false); }}
          onCancel={() => setCreating(false)}
        />
      )}

      {grouped.map(({ id, label, items }) => (
        <div key={id} className="keyword-group">
          <h3>{label} <span className="keyword-count">({items.length})</span></h3>
          <ul className="keyword-list">
            {items.map((k) => (
              <li key={k.id} className="keyword-list-item">
                {editingId === k.id ? (
                  <KeywordEditor kw={k} onSave={(kw) => { onUpsert(kw); setEditingId(null); }} onCancel={() => setEditingId(null)} />
                ) : (
                  <>
                    <div>
                      <strong>{k.name}</strong>
                      {groupBy === 'category' && <span className={`impact-badge impact-${k.impact}`}>{IMPACT_LABELS[k.impact]}</span>}
                      <p>{k.definition}</p>
                    </div>
                    <div className="keyword-list-actions">
                      <button type="button" className="btn btn-ghost" onClick={() => setEditingId(k.id)}>Modifier</button>
                      <button type="button" className="btn btn-ghost btn-danger" onClick={() => onRemove(k.id)}>Supprimer</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {cardEntries.length > 0 && (
        <>
          <h2>Cartes déjà taguées</h2>
          <p className="import-note">Ces associations carte → mots-clés sont réutilisées automatiquement à chaque import.</p>
          <ul className="card-tag-list">
            {cardEntries.map(([cardKey, tags]) => (
              <li key={cardKey}>
                <strong>{cardKey}</strong>
                <div className="card-row-tags">
                  {tags.map((t) => {
                    const def = byId.get(t.keywordId);
                    if (!def) return null;
                    return (
                      <span key={t.keywordId} className="chip">
                        {def.name}{def.hasValue && t.value ? ` ${t.value}` : ''}
                        <button type="button" className="chip-remove" onClick={() => onRemoveCardTag(cardKey, t.keywordId)}>×</button>
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
