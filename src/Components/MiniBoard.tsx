import { Arrow, Chessboard } from 'react-chessboard';
interface MiniBoardProps {
  position: string;
  size?: number;
  arrows?: Array<string[]>;
}
export function MiniBoard({
  position,
  size = 100,
  arrows = [],
}: MiniBoardProps) {
  const mappedArrows: Arrow[] = (arrows || []).map((a) => ({
    startSquare: a?.[0] || '',
    endSquare: a?.[1] || '',
    color: '#11d954',
  }));

  return (
    <Chessboard
      options={{
        showNotation: false,
        position,
        boardStyle: { width: size },
        arrows: mappedArrows,
        allowDragging: false,
      }}
    />
  );
}
