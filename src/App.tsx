import { useEffect, useMemo, useState } from 'react';
import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter';
import {
  Configure,
  ClearRefinements,
  Stats,
  RefinementList,
  Hits,
  InstantSearch,
  Pagination,
  SearchBox,
  PoweredBy,
} from 'react-instantsearch';
import { useParams, useNavigate } from 'react-router-dom';
import { HiMagnifyingGlass } from 'react-icons/hi2';
import { AiOutlineClose } from 'react-icons/ai';
import './App.css';
import { DisplaySelector } from './Components/DisplaySelector';
import { Panel } from './Components/Panel';
import { Hit } from './Components/Hit';
import { Modal } from './Components/Modal';
import { GameViewer } from './Components/GameViewer';
import { HitCard } from './Components/HitCard';
import { TableHit } from './Components/TableHit';
import { algoliasearch } from 'algoliasearch';
import { OpenPgn } from './Components/OpenPgn';
import { Setting } from './Components/Setting';
import PgnUploadComponent from './Components/UploadPgnFile';

function standardizeMoves(moves: string[]) {
  if (!Array.isArray(moves)) return moves;
  return moves.map((move) => {
    if (typeof move !== 'string') return move;
    return move.replace(/\b0-0-0\b/g, 'O-O-O').replace(/\b0-0\b/g, 'O-O');
  });
}

export default function App() {
  const { gameId } = useParams();

  const navigate = useNavigate();
  const { searchClient, isAlgolia, indexName, algoliaClient } = useMemo(() => {
    const typesenseInstantsearchAdapter = new TypesenseInstantSearchAdapter({
      server: {
        apiKey: import.meta.env.VITE_TYPESENSE_API || 'xyz', // Be sure to use an API key that only allows search operations
        nodes: [
          {
            host: import.meta.env.VITE_TYPESENSE_HOST || 'localhost',
            port: parseInt(import.meta.env.VITE_TYPESENSE_PORT || '8108'),
            path: '', // Optional. Example: If you have your typesense mounted in localhost:8108/typesense, path should be equal to '/typesense'
            protocol: import.meta.env.VITE_TYPESENSE_PROTOCOL || 'http',
          },
        ],
        cacheSearchResultsForSeconds: 1 * 60, // Cache search results from server. Defaults to 2 minutes. Set to 0 to disable caching.
      },
      additionalSearchParameters: {
        query_by: 'Game,embedding,White,Black',
        exclude_fields: 'embedding',
      },
    });
    const algolia_app_ids = (import.meta.env.VITE_ALGOLIA_APP_ID || '')
      .split(',')
      .filter(Boolean);
    const algolia_api_keys = (import.meta.env.VITE_ALGOLIA_KEY || '')
      .split(',')
      .filter(Boolean);
    const algolia_games = (import.meta.env.VITE_ALGOLIA_INDEX || '')
      .split(',')
      .filter(Boolean);
    const rndIdx = Math.floor(Math.random() * algolia_app_ids.length);
    console.log('rndIdx', rndIdx);
    const algoliaSearchClient =
      algolia_app_ids.length > 0
        ? algoliasearch(algolia_app_ids[rndIdx], algolia_api_keys[rndIdx])
        : undefined;

    const searchClient =
      algoliaSearchClient || typesenseInstantsearchAdapter.searchClient;

    return {
      searchClient,
      isAlgolia: algoliaSearchClient !== undefined,
      algoliaClient: algoliaSearchClient,
      indexName:
        algolia_games[rndIdx] ||
        import.meta.env.VITE_INDEX_NAME ||
        'chessgames',
    };
  }, []);

  const [game, setGame] = useState<any>();
  const [displayMode, setDisplayMode] = useState<string>('card');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleHitClick = (item: any) => {
    navigate('/game/' + item.objectID);
    setGame(item);
  };

  const handleModeChange = (type: string) => {
    setDisplayMode(type);
  };
  const yearAttribute = 'Year';

  useEffect(() => {
    if (!gameId) {
      return;
    }
    if (game && gameId == game.objectID) {
      return;
    }
    const fetchGameById = async () => {
      if (!isAlgolia || !algoliaClient) {
        return;
      }

      const gamedata = await algoliaClient.getObject({
        indexName,
        objectID: gameId,
      });
      if (gamedata) {
        setGame(gamedata);
      }
    };
    fetchGameById();
  }, [algoliaClient, game, gameId, indexName, isAlgolia, setGame]);

  // Handle keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Handle scroll detection for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexName}
      insights={false}
    >
      <Configure hitsPerPage={50} />
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg'
            : 'bg-gradient-to-r from-primary-50 to-primary-100 shadow-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Layout */}
          <div className="flex items-center justify-between py-3 md:hidden">
            {/* Logo */}
            <button
              onClick={() => {
                navigate('/');
                setGame(undefined);
              }}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <img
                src="/chess_logo.png"
                alt="Chess Games Logo"
                className="h-8 w-8 object-contain"
              />
            </button>
            
            {/* Navigation Icons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-lg hover:bg-primary-100 transition-colors cursor-pointer text-primary-600 hover:text-primary-700"
                title="Search (Ctrl+K)"
                aria-label="Search"
              >
                <HiMagnifyingGlass className="text-xl sm:text-2xl" />
              </button>
              <PgnUploadComponent />
              <Setting />
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex md:items-center md:justify-between md:py-4 md:gap-6">
            {/* Logo Section */}
            <button
              onClick={() => {
                navigate('/');
                setGame(undefined);
              }}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <img
                src="/chess_logo.png"
                alt="Hobsons Bay Chess Club Logo"
                className="h-10 w-10 object-contain"
              />
              <span
                className={`text-xl font-bold hidden lg:block transition-colors ${
                  isScrolled ? 'text-primary-700' : 'text-primary-800'
                }`}
              >
                Hobsons Bay Chess Club
              </span>
            </button>

            {/* Navigation Section */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-lg hover:bg-primary-100 transition-colors cursor-pointer text-primary-600 hover:text-primary-700"
                title="Search (Ctrl+K)"
                aria-label="Search"
              >
                <HiMagnifyingGlass className="text-xl" />
              </button>
              <PgnUploadComponent />
              <Setting />
            </div>
          </div>

        </div>
      </header>

      {/* Modern Floating Search Box - Always render SearchBox to maintain state */}
      <div
        className={`fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 px-4 transition-all duration-500 ease-out ${
          isSearchOpen ? 'opacity-100 pointer-events-auto visible backdrop-blur-sm bg-black/20' : 'opacity-0 pointer-events-none invisible'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsSearchOpen(false);
          }
        }}
      >
        <div
          className={`w-full max-w-4xl transition-all duration-500 ease-out relative ${
            isSearchOpen ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-8 scale-90 opacity-0'
          }`}
        >
          {/* Close button - always visible for mobile */}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="absolute -top-12 right-0 sm:right-4 p-3 rounded-full bg-white/90 backdrop-blur-xl shadow-lg hover:bg-white transition-all duration-200 text-primary-600 hover:text-primary-700 active:scale-95 touch-manipulation"
            aria-label="Close search"
          >
            <AiOutlineClose className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
          
          <SearchBox
            placeholder="Search games (e.g., Kiet vs Tony)"
            classNames={{
              root: 'w-full',
              form: 'relative',
              input: 'w-full px-6 py-5 sm:px-8 sm:py-7 pl-16 sm:pl-20 pr-16 sm:pr-20 rounded-3xl bg-white/95 backdrop-blur-xl border-0 shadow-2xl focus:shadow-3xl outline-none transition-all duration-300 text-xl sm:text-2xl font-medium text-primary-800 placeholder:text-primary-400',
              submit: 'absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-primary-500 hover:text-primary-700 transition-colors z-10',
              reset: 'absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 transition-colors z-10',
              loadingIndicator: 'absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10',
            }}
            submitIconComponent={() => (
              <HiMagnifyingGlass className="w-6 h-6 sm:w-7 sm:h-7" />
            )}
            resetIconComponent={() => (
              <AiOutlineClose className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          />
          <div className={`mt-4 sm:mt-6 text-center transition-all duration-500 delay-100 ${
            isSearchOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}>
            <p className="text-xs sm:text-sm text-primary-500">
              <span className="hidden sm:inline">Press <kbd className="px-3 py-1.5 mx-1 bg-primary-100/50 backdrop-blur-sm rounded text-primary-700 text-sm font-medium">Esc</kbd> to close</span>
              <span className="sm:hidden">Tap outside or close button to dismiss</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full p-4 flex-col sm:flex-row">
        <div className="w-full sm:w-3/12 pr-2 lg:w-2/12">
          <div className="" data-layout="desktop">
            <ClearRefinements />
          </div>

          <Panel header="Year">
            <RefinementList
              attribute={yearAttribute}
              searchable={true}
              // translations={{
              //   placeholder: 'Search for brands…',
              // }}
            />
          </Panel>
          <Panel header="Event">
            <RefinementList
              attribute="Event"
              searchable={true}
              // translations={{
              //   placeholder: 'Search for brands…',
              // }}
            />
          </Panel>

          <Panel header="Round">
            <RefinementList attribute="Round" />
          </Panel>

          <Panel header="White">
            <RefinementList
              attribute="White"
              searchable={true}
              // translations={{
              //   placeholder: 'Search for brands…',
              // }}
            />
          </Panel>

          <Panel header="Black">
            <RefinementList
              attribute="Black"
              searchable={true}
              // translations={{
              //   placeholder: 'Search for brands…',
              // }}
            />
          </Panel>

          <Panel header="Result">
            <RefinementList
              attribute="Result"
              searchable={true}
              // translations={{
              //   placeholder: 'Search for brands…',
              // }}
            />
          </Panel>

          <Panel header="ECO">
            <RefinementList
              attribute="ECO"
              searchable={true}
              // translations={{
              //   placeholder: 'Search for brands…',
              // }}
            />
          </Panel>
        </div>

        <div className="w-full sm:w-9/12 lg:w-10/12">
          <div className="flex w-full justify-between">
            <div className="w-full sm:w-3/4 flex ">
              <Stats className="mb-3 mr-10" />
              {isAlgolia && <PoweredBy />}
            </div>

            <div className="w-1/2 justify-end flex">
              <DisplaySelector
                onChange={handleModeChange}
                mode={displayMode as any}
              />
              <OpenPgn onGameLoad={(g) => setGame(g)} />
            </div>
          </div>
          {displayMode === 'card' && (
            <Hits
              classNames={{ root: 'w-full hits_card' }}
              hitComponent={(props) => (
                <HitCard {...props} onHitClick={handleHitClick} />
              )}
            />
          )}
          {displayMode === 'list' && (
            <Hits
              hitComponent={(props) => (
                <Hit {...props} onHitClick={handleHitClick} />
              )}
            />
          )}

          {displayMode === 'table' && (
            <Hits
              classNames={{ root: 'ais-Hits-table' }}
              hitComponent={(props) => (
                <TableHit {...props} onHitClick={handleHitClick} />
              )}
            />
          )}

          <div className="flex align-middle w-full justify-center pt-5 ">
            <Pagination />
          </div>
        </div>
      </div>
      {game && (
        <Modal
          onClose={() => {
            navigate('/');
            setGame(undefined);
          }}
        >
          <GameViewer
            data={{
              ...game,
              Moves: standardizeMoves(game.Moves || game.moves),
              ECO: game.eco || game.ECO,
            }}
          ></GameViewer>
        </Modal>
      )}
    </InstantSearch>
  );
}
