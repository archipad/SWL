import { useCallback, useEffect, useState } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { ArmyScreen } from './components/ArmyScreen';
import { CombatScreen } from './components/CombatScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { importArmyList } from './lib/importList';
import { usePersistentState } from './lib/storage';
import { useKeywordLibrary } from './lib/useKeywordLibrary';
import { useCardTags } from './lib/useCardTags';
import type { ParsedList } from './types';

type Page = 'setup' | 'army' | 'combat' | 'library';
type PlayerId = 'p1' | 'p2';

const OLD_SINGLE_LIST_KEY = 'swl.current-list.v1';

export default function App() {
  const [listP1, setListP1] = usePersistentState<ParsedList | null>('swl.list.p1.v1', null);
  const [listP2, setListP2] = usePersistentState<ParsedList | null>('swl.list.p2.v1', null);
  const [page, setPage] = usePersistentState<Page>('swl.page.v1', 'setup');
  const [activePlayer, setActivePlayer] = useState<PlayerId>('p1');
  const { keywords, upsertKeyword, removeKeyword, resetToDefaults } = useKeywordLibrary();
  const { library: tagLibrary, getTags, addTag, removeTag } = useCardTags();

  // Reprend, une seule fois, l'ancienne liste unique (avant le passage à deux
  // joueurs) comme liste du Joueur 1, pour ne rien perdre à cette mise à jour.
  useEffect(() => {
    if (listP1 !== null) return;
    try {
      const raw = localStorage.getItem(OLD_SINGLE_LIST_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ParsedList | null;
      if (parsed) setListP1(parsed);
      localStorage.removeItem(OLD_SINGLE_LIST_KEY);
    } catch {
      // rien à migrer
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bothReady = listP1 !== null && listP2 !== null;

  const handleParseP1 = useCallback((text: string) => setListP1(importArmyList(text)), [setListP1]);
  const handleParseP2 = useCallback((text: string) => setListP2(importArmyList(text)), [setListP2]);
  const handleAddTag = useCallback(
    (cardName: string, keywordId: string, value?: number) => addTag(cardName, { keywordId, value }),
    [addTag],
  );

  const goToPage = (target: Page) => {
    if ((target === 'army' || target === 'combat') && !bothReady) {
      setPage('setup');
      return;
    }
    setPage(target);
  };

  const activeList = activePlayer === 'p1' ? listP1 : listP2;
  const activeLabel = activePlayer === 'p1'
    ? (listP1?.listName ?? listP1?.faction ?? 'Joueur 1')
    : (listP2?.listName ?? listP2?.faction ?? 'Joueur 2');

  let content;
  if (page === 'library') {
    content = (
      <LibraryScreen
        keywords={keywords}
        tagLibrary={tagLibrary}
        onUpsert={upsertKeyword}
        onRemove={removeKeyword}
        onResetDefaults={resetToDefaults}
        onRemoveCardTag={removeTag}
      />
    );
  } else if (page === 'combat' && bothReady) {
    content = (
      <CombatScreen listP1={listP1} listP2={listP2} tagLibrary={tagLibrary} keywords={keywords} />
    );
  } else if (page === 'army' && bothReady && activeList) {
    content = (
      <div className="army-page">
        <div className="player-toggle no-print">
          <button type="button" className={activePlayer === 'p1' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setActivePlayer('p1')}>
            Joueur 1
          </button>
          <button type="button" className={activePlayer === 'p2' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setActivePlayer('p2')}>
            Joueur 2
          </button>
        </div>
        <ArmyScreen
          list={activeList}
          playerLabel={activeLabel}
          tagLibrary={tagLibrary}
          keywords={keywords}
          getTags={getTags}
          onAddTag={handleAddTag}
          onRemoveTag={removeTag}
          onCreateKeyword={upsertKeyword}
          onChangeList={() => {
            if (activePlayer === 'p1') setListP1(null); else setListP2(null);
            setPage('setup');
          }}
        />
      </div>
    );
  } else {
    content = (
      <SetupScreen
        listP1={listP1}
        listP2={listP2}
        onParseP1={handleParseP1}
        onParseP2={handleParseP2}
        onClearP1={() => setListP1(null)}
        onClearP2={() => setListP2(null)}
      />
    );
  }

  return (
    <div className="app">
      <header className="app-header no-print">
        <h1>Legion Compagnon</h1>
        <nav>
          <button type="button" className={page === 'setup' ? 'active' : ''} onClick={() => setPage('setup')}>Listes</button>
          <button type="button" className={page === 'army' ? 'active' : ''} disabled={!bothReady} onClick={() => goToPage('army')}>Armées</button>
          <button type="button" className={page === 'combat' ? 'active' : ''} disabled={!bothReady} onClick={() => goToPage('combat')}>Combat</button>
          <button type="button" className={page === 'library' ? 'active' : ''} onClick={() => setPage('library')}>Glossaire complet</button>
        </nav>
      </header>

      <main>{content}</main>

      <footer className="app-footer no-print">
        <p>
          Outil non officiel réalisé pour un usage personnel entre joueurs. Star Wars: Legion est
          une marque d'Atomic Mass Games / Lucasfilm — ce site n'y est pas affilié.
        </p>
      </footer>
    </div>
  );
}
