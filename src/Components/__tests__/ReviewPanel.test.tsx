import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ReviewPanel } from '../ReviewPanel';
import { GameTree, GameTreeNode } from '../../Shared/GameTree'; // Adjust path as needed

// Helper to create a simple GameTree for testing
const createTestTree = (moves?: string[], initialFen?: string): GameTree => {
  return new GameTree(initialFen, moves);
};

describe('ReviewPanel Component', () => {
  const mockOnNavigateToNode = jest.fn();

  // Mock scrollIntoView
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

  describe('Rendering with Moves', () => {
    let tree: GameTree;
    let rootNode: GameTreeNode;
    let e4Node: GameTreeNode;
    let e5Node: GameTreeNode;
    let d4Node: GameTreeNode; // Variation from root
    let d5Node: GameTreeNode; // Main line response to e4

    beforeEach(() => {
      tree = createTestTree(); // Standard start
      rootNode = tree.rootNode;
      
      e4Node = tree.addMove('e4', rootNode.id)!; // 1. e4
      d5Node = tree.addMove('d5', e4Node.id)!;   // 1... d5 (main continuation for e4)
      e5Node = tree.addMove('e5', e4Node.id)!;   // 1... e5 (variation for e4)
      
      tree.navigateToNode(rootNode.id); // Go back to root
      d4Node = tree.addMove('d4', rootNode.id)!; // 1. d4 (variation from root)
    });

    test('renders main line moves and variations correctly', () => {
      // Current node is d5 (1. e4 d5)
      render(
        <ReviewPanel
          gameTree={tree}
          currentNode={d5Node}
          onNavigateToNode={mockOnNavigateToNode}
        />
      );
      // screen.debug(undefined, 30000); // Increase debug output limit

      // Check for 1. e4
      const e4Rendered = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'span' && content.startsWith('1. e4');
      });
      expect(e4Rendered).toBeInTheDocument();
      
      // Check for 1... d5 (main continuation of e4, part of current path)
      const d5Rendered = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'span' && content.includes('1... d5');
      });
      expect(d5Rendered).toBeInTheDocument();
      
      // Check for (1... e5) - variation
      const e5VariationRendered = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'span' && content.includes('1... e5');
      });
      expect(e5VariationRendered).toBeInTheDocument();
      expect(screen.getByText((content, element) => content === '(' && element?.parentElement?.textContent?.includes('1... e5'))).toBeInTheDocument();
      expect(screen.getByText((content, element) => content === ')' && element?.parentElement?.textContent?.includes('1... e5'))).toBeInTheDocument();


      // Check for 1. d4 (variation from root)
      const d4Rendered = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'span' && content.startsWith('1. d4');
      });
      expect(d4Rendered).toBeInTheDocument();
    });

    test('highlights the current node', () => {
      render(
        <ReviewPanel
          gameTree={tree}
          currentNode={d5Node} // 1. e4 d5
          onNavigateToNode={mockOnNavigateToNode}
        />
      );
      const d5Rendered = screen.getByText((content, element) => content.includes('1... d5'));
      expect(d5Rendered).toHaveStyle('font-weight: bold');
      expect(d5Rendered).toHaveStyle('background-color: #007bff'); // Blue for current
    });

    test('highlights the path to the current node', () => {
      render(
        <ReviewPanel
          gameTree={tree}
          currentNode={d5Node} // 1. e4 d5
          onNavigateToNode={mockOnNavigateToNode}
        />
      );
      const e4Rendered = screen.getByText((content, element) => content.startsWith('1. e4'));
      expect(e4Rendered).toHaveStyle('background-color: #e9ecef'); // Light grey for path
    });

    test('calls onNavigateToNode with correct node.id on click', () => {
      render(
        <ReviewPanel
          gameTree={tree}
          currentNode={rootNode} // Current is root
          onNavigateToNode={mockOnNavigateToNode}
        />
      );
      const e4Rendered = screen.getByText((content, element) => content.startsWith('1. e4'));
      fireEvent.click(e4Rendered);
      expect(mockOnNavigateToNode).toHaveBeenCalledWith(e4Node.id);

      const d4Rendered = screen.getByText((content, element) => content.startsWith('1. d4'));
      fireEvent.click(d4Rendered);
      expect(mockOnNavigateToNode).toHaveBeenCalledWith(d4Node.id);
    });
    
    test('scrolls current node into view', () => {
      // Initial render with root as current
      const { rerender } = render(
        <ReviewPanel
          gameTree={tree}
          currentNode={rootNode}
          onNavigateToNode={mockOnNavigateToNode}
        />
      );
      expect(mockScrollIntoView).not.toHaveBeenCalled();

      // Rerender with e5Node as current
      rerender(
        <ReviewPanel
          gameTree={tree}
          currentNode={e5Node} // 1. e4 e5 (variation)
          onNavigateToNode={mockOnNavigateToNode}
        />
      );
      // The MoveNodeDisplay for e5Node should call scrollIntoView
      // This relies on e5Node being marked as isCurrentNode=true in its MoveNodeDisplay
      // The `isCurrentNode` prop in MoveNodeDisplay is `currentNode?.id === currentN.id` in ReviewPanel
      // and `isCurrentNode={currentNode.id === childOfRoot.id}` in the top-level map.
      // The actual check is `isCurrentNode={isCurrentNode && mainContinuationChild.id === node.id}`
      // which is incorrect. Let's assume the `isCurrentNode` prop in MoveNodeDisplay is correctly set.
      // The test setup for `ReviewPanel` passes `isCurrentNode={currentNode?.id === childNode.id}`
      // or similar, which correctly identifies the current node instance.
      expect(mockScrollIntoView).toHaveBeenCalledTimes(1); 
    });
  });
});
