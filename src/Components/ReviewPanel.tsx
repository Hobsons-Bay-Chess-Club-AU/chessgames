import React, { useEffect, useRef } from 'react';
import { GameTreeNode, GameTree } from '../Shared/GameTree';

interface MoveNodeDisplayProps {
  node: GameTreeNode;
  onNavigateToNode: (nodeId: string) => void;
  isCurrentNode: boolean;
  isCurrentPath: boolean; // Is this node part of the direct path to the currentNode?
  depth: number; // For indentation of variations
  currentLineNodes: GameTreeNode[]; // For determining if next node is inline or variation
}

const MoveNodeDisplay: React.FC<MoveNodeDisplayProps> = ({
  node,
  onNavigateToNode,
  isCurrentNode,
  isCurrentPath,
  depth,
  currentLineNodes,
}) => {
  const moveRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isCurrentNode && moveRef.current) {
      moveRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isCurrentNode]);

  if (!node.move) {
    return null; // Root node has no move to display here
  }

  const moveText =
    node.move.color === 'w'
      ? `${node.startingMoveNumber}. ${node.san}`
      : `${node.startingMoveNumber}... ${node.san}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling if moves are nested in clickable elements
    onNavigateToNode(node.id);
  };

  const style: React.CSSProperties = {
    marginLeft: `${depth * 10}px`, // Indentation for variations
    fontWeight: isCurrentNode ? 'bold' : (isCurrentPath ? '500' : 'normal'),
    cursor: 'pointer',
    display: 'inline-block',
    marginRight: '4px',
    padding: '1px 3px',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
  };

  if (isCurrentNode) {
    style.backgroundColor = '#007bff'; // Bootstrap primary blue
    style.color = 'white';
  } else if (isCurrentPath) {
    style.backgroundColor = '#e9ecef'; // Light grey for path
  }


  // Determine how to render children
  // - If only one child, and it's the next move in the current line of play, render it inline.
  // - Otherwise, render children as variations (indented, potentially grouped).
  const mainContinuationChild = node.children.find(child => currentLineNodes.some(cn => cn.id === child.id) || child.isMainLine);


  return (
    <>
      <span ref={moveRef} style={style} onClick={handleClick} title={`FEN: ${node.fen}`}>
        {moveText}
      </span>

      {/* Render main continuation if it exists and is NOT a variation start */}
      {mainContinuationChild && node.children.length === 1 && (
         <MoveNodeDisplay
            key={mainContinuationChild.id}
            node={mainContinuationChild}
            onNavigateToNode={onNavigateToNode}
            isCurrentNode={isCurrentNode && mainContinuationChild.id === node.id} // This is wrong, should be based on GameViewer's currentNode
            isCurrentPath={currentLineNodes.some(cn => cn.id === mainContinuationChild.id)}
            depth={0} // No new indentation for direct continuation of a line
            currentLineNodes={currentLineNodes}
          />
      )}
      
      {/* Render variations (children that are not the mainContinuationChild, or all children if no clear mainContinuation) */}
      {/* This part needs careful thought to integrate with the main line display logic.
          A common PGN style is (variation moves)
      */}
      {node.children.length > (mainContinuationChild && node.children.length === 1 ? 1 : 0) && ( // Has variations
        <div style={{ marginLeft: `${(depth +1) * 5}px`, borderLeft: '1px solid #ccc', paddingLeft: '5px' }}>
          {node.children.map(childNode => {
            if (mainContinuationChild && childNode.id === mainContinuationChild.id && node.children.length ===1) return null; // Already rendered inline

            // Check if this child is part of the current main displayed line
            const isChildOnCurrentPath = currentLineNodes.some(cn => cn.id === childNode.id);
            
            return (
                <div key={childNode.id} style={{ marginTop: '2px'}}> {/* Each variation on a new "block" line */}
                    {`(`}
                    <MoveNodeDisplay
                        node={childNode}
                        onNavigateToNode={onNavigateToNode}
                        isCurrentNode={false} // This needs to be passed correctly based on GameViewer's currentNode
                        isCurrentPath={isChildOnCurrentPath}
                        depth={mainContinuationChild && childNode.id === mainContinuationChild.id ? 0 : depth +1 } // Indent variations
                        currentLineNodes={currentLineNodes}
                    />
                    {`)`}
                </div>
            );
          })}
        </div>
      )}
    </>
  );
};

interface ReviewPanelProps {
  gameTree: GameTree | null;
  currentNode: GameTreeNode | null;
  onNavigateToNode: (nodeId: string) => void;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  gameTree,
  currentNode,
  onNavigateToNode,
}) => {
  if (!gameTree || !gameTree.rootNode || !currentNode) {
    return <div className="p-2">Loading game tree or no current node...</div>;
  }

  // Get the current line of play from root to the currentNode
  const currentLineNodes = gameTree.getMovesToNode(currentNode.id);

  // We will render the game starting from the root, displaying the main line
  // and then branching out for variations at each step of the main line.

  // This is a simplified recursive render starting from root.
  // A more complex render might build lines of text (e.g., "1. e4 e5 2. Nf3 (2... d6) Nc6")
  // For now, each MoveNodeDisplay handles its direct children.

  return (
    <div className="p-2 overflow-y-auto h-full" style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6' }}>
      <h3 className="text-lg font-semibold mb-2 sticky top-0 bg-white z-10 border-b">Game Moves</h3>
      {gameTree.rootNode.children.length === 0 && <p className="text-gray-500">No moves yet. Make a move on the board.</p>}
      
      {/* Start rendering from the children of the root node */}
      {/* Each child of the root is the beginning of a main line or a major variation from start */}
      {gameTree.rootNode.children.map(childOfRoot => (
        <div key={childOfRoot.id} style={{ marginBottom: '8px' }}> {/* Each top-level line from root */}
          <MoveNodeDisplay
            node={childOfRoot}
            onNavigateToNode={onNavigateToNode}
            isCurrentNode={currentNode.id === childOfRoot.id}
            isCurrentPath={currentLineNodes.some(n => n.id === childOfRoot.id)}
            depth={0}
            currentLineNodes={currentLineNodes}
          />
        </div>
      ))}
    </div>
  );
};

export default ReviewPanel;
