import { Chess, Move, Square } from 'chess.js';

// Simple ID generator for now, as uuid installation is problematic
let nodeIdCounter = 0;
const generateNodeId = (): string => {
  nodeIdCounter++;
  return `node-${nodeIdCounter}`;
};

export interface GameTreeNode {
  id: string;
  fen: string; // FEN after this move
  move: Move | null; // Move that led to this FEN (null for root)
  san: string; // SAN of the move, stored for convenience
  parentId: string | null;
  children: GameTreeNode[];
  isMainLine: boolean;
  comment?: string;
  startingMoveNumber: number; // e.g. 1 for White's first move, 1 for Black's first move, 2 for White's second...
}

export class GameTree {
  public rootNode: GameTreeNode;
  public currentNodeId: string;
  private nodes: Map<string, GameTreeNode>; // For quick lookup

  constructor(initialFen?: string, mainLineMovesSAN?: string[]) {
    this.nodes = new Map<string, GameTreeNode>();
    const chess = new Chess(initialFen); // Handles default FEN if initialFen is undefined

    const rootFen = chess.fen();
    const rootMoveNumber = chess.moveNumber();
    
    this.rootNode = {
      id: generateNodeId(),
      fen: rootFen,
      move: null,
      san: '',
      parentId: null,
      children: [],
      isMainLine: true,
      startingMoveNumber: rootMoveNumber,
    };

    this.nodes.set(this.rootNode.id, this.rootNode);
    this.currentNodeId = this.rootNode.id;

    if (mainLineMovesSAN && mainLineMovesSAN.length > 0) {
      let currentParentId = this.rootNode.id;
      mainLineMovesSAN.forEach((sanMove) => {
        const newNode = this.addMove(sanMove, currentParentId, true);
        if (newNode) {
          currentParentId = newNode.id;
        } else {
          console.warn(`Failed to add main line move: ${sanMove} from FEN of parent ${currentParentId}`);
          // Potentially stop processing further main line moves if one fails
        }
      });
      this.currentNodeId = currentParentId; // Set current node to the end of the main line
    }
  }

  private getMoveNumberFromFen(fen: string): number {
    const parts = fen.split(' ');
    if (parts.length === 6) {
      return parseInt(parts[5], 10);
    }
    // If FEN doesn't have full move number, try to deduce from turn
    // This is a simplified approach; chess.js's moveNumber() on an instance is better.
    const turn = parts[1];
    return turn === 'w' ? 1 : 0; // Fallback, might not be accurate for all cases
  }
  
  private getTurnFromFen(fen: string): 'w' | 'b' {
      const parts = fen.split(' ');
      return parts[1] as 'w' | 'b';
  }


  addMove(
    moveInput: string | { from: string; to: string; promotion?: string },
    parentNodeId?: string,
    isMainLineMove: boolean = false
  ): GameTreeNode | null {
    const parentNode = this.nodes.get(parentNodeId || this.currentNodeId);
    if (!parentNode) {
      console.error('Parent node not found for addMove.');
      return null;
    }

    const chess = new Chess(parentNode.fen);
    let moveResult: Move | null = null;

    try {
      moveResult = chess.move(moveInput);
    } catch (error) {
      console.error('Error making move with chess.js:', error);
      return null;
    }

    if (moveResult === null) {
      // console.warn('Illegal move:', moveInput, 'from FEN:', parentNode.fen);
      return null;
    }

    // Check if this exact move (from-to-promotion) already exists as a child
    // This avoids creating duplicate nodes for the same move variation from the same parent
    const existingChild = parentNode.children.find(child => 
        child.move?.from === moveResult?.from &&
        child.move?.to === moveResult?.to &&
        child.move?.promotion === moveResult?.promotion
    );
    if (existingChild) {
        // console.log("Move already exists as a child, navigating to it.", existingChild.id);
        // this.currentNodeId = existingChild.id; // Optionally navigate to it
        return existingChild;
    }


    const newFen = chess.fen();
    // Determine the move number for the new node.
    // If black just moved, fullmove number increments. If white just moved, it stays the same.
    // chess.moveNumber() gives the number for the *next* move.
    // The move that *led* to this FEN was made by the color *opposite* to chess.turn()
    let moveNumberForThisNode: number;
    const tempChessInstance = new Chess(newFen); // Load new FEN to get its state
    if (tempChessInstance.turn() === 'b') { // White made the move that resulted in newFen
        moveNumberForThisNode = tempChessInstance.moveNumber();
    } else { // Black made the move that resulted in newFen
        moveNumberForThisNode = tempChessInstance.moveNumber() -1; // chess.js increments for white's next move
    }
    // The move number for the new node is the move number of the parent's position
    // (i.e., the number of the move that is *about* to be made).
    const moveNumberForNewNode = chess.moveNumber();

    const newNode: GameTreeNode = {
      id: generateNodeId(),
      fen: newFen,
      move: moveResult,
      san: moveResult.san, // Store SAN from moveResult
      parentId: parentNode.id,
      children: [],
      isMainLine: isMainLineMove,
      startingMoveNumber: moveNumberForNewNode,
    };

    parentNode.children.push(newNode);
    this.nodes.set(newNode.id, newNode);
    // this.currentNodeId = newNode.id; // By default, navigate to the new move
    return newNode;
  }

  navigateToNode(nodeId: string): boolean {
    if (this.nodes.has(nodeId)) {
      this.currentNodeId = nodeId;
      return true;
    }
    return false;
  }

  getCurrentNode(): GameTreeNode | null {
    return this.nodes.get(this.currentNodeId) || null;
  }

  getParentNode(nodeId?: string): GameTreeNode | null {
    const targetNodeId = nodeId || this.currentNodeId;
    const node = this.nodes.get(targetNodeId);
    if (node && node.parentId) {
      return this.nodes.get(node.parentId) || null;
    }
    return null;
  }

  getChildrenNodes(nodeId?: string): GameTreeNode[] {
    const targetNodeId = nodeId || this.currentNodeId;
    const node = this.nodes.get(targetNodeId);
    return node ? node.children : [];
  }

  getMovesToNode(nodeId?: string): GameTreeNode[] {
    const path: GameTreeNode[] = [];
    let current = this.nodes.get(nodeId || this.currentNodeId);
    while (current) {
      path.unshift(current); // Add to the beginning to maintain order from root
      if (current.parentId) {
        current = this.nodes.get(current.parentId);
      } else {
        break; // Root reached
      }
    }
    return path;
  }

  findNodeByFen(fen: string, searchRootNodeId?: string): GameTreeNode | null {
    const startNode = this.nodes.get(searchRootNodeId || this.rootNode.id);
    if (!startNode) return null;

    const queue: GameTreeNode[] = [startNode];
    const visited = new Set<string>(); // To handle potential cycles if any, though unlikely in simple tree

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.fen === fen) {
        return current;
      }
      visited.add(current.id);
      current.children.forEach(child => {
        if (!visited.has(child.id)) {
          queue.push(child);
        }
      });
    }
    return null;
  }

  findNodeByMove(
    move: { from: Square; to: Square; promotion?: string },
    parentNodeId?: string
  ): GameTreeNode | null {
    const parent = this.nodes.get(parentNodeId || this.currentNodeId);
    if (!parent) return null;

    return parent.children.find(childNode => 
      childNode.move?.from === move.from &&
      childNode.move?.to === move.to &&
      childNode.move?.promotion === move.promotion
    ) || null;
  }

  // Basic PGN-like string for a line of moves (nodes)
  formatPathToPgn(nodes: GameTreeNode[]): string {
    let pgn = "";
    let currentMoveNumber = 0;
    let firstMove = true;

    nodes.forEach(node => {
      if (node.move) { // Skip root node if it's just a position setup
        if (node.move.color === 'w') {
          currentMoveNumber = node.startingMoveNumber; // Use node's stored move number
          pgn += `${currentMoveNumber}. `;
        } else if (firstMove && node.move.color === 'b') { // Black starts, e.g. from custom FEN
          currentMoveNumber = node.startingMoveNumber;
          pgn += `${currentMoveNumber}... `;
        }
        pgn += `${node.san} `;
        firstMove = false;
      }
    });
    return pgn.trim();
  }
}
// Example Usage (for testing or demonstration):
// const tree = new GameTree();
// const e4Node = tree.addMove('e4');
// if (e4Node) {
//   const e5Node = tree.addMove('e5', e4Node.id);
// }
// const d4Node = tree.addMove('d4'); // From root, creates a variation
// console.log(tree.rootNode.children);
// if (e4Node) console.log(tree.formatPathToPgn(tree.getMovesToNode(e4Node.id)));

// const mainLine = ["e4", "e5", "Nf3", "Nc6", "Bb5"];
// const treeFromMainLine = new GameTree(undefined, mainLine);
// console.log(treeFromMainLine.getCurrentNode()?.san); // Should be Bb5
// console.log(treeFromMainLine.formatPathToPgn(treeFromMainLine.getMovesToNode()));
// treeFromMainLine.navigateToNode(treeFromMainLine.rootNode.id); // Go to root
// treeFromMainLine.addMove("d4"); // Add d4 as a variation from root
// console.log(treeFromMainLine.formatPathToPgn(treeFromMainLine.getMovesToNode(treeFromMainLine.rootNode.children[1].id)));
