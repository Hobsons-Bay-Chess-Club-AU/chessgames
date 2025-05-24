import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { GameViewer } from '../GameViewer';
import { GameData, StockfishLine } from '../../Shared/Model';
import { GameTree, GameTreeNode } from '../../Shared/GameTree';

// --- Mocks ---

// Mock useStockfish
const mockFetchTopMoves = jest.fn();
const mockEngineReviewGame = jest.fn();
jest.mock('../../Hooks/useStockfish', () => ({
  useStockfish: () => ({
    engine: { reviewGame: mockEngineReviewGame }, // Mock engine object with methods if used
    bestMoveResult: undefined,
    reviewData: undefined,
    reviewStatus: undefined,
    fetchTopMoves: mockFetchTopMoves,
    topMovesAnalysis: undefined, // Provide initial state for topMovesAnalysis
  }),
}));

// Mock GameTree
const mockAddMove = jest.fn();
const mockNavigateToNode = jest.fn(); // Not directly used by GameViewer, but GameTree method
const mockGetCurrentNode = jest.fn();
const mockGetParentNode = jest.fn();
const mockGetMovesToNode = jest.fn();
const mockFormatPathToPgn = jest.fn();
const mockRootNode = { id: 'root', fen: 'startFEN', children: [], move: null, san: '', parentId: null, isMainLine: true, startingMoveNumber: 1 };
const mockNodesMap = new Map<string, GameTreeNode>();
mockNodesMap.set('root', mockRootNode);

jest.mock('../../Shared/GameTree', () => {
  return {
    GameTree: jest.fn().mockImplementation((initialFen, mainLineSANs) => {
      // Simulate main line construction if mainLineSANs are provided
      let lastNode = mockRootNode;
      if (mainLineSANs && mainLineSANs.length > 0) {
        mainLineSANs.forEach((san: string, index: number) => {
          const childNode = { 
            id: `node-${index}`, san, fen: `fen-for-${san}`, 
            parentId: lastNode.id, children: [], move: { san } as any, 
            isMainLine: true, startingMoveNumber: Math.floor(index/2)+1 
          };
          mockNodesMap.set(childNode.id, childNode);
          if(lastNode.children) lastNode.children.push(childNode); else lastNode.children = [childNode];
          if(index === 0 && mockRootNode.children.length === 0) mockRootNode.children.push(childNode); // ensure root has child
          lastNode = childNode;
        });
      }
      mockGetCurrentNode.mockReturnValue(lastNode); // getCurrentNode returns the last node of main line initially

      return {
        rootNode: mockRootNode,
        currentNodeId: lastNode.id,
        nodes: mockNodesMap, // Provide the map for handleNavigateToNode
        addMove: mockAddMove,
        navigateToNode: mockNavigateToNode,
        getCurrentNode: mockGetCurrentNode,
        getParentNode: mockGetParentNode,
        getMovesToNode: mockGetMovesToNode,
        formatPathToPgn: mockFormatPathToPgn,
      };
    }),
  };
});

// Mock Child Components
jest.mock('react-chessboard', () => ({ Chessboard: (props: any) => <div data-testid="chessboard" data-fen={props.position} onClick={() => props.onPieceDrop && props.onPieceDrop('e2', 'e4', 'wP')} /> }));
jest.mock('../ReviewPanel', () => ({ ReviewPanel: (props: any) => <div data-testid="review-panel" onClick={() => props.onNavigateToNode && props.onNavigateToNode('someNodeId')} /> }));
jest.mock('../TopMovesPanel', () => ({ TopMovesPanel: (props: any) => <div data-testid="top-moves-panel" onClick={() => props.onSelectMove && props.onSelectMove({ pv: 'd2d4' } as StockfishLine)} /> }));
jest.mock('../EloBar', () => ({ EloBar: () => <div data-testid="elo-bar" /> }));
jest.mock('../ReviewLoading', () => () => <div data-testid="review-loading" />);
jest.mock('../CapturedPieces', () => () => <div data-testid="captured-pieces" />);


const mockGameData: GameData = {
  Event: 'Test Event',
  Site: 'Test Site',
  Date: '2024.07.28',
  Round: '1',
  White: 'Player W',
  Black: 'Player B',
  Result: '1-0',
  ECO: 'A00',
  Moves: ['e4', 'e5', 'Nf3', 'Nc6'], // SAN moves
  WhiteElo: '1500',
  BlackElo: '1500',
  LastPosition: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', // FEN for after Nc6
  fen: undefined, // Test case where initial FEN comes from LastPosition if fen is undefined
  pgn: '1. e4 e5 2. Nf3 Nc6',
};


describe('GameViewer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset root node children for each test if GameTree mock is stateful across tests
    mockRootNode.children = [];
    mockNodesMap.clear();
    mockNodesMap.set('root', mockRootNode);

    // Default mock for getCurrentNode to return root initially or after main line processing.
    // The GameTree mock constructor handles setting it to the end of main line.
    mockGetCurrentNode.mockReturnValue(mockRootNode); 
    
    // Default mock for addMove to simulate successful move addition
    mockAddMove.mockImplementation((moveInput, parentId) => {
      const newNode = { id: `newNode-${Date.now()}`, fen: 'newFEN', san: (moveInput as any).san || 'd4', parentId, children: [], move: {} as any, isMainLine: false, startingMoveNumber: 1 };
      mockNodesMap.set(newNode.id, newNode);
      return newNode;
    });
  });

  test('Initial Load: initializes GameTree, Chessboard, ReviewPanel, and fetches top moves', () => {
    render(<GameViewer data={mockGameData} />);

    expect(GameTree).toHaveBeenCalledWith(mockGameData.LastPosition, mockGameData.Moves);
    
    const chessboard = screen.getByTestId('chessboard');
    // getCurrentNode is mocked to return the last node of main line by GameTree mock constructor
    const lastMainLineNode = mockNodesMap.get(`node-${mockGameData.Moves.length -1}`);
    expect(chessboard).toHaveAttribute('data-fen', lastMainLineNode?.fen || mockRootNode.fen);

    expect(screen.getByTestId('review-panel')).toBeInTheDocument();
    expect(mockFetchTopMoves).toHaveBeenCalledWith(lastMainLineNode?.fen || mockRootNode.fen, expect.any(Number));
  });

  test('handleMoveOnBoard: calls gameTree.addMove, updates current node, and fetches top moves', () => {
    render(<GameViewer data={mockGameData} />);
    
    const newMoveNode = { id: 'd4-node', fen: 'd4-fen', san: 'd4', parentId: 'root', children: [], move: {} as any, isMainLine: false, startingMoveNumber: 1 };
    mockAddMove.mockReturnValue(newMoveNode); // Ensure addMove returns a node
    mockGetCurrentNode.mockReturnValue(mockRootNode); // Assume current node is root for this interaction

    const chessboard = screen.getByTestId('chessboard');
    fireEvent.click(chessboard); // Simulates onPieceDrop('e2', 'e4', 'wP') due to mock

    expect(mockAddMove).toHaveBeenCalledWith(
      { from: 'e2', to: 'e4', promotion: 'q' },
      mockRootNode.id
    );
    expect(mockFetchTopMoves).toHaveBeenCalledWith(newMoveNode.fen, expect.any(Number));
  });
  
  test('Navigation Controls: handleFirstMove', () => {
    render(<GameViewer data={mockGameData} />);
    mockNodesMap.set(mockRootNode.id, mockRootNode); // Ensure root node is in map for handleNavigateToNode
    fireEvent.click(screen.getByTitle('First Move'));
    expect(mockFetchTopMoves).toHaveBeenCalledWith(mockRootNode.fen, expect.any(Number));
  });

  test('Navigation Controls: handlePreviousMove', () => {
    const childNode = { ...mockRootNode, id: 'child', parentId: 'root', san: 'e4', fen: 'childFEN' };
    mockRootNode.children = [childNode]; // Setup parent-child
    mockGetCurrentNode.mockReturnValue(childNode); // Current is child
    mockGetParentNode.mockReturnValue(mockRootNode); // Mock getParentNode
    mockNodesMap.set(childNode.id, childNode);
    mockNodesMap.set(mockRootNode.id, mockRootNode);


    render(<GameViewer data={mockGameData} />);
    fireEvent.click(screen.getByTitle('Previous Move'));
    expect(mockGetParentNode).toHaveBeenCalledWith(childNode.id);
    expect(mockFetchTopMoves).toHaveBeenCalledWith(mockRootNode.fen, expect.any(Number));
  });

  test('Navigation Controls: handleNextMove', () => {
    const childNode = { id: 'child', fen: 'childFEN', san: 'e4', parentId: 'root', children: [], move: {} as any, isMainLine: true, startingMoveNumber: 1 };
    mockRootNode.children = [childNode];
    mockGetCurrentNode.mockReturnValue(mockRootNode); // Current is root, next is child
    mockNodesMap.set(childNode.id, childNode);

    render(<GameViewer data={mockGameData} />);
    fireEvent.click(screen.getByTitle('Next Move'));
    expect(mockFetchTopMoves).toHaveBeenCalledWith(childNode.fen, expect.any(Number));
  });
  
  test('Navigation Controls: handleLastMove', () => {
    // Setup a deeper main line for last move
    const node1 = { id: 'node1', fen: 'fen1', san: 'e4', parentId: 'root', children: [], move: {} as any, isMainLine: true, startingMoveNumber: 1 };
    const node2 = { id: 'node2', fen: 'fen2', san: 'e5', parentId: 'node1', children: [], move: {} as any, isMainLine: true, startingMoveNumber: 1 };
    mockRootNode.children = [node1];
    node1.children = [node2];
    mockNodesMap.set(node1.id, node1);
    mockNodesMap.set(node2.id, node2);
    mockGetCurrentNode.mockReturnValue(mockRootNode); // Start from root for this test of handleLastMove

    render(<GameViewer data={mockGameData} />);
    fireEvent.click(screen.getByTitle('Last Move'));
    expect(mockFetchTopMoves).toHaveBeenCalledWith(node2.fen, expect.any(Number)); // Should navigate to node2
  });

  test('TopMovesPanel Interaction (onSelectAnalysisMove): calls gameTree.addMove and fetches top moves', () => {
    // Set isAnalysisMode to true to render TopMovesPanel
    // This requires a way to set isAnalysisMode or trigger its set.
    // For simplicity, we assume TopMovesPanel is rendered.
    // If GameViewer's state controls this, we might need to simulate the button click first.

    render(
        <GameViewer data={mockGameData} />
    );
    // Simulate clicking the 'LuBrain' button to toggle isAnalysisMode
    const analysisModeButton = screen.getByTitle('Start Exploration'); // Or "Exit Exploration" if default is true
    fireEvent.click(analysisModeButton); // Now isAnalysisMode should be true

    const newMoveNode = { id: 'd4-node-from-topmoves', fen: 'd4-fen-topmoves', san: 'd4', parentId: 'root', children: [], move: {} as any, isMainLine: false, startingMoveNumber: 1 };
    mockAddMove.mockReturnValue(newMoveNode);
    mockGetCurrentNode.mockReturnValue(mockRootNode); // Assume current node is root

    const topMovesPanel = screen.getByTestId('top-moves-panel');
    fireEvent.click(topMovesPanel); // Simulates onSelectMove with { pv: 'd2d4' }

    expect(mockAddMove).toHaveBeenCalledWith(
      { from: 'd2', to: 'd4', promotion: 'q' }, // d2d4 parsed from pv
      mockRootNode.id
    );
    expect(mockFetchTopMoves).toHaveBeenCalledWith(newMoveNode.fen, expect.any(Number));
  });
  
  test('handleNavigateToNode (from ReviewPanel): updates current node and fetches top moves', () => {
    const targetNodeId = 'targetNode';
    const targetNode = { id: targetNodeId, fen: 'targetFEN', san: 'Nf3', parentId: 'someParent', children: [], move: {} as any, isMainLine: false, startingMoveNumber: 2 };
    mockNodesMap.set(targetNodeId, targetNode); // Make sure the node is in our mock map

    render(<GameViewer data={mockGameData} />);
    
    // Simulate ReviewPanel calling onNavigateToNode
    // The mock ReviewPanel calls onNavigateToNode('someNodeId') on click
    // We'll make 'someNodeId' our targetNodeId for this test
    const reviewPanelMock = screen.getByTestId('review-panel');
    // To make this more robust, we'd ideally pass a specific ID from the test
    // For now, we assume the mock ReviewPanel calls with an ID we can intercept or predict
    // Let's refine the mock or this test.
    // For now, we can just call the handler if it's exposed, or rely on the click.
    // The mock ReviewPanel calls with 'someNodeId'. Let's use that.
    mockNodesMap.set('someNodeId', targetNode);


    fireEvent.click(reviewPanelMock);
    
    expect(mockFetchTopMoves).toHaveBeenCalledWith(targetNode.fen, expect.any(Number));
  });

});
