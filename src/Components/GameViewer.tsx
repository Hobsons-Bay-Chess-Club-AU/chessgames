import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Square, Chess, ChessInstance } from 'chess.js';
import { LuChevronFirst, LuDownload, LuChevronLast, LuBrain } from 'react-icons/lu';
import { BsPlayFill, BsStopFill } from 'react-icons/bs';
import { GrPrevious, GrNext } from 'react-icons/gr';
import { PiSpeakerHigh, PiSpeakerX } from 'react-icons/pi';
import { MdReviews } from 'react-icons/md';
import { useStockfish } from '../Hooks/useStockfish';
import useViewport from '../Hooks/useViewport';
import ReviewLoading from './ReviewLoading';
import ReviewSummary from './ReviewSummary';
import { findPiecePosition } from '../Shared/Utils';
import CapturedPieces from './CapturedPieces';
import { playSound } from '../Shared/Media';
import { CustomSquareRenderer } from './CustomSquareRenderer';
import { MoveClassification } from '../Shared/Constants';
import { GameData, ReviewedMove, ReviewedMoveOutput } from '../Shared/Model';
import EloSummary from './EloSummary';
import { simulateInitialGame } from '../Shared/Game';
import MoveChart from './MoveChart';
import { EloBar } from './EloBar';
import useStockfishOptions from '../Hooks/useStockfishOptions';
import { ReviewPanel } from './ReviewPanel'; // Import the new ReviewPanel
import useSetting from '../Hooks/useSettings';
import { TopMovesPanel } from './TopMovesPanel';
import { StockfishLine } from '../Shared/Model';
import { GameTree, GameTreeNode } from '../Shared/GameTree'; // Import GameTree

interface GameViewerProps {
  data: GameData;
}

export function GameViewer({ data }: GameViewerProps) {
  // const lineRefs = useRef<any>([]); // Remove: No longer needed by new ReviewPanel
  const { settings, setSetting } = useSetting({ isMute: true });
  const [{ depth }] = useStockfishOptions(); // Keep depth for engine calls

  // --- New GameTree State ---
  const [gameTree, setGameTree] = useState<GameTree | null>(null);
  const [currentNode, setCurrentNode] = useState<GameTreeNode | null>(null);
  
  // --- Old State (to be removed or adapted) ---
  // const [currentMove, setCurrentMove] = useState<ReviewedMove>(); // Replaced by currentNode
  const [arrow, setArrow] = useState<Square[][]>([]); // Still needed
  // const [moveList, setMoveList] = useState<ReviewedMove[]>([]); // Replaced by gameTree
  const { engine, bestMoveResult, reviewData, reviewStatus, fetchTopMoves, topMovesAnalysis } = useStockfish(); // reviewData might be less relevant now
  const { height, width } = useViewport();
  // const [currentMoveIndex, setCurrentMoveIndex] = useState(data.Moves.length - 1); // Replaced by gameTree navigation
  // const [fen, setFen] = useState(data.fen || data.LastPosition); // Replaced by currentNode.fen
  const [isPlaying, setIsPlaying] = useState(false); // Autoplay logic to be re-evaluated
  
  // --- Analysis Mode State (might be re-purposed or integrated differently) ---
  const [isAnalysisMode, setIsAnalysisMode] = useState<boolean>(false); // Concept might change
  const [analysisFen, setAnalysisFen] = useState<string>(''); // Potentially covered by currentNode.fen when exploring
  const analysisGameRef = useRef<ChessInstance | null>(null); // For on-the-fly move validation if needed outside GameTree
  const boardSize = useMemo(() => {
    if (width >= 640) {
      return Math.min(height - 300, width - 400);
    }
    return width - 50;
  }, [width, height]);

  // --- Initialize GameTree ---
  useEffect(() => {
    if (data && data.Moves) {
      const initialFen = data.fen || data.LastPosition; // Use provided FEN or last position
      // Ensure data.Moves is an array of SAN strings
      const sanMoves = Array.isArray(data.Moves) ? data.Moves.map(move => (typeof move === 'string' ? move : move.san || '')) : [];
      const tree = new GameTree(initialFen, sanMoves.filter(san => typeof san === 'string' && san.length > 0));
      setGameTree(tree);
      setCurrentNode(tree.getCurrentNode());
    } else if (data) { // Handle case where there are no moves, just a starting position
      const initialFen = data.fen || data.LastPosition;
      const tree = new GameTree(initialFen);
      setGameTree(tree);
      setCurrentNode(tree.rootNode);
    }
  }, [data]);

  // --- Update Board Arrows and Fetch Stockfish Analysis on Current Node Change ---
  useEffect(() => {
    if (currentNode) {
      if (currentNode.move) {
        setArrow([[`${currentNode.move.from}`, `${currentNode.move.to}`]]);
      } else {
        setArrow([]); // Clear arrows for root node or nodes without a move
      }

      if (engine && fetchTopMoves) {
        fetchTopMoves(currentNode.fen, depth); // Use depth from useStockfishOptions
      }
    }
  }, [currentNode, engine, fetchTopMoves, depth]);


  // --- Comment out or remove old useEffects that relied on moveList/currentMoveIndex ---
  // useEffect(() => { // Old logic for isAnalysisMode toggle and fetching top moves
  //   if (isAnalysisMode) { ... } else { ... }
  // }, [isAnalysisMode, fen, fetchTopMoves, currentMove]);

  // useEffect(() => { // Old logic for setting moveList from reviewData
  //   if (reviewData) { setMoveList(reviewData.moves); }
  // }, [reviewData]);

  // useEffect(() => { // Old logic for initial findBestMove
  //   if (!isAnalysisMode && engine) { engine.findBestMove(data.fen || data.LastPosition, depth); }
  // }, [engine, data.LastPosition, data.fen, depth, isAnalysisMode]);

  // useEffect(() => { // THE MAIN BIG useEffect based on currentMoveIndex - REMOVE/COMMENT
  //   const item: ReviewedMove = moveList[currentMoveIndex];
  //   if (item) { ... }
  //   if (currentMoveIndex >= moveList.length && !isAnalysisMode) { setIsPlaying(false); }
  // }, [currentMoveIndex, moveList, depth, settings, isAnalysisMode, engine, analysisFen, topMovesAnalysis, height, fen]);

  // useEffect(() => { // Old autoplay logic
  //   let intervalId: number = 0;
  //   if (isPlaying) { ... }
  //   return () => { clearInterval(intervalId); };
  // }, [isPlaying, moveList.length, currentMoveIndex, settings.delay]);

  // useEffect(() => { // Old initialization of moveList
  //   const lines = simulateInitialGame(data.Moves) as ReviewedMove[];
  //   setMoveList(lines);
  // }, [data.Moves]);

  // useEffect(() => { // Old key press logic
  //   const handleKeyPress = (e: any) => { ... };
  //   window.addEventListener('keydown', handleKeyPress);
  //   return () => { window.removeEventListener('keydown', handleKeyPress); };
  // }, [currentNode]); // Updated to depend on currentNode if re-enabled


  // --- Navigation and Interaction Functions ---
  const handleNavigateToNode = (nodeId: string) => {
    if (gameTree) {
      const node = gameTree.nodes.get(nodeId); // Efficient lookup
      if (node) {
        setCurrentNode(node);
        // The useEffect for currentNode will handle fetching Stockfish analysis & updating arrows
      }
    }
  };

  const handleFirstMove = () => {
    if (gameTree) {
      handleNavigateToNode(gameTree.rootNode.id);
    }
  };

  const handlePreviousMove = () => {
    if (gameTree && currentNode && currentNode.parentId) {
      const parentNode = gameTree.getParentNode(currentNode.id); // Or gameTree.nodes.get(currentNode.parentId)
      if (parentNode) {
        handleNavigateToNode(parentNode.id);
      }
    }
  };

  const handleNextMove = () => {
    if (gameTree && currentNode && currentNode.children.length > 0) {
      // Navigate to the first child. 
      // Future enhancement: prioritize main line child if isMainLine is reliable.
      handleNavigateToNode(currentNode.children[0].id);
    }
  };

  const handleLastMove = () => {
    if (!gameTree || !currentNode) return;
    let tempNode = currentNode;
    // Keep moving to the first child as long as there are children
    while (tempNode.children.length > 0) {
      // Prioritize 'isMainLine' if available and we want to stick to it,
      // otherwise, default to the first child for "end of current line/variation".
      // For this implementation, we'll follow the "Strategy 1" for "Next" which is first child.
      const nextNodeCandidate = tempNode.children.find(child => child.isMainLine); // Optional: prioritize main line
      if (nextNodeCandidate && tempNode.isMainLine) { // Only stick to mainLine if current node is also mainLine
          tempNode = nextNodeCandidate;
      } else {
          tempNode = tempNode.children[0]; // Default to first child
      }
    }
    handleNavigateToNode(tempNode.id);
  };
  
  // const moveTo = useCallback( // This function is now largely non-functional / replaced by handleNavigateToNode
  //   (index: number) => {
  //     console.warn("moveTo function needs to be updated for GameTree navigation.");
  //   },
  //   [] 
  // );

  const togglePlay = () => { // Autoplay needs to be re-thought with GameTree
    console.warn("togglePlay function needs to be updated for GameTree.");
    // if (!isPlaying && currentMoveIndex >= data.Moves.length - 1) {
    //   setCurrentMoveIndex(0);
    // }
    setIsPlaying(!isPlaying);
  };
  const toggleSpeaker = () => {
    setSetting('isMute', !settings.isMute);
  };

  const handleMoveOnBoard = (sourceSquare: Square, targetSquare: Square, piece?: string): boolean => {
    if (!gameTree || !currentNode) {
      console.error("GameTree or currentNode not available.");
      return false;
    }

    const moveInput = {
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q', // Default to queen promotion for simplicity
    };

    // Attempt to add the move to the gameTree
    // GameTree.addMove will use the FEN from the parentNode (currentNode.fen) for validation
    const newNode = gameTree.addMove(moveInput, currentNode.id);

    if (newNode) {
      setCurrentNode(newNode); // This will trigger useEffect to fetch analysis and update arrows
      // If gameTree.addMove mutated the tree, and a component deeper than GameViewer
      // needs to react to the tree structure change (not just currentNode change),
      // we might need to force a GameTree state update here.
      // For now, setCurrentNode is sufficient for board & analysis updates.
      // e.g., setGameTree(Object.assign(Object.create(Object.getPrototypeOf(gameTree)), gameTree));
      // or if GameTree had a version: setGameTreeVersion(v => v + 1);
      return true; // Move was successful
    } else {
      // Illegal move or error in addMove
      console.warn("Illegal move or error adding move to GameTree:", moveInput);
      return false;
    }
  };

  // const onShowMove = (rMove: ReviewedMoveOutput) => { // Commented out - relies on old ReviewPanel logic
  //   if (isAnalysisMode) return;
  //   // ...
  // };

  const handleDownload = () => {
    // This can remain, but PGN generation might eventually come from GameTree
    const pgnToDownload = gameTree ? gameTree.formatPathToPgn(gameTree.getMovesToNode(gameTree.rootNode.id)) : (data.pgn || data.Pgn);
    const element = document.createElement('a');
    const file = new Blob([pgnToDownload || ''], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = (data.game || data.Game || 'game').trim() + '.pgn';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // const clickOnSummaryItem = (type: 'w' | 'b', cl: MoveClassification) => { // Commented out - ReviewSummary likely hidden
  //   // ...
  // };

  // Updated onSelectAnalysisMove to use gameTree.addMove
  const onSelectAnalysisMove = (line: StockfishLine) => {
    if (!gameTree || !currentNode) {
      console.error("GameTree or currentNode not available for selecting analysis move.");
      return;
    }
    
    const lanMove = line.pv.split(' ')[0]; // Get the first move (LAN) from the PV
    if (!lanMove) {
      console.error("No move found in PV string:", line.pv);
      return;
    }

    const fromSquare = lanMove.substring(0, 2);
    const toSquare = lanMove.substring(2, 4);
    const promotionPiece = lanMove.length === 5 ? lanMove.substring(4, 5) : 'q'; // Default to queen

    const moveInput = {
      from: fromSquare,
      to: toSquare,
      promotion: promotionPiece,
    };
    
    // Attempt to add the move to the gameTree, parented by the current node
    const newNode = gameTree.addMove(moveInput, currentNode.id);

    if (newNode) {
      setCurrentNode(newNode); // Update current node to the new move
      // Arrow update and analysis fetch will be handled by useEffect watching currentNode
    } else {
      console.warn("Failed to add selected analysis move to GameTree:", moveInput);
      // Optionally, provide feedback to the user if the move from TopMovesPanel is illegal (should be rare)
    }
  };

  // const memoCustomerRender = useMemo( // currentMove is removed
  //   () => CustomSquareRenderer(currentMove),
  //   [currentMove]
  // );

  const customSquare = useMemo(() => { // currentMove is removed
    // This logic needs to be adapted if highlighting is based on currentNode.move
    const currentMoveSan = currentNode?.move?.san;
    const currentMoveFrom = currentNode?.move?.from;
    const currentMoveTo = currentNode?.move?.to;
    const currentFen = currentNode?.fen;

    if (!currentMoveSan || !currentMoveFrom || !currentMoveTo || !currentFen) return {};
    
    const styles = {
      [currentMoveFrom]: { backgroundColor: '#FFA50077' },
      [currentMoveTo]: { backgroundColor: '#FFA500EE' },
    };
    if (currentMoveSan.includes('+')) {
      const tempGame = new Chess(currentFen); // Use current node's FEN
      const colorOfPlayerMakingMove = tempGame.turn() === 'w' ? 'b' : 'w'; // The king in check is of this color
      
      const [checkedKing] = findPiecePosition(
        currentFen, // Use current FEN
        colorOfPlayerMakingMove,
        'k'
      );
      if (checkedKing) {
        styles[checkedKing.square] = { backgroundColor: '#CC0000CC' };
      }
    }
    return styles;
  }, [currentNode]);

  const boardFen = currentNode?.fen || new GameTree().rootNode.fen; // Fallback for initial render

  return (
    <div className="flex flex-col pt-[230px] sm:pt-0">
      <div>
        <div className="pt-1 text-center font-semibold">
          {data.Event} - {data.Site} - {data.Year || data.year}
        </div>
        <div className="pt-1 text-center">{data.ECO}</div>
      </div>

      <div className="flex flex-col sm:flex-row">
        <EloBar bestMoveResult={bestMoveResult} height={boardSize} /> {/* bestMoveResult might not be relevant */}

        <div className="">
          <div
            className="text-xs font-semibold justify-center height-[38px]"
            style={{ height: 40 }}
          >
            {data.Black} ({data.BlackElo})
            {/* Captured pieces logic needs update based on GameTree/currentNode if possible */}
            <CapturedPieces
              capturedPieces={undefined} // Placeholder
              color="w"
              point={0} // Placeholder
            />
          </div>
          <Chessboard
            position={boardFen} // Use boardFen derived from currentNode
            boardWidth={boardSize}
            customArrows={arrow}
            customArrowColor="#11d954"
            customSquare={undefined} // memoCustomerRender removed for now
            customSquareStyles={customSquare} // Updated to use currentNode
            onPieceDrop={handleMoveOnBoard} // Use the new handler
          />
          <div
            className="text-xs font-semibold height-[38px] mt-1"
            style={{ height: 38 }}
          >
            {data.White} ({data.WhiteElo})
            {/* Captured pieces logic needs update */}
            <CapturedPieces
              capturedPieces={undefined} // Placeholder
              color="b"
              point={0} // Placeholder
            />
          </div>

          <div className="flex w-full justify-between sm:justify-center mt-3 items-center ">
            <button onClick={handleFirstMove} className="p-3 cursor-pointer" title="First Move">
              <LuChevronFirst />
            </button>
            <button
              onClick={handlePreviousMove}
              className="p-3 cursor-pointer"
              title="Previous Move"
            >
              <GrPrevious />
            </button>
            <button onClick={togglePlay} className="p-3 cursor-pointer" title={isPlaying ? "Stop Autoplay" : "Start Autoplay"}>
              {isPlaying ? (
                <BsStopFill color="red" />
              ) : (
                <BsPlayFill color="green" />
              )}
            </button>
            <button
              onClick={handleNextMove}
              className="p-3 cursor-pointer"
              title="Next Move"
            >
              <GrNext />
            </button>
            <button onClick={handleLastMove} title="Last Move"  className="p-3 cursor-pointer">
              <LuChevronLast />
            </button>
            <button
              onClick={toggleSpeaker}
              className="ml-10 p-3 cursor-pointer"
            >
              {settings.isMute ? (
                <PiSpeakerX color="red" />
              ) : (
                <PiSpeakerHigh color="green" />
              )}
            </button>
            <button onClick={handleDownload} className="p-3 cursor-pointer">
              <LuDownload />
            </button>
            <button
              onClick={() => setIsAnalysisMode(!isAnalysisMode)} // This toggle's meaning will evolve
              className="p-3 cursor-pointer"
              title={isAnalysisMode ? 'Exit Exploration' : 'Start Exploration'}
            >
              <LuBrain color={isAnalysisMode ? 'green' : 'inherit'} />
            </button>
            {/* engine.reviewGame might need adaptation or be removed if analysis is continuous */}
            <button
              onClick={() => {
                if (gameTree && engine) {
                  // const mainLineNodes = gameTree.getMovesToNode(gameTree.rootNode.id); // Example: review main line
                  // const mainLineMoves = mainLineNodes.map(node => node.move).filter(Boolean) as Move[];
                  // engine.reviewGame(mainLineMoves, depth); // reviewGame expects chess.js Move objects
                  console.warn("engine.reviewGame integration with GameTree needs review.");
                }
              }}
              className="p-3 cursor-pointer"
              title="Review Game (Concept Needs Update)"
            >
              <MdReviews />
            </button>
          </div>
        </div>
        <div
          className="ml-3 flex flex-col pl-2 w-[400px] overflow-y-scroll overflow-x-hidden mt-5"
          style={{ maxHeight: boardSize + 100 }}
        >
          {/* TopMovesPanel is shown if isAnalysisMode (exploration mode) is true */}
          {isAnalysisMode && topMovesAnalysis && currentNode && (
            <TopMovesPanel
              topMovesOutput={topMovesAnalysis}
              onSelectMove={onSelectAnalysisMove} 
              currentAnalysisFen={currentNode.fen} 
            />
          )}

          {/* The new ReviewPanel for displaying the game tree */}
          {/* It should likely always be visible, or its visibility managed differently than TopMovesPanel */}
          {/* For now, let's assume it's shown when NOT in isAnalysisMode (deep exploration with TopMovesPanel) */}
          {/* Or, perhaps isAnalysisMode should gate TopMovesPanel, and ReviewPanel is always there. */}
          {/* Based on subtask, ReviewPanel displays the tree. Let's make it primary. */}
          
          <ReviewPanel
            gameTree={gameTree}
            currentNode={currentNode}
            onNavigateToNode={handleNavigateToNode}
          />
          
          {/* Old placeholders and commented out sections for ReviewSummary etc. are removed */}
          {/* The new ReviewPanel takes over the display of moves. */}
          {/* Other summary components might be added back later or integrated differently. */}

        </div>
      </div>
      {/* ReviewStatus loading bar: only show if not in analysis exploration and review is running */}
      {reviewStatus && !reviewStatus.done && !isAnalysisMode && ( 
        <ReviewLoading data={reviewStatus} />
      )}
    </div>
  );
}
