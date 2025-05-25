import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { GameViewer } from '../GameViewer';
import { GameData, StockfishLine } from '../../Shared/Model';
import { GameTree, GameTreeNode } from '../../Shared/GameTree';

// Default depth from useStockfishOptions
const DEFAULT_ENGINE_DEPTH = 12; 

// --- Mocks ---

// Mock useStockfish
const mockFetchTopMoves = jest.fn();
const mockEngineReviewGame = jest.fn();
jest.mock('../../Hooks/useStockfish', () => ({
  useStockfish: () => ({
    engine: { reviewGame: mockEngineReviewGame }, 
    bestMoveResult: undefined,
    reviewData: undefined,
    reviewStatus: undefined,
    fetchTopMoves: mockFetchTopMoves,
    topMovesAnalysis: undefined, 
  }),
}));

// Mock useStockfishOptions to control depth
jest.mock('../../Hooks/useStockfishOptions', () => ({
  __esModule: true,
  default: () => [{ depth: DEFAULT_ENGINE_DEPTH }, jest.fn()],
}));


// Mock GameTree
const mockAddMove = jest.fn();
const mockNavigateToNode = jest.fn(); 
const mockGetCurrentNode = jest.fn();
const mockGetParentNode = jest.fn();
const mockGetMovesToNode = jest.fn().mockReturnValue([]); // Default to empty array
const mockFormatPathToPgn = jest.fn().mockReturnValue(''); // Default to empty string
const mockRootNode: GameTreeNode = { id: 'root', fen: 'startFEN', children: [], move: null, san: '', parentId: null, isMainLine: true, startingMoveNumber: 1 };
const mockNodesMap = new Map<string, GameTreeNode>();
mockNodesMap.set('root', mockRootNode);

jest.mock('../../Shared/GameTree', () => {
  return {
    GameTree: jest.fn().mockImplementation((initialFen, mainLineSANs) => {
      let lastNode = { ...mockRootNode, fen: initialFen || 'startFEN' }; // Ensure rootNode has the initialFen
      mockNodesMap.clear(); // Clear map for new instance
      mockNodesMap.set(lastNode.id, lastNode);

      if (mainLineSANs && mainLineSANs.length > 0) {
        mainLineSANs.forEach((san: string, index: number) => {
          const moveColor = index % 2 === 0 ? 'w' : 'b'; // Alternate color
          const childNode: GameTreeNode = { 
            id: `node-${index}`, 
            san, 
            fen: `fen-for-${san}`, 
            parentId: lastNode.id, 
            children: [], 
            move: { san, from: 'a1', to: 'a2', color: moveColor } as any, // Add basic move object
            isMainLine: true, 
            startingMoveNumber: Math.floor(index/2)+1 
          };
          mockNodesMap.set(childNode.id, childNode);
          if(lastNode.children) lastNode.children.push(childNode); else lastNode.children = [childNode];
          // Ensure rootNode's children array is also updated if lastNode is rootNode
          if (lastNode.id === mockRootNode.id) {
             mockRootNode.children = [childNode]; // Simplified: assumes first main line move is child of root
          }
          lastNode = childNode;
        });
      }
      mockGetCurrentNode.mockReturnValue(lastNode); 

      return {
        rootNode: mockRootNode, // Use the consistent mockRootNode reference
        currentNodeId: lastNode.id,
        nodes: mockNodesMap, 
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
jest.mock('../ReviewPanel', () => ({ ReviewPanel: (props: any) => <div data-testid="review-panel" onClick={() => props.onNavigateToNode && props.onNavigateToNode('someNodeIdFromPanel')} /> }));
jest.mock('../TopMovesPanel', () => ({ TopMovesPanel: (props: any) => <div data-testid="top-moves-panel" onClick={() => props.onSelectMove && props.onSelectMove({ pv: 'd2d4 d7d5' } as StockfishLine)} /> })); // Ensure pv has at least one move
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
  Moves: ['e4', 'e5', 'Nf3', 'Nc6'], 
  WhiteElo: '1500',
  BlackElo: '1500',
  LastPosition: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 
  fen: undefined, 
  pgn: '1. e4 e5 2. Nf3 Nc6',
};


describe('GameViewer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mockRootNode for each test to avoid state leakage
    mockRootNode.children = []; 
    mockRootNode.fen = 'startFEN'; // Reset FEN

    // Default mock for getCurrentNode to return a fresh rootNode
    mockGetCurrentNode.mockImplementation(() => ({ ...mockRootNode })); 
    
    mockAddMove.mockImplementation((moveInput, parentId) => {
      const san = typeof moveInput === 'string' ? moveInput : moveInput.from + moveInput.to;
      const newNode: GameTreeNode = { 
        id: `newNode-${Date.now()}`, 
        fen: 'newFEN', 
        san: san, 
        parentId, 
        children: [], 
        move: { san } as any, 
        isMainLine: false, 
        startingMoveNumber: 1 
      };
      mockNodesMap.set(newNode.id, newNode);
      return newNode;
    });
    mockGetMovesToNode.mockReturnValue([mockRootNode]); // Default for path to root
  });

  test('Initial Load: initializes GameTree, Chessboard, ReviewPanel, and fetches top moves', () => {
    render(<GameViewer data={mockGameData} />);

    expect(GameTree).toHaveBeenCalledWith(mockGameData.LastPosition, mockGameData.Moves);
    
    const chessboard = screen.getByTestId('chessboard');
    const lastMainLineNode = mockNodesMap.get(`node-${mockGameData.Moves.length -1}`);
    expect(chessboard).toHaveAttribute('data-fen', lastMainLineNode?.fen || mockRootNode.fen);

    expect(screen.getByTestId('review-panel')).toBeInTheDocument();
    expect(mockFetchTopMoves).toHaveBeenCalledWith(lastMainLineNode?.fen || mockRootNode.fen, DEFAULT_ENGINE_DEPTH);
  });

  test('handleMoveOnBoard: calls gameTree.addMove, updates current node, and fetches top moves', () => {
    const initialCurrentNode = { ...mockRootNode, id: 'root-for-move', fen: 'rootFEN-for-move' };
    mockGetCurrentNode.mockReturnValue(initialCurrentNode); // Set current node for this test

    render(<GameViewer data={mockGameData} />);
    
    const newMoveNodeData = { id: 'd4-node', fen: 'd4-fen', san: 'd4', parentId: initialCurrentNode.id, children: [], move: {} as any, isMainLine: false, startingMoveNumber: 1 };
    mockAddMove.mockReturnValue(newMoveNodeData); 

    const chessboard = screen.getByTestId('chessboard');
    fireEvent.click(chessboard); 

    expect(mockAddMove).toHaveBeenCalledWith(
      { from: 'e2', to: 'e4', promotion: 'q' },
      initialCurrentNode.id
    );
    expect(mockFetchTopMoves).toHaveBeenCalledWith(newMoveNodeData.fen, DEFAULT_ENGINE_DEPTH);
  });
  
  test('Navigation Controls: handleFirstMove', () => {
    render(<GameViewer data={mockGameData} />);
    mockNodesMap.set(mockRootNode.id, mockRootNode); 
    fireEvent.click(screen.getByTitle('First Move'));
    expect(mockFetchTopMoves).toHaveBeenCalledWith(mockRootNode.fen, DEFAULT_ENGINE_DEPTH);
  });

  test('Navigation Controls: handlePreviousMove', () => {
    const parentNodeData = { ...mockRootNode, id: 'parent-id', fen: 'parentFEN' };
    const childNodeData = { ...mockRootNode, id: 'child-id', parentId: 'parent-id', san: 'e4', fen: 'childFEN' };
    mockGetCurrentNode.mockReturnValue(childNodeData); 
    mockGetParentNode.mockReturnValue(parentNodeData); 
    mockNodesMap.set(childNodeData.id, childNodeData);
    mockNodesMap.set(parentNodeData.id, parentNodeData);

    render(<GameViewer data={mockGameData} />);
    fireEvent.click(screen.getByTitle('Previous Move'));
    expect(mockGetParentNode).toHaveBeenCalledWith(childNodeData.id);
    expect(mockFetchTopMoves).toHaveBeenCalledWith(parentNodeData.fen, DEFAULT_ENGINE_DEPTH);
  });

  test('Navigation Controls: handleNextMove', () => {
    const childNodeData = { id: 'child-id', fen: 'childFEN', san: 'e4', parentId: 'root-for-next', children: [], move: {} as any, isMainLine: true, startingMoveNumber: 1 };
    const rootForNextData = { ...mockRootNode, id: 'root-for-next', children: [childNodeData] };
    mockGetCurrentNode.mockReturnValue(rootForNextData); 
    mockNodesMap.set(childNodeData.id, childNodeData);
    mockNodesMap.set(rootForNextData.id, rootForNextData);


    render(<GameViewer data={mockGameData} />);
    fireEvent.click(screen.getByTitle('Next Move'));
    expect(mockFetchTopMoves).toHaveBeenCalledWith(childNodeData.fen, DEFAULT_ENGINE_DEPTH);
  });
  
  test('Navigation Controls: handleLastMove', () => {
    const node1Data = { id: 'node1-last', fen: 'fen1-last', san: 'e4', parentId: 'root-for-last', children: [], move: {} as any, isMainLine: true, startingMoveNumber: 1 };
    const node2Data = { id: 'node2-last', fen: 'fen2-last', san: 'e5', parentId: 'node1-last', children: [], move: {} as any, isMainLine: true, startingMoveNumber: 1 };
    const rootForLastData = { ...mockRootNode, id: 'root-for-last', children: [node1Data] };
    node1Data.children = [node2Data]; // node1 has node2 as child
    
    mockGetCurrentNode.mockReturnValue(rootForLastData); 
    mockNodesMap.set(rootForLastData.id, rootForLastData);
    mockNodesMap.set(node1Data.id, node1Data);
    mockNodesMap.set(node2Data.id, node2Data);

    render(<GameViewer data={mockGameData} />);
    fireEvent.click(screen.getByTitle('Last Move'));
    expect(mockFetchTopMoves).toHaveBeenCalledWith(node2Data.fen, DEFAULT_ENGINE_DEPTH); 
  });

  test('TopMovesPanel Interaction (onSelectAnalysisMove): calls gameTree.addMove and fetches top moves', async () => {
    const initialCurrentNode = { ...mockRootNode, id: 'root-for-topmoves', fen: 'rootFEN-for-topmoves' };
    mockGetCurrentNode.mockReturnValue(initialCurrentNode);

    render(<GameViewer data={mockGameData} />);
    
    // Simulate clicking the 'LuBrain' button to toggle isAnalysisMode to true
    // Assuming initial state of isAnalysisMode is false
    const analysisModeButton = screen.getByTitle('Start Exploration'); 
    fireEvent.click(analysisModeButton); 

    const newMoveNodeData = { id: 'd4-node-topmoves', fen: 'd4-fen-topmoves', san: 'd4', parentId: initialCurrentNode.id, children: [], move: {} as any, isMainLine: false, startingMoveNumber: 1 };
    mockAddMove.mockReturnValue(newMoveNodeData);

    // Wait for TopMovesPanel to be potentially rendered (though it's mocked, the click should work)
    // The click on TopMovesPanel mock triggers its onSelectMove prop
    const topMovesPanel = screen.getByTestId('top-moves-panel');
    fireEvent.click(topMovesPanel); 

    expect(mockAddMove).toHaveBeenCalledWith(
      { from: 'd2', to: 'd4', promotion: 'q' }, 
      initialCurrentNode.id
    );
    expect(mockFetchTopMoves).toHaveBeenCalledWith(newMoveNodeData.fen, DEFAULT_ENGINE_DEPTH);
  });
  
  test('handleNavigateToNode (from ReviewPanel): updates current node and fetches top moves', () => {
    const targetNodeId = 'nodeFromPanel';
    const targetNodeData = { id: targetNodeId, fen: 'targetFEN-panel', san: 'Nf3', parentId: 'someParent', children: [], move: {} as any, isMainLine: false, startingMoveNumber: 2 };
    mockNodesMap.set(targetNodeId, targetNodeData); 

    render(<GameViewer data={mockGameData} />);
    
    // The mock ReviewPanel calls onNavigateToNode('someNodeIdFromPanel') on click.
    // We need to ensure 'someNodeIdFromPanel' is in our map and points to targetNodeData for this test.
    mockNodesMap.set('someNodeIdFromPanel', targetNodeData);

    const reviewPanelMock = screen.getByTestId('review-panel');
    fireEvent.click(reviewPanelMock);
    
    expect(mockFetchTopMoves).toHaveBeenCalledWith(targetNodeData.fen, DEFAULT_ENGINE_DEPTH);
  });

});
