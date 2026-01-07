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
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexName}
      insights={false}
    >
      <Configure hitsPerPage={50} />
      <header className="h-[100px] sm:h-auto min-height-[90px] pt-[0px] header-bg flex justify-center items-center sm:min-height-[170px] p-2 bg-opacity-50 bg-white bg-contain sm:pt-[150px] relative">
        <SearchBox
          placeholder="Search keywork (ie: Kiet vs Elias)"
          className="w-3/4 mb-8"
        />
        <div className="absolute top-5 right-5 p-2 flex w-[180px] justify-between">
          <PgnUploadComponent />
          <Setting />
        </div>
      </header>

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
