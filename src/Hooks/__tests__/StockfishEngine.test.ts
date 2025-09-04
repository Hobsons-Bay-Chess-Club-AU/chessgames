import { StockfishEngine } from '../StockfishEngine';
import { BestMoveOutput, StockfishLine } from '../../Shared/Model';

// Mock the Worker
const mockPostMessage = jest.fn();
const mockTerminate = jest.fn();
let mockOnMessage: ((event: MessageEvent) => void) | null = null;

global.Worker = jest.fn().mockImplementation(() => ({
  postMessage: mockPostMessage,
  terminate: mockTerminate,
  set onmessage(handler: (event: MessageEvent) => void) {
    mockOnMessage = handler;
  },
  get onmessage() {
    return mockOnMessage;
  },
})) as any;


// Helper function to simulate messages from the worker
function emitWorkerMessage(data: string) {
  if (mockOnMessage) {
    mockOnMessage({ data } as MessageEvent);
  }
}

describe('StockfishEngine', () => {
  let engine: StockfishEngine;
  let emitterMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    emitterMock = jest.fn();
    engine = new StockfishEngine(emitterMock);
    // Simulate initial 'uciok' and 'isready' flow if necessary for setup,
    // or ensure methods reset state appropriately.
    // For getTopMoves, it calls reset, so initial state might not be critical.
    emitWorkerMessage('info string classical evaluation enabled.'); // Consume initial messages
    emitWorkerMessage('info string NNUE evaluation enabled.');
    emitWorkerMessage('uciok'); 
    emitWorkerMessage('readyok');
  });

  describe('getTopMoves', () => {
    it('should call setOption MultiPV with count and then reset to 1, and process lines', async () => {
      const positionFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const count = 3;
      const depth = 10;

      // Intercept 'go depth' to know when to send info lines
      mockPostMessage.mockImplementation((command) => {
        if (command.startsWith('go depth')) {
          // Simulate stockfish output for MultiPV
          setTimeout(() => {
            emitWorkerMessage('info depth 1 seldepth 1 multipv 1 score cp 100 nodes 10 nps 1000 time 100 pv e2e4');
            emitWorkerMessage('info depth 1 seldepth 1 multipv 2 score cp 50 nodes 10 nps 1000 time 100 pv d2d4');
            emitWorkerMessage('info depth 1 seldepth 1 multipv 3 score cp 0 nodes 10 nps 1000 time 100 pv g1f3');
            emitWorkerMessage('bestmove e2e4 ponder e7e5');
          }, 0);
        }
      });
      
      const result = await engine.getTopMoves(positionFen, count, depth);

      expect(mockPostMessage).toHaveBeenCalledWith('setoption name MultiPV value 3');
      expect(mockPostMessage).toHaveBeenCalledWith('position fen ' + positionFen);
      expect(mockPostMessage).toHaveBeenCalledWith('go depth ' + depth);
      
      // Check that MultiPV is reset
      // This relies on the internal call order of sendUci. A more robust way might be to check the last relevant calls.
      const setOptionCalls = mockPostMessage.mock.calls.filter(call => call[0].startsWith('setoption name MultiPV'));
      expect(setOptionCalls.length).toBeGreaterThanOrEqual(2); // Initial set, then reset
      expect(setOptionCalls[setOptionCalls.length -1][0]).toBe('setoption name MultiPV value 1');


      expect(result).toBeDefined();
      expect(result.lines).toHaveLength(3);
      expect(result.lines[0].pv).toBe('e2e4');
      expect(result.lines[0].multipv).toBe(1);
      expect(result.lines[1].pv).toBe('d2d4');
      expect(result.lines[1].multipv).toBe(2);
      expect(result.lines[2].pv).toBe('g1f3');
      expect(result.lines[2].multipv).toBe(3);
      expect(result.bestmove).toBe('e2e4');
      expect(result.position).toBe(positionFen); // Check position is set
      
      // postEngineRun internally sorts, so the order might change based on score
      // The example output above has decreasing scores, so it should remain.
      // If scores were different, this would need to be adjusted.
      // For example, if multipv 2 had a higher score than multipv 1.
      // Let's refine the sorting check based on typical postEngineRun behavior (mates first, then CP desc)
    });

    it('should sort lines correctly (mates first, then CP descending) via postEngineRun', async () => {
      const positionFen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
      const count = 3;
      const depth = 12;

      mockPostMessage.mockImplementation((command) => {
        if (command.startsWith('go depth')) {
          setTimeout(() => {
            emitWorkerMessage('info depth 1 seldepth 1 multipv 1 score cp 50 nodes 10 nps 1000 time 100 pv d2d4'); // Lower CP
            emitWorkerMessage('info depth 1 seldepth 1 multipv 2 score mate 2 nodes 10 nps 1000 time 100 pv e2e4'); // Mate
            emitWorkerMessage('info depth 1 seldepth 1 multipv 3 score cp 100 nodes 10 nps 1000 time 100 pv g1f3'); // Higher CP
            emitWorkerMessage('bestmove e2e4 ponder e7e5');
          }, 0);
        }
      });

      const result = await engine.getTopMoves(positionFen, count, depth);

      expect(result.lines).toHaveLength(3);
      expect(result.lines[0].score.type).toBe('mate');
      expect(result.lines[0].pv).toBe('e2e4');
      expect(result.lines[1].score.type).toBe('cp');
      expect(result.lines[1].score.value).toBe(100); // Higher CP score
      expect(result.lines[1].pv).toBe('g1f3');
      expect(result.lines[2].score.type).toBe('cp');
      expect(result.lines[2].score.value).toBe(50); // Lower CP score
      expect(result.lines[2].pv).toBe('d2d4');
      expect(result.position).toBe(positionFen);
    });
     it('should ensure this.data.position is set before postEngineRun is called', async () => {
      const positionFen = 'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
      const count = 1;
      const depth = 1;

      // Spy on postEngineRun and check this.data.position within its execution context
      // This is a bit tricky as postEngineRun is internal. A less direct way is to check
      // result.position, which is set from this.data.position in postEngineRun.
      // We already test result.position.

      // For a more direct test (if postEngineRun were public or easily spied on):
      // const postEngineRunSpy = jest.spyOn(engine as any, 'postEngineRun');
      // await engine.getTopMoves(positionFen, count, depth);
      // expect((engine as any).data.position).toBe(positionFen); // Check before spy call if possible
      // expect(postEngineRunSpy).toHaveBeenCalled();
      // This would require making 'data' public or having a getter, or making postEngineRun a spy target.

      // Simpler check: if result.position is correct, this.data.position was set.
       mockPostMessage.mockImplementation((command) => {
        if (command.startsWith('go depth')) {
          setTimeout(() => {
            emitWorkerMessage('info depth 1 seldepth 1 multipv 1 score cp 100 nodes 10 nps 1000 time 100 pv e2e4');
            emitWorkerMessage('bestmove e2e4 ponder e7e5');
          }, 0);
        }
      });
      const result = await engine.getTopMoves(positionFen, count, depth);
      expect(result.position).toBe(positionFen);
    });
  });
});
