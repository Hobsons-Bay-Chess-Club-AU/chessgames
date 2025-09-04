import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ReviewPanel } from '../ReviewPanel';
import { GameTree, GameTreeNode } from '../../Shared/GameTree'; // Adjust path as needed

const INDENT_SIZE = 20; // Must match INDENT_SIZE in ReviewPanel.tsx

// Helper to create a simple GameTree for testing
const createTestTree = (moves?: string[], initialFen?: string): GameTree => {
  return new GameTree(initialFen, moves);
};

describe('ReviewPanel Component - PGN Option B Formatting', () => {
  const mockOnNavigateToNode = jest.fn();

  const mockScrollIntoView = jest.fn();
  Element.prototype.scrollIntoView = mockScrollIntoView;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading message when gameTree is null', () => {
    render(
      <ReviewPanel
        gameTree={null}
        currentNode={null}
        onNavigateToNode={mockOnNavigateToNode}
      />
    );
    expect(screen.getByText(/Loading game tree or no current node.../i)).toBeInTheDocument();
  });

  test('renders "No moves yet" when tree has only a root node', () => {
    const tree = createTestTree([]);
    render(
      <ReviewPanel
        gameTree={tree}
        currentNode={tree.rootNode}
        onNavigateToNode={mockOnNavigateToNode}
      />
    );
    expect(screen.getByText(/No moves yet. Make a move on the board./i)).toBeInTheDocument();
  });

  describe('Rendering with Moves and Variations (Option B)', () => {
    let tree: GameTree;
    let rootNode: GameTreeNode;
    let e4Node: GameTreeNode, e5Node: GameTreeNode, nf3Node: GameTreeNode, nc6Node: GameTreeNode;
    let c5Node: GameTreeNode, nf6NodeAsVar: GameTreeNode; // Variations

    beforeEach(() => {
      tree = createTestTree(); // Standard start
      rootNode = tree.rootNode;
      
      // Main line: 1. e4 e5 2. Nf3 Nc6
      e4Node = tree.addMove('e4', rootNode.id)!; 
      e5Node = tree.addMove('e5', e4Node.id)!;   
      nf3Node = tree.addMove('Nf3', e5Node.id)!; 
      nc6Node = tree.addMove('Nc6', nf3Node.id)!;

      // Variation on 1. e4: 1... c5
      c5Node = tree.addMove('c5', e4Node.id)!; 
      // Variation on 1... c5: 2. Nf6 (as a child of c5)
      nf6NodeAsVar = tree.addMove('Nf6', c5Node.id)!;
      
      tree.navigateToNode(nc6Node.id); // Set current node to end of main line for path highlighting
    });

    test('renders main line with correct indentation and move pairing', () => {
      render(
        <ReviewPanel
          gameTree={tree}
          currentNode={nc6Node}
          onNavigateToNode={mockOnNavigateToNode}
        />
      );

      // 1. e4 e5
      const e4Span = screen.getByText((content, el) => el?.textContent === '1. e4' && el.tagName === 'SPAN');
      const e5Span = screen.getByText((content, el) => el?.textContent === 'e5' && el.tagName === 'SPAN');
      expect(e4Span.parentElement).toHaveStyle(`padding-left: ${0 * INDENT_SIZE}px`); // Depth 0
      expect(e5Span.parentElement).toBe(e4Span.parentElement); // Same line

      // 2. Nf3 Nc6 (Continuation of e5)
      const nf3Span = screen.getByText((content, el) => el?.textContent === '2. Nf3' && el.tagName === 'SPAN');
      const nc6Span = screen.getByText((content, el) => el?.textContent === 'Nc6' && el.tagName === 'SPAN');
      // nf3 is a child of e5, so its PgnMoveEntry block is depth 0 + 1 = 1
      expect(nf3Span.parentElement?.parentElement).toHaveStyle(`padding-left: ${(0 + 1) * INDENT_SIZE}px`);
      expect(nc6Span.parentElement).toBe(nf3Span.parentElement); // Same line
    });

    test('renders variations with correct indentation and parentheses', () => {
      render(
        <ReviewPanel
          gameTree={tree}
          currentNode={nc6Node} // Current node on main line
          onNavigateToNode={mockOnNavigateToNode}
        />
      );
      
      // Variation (1... c5 ...)
      // The variation block div containing the parenthesis and the PgnMoveEntry for c5
      const c5Span = screen.getByText((content, el) => el?.textContent === '1... c5' && el.tagName === 'SPAN');
      // c5 is a variation on e4 (depth 0). So, the variation block is at depth 1.
      // The span for '(' should be indented by depth 1.
      const c5VariationBlock = c5Span.closest('div[style*="display: block"]'); // The div created for the variation by the parent
      expect(c5VariationBlock?.firstChild).toHaveTextContent('(');
      expect(c5VariationBlock?.lastChild).toHaveTextContent(')');
      expect(c5VariationBlock?.firstChild).toHaveStyle(`padding-left: ${(0 + 1) * INDENT_SIZE}px`);
      
      // The PgnMoveEntry for c5 itself has depth 0 relative to its parenthesized block
      expect(c5Span.parentElement?.parentElement).toHaveStyle(`padding-left: ${0 * INDENT_SIZE}px`);

      // Continuation/variation within the c5 line: 2. Nf6
      const nf6VarSpan = screen.getByText((content, el) => el?.textContent === '2. Nf6' && el.tagName === 'SPAN');
      // nf6VarSpan is a child of c5. c5's PgnMoveEntry was called with depth 0 (relative).
      // So, nf6VarSpan's PgnMoveEntry will be called with depth (0 + 1) = 1.
      // Its block div should have padding-left: 1 * INDENT_SIZE.
      expect(nf6VarSpan.parentElement?.parentElement).toHaveStyle(`padding-left: ${1 * INDENT_SIZE}px`);
    });

    test('highlights current node and path correctly', () => {
        tree.navigateToNode(nf3Node.id); // Current: 1. e4 e5 2. Nf3
        render(
          <ReviewPanel
            gameTree={tree}
            currentNode={nf3Node}
            onNavigateToNode={mockOnNavigateToNode}
          />
        );
  
        const e4Span = screen.getByText("1. e4");
        const e5Span = screen.getByText("e5");
        const nf3Span = screen.getByText("2. Nf3");
  
        expect(e4Span).toHaveStyle('background-color: #e9ecef'); // On path
        expect(e5Span).toHaveStyle('background-color: #e9ecef'); // On path
        expect(nf3Span).toHaveStyle('background-color: #007bff'); // Current node
      });
  
      test('calls onNavigateToNode with correct node ID on click', () => {
        render(
          <ReviewPanel
            gameTree={tree}
            currentNode={rootNode}
            onNavigateToNode={mockOnNavigateToNode}
          />
        );
        const e4Span = screen.getByText("1. e4");
        fireEvent.click(e4Span);
        expect(mockOnNavigateToNode).toHaveBeenCalledWith(e4Node.id);
      });
  
      test('scrolls current node into view', () => {
        const { rerender } = render(
          <ReviewPanel gameTree={tree} currentNode={e4Node} onNavigateToNode={mockOnNavigateToNode} />
        );
        expect(mockScrollIntoView).toHaveBeenCalledTimes(1); // For e4Node
  
        rerender(
            <ReviewPanel gameTree={tree} currentNode={nc6Node} onNavigateToNode={mockOnNavigateToNode} />
        );
        expect(mockScrollIntoView).toHaveBeenCalledTimes(2); // For nc6Node
      });
  });
});
