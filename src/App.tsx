import { lazy, Suspense, useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { importArmyList } from './lib/importList';
import { usePersistentState } from './lib/storage';
import { useKeywordLibrary } from './lib/useKeywordLibrary';
import { useCardTags } from './lib/useCardTags';
import { useSync } from './lib/useSync';
import { useGameTracker } from './lib/useGameTracker';
import { FactionCrest } from './lib/navIcons';
import { CxIcon, type CxIconName } from './lib/codexIcons';
import { commandFactionForList } from './lib/commandDeck';
import type { ParsedList } from './types';

const ArmyScreen = lazy(() => import('./components/ArmyScreen').then((module) => ({ default: module.ArmyScreen })));
const GameTrackerScreen = lazy(() => import('./components/GameTrackerScreen').then((module) => ({ default: module.GameTrackerScreen })));
const CommandCardsScreen = lazy(() => import('./components/CommandCardsScreen').then((module) => ({ default: module.CommandCardsScreen })));
const LibraryScreen = lazy(() => import('./components/LibraryScreen').then((module) => ({ default: module.LibraryScreen })));
const CheatSheetScreen = lazy(() => import('./components/CheatSheetScreen').then((module) => ({ default: module.CheatSheetScreen })));
const PrintCardsScreen = lazy(() => import('./components/PrintCardsScreen').then((module) => ({ default: module.PrintCardsScreen })));

type ThemeId = 'imperial' | 'rebel';
type ThemePref = 'auto' | ThemeId;
type Page = 'setup' | 'army' | 'game' | 'commands' | 'library' | 'cheatsheet' | 'print-cards';
type PlayerId = 'p1' | 'p2';

const OLD_SINGLE_LIST_KEY = 'swl.current-list.v1';
const ASSISTANT_URL = 'https://archipad.github.io/SWL/assistant/';
/* Durée de l'animation .nav-ignite (voir index.css) : le clic sur Assistant
   d'unité doit la laisser jouer avant de quitter la SPA, sinon la
   navigation coupe l'animation avant qu'elle soit visible. */
const NAV_IGNITE_MS = 460;

/* Navigation « Codex Legion » : trois onglets en haut (sections), et une barre
   latérale qui liste les pages de la section active.
   - Gestion Armée : listes, armées, impression des cartes ;
   - Partie : suivi de partie, cartes de Commandement, pense-bête, et le
     raccourci vers l'Assistant d'unité (page autonome, lien externe) ;
   - Glossaire : bibliothèque des mots-clés. */
const PAGE_META: Record<Page, { label: string; icon: CxIconName }> = {
  setup: { label: 'Listes', icon: 'army' },
  army: { label: 'Armées', icon: 'units' },
  game: { label: 'Suivi de partie', icon: 'mission' },
  commands: { label: 'Cartes de Commandement', icon: 'strategy' },
  library: { label: 'Glossaire complet', icon: 'rules' },
  cheatsheet: { label: 'Pense-bête', icon: 'info' },
  'print-cards': { label: 'Imprimer des cartes', icon: 'dice' },
};
const SECTIONS: { id: string; label: string; icon: CxIconName; pages: Page[] }[] = [
  { id: 'armees', label: 'Gestion Armée', icon: 'army', pages: ['setup', 'army', 'print-cards'] },
  { id: 'partie', label: 'Partie', icon: 'mission', pages: ['game', 'commands', 'cheatsheet'] },
  { id: 'glossaire', label: 'Glossaire', icon: 'search', pages: ['library'] },
];
const NEEDS_LISTS: Page[] = ['army', 'game', 'commands'];

export default function App() {
  const [listP1, setListP1] = usePersistentState<ParsedList | null>('swl.list.p1.v1', null);
  const [listP2, setListP2] = usePersistentState<ParsedList | null>('swl.list.p2.v1', null);
  const [page, setPage] = usePersistentState<Page>('swl.page.v1', 'setup');
  const [activePlayer, setActivePlayer] = useState<PlayerId>('p1');
  const [themePref, setThemePref] = usePersistentState<ThemePref>('swl.theme.v1', 'auto');
  const [assistantIgniting, setAssistantIgniting] = useState(false);
  const { keywords, upsertKeyword, removeKeyword, resetToDefaults } = useKeywordLibrary();
  const { library: tagLibrary, getTags, addTag, removeTag } = useCardTags();
  const gameTracker = useGameTracker();
  const sync = useSync({ listP1, listP2, setListP1, setListP2, gameTracker: gameTracker.state, setGameTracker: gameTracker.replace });
  const bothReady = listP1 !== null && listP2 !== null;

  // Permet aux liens de navigation de l'Assistant d'unité (page HTML
  // autonome, public/assistant/) de rouvrir n'importe quel onglet de la SPA
  // via une simple ancre (ex. "../#commandement") -- sans ce mapping, seul
  // "#suivi-partie" ramenait sur un onglet précis.
  useEffect(() => {
    const HASH_PAGES: Record<string, Page> = {
      '#listes': 'setup',
      '#armees': 'army',
      '#suivi-partie': 'game',
      '#commandement': 'commands',
      '#glossaire': 'library',
      '#pense-bete': 'cheatsheet',
      '#imprimer': 'print-cards',
    };
    const openRequestedScreen = () => {
      const target = HASH_PAGES[window.location.hash];
      if (!target) return;
      if ((target === 'army' || target === 'game' || target === 'commands') && !bothReady) {
        setPage('setup');
        return;
      }
      setPage(target);
    };
    openRequestedScreen();
    window.addEventListener('hashchange', openRequestedScreen);
    return () => window.removeEventListener('hashchange', openRequestedScreen);
  }, [bothReady, setPage]);

  // Thème visuel (« Codex Legion ») : Empire = noir/rouge, Rébellion =
  // parchemin/bleu. En mode Auto il suit la faction du Joueur 1 (ou, à
  // défaut, du Joueur 2), comme le halo de fond de l'Assistant d'unité ;
  // l'interrupteur du bandeau force l'un des deux. Posé sur <html> (et non
  // <body>) pour que les variables --accent & co, déclarées sur :root, se
  // recalculent avec le thème. Sans faction reconnue, en Auto : Empire.
  const detectedFaction = commandFactionForList(listP1) ?? commandFactionForList(listP2);
  const autoTheme: ThemeId = detectedFaction === 'rebelles' ? 'rebel' : 'imperial';
  const activeTheme: ThemeId = themePref === 'auto' ? autoTheme : themePref;
  useEffect(() => {
    document.documentElement.dataset.swlTheme = activeTheme;
  }, [activeTheme]);
  const cycleTheme = () => setThemePref(themePref === 'auto' ? 'imperial' : themePref === 'imperial' ? 'rebel' : 'auto');

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
    if ((target === 'army' || target === 'game' || target === 'commands') && !bothReady) {
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
        onOpenCommandCards={() => setPage('commands')}
      />
    );
  } else if (page === 'commands' && bothReady) {
    content = (
      <CommandCardsScreen
        listP1={listP1}
        listP2={listP2}
        tracker={gameTracker}
        onSync={(state) => sync.push(listP1, listP2, state)}
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

  const currentSection = SECTIONS.find((section) => section.pages.includes(page));
  const sectionLanding = (section: (typeof SECTIONS)[number]): Page => (
    section.id === 'armees' && bothReady
      ? 'army'
      : section.pages.find((target) => bothReady || !NEEDS_LISTS.includes(target)) ?? section.pages[0]
  );
  // Assistant d'unité : page autonome distincte (public/assistant/), pas un onglet de cette
  // SPA. Navigue dans le même onglet (demande explicite de l'utilisateur). Le clic déclenche
  // d'abord l'effet d'ignition (classe .igniting, voir index.css) avant de naviguer, sinon la
  // navigation coupe l'animation avant qu'elle soit visible ; la page d'arrivée rejoue ensuite
  // son propre « star wipe » (public/assistant/header-sync.css).
  const openAssistant = (event: ReactMouseEvent) => {
    event.preventDefault();
    // Pas d'attente artificielle si l'utilisateur a demandé de réduire les animations :
    // l'effet ne joue pas (voir la garde prefers-reduced-motion dans index.css).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.location.href = ASSISTANT_URL;
      return;
    }
    setAssistantIgniting(true);
    setTimeout(() => { window.location.href = ASSISTANT_URL; }, NAV_IGNITE_MS);
  };

  return (
    <div className="app app-game-tracker">
      {/* Champ d'étoiles discret en fond, en plus du quadrillage existant
          (voir body:has(.app-game-tracker) dans index.css) — premier enfant,
          sans z-index : peint donc derrière le contenu normal mais devant
          le fond uni du body. Respecte prefers-reduced-motion (index.css). */}
      <div className="starfield" aria-hidden="true"><i className="shooting-star" /></div>
      <header className="cx-topbar no-print">
        <div className="cx-logo">
          <h1>Legion Compagnon</h1>
          {/* Aurebesh purement décoratif (police Droidobesh Depot, sans accents) : jamais du texte à lire. */}
          <span className="aurebesh" aria-hidden="true">Legion Companion</span>
        </div>
        <nav className="cx-tabs" aria-label="Sections">
          {SECTIONS.map((section) => {
            const isActive = section.pages.includes(page);
            const locked = !bothReady && section.pages.every((target) => NEEDS_LISTS.includes(target));
            return (
              <button
                key={section.id}
                type="button"
                className={`cx-tab${isActive ? ' active' : ''}`}
                disabled={locked}
                onClick={() => goToPage(isActive ? page : sectionLanding(section))}
              >
                <CxIcon name={section.icon} /><span>{section.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="cx-topbar-right">
          <span className="aurebesh" aria-hidden="true">Rebel Alliance</span>
          <button
            type="button"
            className="cx-gear"
            onClick={cycleTheme}
            title="Changer de thème : Auto (suit la faction du Joueur 1) → Empire → Rébellion"
            aria-label={`Thème : ${themePref === 'auto' ? 'automatique' : themePref === 'imperial' ? 'Empire' : 'Rébellion'}. Changer de thème.`}
          >
            <CxIcon name="settings" />
            <small>{themePref === 'auto' ? 'Auto' : themePref === 'imperial' ? 'Empire' : 'Rébellion'}</small>
          </button>
        </div>
      </header>

      <div className="cx-body">
        <aside className="cx-sidebar no-print" aria-label="Menu de la section">
          <div className="cx-sidebar-inner">
            <div className="cx-faction">
              <FactionCrest />
              <strong>{activeTheme === 'imperial' ? 'Empire' : 'Alliance Rebelle'}</strong>
              <span className="aurebesh" aria-hidden="true">{activeTheme === 'imperial' ? 'Galactic Empire' : 'Rebel Alliance'}</span>
            </div>
            <ul className="cx-menu">
              {(currentSection?.pages ?? []).map((target) => {
                const locked = !bothReady && NEEDS_LISTS.includes(target);
                return (
                  <li key={target}>
                    <button type="button" className={`cx-menu-item${page === target ? ' active' : ''}`} disabled={locked} onClick={() => goToPage(target)}>
                      <CxIcon name={PAGE_META[target].icon} /><span>{PAGE_META[target].label}</span>
                    </button>
                  </li>
                );
              })}
              {currentSection?.id === 'partie' && (
                <li>
                  <a
                    className={`cx-menu-item cx-menu-item-external${assistantIgniting ? ' igniting' : ''}`}
                    href={ASSISTANT_URL}
                    onClick={openAssistant}
                  >
                    <CxIcon name="attack" /><span>Assistant d'unité</span>
                  </a>
                </li>
              )}
            </ul>
            <div className="cx-art" aria-hidden="true" />
          </div>
        </aside>
        {/* key={page} : force le remontage de <main> à chaque changement de
          page pour rejouer l'animation de transition (« wipe » façon
          Star Wars, voir .page-transition dans index.css) — sans quoi une
          animation CSS ne se rejoue pas au simple changement des enfants. */}
        <main key={page} className="page-transition">
          {currentSection?.id === 'partie' && (
            <a
              className={`cx-assistant-shortcut no-print${assistantIgniting ? ' igniting' : ''}`}
              href={ASSISTANT_URL}
              onClick={openAssistant}
            >
              <CxIcon name="attack" />
              <span><strong>Assistant d'unité</strong><small>Résoudre une attaque pas à pas</small></span>
              <CxIcon name="next" />
            </a>
          )}
          <Suspense fallback={<p className="screen-loading" role="status">Chargement de la console…</p>}>{content}</Suspense>
        </main>
      </div>

      <footer className="app-footer no-print">
        <p>
          Outil non officiel réalisé pour un usage personnel entre joueurs. Star Wars: Legion est
          une marque d'Atomic Mass Games / Lucasfilm — ce site n'y est pas affilié.
        </p>
      </footer>

      {/* Saut en hyperespace : quelques traits lumineux qui filent
          horizontalement pendant le délai avant de quitter la SPA pour
          l'Assistant d'unité (voir le clic ci-dessus) — la seule vraie
          transition/chargement de cette appli (un changement de page
          interne est instantané, rien à couvrir par un tel effet).
          Masqué sous prefers-reduced-motion (index.css), auquel cas
          assistantIgniting ne passe jamais à true (cf. le onClick). */}
      {assistantIgniting && (
        <div className="hyperspace-overlay" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="beam" style={{ top: `${8 + i * 13}%`, animationDelay: `${i * 22}ms` }} />
          ))}
        </div>
      )}
    </div>
  );
}
