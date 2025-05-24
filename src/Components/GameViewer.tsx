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
import { ReviewPanel } from './ReviewPanel';
import useSetting from '../Hooks/useSettings';
import { TopMovesPanel } from './TopMovesPanel'; // Added import
import { StockfishLine } from '../Shared/Model'; // Added import for StockfishLine type

interface GameViewerProps {
  data: GameData;
}

export function GameViewer({ data }: GameViewerProps) {
  const lineRefs = useRef<any>([]);
  const { settings, setSetting } = useSetting({ isMute: true });
  const [{ depth }] = useStockfishOptions();
  const [currentMove, setCurrentMove] = useState<ReviewedMove>();
  const [arrow, setArrow] = useState<Square[][]>([]);
  const [moveList, setMoveList] = useState<ReviewedMove[]>([]);
  const { engine, bestMoveResult, reviewData, reviewStatus, fetchTopMoves, topMovesAnalysis } = useStockfish();
  const { height, width } = useViewport();
  const [currentMoveIndex, setCurrentMoveIndex] = useState(
    data.Moves.length - 1
  );
  const [fen, setFen] = useState(data.fen || data.LastPosition);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalysisMode, setIsAnalysisMode] = useState<boolean>(false);
  const [analysisFen, setAnalysisFen] = useState<string>('');
  const analysisGameRef = useRef<ChessInstance | null>(null);
  const boardSize = useMemo(() => {
    if (width >= 640) {
      return Math.min(height - 300, width - 400);
    }
    return width - 50;
  }, [width, height]);

  const moveTo = useCallback(
    (index: number) => {
      if (index < 0) {
        return;
      }
      if (index > moveList.length - 1) {
        return;
      }
      if (isAnalysisMode) {
        setIsAnalysisMode(false); // Exit analysis mode if navigating main game
      }
      setCurrentMoveIndex(index);
    },
    [moveList.length, isAnalysisMode, setIsAnalysisMode] // Add dependencies
  );

  useEffect(() => {
    if (isAnalysisMode) {
      const currentBoardFen = fen; // Use the main game's FEN when starting analysis
      analysisGameRef.current = new Chess(currentBoardFen);
      setAnalysisFen(currentBoardFen);
      // Clear any existing top moves when analysis mode starts/restarts for a new position
      if (fetchTopMoves) fetchTopMoves(currentBoardFen);
    } else {
      // Optional: Clear analysis arrows or other analysis-specific UI when exiting
      // We want to keep the arrows from the main game's current move if exiting analysis.
      // If currentMove is defined, set arrows based on its best move.
      if (currentMove && currentMove.best && currentMove.best.bestmove) {
        const bestmove = currentMove.best.bestmove;
        setArrow([
          [
            bestmove.substring(0, 2) as Square,
            bestmove.substring(2, 4) as Square,
          ],
        ]);
      } else {
        setArrow([]);
      }
    }
  }, [isAnalysisMode, fen, fetchTopMoves, currentMove]);


  useEffect(() => {
    if (reviewData) {
      setMoveList(reviewData.moves);
    }
  }, [reviewData]);

  useEffect(() => {
    if (!isAnalysisMode && engine) { // Only run for initial load in non-analysis mode
      engine.findBestMove(data.fen || data.LastPosition, depth);
    }
  }, [engine, data.LastPosition, data.fen, depth, isAnalysisMode]);

  useEffect(() => {
    const item: ReviewedMove = moveList[currentMoveIndex];

    if (item) {
      // console.log(item); 

      if (!isAnalysisMode && moveList.length > 0) {
        const refIndex = Math.floor(currentMoveIndex / 2);
        if (lineRefs.current && lineRefs.current[refIndex]) {
          const itemRef = lineRefs.current[refIndex] as HTMLDivElement;
          const rect = itemRef.getBoundingClientRect();
          if (rect.y > height - 200) { // height is from useViewport
            itemRef.scrollIntoView();
          }
        }
        
        if (!settings.isMute) {
          playSound(item);
        }
      }

      if (!isAnalysisMode && engine) {
        engine.findBestMove(item.after, depth);
        if (item.best) {
          const bestmove: string = item.best?.bestmove || '';
          // Arrow for main game, only if not in analysis mode.
           setArrow([
             [
               bestmove.substring(0, 2) as Square,
               bestmove.substring(2, 4) as Square,
             ],
           ]);
        }
      } else if (isAnalysisMode && topMovesAnalysis?.lines && topMovesAnalysis.lines.length > 0) {
        // Arrow for analysis mode.
        const bestAnalysisMovePV = topMovesAnalysis.lines[0].pv;
        if (bestAnalysisMovePV) {
            const bestAnalysisMove = bestAnalysisMovePV.split(' ')[0];
             setArrow([
               [
                 bestAnalysisMove.substring(0, 2) as Square,
                 bestAnalysisMove.substring(2, 4) as Square,
               ],
             ]);
        }
      }
      
      // Set FEN based on mode. For main game, item.after is used.
      // For analysis mode, analysisFen is managed by onAnalysisMove/onSelectAnalysisMove.
      // This useEffect primarily reacts to currentMoveIndex changes for the *main game*.
      if (!isAnalysisMode) {
        setFen(item.after);
      }
      // currentMove is primarily for the main game's display (like CustomSquareRenderer)
      // It's okay to set it even if CustomSquareRenderer is hidden in analysis mode.
      setCurrentMove(item); 
    }

    if (currentMoveIndex >= moveList.length && !isAnalysisMode) { // only stop play if related to main game
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMoveIndex, moveList, depth, settings, isAnalysisMode, engine, analysisFen, topMovesAnalysis, height, fen]);

  useEffect(() => {
    let intervalId: number = 0;

    if (isPlaying) {
      intervalId = window.setInterval(() => {
        if (currentMoveIndex < moveList.length) {
          setCurrentMoveIndex((previousCount) => previousCount + 1);
        }

        if (currentMoveIndex === moveList.length) {
          clearInterval(intervalId);
          setIsPlaying(false);
        }
      }, settings.delay);
    } else {
      if (intervalId) clearInterval(intervalId);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [isPlaying, moveList.length, currentMoveIndex, settings.delay]);

  useEffect(() => {
    const lines = simulateInitialGame(data.Moves) as ReviewedMove[];
    setMoveList(lines);
  }, [data.Moves]);

  useEffect(() => {
    const handleKeyPress = (e: any) => {
      if (e.key === 'ArrowRight') {
        moveTo(currentMoveIndex + 1);
      }
      if (e.key === 'ArrowLeft') {
        moveTo(currentMoveIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentMoveIndex, moveTo]);

  const togglePlay = () => {
    if (!isPlaying && currentMoveIndex >= data.Moves.length - 1) {
      setCurrentMoveIndex(0);
    }
    setIsPlaying(!isPlaying);
  };
  const toggleSpeaker = () => {
    setSetting('isMute', !settings.isMute);
  };

  const onAnalysisMove = (sourceSquare: Square, targetSquare: Square, piece: string): boolean => {
    if (!analysisGameRef.current) return false;

    const move = analysisGameRef.current.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q', // Always promote to queen for simplicity
    });

    if (move === null) { // Illegal move
      return false;
    }

    const newFen = analysisGameRef.current.fen();
    setAnalysisFen(newFen);
    setArrow([[sourceSquare, targetSquare]]); // Show the user's move

    if (fetchTopMoves) {
      fetchTopMoves(newFen);
    }
    
    return true; // Move was successful
  };

  const onShowMove = (rMove: ReviewedMoveOutput) => {
    if (isAnalysisMode) return; // Disable this functionality in analysis mode

    let index = 1;
    for (const m of rMove.bestLine?.moves || []) {
      setTimeout(() => {
        if (!settings.isMute) {
          playSound(m);
        }
        // console.log(m); // Reduced logging for cleaner console
        setArrow([[m.from, m.to]]);
        if (engine) engine.findBestMove(m.after, depth);
        setFen(m.after);
      }, index * 1000);
      index++;
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([data.pgn || data.Pgn], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = (data.game || data.Game).trim() + '.pgn'; // Change the filename as needed
    document.body.appendChild(element);
    element.click();
  };

  const clickOnSummaryItem = (type: 'w' | 'b', cl: MoveClassification) => {
    const indexOfMove = moveList.findIndex(
      (x) => x.color === type && x.playedMove?.classification === cl
    );
    if (indexOfMove >= 0) {
      moveTo(indexOfMove);
    }
  };

  const onSelectAnalysisMove = (line: StockfishLine) => {
    if (!analysisGameRef.current) return;
    const lanMove = line.pv.split(' ')[0]; // Get the first move from the PV

    const fromSquare = lanMove.substring(0, 2) as Square;
    const toSquare = lanMove.substring(2, 4) as Square;
    const promotionPiece = lanMove.length === 5 ? lanMove.substring(4,5) : undefined;

    const moveResult = analysisGameRef.current.move({
      from: fromSquare,
      to: toSquare,
      promotion: promotionPiece || 'q', 
    });

    if (moveResult === null) {
      console.error("Failed to make selected analysis move:", lanMove);
      return;
    }

    const newFen = analysisGameRef.current.fen();
    setAnalysisFen(newFen);
    setArrow([[fromSquare, toSquare]]); 

    if (fetchTopMoves) {
      fetchTopMoves(newFen);
    }
  };

  const memoCustomerRender = useMemo(
    () => CustomSquareRenderer(currentMove),
    [currentMove]
  );
  const customSquare = useMemo(() => {
    const styles = {
      [currentMove?.from as Square]: { backgroundColor: '#FFA50077' },
      [currentMove?.to as Square]: { backgroundColor: '#FFA500EE' },
    };
    if (currentMove?.san.includes('+')) {
      // find the target king square
      const [checkedKing] = findPiecePosition(
        currentMove.after,
        currentMove.color === 'w' ? 'b' : 'w',
        'k'
      );
      if (checkedKing) {
        styles[checkedKing.square] = { backgroundColor: '#CC0000CC' };
      }
    }
    return styles;
  }, [currentMove]);

  return (
    <div className="flex flex-col pt-[230px] sm:pt-0">
      <div>
        <div className="pt-1 text-center font-semibold">
          {data.Event} - {data.Site} - {data.Year || data.year}
        </div>
        <div className="pt-1 text-center">{data.ECO}</div>
      </div>

      <div className="flex flex-col sm:flex-row">
        <EloBar bestMoveResult={bestMoveResult} height={boardSize} />

        <div className="">
          <div
            className="text-xs font-semibold justify-center height-[38px]"
            style={{ height: 40 }}
          >
            {data.Black} ({data.BlackElo})
            <CapturedPieces
              capturedPieces={currentMove?.captured_pieces.b}
              color="w"
              point={
                (currentMove?.captured_pieces?.bPoint || 0) -
                (currentMove?.captured_pieces?.wPoint || 0)
              }
            />
          </div>
          <Chessboard
            position={fen}
            boardWidth={boardSize}
            position={isAnalysisMode ? analysisFen : fen}
            boardWidth={boardSize}
            customArrows={arrow}
            customArrowColor="#11d954"
            customSquare={currentMove?.playedMove && !isAnalysisMode && memoCustomerRender}
            customSquareStyles={isAnalysisMode ? {} : customSquare}
            onPieceDrop={isAnalysisMode ? onAnalysisMove : undefined}
          />
          <div
            className="text-xs font-semibold height-[38px] mt-1"
            style={{ height: 38 }}
          >
            {data.White} ({data.WhiteElo})
            <CapturedPieces
              capturedPieces={currentMove?.captured_pieces.w}
              color="b"
              point={
                (currentMove?.captured_pieces?.wPoint || 0) -
                (currentMove?.captured_pieces?.bPoint || 0)
              }
            />
          </div>

          <div className="flex w-full justify-between sm:justify-center mt-3 items-center ">
            <button onClick={() => moveTo(0)} className="p-3 cursor-pointer">
              <LuChevronFirst />
            </button>
            <button
              onClick={() => moveTo(currentMoveIndex - 1)}
              className="p-3 cursor-pointer"
            >
              <GrPrevious />
            </button>
            <button onClick={togglePlay} className="p-3 cursor-pointer">
              {isPlaying ? (
                <BsStopFill color="red" />
              ) : (
                <BsPlayFill color="green" />
              )}
            </button>
            <button
              onClick={() => moveTo(currentMoveIndex + 1)}
              className="p-3 cursor-pointer"
            >
              <GrNext />
            </button>
            <button onClick={() => moveTo(moveList.length - 1)}>
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
              onClick={() => setIsAnalysisMode(!isAnalysisMode)}
              className="p-3 cursor-pointer"
              title={isAnalysisMode ? 'Exit Analysis Mode' : 'Start Analysis Mode'}
            >
              <LuBrain color={isAnalysisMode ? 'green' : 'inherit'} />
            </button>
            <button
              onClick={() => engine?.reviewGame(moveList, depth)}
              className="p-3 cursor-pointer"
              title="Review Game"
            >
              <MdReviews />
            </button>
          </div>
        </div>
        <div
          className="ml-3 flex flex-col pl-2 w-[400px] overflow-y-scroll overflow-x-hidden mt-5"
          style={{ maxHeight: boardSize + 100 }}
        >
          {isAnalysisMode && topMovesAnalysis && (
            <TopMovesPanel
              topMovesOutput={topMovesAnalysis}
              onSelectMove={onSelectAnalysisMove}
              currentAnalysisFen={analysisFen}
            />
          )}

          {!isAnalysisMode && reviewData && reviewData.summary && (
            <>
              <MoveChart reviewData={reviewData} />
              <ReviewSummary
                data={reviewData.summary}
                result={data.Result}
                clickOnSummaryItem={clickOnSummaryItem}
              />
            </>
          )}
          {!isAnalysisMode && !reviewData?.summary && (
             <div className="p-3 text-3xl text-center font-bold border border-solid mb-4">
              {data.Result || data.result}
            </div>
          )}

          {!isAnalysisMode && (
            <ReviewPanel
              moveList={moveList}
              currentMoveIndex={currentMoveIndex}
              moveTo={moveTo}
              currentMove={currentMove}
              onShowMove={onShowMove}
              lineRefs={lineRefs}
              isAnalysisMode={isAnalysisMode} 
              analysisLines={[]} 
              analysisFen={analysisFen} 
            />
          )}
          
          {!isAnalysisMode && reviewData && reviewData.summary && (
            <EloSummary data={reviewData.summary} />
          )}
        </div>
      </div>
      {reviewStatus && !reviewStatus.done && !isAnalysisMode && (
        <ReviewLoading data={reviewStatus} />
      )}
    </div>
  );
}
