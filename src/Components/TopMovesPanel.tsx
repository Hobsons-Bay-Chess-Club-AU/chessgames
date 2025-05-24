import React from 'react';
import { Chess } from 'chess.js';
import { BestMoveOutput, StockfishLine } from '../Shared/Model';

interface TopMovesPanelProps {
  topMovesOutput?: BestMoveOutput;
  onSelectMove?: (move: StockfishLine) => void;
  currentAnalysisFen: string;
}

export const TopMovesPanel: React.FC<TopMovesPanelProps> = ({ topMovesOutput, onSelectMove, currentAnalysisFen }) => {
  if (!topMovesOutput || !topMovesOutput.lines || topMovesOutput.lines.length === 0) {
    return (
      <div className="p-2 bg-gray-100 rounded shadow mt-4">
        <h3 className="text-lg font-semibold mb-2">Top Engine Moves:</h3>
        <div>Loading top moves or no moves to display...</div>
      </div>
    );
  }

  const gameForSAN = new Chess(currentAnalysisFen);

  return (
    <div className="p-2 bg-gray-100 rounded shadow mt-4">
      <h3 className="text-lg font-semibold mb-2">Top Engine Moves:</h3>
      <ul>
        {topMovesOutput.lines.slice(0, 4).map((line, index) => {
          const lanMove = line.pv.split(' ')[0];
          let displayMove = lanMove;
          
          try {
            // chess.js move function expects an object { from, to, promotion } or SAN string.
            // Stockfish LAN (e.g., e2e4, e7e8q) needs to be parsed.
            const from = lanMove.substring(0, 2);
            const to = lanMove.substring(2, 4);
            const promotion = lanMove.length === 5 ? lanMove.substring(4) : undefined;
            
            const moveObject = gameForSAN.move({ from, to, promotion });
            
            if (moveObject) {
              displayMove = moveObject.san;
              gameForSAN.undo(); // Important: undo the move to keep the FEN correct for the next line
            }
          } catch (e) {
            // console.warn("Could not convert LAN to SAN for display:", lanMove, e);
            // If conversion fails, displayMove remains lanMove
          }
          
          return (
            <li 
              key={index} 
              onClick={() => onSelectMove && onSelectMove(line)}
              className="cursor-pointer hover:bg-gray-200 p-1 rounded flex justify-between items-center"
            >
              <span>{index + 1}. {displayMove}</span>
              <span className="text-xs text-gray-600 ml-2">
                {line.score.type === 'mate' ? 'Mate in ' : 'CP: '} {line.score.value}
                {line.depth && <span className="ml-1">(D: {line.depth})</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
