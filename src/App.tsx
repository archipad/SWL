import { useCallback, useEffect, useState } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { ArmyScreen } from './components/ArmyScreen';
import { GameTrackerScreen } from './components/GameTrackerScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { CheatSheetScreen } from './components/CheatSheetScreen';
import { PrintCardsScreen } from './components/PrintCardsScreen';
import { importArmyList } from './lib/importList';
import { usePersistentState } from './lib/storage';
import { useKeywordLibrary } from './lib/useKeywordLibrary';
import { useCardTags } from './lib/useCardTags';
import { useSync } from './lib/useSync';
import { useGameTracker } from './lib/useGameTracker';
import type { ParsedList } from './types';

type Page = 'setup' | 'army' | 'game' | 'library' | 'cheatsheet' | 'print-cards';
type PlayerId = 'p1' | 'p2';

const OLD_SINGLE_LIST_KEY = 'swl.current-list.v1';

export default function App() {
  const [listP1, setListP1] = usePersistentState<ParsedList | null>('swl.list.p1.v1', null);
  const [listP2, setListP2] = usePersistentState<ParsedList | null>('swl.list.p2.v1', null);
  const [page, setPage] = usePersistentState<Page>('swl.page.v1', 'setup');
  const [activePlayer, setActivePlayer] = useState<PlayerId>('p1');
  const { keywords, upsertKeyword, removeKeyword, resetToDefaults } = useKeywordLibrary();
  const { library: tagLibrary, getTags, addTag, removeTag } = useCardTags();
  const gameTracker = useGameTracker();
  const sync = useSync({ listP1, listP2, setListP1, setListP2, gameTracker: gameTracker.state, setGameTracker: gameTracker.replace });

  useEffect(() => {
    const openRequestedScreen = () => {
      if (window.location.hash === '#suivi-partie') setPage('game');
    };
    openRequestedScreen();
    window.addEventListener('hashchange', openRequestedScreen);
    return () => window.removeEventListener('hashchange', openRequestedScreen);
  }, [setPage]);

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

  const handleParseP1 = useCallback((text: string) => {
    const parsed = importArmyList(text);
    setListP1(parsed);
    sync.push(parsed, listP2);
  }, [setListP1, listP2, sync]);
  const handleParseP2 = useCallback((text: string) => {
    const parsed = importArmyList(text);
    setListP2(parsed);
    sync.push(listP1, parsed);
  }, [setListP2, listP1, sync]);
  const handleClearP1 = useCallback(() => {
    setListP1(null);
    sync.push(null, listP2);
  }, [setListP1, listP2, sync]);
  const handleClearP2 = useCallback(() => {
    setListP2(null);
    sync.push(listP1, null);
  }, [setListP2, listP1, sync]);
  const handleAddTag = useCallback(
    (cardName: string, keywordId: string, value?: number) => addTag(cardName, { keywordId, value }),
    [addTag],
  );

  const goToPage = (target: Page) => {
    if ((target === 'army' || target === 'game') && !bothReady) {
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
  if (page === 'cheatsheet') {
    content = <CheatSheetScreen />;
  } else if (page === 'print-cards') {
    content = <PrintCardsScreen />;
  } else if (page === 'library') {
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
  } else if (page === 'game' && bothReady) {
    content = (
      <GameTrackerScreen
        listP1={listP1}
        listP2={listP2}
        tracker={gameTracker}
        onSync={(state) => sync.push(listP1, listP2, state)}
        syncStatus={sync.status}
        lastSyncAt={sync.lastSyncAt}
      />
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
            if (activePlayer === 'p1') handleClearP1(); else handleClearP2();
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
        tagLibrary={tagLibrary}
        keywords={keywords}
        onParseP1={handleParseP1}
        onParseP2={handleParseP2}
        onClearP1={handleClearP1}
        onClearP2={handleClearP2}
        sync={sync}
      />
    );
  }

  // Habillage « console tactique » du Suivi de partie, étendu à toutes les
  // pages de la SPA pour une identité visuelle unique (police Rajdhani,
  // fond quadrillé, titres orange) — voir index.css, règles
  // ".app-game-tracker" et les sélecteurs dédiés .cheatsheet-screen /
  // .library-screen / .print-cards-screen juste en dessous.

  return (
    <div className="app app-game-tracker">
      <header className="app-header no-print">
        <h1>Legion Compagnon</h1>
        <nav>
          <button type="button" className={page === 'setup' ? 'active' : ''} onClick={() => setPage('setup')}>
            <span className="nav-icon" aria-hidden="true">📋</span>Listes
          </button>
          <button type="button" className={page === 'army' ? 'active' : ''} disabled={!bothReady} onClick={() => goToPage('army')}>
            <span className="nav-icon" aria-hidden="true">🗂️</span>Armées
          </button>
          <button type="button" className={page === 'game' ? 'active' : ''} disabled={!bothReady} onClick={() => goToPage('game')}>
            <span className="nav-icon" aria-hidden="true">🎯</span>Suivi de partie
          </button>
          {/* Page autonome distincte (public/assistant/), pas un onglet de cette
              SPA : lien externe plutôt qu'une entrée de Page/setPage. Navigue
              dans le même onglet (demande explicite de l'utilisateur). Placée
              juste après Suivi de partie, comme demandé. */}
          <a className="nav-external" href="https://archipad.github.io/SWL/assistant/">
            <span className="nav-icon" aria-hidden="true">⚔️</span>Assistant d'unité
          </a>
          <button type="button" className={page === 'library' ? 'active' : ''} onClick={() => setPage('library')}>
            <span className="nav-icon" aria-hidden="true">🔍</span>Glossaire complet
          </button>
          <button type="button" className={page === 'cheatsheet' ? 'active' : ''} onClick={() => setPage('cheatsheet')}>
            <span className="nav-icon" aria-hidden="true">📝</span>Pense-bête
          </button>
          <button type="button" className={page === 'print-cards' ? 'active' : ''} onClick={() => setPage('print-cards')}>
            <span className="nav-icon" aria-hidden="true">🖨️</span>Imprimer des cartes
          </button>
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
