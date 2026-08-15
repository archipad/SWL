import { useMemo, useState } from 'react';
import type { KeywordDef } from '../types';
import { slugifyKeywordId } from '../lib/useKeywordLibrary';

interface Props {
  keywords: KeywordDef[];
  existingIds: Set<string>;
  onAdd: (keywordId: string, value?: number) => void;
  onCreateKeyword: (kw: KeywordDef) => void;
  onClose: () => void;
}

export function KeywordTagEditor({ keywords, existingIds, onAdd, onCreateKeyword, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDef, setNewDef] = useState('');
  const [newHasValue, setNewHasValue] = useState(false);
  const [newImpact, setNewImpact] = useState<KeywordDef['impact']>('autre');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = keywords.filter((k) => !existingIds.has(k.id));
    if (!q) return pool.slice(0, 8);
    return pool.filter((k) => k.name.toLowerCase().includes(q)).slice(0, 8);
  }, [keywords, existingIds, query]);

  const selected = keywords.find((k) => k.id === selectedId) ?? null;

  if (creating) {
    return (
      <form
        className="tag-editor"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          const id = slugifyKeywordId(newName);
          onCreateKeyword({
            id, name: newName.trim(), hasValue: newHasValue, impact: newImpact,
            category: 'autre', definition: newDef.trim() || '(définition à compléter)', custom: true,
          });
          onAdd(id, newHasValue ? Number(value) || undefined : undefined);
          onClose();
        }}
      >
        <label className="field">
          Nom du mot-clé
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ex. Grenadier" />
        </label>
        <label className="field">
          Définition
          <textarea value={newDef} onChange={(e) => setNewDef(e.target.value)} rows={2} placeholder="Explication courte pour la table de jeu" />
        </label>
        <label className="field">
          Impact
          <select value={newImpact} onChange={(e) => setNewImpact(e.target.value as KeywordDef['impact'])}>
            <option value="attaque">Attaque</option>
            <option value="défense">Défense</option>
            <option value="autre">Autre</option>
          </select>
        </label>
        <label className="field field-inline">
          <input type="checkbox" checked={newHasValue} onChange={(e) => setNewHasValue(e.target.checked)} />
          Porte une valeur numérique (X)
        </label>
        {newHasValue && (
          <label className="field">
            Valeur sur cette carte
            <input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="ex. 2" />
          </label>
        )}
        <div className="tag-editor-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>← Retour</button>
          <button type="submit" className="btn btn-primary">Créer et ajouter</button>
        </div>
      </form>
    );
  }

  return (
    <div className="tag-editor">
      <input
        className="tag-editor-search"
        autoFocus
        placeholder="Chercher un mot-clé…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelectedId(null); }}
      />
      <ul className="tag-editor-results">
        {results.map((k) => (
          <li key={k.id}>
            <button type="button" className={selectedId === k.id ? 'active' : ''} onClick={() => setSelectedId(k.id)}>
              {k.name}
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="tag-editor-empty">Aucun résultat</li>}
      </ul>
      {selected?.hasValue && (
        <label className="field">
          Valeur sur cette carte (X)
          <input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="ex. 2" />
        </label>
      )}
      <div className="tag-editor-actions">
        <button type="button" className="btn btn-ghost" onClick={() => setCreating(true)}>+ Nouveau mot-clé</button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!selected}
          onClick={() => { if (selected) { onAdd(selected.id, selected.hasValue ? Number(value) || undefined : undefined); onClose(); } }}
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}
