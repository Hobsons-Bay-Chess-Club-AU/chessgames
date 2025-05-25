import { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { StockfishEngine } from './StockfishEngine';
import { ReviewStatus, GameReview, BestMoveOutput } from '../Shared/Model';
import sortBy from 'lodash/sortBy';

export function useStockfish() {
  const [bestMoveResult, setBestMoveResult] = useState<BestMoveOutput | undefined>();
  const [reviewData, setReviewData] = useState<GameReview | undefined>();
  const [topMovesAnalysis, setTopMovesAnalysis] = useState<BestMoveOutput | undefined>();
  const [engine, setEngine] = useState<StockfishEngine>();
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | undefined>(
    undefined
  );

  const fetchTopMoves = useCallback(async (fen: string, currentDepth: number) => { // Added currentDepth
    if (engine) {
      try {
        // Pass currentDepth to engine.getTopMoves. Assuming count of 4 is desired.
        const result = await engine.getTopMoves(fen, 4, currentDepth); 
        setTopMovesAnalysis(result);
      } catch (error) {
        console.error("Error fetching top moves:", error);
        setTopMovesAnalysis(undefined); 
      }
    }
  }, [engine, setTopMovesAnalysis]); // setTopMovesAnalysis is stable

  useEffect(() => {
    const initStockfishWorkerEngine = async () => {
      console.log('Start new stockfish engine worker');
      setEngine(
        new StockfishEngine((type, data) => {
          if (type === 'review') {
            setReviewData(data);
          }

          if (type === 'bestmove') {
            setBestMoveResult(data);
          }
          if (type === 'review-status') {
            setReviewStatus(data);
          }

          if (type === 'move-update') {
            const lines = data.lines;
            const mateMoves = lines.filter((x: any) => x.score.type === 'mate');
            const cpMoves = lines.filter((x: any) => x.score.type === 'cp');
            sortBy(mateMoves, (x) => x.score.value);
            sortBy(cpMoves, (x) => x.score.value, 'desc');
            const bestLines = [...mateMoves, ...cpMoves]; 
            console.log(bestLines);
          }
        })
      );
    };

    if (!engine) {
      initStockfishWorkerEngine();
    }
    return () => {
      console.log('Clean up stockfish engine after use');
      if (engine) engine.quit();
    };
  }, [engine]); // engine dependency is correct here

  return {
    bestMoveResult,
    reviewData,
    engine,
    reviewStatus,
    topMovesAnalysis,
    fetchTopMoves,
  };
}
