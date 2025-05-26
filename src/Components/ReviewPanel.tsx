import React, { useEffect, useRef } from 'react';
import { GameTreeNode } from '../Shared/GameTree';

const INDENT_SIZE = 20; // pixels for each depth level

interface PgnMoveEntryProps {
  node: GameTreeNode; // The current move node to display.
  depth: number; // Current indentation level for this move.
  onNavigateToNode: (nodeId: string) => void;
  isCurrentNode: (nodeId: string) => boolean;
  isNodeOnCurrentPath: (nodeId: string) => boolean;
}

const PgnMoveEntry: React.FC<PgnMoveEntryProps> = ({
  node,
  depth,
  onNavigateToNode,
  isCurrentNode,
  isNodeOnCurrentPath,
}) => {
  const primaryMoveRef = useRef<HTMLSpanElement>(null);
  const pairedBlackMoveRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isCurrentNode(node.id) && primaryMoveRef.current) {
      primaryMoveRef.current.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    }
  }, [isCurrentNode, node.id]);

  if (!node.move) return null;

  const isNodeWhite = node.move.color === 'w';
  
  let movePrefix = "";
  if (isNodeWhite) {
    movePrefix = `${node.startingMoveNumber}. `;
  } else { 
    movePrefix = `${node.startingMoveNumber}... `;
  }

  const moveSpanStyle = (isActiveNode: boolean, isOnPath: boolean, isPairedBlack = false): React.CSSProperties => ({
    cursor: 'pointer',
    padding: '1px 3px',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
    fontWeight: isActiveNode ? 'bold' : (isOnPath ? '500' : 'normal'),
    backgroundColor: isActiveNode ? '#007bff' : (isOnPath ? '#e9ecef' : 'transparent'),
    color: isActiveNode ? 'white' : 'inherit',
    marginLeft: isPairedBlack ? '5px' : undefined, 
    marginRight: '3px', 
  });

  let primaryBlackResponse: GameTreeNode | null = null;
  let variationsOnWhite: GameTreeNode[] = [];
  let mainContinuation: GameTreeNode | null = null;

  const children = node.children;
  if (isNodeWhite) {
    if (children.length > 0) {
      const firstChild = children[0];
      if (firstChild.move?.color === 'b' && (firstChild.isMainLine || children.length === 1)) {
        primaryBlackResponse = firstChild;
        variationsOnWhite = children.slice(1); 
        if (primaryBlackResponse && primaryBlackResponse.children.length > 0) {
          // Main continuation is the first child of the black response, if it's main line or only child
          const blackResponseFirstChild = primaryBlackResponse.children[0];
          if (blackResponseFirstChild.isMainLine || primaryBlackResponse.children.length === 1) {
            mainContinuation = blackResponseFirstChild;
          }
           // Other children of black response are variations on black's move
          variationsOnWhite.push(...primaryBlackResponse.children.slice(mainContinuation ? 1 : 0));
        }
      } else {
        // All children of white are variations if no primary black response
        variationsOnWhite = children;
      }
    }
  } else { // Node is Black
    if (children.length > 0) {
      // First child of black is main continuation
      mainContinuation = children[0];
      variationsOnWhite = children.slice(1); // Other children are variations on black's move
    }
  }
  
  useEffect(() => {
    if (primaryBlackResponse && isCurrentNode(primaryBlackResponse.id) && pairedBlackMoveRef.current) {
      pairedBlackMoveRef.current.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    }
  }, [isCurrentNode, primaryBlackResponse]);

  return (
    <div style={{ 
        paddingLeft: `${depth * INDENT_SIZE}px`, 
        marginTop: '2px', 
        marginBottom: '2px',
        lineHeight: '1.7',
      }}>
      {/* White move (or Black if starting a variation line) */}
      <span
        ref={primaryMoveRef}
        style={moveSpanStyle(isCurrentNode(node.id), isNodeOnCurrentPath(node.id))}
        onClick={() => onNavigateToNode(node.id)}
      >
        {movePrefix}{node.san}
      </span>

      {/* Paired Black move */}
      {primaryBlackResponse && primaryBlackResponse.move && (
        <span
          ref={pairedBlackMoveRef}
          style={moveSpanStyle(isCurrentNode(primaryBlackResponse.id), isNodeOnCurrentPath(primaryBlackResponse.id), true)}
          onClick={() => onNavigateToNode(primaryBlackResponse.id)}
        >
          {primaryBlackResponse.san}
        </span>
      )}

      {/* Variations on the White move (or Black if it started the line) */}
      {variationsOnWhite.map(varNode => (
        <div key={varNode.id} style={{ display: 'block' }}> {/* Each variation on a new line */}
          <span style={{ paddingLeft: `${(depth +1) * INDENT_SIZE}px` }}>(</span>
          <div style={{ display: 'inline-block' }}>
            <PgnMoveEntry
              node={varNode}
              depth={0} // Relative depth within the parenthesis
              onNavigateToNode={onNavigateToNode}
              isCurrentNode={isCurrentNode}
              isNodeOnCurrentPath={isNodeOnCurrentPath}
            />
          </div>
          <span>)</span>
        </div>
      ))}
      
      {/* Main line continuation (next White move) */}
      {mainContinuation && (
        <PgnMoveEntry
          node={mainContinuation}
          depth={depth} // Main continuation stays at the same depth
          onNavigateToNode={onNavigateToNode}
          isCurrentNode={isCurrentNode}
          isNodeOnCurrentPath={isNodeOnCurrentPath}
        />
      ))}
    </div>
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

  const isCurrentNodeCallback = React.useCallback((nodeId: string) => nodeId === currentNode.id, [currentNode.id]);
  
  const currentLineNodeIds = React.useMemo(() => 
    gameTree.getMovesToNode(currentNode.id).map(n => n.id),
    [gameTree, currentNode.id]
  );
  const isNodeOnCurrentPathCallback = React.useCallback((nodeId: string) => currentLineNodeIds.includes(nodeId), [currentLineNodeIds]);

  return (
    <div className="p-2 overflow-y-auto h-full" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
      <h3 className="text-lg font-semibold mb-2 sticky top-0 bg-white z-10 border-b">Game Moves</h3>
      {gameTree.rootNode.children.length === 0 && <p className="text-gray-500">No moves yet. Make a move on the board.</p>}
      
      {gameTree.rootNode.children.map(childNode => (
        <PgnMoveEntry
          key={childNode.id}
          node={childNode} 
          depth={0}       
          onNavigateToNode={onNavigateToNode}
          isCurrentNode={isCurrentNodeCallback}
          isNodeOnCurrentPath={isNodeOnCurrentPathCallback}
        />
      ))}
    </div>
  );
};

export default ReviewPanel;
