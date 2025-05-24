import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TopMovesPanel } from '../TopMovesPanel';
import { BestMoveOutput, StockfishLine, Score } from '../../Shared/Model';
import { Chess, Move } from 'chess.js';

// Mock chess.js
const mockChessMove = jest.fn();
const mockChessUndo = jest.fn();
const mockChessLoad = jest.fn(); // if needed for constructor

jest.mock('chess.js', () => {
  return {
    Chess: jest.fn().mockImplementation((fen) => {
      mockChessLoad(fen); // Track FEN used for initialization
      return {
        move: mockChessMove,
        undo: mockChessUndo,
        //fen: () => fen, // if needed
        // ... other methods if used by the component
      };
    }),
  };
});


describe('TopMovesPanel', () => {
  const mockOnSelectMove = jest.fn();
  const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Chess mock implementation for each test to ensure clean state
    (Chess as jest.Mock).mockImplementation((fen) => {
        mockChessLoad(fen);
        return {
            move: mockChessMove,
            undo: mockChessUndo,
        };
    });
  });

  const mockLine = (pv: string, cp?: number, mate?: number, depth = 10, multipv = 1): StockfishLine => ({
    pv,
    score: (cp !== undefined ? { type: 'cp', value: cp } : { type: 'mate', value: mate! }) as Score,
    depth,
    multipv,
    nodes: 1000,
    nps: 10000,
    time: 100,
    winChance: 0.5, // Example value
    seldepth: depth, // Example value
    info: `info depth ${depth} seldepth ${depth} multipv ${multipv} score ${cp !== undefined ? 'cp ' + cp : 'mate ' + mate} pv ${pv}`
  });


  test('renders loading message when topMovesOutput is undefined', () => {
    render(<TopMovesPanel topMovesOutput={undefined} onSelectMove={mockOnSelectMove} currentAnalysisFen={initialFen} />);
    expect(screen.getByText(/Loading top moves or no moves to display.../i)).toBeInTheDocument();
  });

  test('renders loading message when topMovesOutput.lines is empty', () => {
    const emptyOutput: BestMoveOutput = { lines: [], bestmove: '', ponder: '' };
    render(<TopMovesPanel topMovesOutput={emptyOutput} onSelectMove={mockOnSelectMove} currentAnalysisFen={initialFen} />);
    expect(screen.getByText(/Loading top moves or no moves to display.../i)).toBeInTheDocument();
  });

  describe('with topMovesOutput data', () => {
    const mockMovesOutput: BestMoveOutput = {
      lines: [
        mockLine('e2e4 e7e5', 100, undefined, 18, 1),
        mockLine('d2d4 d7d5', 50, undefined, 17, 2),
        mockLine('g1f3 g8f6', undefined, 5, 19, 3), // Mate in 5
        mockLine('c2c4 c7c5', -20, undefined, 16, 4),
        mockLine('b1c3 b8c6', 0, undefined, 15, 5), // Should not be displayed (top 4)
      ],
      bestmove: 'e2e4',
      ponder: 'e7e5',
    };

    test('renders top moves (up to 4) with scores and depths', () => {
      // Mock successful SAN conversion for all moves
      mockChessMove
        .mockReturnValueOnce({ san: 'e4' } as Move)
        .mockReturnValueOnce({ san: 'd4' } as Move)
        .mockReturnValueOnce({ san: 'Nf3' } as Move)
        .mockReturnValueOnce({ san: 'c4' } as Move);
        
      render(<TopMovesPanel topMovesOutput={mockMovesOutput} onSelectMove={mockOnSelectMove} currentAnalysisFen={initialFen} />);

      expect(screen.getByText(/1\. e4/i)).toBeInTheDocument();
      expect(screen.getByText(/CP: 100/i)).toBeInTheDocument();
      expect(screen.getByText(/\(D: 18\)/i)).toBeInTheDocument();

      expect(screen.getByText(/2\. d4/i)).toBeInTheDocument();
      expect(screen.getByText(/CP: 50/i)).toBeInTheDocument();
      expect(screen.getByText(/\(D: 17\)/i)).toBeInTheDocument();
      
      expect(screen.getByText(/3\. Nf3/i)).toBeInTheDocument();
      expect(screen.getByText(/Mate in 5/i)).toBeInTheDocument();
      expect(screen.getByText(/\(D: 19\)/i)).toBeInTheDocument();

      expect(screen.getByText(/4\. c4/i)).toBeInTheDocument();
      expect(screen.getByText(/CP: -20/i)).toBeInTheDocument();
      expect(screen.getByText(/\(D: 16\)/i)).toBeInTheDocument();
      
      expect(screen.queryByText(/b1c3/i)).not.toBeInTheDocument(); // 5th move
      expect(Chess).toHaveBeenCalledWith(initialFen); // Ensure Chess was initialized with the FEN
    });

    test('calls onSelectMove with correct line data on click', () => {
      mockChessMove.mockReturnValue({ san: 'e4' } as Move); // Mock for first move
      render(<TopMovesPanel topMovesOutput={mockMovesOutput} onSelectMove={mockOnSelectMove} currentAnalysisFen={initialFen} />);
      
      const firstMoveElement = screen.getByText(/1\./); // Find by the start of the line
      fireEvent.click(firstMoveElement);
      
      expect(mockOnSelectMove).toHaveBeenCalledTimes(1);
      expect(mockOnSelectMove).toHaveBeenCalledWith(mockMovesOutput.lines[0]);
    });

    test('displays LAN if SAN conversion fails (chess.js move returns null)', () => {
      mockChessMove.mockReturnValue(null); // Simulate failed SAN conversion for the first move
      
      render(<TopMovesPanel topMovesOutput={mockMovesOutput} onSelectMove={mockOnSelectMove} currentAnalysisFen={initialFen} />);
      
      // Expect the LAN 'e2e4' to be displayed for the first move
      expect(screen.getByText(/1\. e2e4/i)).toBeInTheDocument(); 
      expect(mockChessMove).toHaveBeenCalledWith({ from: 'e2', to: 'e4', promotion: undefined });
      expect(mockChessUndo).toHaveBeenCalledTimes(mockMovesOutput.lines.slice(0,4).length); // Called for each attempt
    });
    
    test('displays LAN if SAN conversion throws an error', () => {
      mockChessMove.mockImplementation(() => { throw new Error("SAN conversion error"); });
      
      render(<TopMovesPanel topMovesOutput={mockMovesOutput} onSelectMove={mockOnSelectMove} currentAnalysisFen={initialFen} />);
      
      expect(screen.getByText(/1\. e2e4/i)).toBeInTheDocument();
      // We don't check mockChessUndo here as it might not be called if .move throws before .undo can be called
    });

    test('handles moves with promotion for SAN conversion', () => {
      const promotionLine = mockLine('a7a8q', 500, undefined, 20, 1);
      const outputWithPromotion: BestMoveOutput = {
        lines: [promotionLine],
        bestmove: 'a7a8q',
      };
      mockChessMove.mockReturnValueOnce({ san: 'a8=Q' } as Move);

      render(<TopMovesPanel topMovesOutput={outputWithPromotion} onSelectMove={mockOnSelectMove} currentAnalysisFen={initialFen} />);
      
      expect(screen.getByText(/1\. a8=Q/i)).toBeInTheDocument();
      expect(mockChessMove).toHaveBeenCalledWith({ from: 'a7', to: 'a8', promotion: 'q' });
      expect(mockChessUndo).toHaveBeenCalledTimes(1);
    });
  });
});
