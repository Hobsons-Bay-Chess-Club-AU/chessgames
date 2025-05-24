import { renderHook, act } from '@testing-library/react-hooks';
import { useStockfish } from '../useStockfish';
import { StockfishEngine } from '../StockfishEngine';
import { BestMoveOutput, StockfishLine } from '../../Shared/Model';

// Mock StockfishEngine
// We need to mock the implementation of the class, not just the import path
// if the hook instantiates it directly.
const mockGetTopMoves = jest.fn();
const mockFindBestMove = jest.fn();
const mockQuit = jest.fn();
const mockReviewGame = jest.fn();

jest.mock('../StockfishEngine', () => {
  return {
    StockfishEngine: jest.fn().mockImplementation((emitter) => {
      return {
        getTopMoves: mockGetTopMoves,
        findBestMove: mockFindBestMove,
        quit: mockQuit,
        reviewGame: mockReviewGame,
        // Mock other methods if they are called during hook initialization or cleanup
        // For example, if constructor sends 'uci' or 'isready' and expects emitter calls
        // For now, keep it simple focusing on getTopMoves.
      };
    }),
  };
});

describe('useStockfish Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks before each test
    mockGetTopMoves.mockReset();
    mockFindBestMove.mockReset();
    mockQuit.mockReset();
  });

  it('should initialize and set engine', () => {
    const { result } = renderHook(() => useStockfish());
    expect(result.current.engine).toBeDefined();
    expect(StockfishEngine).toHaveBeenCalledTimes(1);
  });

  describe('fetchTopMoves', () => {
    it('should call engine.getTopMoves and update topMovesAnalysis state on success', async () => {
      const mockTopMovesData: BestMoveOutput = {
        lines: [
          { pv: 'e2e4 e7e5', score: { type: 'cp', value: 10 }, depth: 10, multipv: 1, winChance: 0.51 } as StockfishLine,
        ],
        bestmove: 'e2e4',
        ponder: 'e7e5',
        position: 'startpos',
      };
      mockGetTopMoves.mockResolvedValue(mockTopMovesData);

      const { result, waitForNextUpdate } = renderHook(() => useStockfish());

      // Ensure engine is initialized before calling fetchTopMoves
      // In this setup, useEffect runs on mount and initializes engine.
      // If engine initialization was async or conditional in a more complex way,
      // we might need to wait for it.

      await act(async () => {
        result.current.fetchTopMoves('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        // No need for waitForNextUpdate if state update is synchronous after promise resolution
      });
      
      // Need to wait for the promise to resolve and state to update
      // await waitForNextUpdate(); // This might be needed if act doesn't fully cover it.
      // For promises and state updates, act should handle it, but sometimes timing can be tricky.
      // Let's verify directly after act.

      expect(mockGetTopMoves).toHaveBeenCalledWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 4);
      expect(result.current.topMovesAnalysis).toEqual(mockTopMovesData);
    });

    it('should set topMovesAnalysis to undefined and log error on failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const errorMessage = 'Engine error';
      mockGetTopMoves.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useStockfish());

      await act(async () => {
        result.current.fetchTopMoves('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      });

      expect(mockGetTopMoves).toHaveBeenCalledWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 4);
      expect(result.current.topMovesAnalysis).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching top moves:', new Error(errorMessage));

      consoleErrorSpy.mockRestore();
    });
  });
  
  it('should call engine.quit on unmount', () => {
    const { unmount } = renderHook(() => useStockfish());
    unmount();
    expect(mockQuit).toHaveBeenCalledTimes(1);
  });

  // Example of testing emitter logic if needed (though not directly for getTopMoves)
  it('should update bestMoveResult when engine emits bestmove event', () => {
    // This requires the mocked StockfishEngine constructor to capture the emitter
    // and a way to simulate an emission.
    let capturedEmitter: ((type: string, data: any) => void) | null = null;
    (StockfishEngine as jest.Mock).mockImplementationOnce((emitter) => {
      capturedEmitter = emitter; // Capture the emitter
      return { /* other methods */ quit: mockQuit, getTopMoves: mockGetTopMoves, findBestMove: mockFindBestMove };
    });

    const { result } = renderHook(() => useStockfish());
    
    expect(capturedEmitter).not.toBeNull();

    const mockBestMoveData: BestMoveOutput = {
        lines: [], bestmove: 'd2d4', ponder: 'd7d5', position: 'somefen'
    };

    act(() => {
      if (capturedEmitter) {
        capturedEmitter('bestmove', mockBestMoveData);
      }
    });

    expect(result.current.bestMoveResult).toEqual(mockBestMoveData);
  });

});
