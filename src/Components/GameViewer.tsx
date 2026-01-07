import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Arrow, Chessboard } from 'react-chessboard';
import { Square } from 'chess.js';
import { LuChevronFirst, LuDownload, LuChevronLast } from 'react-icons/lu';
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

interface GameViewerProps {
  data: GameData;
}

export function GameViewer({ data }: GameViewerProps) {
  const lineRefs = useRef<any>([]);
  const { settings, setSetting } = useSetting({ isMute: true });
  const [{ depth }] = useStockfishOptions();
  const [currentMove, setCurrentMove] = useState<ReviewedMove>();
  const [arrow, setArrow] = useState<Arrow[]>([]);
  const [moveList, setMoveList] = useState<ReviewedMove[]>([]);
  const { engine, bestMoveResult, reviewData, reviewStatus } = useStockfish();
  const { height, width } = useViewport();
  const [currentMoveIndex, setCurrentMoveIndex] = useState(
    data.Moves.length - 1
  );
  const [fen, setFen] = useState(data.fen || data.LastPosition);
  const [isPlaying, setIsPlaying] = useState(false);
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
      setCurrentMoveIndex(index);
    },
    [moveList.length]
  );

  useEffect(() => {
    if (reviewData) {
      setMoveList(reviewData.moves);
    }
  }, [reviewData]);

  useEffect(() => {
    engine?.findBestMove(data.fen || data.LastPosition, depth);
  }, [engine, data.LastPosition, data.fen, depth]);

  useEffect(() => {
    const item: ReviewedMove = moveList[currentMoveIndex];

    if (item) {
      console.log(item);
      // scrolling
      const itemRef = lineRefs.current[
        Math.floor(currentMoveIndex / 2)
      ] as HTMLDivElement;
      const rect = itemRef.getBoundingClientRect();
      if (rect.y > height - 200) {
        itemRef.scrollIntoView();
      }
      if (!settings.isMute) {
        playSound(item);
      }
      engine?.findBestMove(item.after, depth);
      if (item.best) {
        const bestmove: string = item.best?.bestmove || '';
        setArrow([
          {
            startSquare: bestmove.substring(0, 2),
            endSquare: bestmove.substring(2, 4),
            color: '#11d954',
          },
        ]);
      }
      setFen(item.after);
      setCurrentMove(item);
    }
    if (currentMoveIndex >= moveList.length) {
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMoveIndex, moveList, depth, settings]);

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

  // Apply custom chessboard colors as fallback
  useEffect(() => {
    const applyChessboardColors = () => {
      const boards = document.querySelectorAll('.react-chessboard');
      boards.forEach((board) => {
        const squares = board.querySelectorAll('[style*="background"]');
        squares.forEach((square: any) => {
          const style = square.getAttribute('style') || '';
          // Dark squares (default react-chessboard colors)
          if (
            style.includes('rgb(118, 150, 86)') ||
            style.includes('rgb(181, 136, 99)') ||
            style.includes('#769656') ||
            style.includes('#b58863')
          ) {
            square.style.backgroundColor = '#105463';
          }
          // Light squares
          if (
            style.includes('rgb(238, 238, 210)') ||
            style.includes('rgb(240, 217, 181)') ||
            style.includes('#eeeed2') ||
            style.includes('#f0d9b5')
          ) {
            square.style.backgroundColor = '#F5E6D3';
          }
        });
      });
    };

    // Apply immediately and after a short delay to catch dynamically rendered boards
    applyChessboardColors();
    const timeout = setTimeout(applyChessboardColors, 100);
    const interval = setInterval(applyChessboardColors, 500);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fen, currentMove]);

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
  const onShowMove = (rMove: ReviewedMoveOutput) => {
    let index = 1;
    for (const m of rMove.bestLine?.moves || []) {
      setTimeout(() => {
        if (!settings.isMute) {
          playSound(m);
        }
        console.log(m);
        setArrow([
          {
            startSquare: m.from,
            endSquare: m.to,
            color: '#11d954',
          },
        ]);
        engine?.findBestMove(m.after, depth);
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
        <div className="pt-1 text-center font-semibold text-primary-700">
          {data.Event} - {data.Site} - {data.Year || data.year}
        </div>
        <div className="pt-1 text-center text-primary-600">{data.ECO}</div>
      </div>

      <div className="flex flex-col sm:flex-row">
        <EloBar bestMoveResult={bestMoveResult} height={boardSize} />

        <div className="flex flex-col items-left">
          <div
            className="text-xs font-semibold justify-center height-[38px] text-primary-700"
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
          <div style={{ width: boardSize, height: boardSize }}>
            <Chessboard
              options={{
                position: fen,
                boardStyle: { width: boardSize, height: boardSize },
                arrows: arrow,
                squareRenderer: currentMove?.playedMove
                  ? (memoCustomerRender as any)
                  : undefined,
                squareStyles: customSquare,
              }}
            />
          </div>
          <div
            className="text-xs font-semibold height-[38px] mt-1 text-primary-700"
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
            <button onClick={() => moveTo(0)} className="p-3 cursor-pointer text-primary-600 hover:text-primary-700">
              <LuChevronFirst />
            </button>
            <button
              onClick={() => moveTo(currentMoveIndex - 1)}
              className="p-3 cursor-pointer text-primary-600 hover:text-primary-700"
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
              className="p-3 cursor-pointer text-primary-600 hover:text-primary-700"
            >
              <GrNext />
            </button>
            <button onClick={() => moveTo(moveList.length - 1)} className="p-3 cursor-pointer text-primary-600 hover:text-primary-700">
              <LuChevronLast />
            </button>
            <button
              onClick={toggleSpeaker}
              className="ml-10 p-3 cursor-pointer text-primary-600 hover:text-primary-700"
            >
              {settings.isMute ? (
                <PiSpeakerX color="red" />
              ) : (
                <PiSpeakerHigh color="green" />
              )}
            </button>
            <button onClick={handleDownload} className="p-3 cursor-pointer text-primary-600 hover:text-primary-700">
              <LuDownload />
            </button>

            <button
              onClick={() => engine?.reviewGame(moveList, depth)}
              className="p-3 cursor-pointer text-primary-600 hover:text-primary-700"
            >
              <MdReviews />
            </button>
          </div>
        </div>
        <div
          className="ml-3 flex flex-col pl-2 w-[400px] overflow-y-scroll overflow-x-hidden mt-5"
          style={{ maxHeight: boardSize + 100 }}
        >
          {reviewData && reviewData.summary ? (
            <>
              <MoveChart reviewData={reviewData} />

              <ReviewSummary
                data={reviewData.summary}
                result={data.Result}
                clickOnSummaryItem={clickOnSummaryItem}
              />
            </>
          ) : (
            <div className="p-3 text-3xl text-center font-bold border border-solid border-primary-300 text-primary-700 mb-4">
              {data.Result || data.result}
            </div>
          )}
          <ReviewPanel
            moveList={moveList}
            currentMoveIndex={currentMoveIndex}
            moveTo={moveTo}
            currentMove={currentMove}
            onShowMove={onShowMove}
            lineRefs={lineRefs}
          />

          {reviewData && reviewData.summary && (
            <EloSummary data={reviewData.summary} />
          )}
        </div>
      </div>
      {reviewStatus && !reviewStatus.done && (
        <ReviewLoading data={reviewStatus} />
      )}
    </div>
  );
}
