import { useCallback } from 'react';
import { ImportScreen } from './components/ImportScreen';
import { ArmyScreen } from './components/ArmyScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { parseArmyListText } from './lib/parseList';
import { usePersistentState } from './lib/storage';
import { useKeywordLibrary } from './lib/useKeywordLibrary';
import { useCardTags } from './lib/useCardTags';
import type { ParsedList } from './types';

type Page = 'army' | 'library';

export default function App() {
  const [list, setList] = usePersistentState<ParsedList | null>('swl.current-list.v1', null);
  const [page, setPage] = usePersistentState<Page>('swl.page.v1', 'army');
  const { keywords, upsertKeyword, removeKeyword, resetToDefaults } = useKeywordLibrary();
  const { library: tagLibrary, getTags, addTag, removeTag } = useCardTags();

  const handleParse = useCallback((text: string) => setList(parseArmyListText(text)), [setList]);
  const handleAddTag = useCallback(
    (cardName: string, keywordId: string, value?: number) => addTag(cardName, { keywordId, value }),
    [addTag],
  );

  return (
    <div className="app">
      <header className="app-header no-print">
        <h1>Legion Compagnon</h1>
        <nav>
          <button type="button" className={page === 'army' ? 'active' : ''} onClick={() => setPage('army')}>Ma liste</button>
          <button type="button" className={page === 'library' ? 'active' : ''} onClick={() => setPage('library')}>Glossaire complet</button>
        </nav>
      </header>

      <main>
        {page === 'library' ? (
          <LibraryScreen
            keywords={keywords}
            tagLibrary={tagLibrary}
            onUpsert={upsertKeyword}
            onRemove={removeKeyword}
            onResetDefaults={resetToDefaults}
            onRemoveCardTag={removeTag}
          />
        ) : list ? (
          <ArmyScreen
            list={list}
            tagLibrary={tagLibrary}
            keywords={keywords}
            getTags={getTags}
            onAddTag={handleAddTag}
            onRemoveTag={removeTag}
            onCreateKeyword={upsertKeyword}
            onNewList={() => setList(null)}
          />
        ) : (
          <ImportScreen onParse={handleParse} />
        )}
      </main>

      <footer className="app-footer no-print">
        <p>
          Outil non officiel réalisé pour un usage personnel entre joueurs. Star Wars: Legion est
          une marque d'Atomic Mass Games / Lucasfilm — ce site n'y est pas affilié.
        </p>
      </footer>
    </div>
  );
}
