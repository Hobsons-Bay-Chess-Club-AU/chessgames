import { useEffect, useState } from 'react';
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

  const fetchTopMoves = async (fen: string) => {
    if (engine) {
      try {
        const result = await engine.getTopMoves(fen, 4); // Fetch top 4 moves
        setTopMovesAnalysis(result);
      } catch (error) {
        console.error("Error fetching top moves:", error);
        setTopMovesAnalysis(undefined); // Or handle error appropriately
      }
    }
  };

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
            // setReviewStatus(data);
            const lines = data.lines;
            const mateMoves = lines.filter((x: any) => x.score.type === 'mate');
            const cpMoves = lines.filter((x: any) => x.score.type === 'cp');
            sortBy(mateMoves, (x) => x.score.value);
            sortBy(cpMoves, (x) => x.score.value, 'desc');
            const bestLines = [...mateMoves, ...cpMoves]; //.splice(0, 5);
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
  }, [engine]);

  return {
    bestMoveResult,
    reviewData,
    engine,
    reviewStatus,
    topMovesAnalysis,
    fetchTopMoves,
  };
}
