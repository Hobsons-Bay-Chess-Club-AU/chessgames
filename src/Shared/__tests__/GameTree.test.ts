import { GameTree, GameTreeNode } from '../GameTree';
import { Chess, Move } from 'chess.js'; // Will use actual chess.js

// Helper to reset the internal nodeIdCounter if it's exposed or needs resetting for test predictability
// For now, assuming it's an internal detail and tests are independent enough.
// If GameTree exposed a reset for its ID counter, we'd call it in beforeEach.

describe('GameTree', () => {
  describe('Constructor', () => {
    it('should initialize with default FEN and no main line if no args provided', () => {
      const tree = new GameTree();
      expect(tree.rootNode).toBeDefined();
      expect(tree.rootNode.fen).toBe(new Chess().fen()); // Default starting FEN
      expect(tree.rootNode.children).toHaveLength(0);
      expect(tree.currentNodeId).toBe(tree.rootNode.id);
      expect(tree.nodes.size).toBe(1);
    });

    it('should initialize with a given initial FEN', () => {
      const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const tree = new GameTree(customFen);
      expect(tree.rootNode.fen).toBe(customFen);
      expect(tree.currentNodeId).toBe(tree.rootNode.id);
    });

    it('should initialize with main line moves (SAN strings)', () => {
      const mainLineSAN = ['e4', 'c5', 'Nf3'];
      const tree = new GameTree(undefined, mainLineSAN);
      
      expect(tree.rootNode.children).toHaveLength(1); // e4
      const e4Node = tree.rootNode.children[0];
      expect(e4Node.san).toBe('e4');
      expect(e4Node.isMainLine).toBe(true);
      expect(e4Node.children).toHaveLength(1); // c5

      const c5Node = e4Node.children[0];
      expect(c5Node.san).toBe('c5');
      expect(c5Node.isMainLine).toBe(true);
      expect(c5Node.children).toHaveLength(1); // Nf3

      const nf3Node = c5Node.children[0];
      expect(nf3Node.san).toBe('Nf3');
      expect(nf3Node.isMainLine).toBe(true);
      expect(nf3Node.children).toHaveLength(0);

      expect(tree.currentNodeId).toBe(nf3Node.id); // Current node is the last move of the main line
      expect(tree.nodes.size).toBe(1 + mainLineSAN.length); // Root + 3 moves
    });

    it('should handle invalid SAN moves gracefully during main line construction', () => {
        const mainLineSAN = ['e4', 'invalid_move', 'Nf3'];
        // Expect console.warn to be called for "invalid_move"
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const tree = new GameTree(undefined, mainLineSAN);
        
        expect(tree.rootNode.children).toHaveLength(1); // e4
        const e4Node = tree.rootNode.children[0];
        expect(e4Node.san).toBe('e4');
        expect(e4Node.children).toHaveLength(0); // invalid_move and subsequent Nf3 should not be added
        expect(tree.currentNodeId).toBe(e4Node.id); // Current node is e4
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to add main line move: invalid_move'));
        consoleWarnSpy.mockRestore();
    });
  });

  describe('addMove', () => {
    let tree: GameTree;
    beforeEach(() => {
      tree = new GameTree(); // Standard starting position
    });

    it('should add a valid move to the current node', () => {
      const parentNodeId = tree.currentNodeId;
      const newNode = tree.addMove('e4', parentNodeId);
      
      expect(newNode).not.toBeNull();
      expect(newNode?.san).toBe('e4');
      expect(newNode?.parentId).toBe(parentNodeId);
      expect(tree.nodes.get(parentNodeId)?.children).toContain(newNode);
      const expectedFen = new Chess(tree.nodes.get(parentNodeId)!.fen).move('e4').fen();
      expect(newNode?.fen).toBe(expectedFen);
    });

    it('should return null for an illegal move', () => {
      const newNode = tree.addMove('e5'); // Illegal for white from start
      expect(newNode).toBeNull();
    });

    it('should create a new variation if a different move is added to a node', () => {
      const e4Node = tree.addMove('e4');
      expect(e4Node).not.toBeNull();
      tree.navigateToNode(tree.rootNode.id); // Go back to root
      
      const d4Node = tree.addMove('d4');
      expect(d4Node).not.toBeNull();
      expect(d4Node?.san).toBe('d4');
      
      const rootNode = tree.rootNode;
      expect(rootNode.children).toHaveLength(2);
      expect(rootNode.children.map(c => c.san)).toContain('e4');
      expect(rootNode.children.map(c => c.san)).toContain('d4');
    });

    it('should return the existing child node if the same move is added again', () => {
      const e4Node1 = tree.addMove('e4');
      tree.navigateToNode(tree.rootNode.id); // Go back to root to add same move from same parent
      const e4Node2 = tree.addMove('e4');
      
      expect(e4Node2).not.toBeNull();
      expect(e4Node1?.id).toBe(e4Node2?.id); // Should be the same node
      expect(tree.rootNode.children).toHaveLength(1);
    });

    it('should correctly handle promotion moves', () => {
      // Setup a position where promotion is possible
      const fenWithPawnReadyToPromote = 'k7/7P/8/8/8/8/8/K7 w - - 0 1';
      tree = new GameTree(fenWithPawnReadyToPromote);
      
      const promotionNode = tree.addMove({ from: 'h7', to: 'h8', promotion: 'q' });
      expect(promotionNode).not.toBeNull();
      expect(promotionNode?.san).toBe('h8=Q');
      expect(promotionNode?.fen).toContain('h8=Q'); // FEN should reflect the queen
    });

    it('should calculate startingMoveNumber correctly', () => {
      // White's first move
      const e4Node = tree.addMove('e4'); 
      expect(e4Node?.startingMoveNumber).toBe(1);

      // Black's first move
      tree.navigateToNode(e4Node!.id);
      const e5Node = tree.addMove('e5');
      expect(e5Node?.startingMoveNumber).toBe(1);

      // White's second move
      tree.navigateToNode(e5Node!.id);
      const nf3Node = tree.addMove('Nf3');
      expect(nf3Node?.startingMoveNumber).toBe(2);
    });
  });

  describe('Navigation Methods', () => {
    let tree: GameTree;
    let e4Node: GameTreeNode, e5Node: GameTreeNode, nf3Node: GameTreeNode;

    beforeEach(() => {
      tree = new GameTree(undefined, ['e4', 'e5', 'Nf3']); // Root -> e4 -> e5 -> Nf3
      e4Node = tree.rootNode.children[0];
      e5Node = e4Node.children[0];
      nf3Node = e5Node.children[0];
    });

    it('navigateToNode should update currentNodeId and getCurrentNode should return it', () => {
      expect(tree.navigateToNode(e5Node.id)).toBe(true);
      expect(tree.currentNodeId).toBe(e5Node.id);
      expect(tree.getCurrentNode()?.id).toBe(e5Node.id);
      expect(tree.navigateToNode('invalid-id')).toBe(false);
    });

    it('getParentNode should return the correct parent', () => {
      tree.navigateToNode(nf3Node.id);
      const parentOfNf3 = tree.getParentNode();
      expect(parentOfNf3?.id).toBe(e5Node.id);

      tree.navigateToNode(e5Node.id);
      const parentOfE5 = tree.getParentNode();
      expect(parentOfE5?.id).toBe(e4Node.id);
      
      tree.navigateToNode(tree.rootNode.id);
      expect(tree.getParentNode()).toBeNull();
    });

    it('getChildrenNodes should return children of the current or specified node', () => {
      const childrenOfE4 = tree.getChildrenNodes(e4Node.id);
      expect(childrenOfE4).toHaveLength(1);
      expect(childrenOfE4[0].id).toBe(e5Node.id);

      tree.navigateToNode(nf3Node.id); // Leaf node
      expect(tree.getChildrenNodes()).toHaveLength(0);
    });
  });

  describe('getMovesToNode', () => {
    let tree: GameTree;
    let rootId: string, e4Id: string, e5Id: string, d5Id: string;

    beforeEach(() => {
      tree = new GameTree(); // Start fresh
      rootId = tree.rootNode.id;
      const e4 = tree.addMove('e4')!;
      e4Id = e4.id;
      const e5 = tree.addMove('e5', e4Id)!;
      e5Id = e5.id;
      tree.navigateToNode(e4Id); // Back to e4
      const d5 = tree.addMove('d5')!; // Variation from e4
      d5Id = d5.id;
    });

    it('should return path for a node in the main line', () => {
      const path = tree.getMovesToNode(e5Id);
      expect(path.map(n => n.id)).toEqual([rootId, e4Id, e5Id]);
      expect(path.map(n => n.san || 'root')).toEqual(['root', 'e4', 'e5']);
    });

    it('should return path for a node in a variation', () => {
      const path = tree.getMovesToNode(d5Id);
      expect(path.map(n => n.id)).toEqual([rootId, e4Id, d5Id]);
      expect(path.map(n => n.san || 'root')).toEqual(['root', 'e4', 'd5']);
    });

    it('should return just the root node for the root node ID', () => {
      const path = tree.getMovesToNode(rootId);
      expect(path).toHaveLength(1);
      expect(path[0].id).toBe(rootId);
    });
  });
  
  describe('findNodeByMove', () => {
    it('should find a child node by move object if it exists', () => {
        const tree = new GameTree();
        const e4Node = tree.addMove('e4')!;
        tree.navigateToNode(tree.rootNode.id); // Reset to root

        const foundNode = tree.findNodeByMove({ from: 'e2', to: 'e4' });
        expect(foundNode).not.toBeNull();
        expect(foundNode?.id).toBe(e4Node.id);
    });

    it('should return null if no child node matches the move object', () => {
        const tree = new GameTree();
        tree.addMove('e4');
        tree.navigateToNode(tree.rootNode.id);

        const foundNode = tree.findNodeByMove({ from: 'd2', to: 'd4' });
        expect(foundNode).toBeNull();
    });
  });

  describe('formatPathToPgn', () => {
    it('should format a simple path correctly', () => {
      const tree = new GameTree(undefined, ['e4', 'e5', 'Nf3']);
      const path = tree.getMovesToNode(tree.currentNodeId); // Path to Nf3
      // Path includes root, so filter it out or adjust expectation
      const movesOnlyPath = path.filter(node => node.move !== null);
      expect(tree.formatPathToPgn(movesOnlyPath)).toBe('1. e4 e5 2. Nf3');
    });
    
    it('should handle path starting with Black move if tree starts from such FEN', () => {
        const tree = new GameTree('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1', ['e5', 'Nf3']);
        const path = tree.getMovesToNode(tree.currentNodeId);
        const movesOnlyPath = path.filter(node => node.move !== null);
        expect(tree.formatPathToPgn(movesOnlyPath)).toBe('1... e5 2. Nf3');
    });
  });
});
