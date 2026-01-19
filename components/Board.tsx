import React, { useMemo } from 'react';
import { Player } from '../types';
import type { BoardState } from '../types';
import { BOARD_SIZE } from '../constants';
import { Stone } from './Stone';

interface BoardProps {
  board: BoardState;
  onCellClick: (r: number, c: number) => void;
  nextPlayer: Player;
}

export const Board: React.FC<BoardProps> = ({ board, onCellClick, nextPlayer }) => {
  const padding = 20;
  const cellSize = 30;
  const boardSizePx = (BOARD_SIZE - 1) * cellSize + padding * 2;

  const starPoints = [
    [3, 3], [3, 9], [3, 15],
    [9, 3], [9, 9], [9, 15],
    [15, 3], [15, 9], [15, 15]
  ];

  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      const offset = padding + i * cellSize;
      lines.push(<line key={`v-${i}`} x1={offset} y1={padding} x2={offset} y2={boardSizePx - padding} stroke="#3d2b1f" strokeWidth="1" />);
      lines.push(<line key={`h-${i}`} x1={padding} y1={offset} x2={boardSizePx - padding} y2={offset} stroke="#3d2b1f" strokeWidth="1" />);
    }
    return lines;
  }, [boardSizePx]);

  return (
    <div className="relative inline-block go-board-wood rounded-lg shadow-2xl p-4 border-4 border-[#5c3c24]">
      <svg width={boardSizePx} height={boardSizePx} viewBox={`0 0 ${boardSizePx} ${boardSizePx}`}>
        {gridLines}
        {starPoints.map(([r, c]) => (
          <circle key={`star-${r}-${c}`} cx={padding + c * cellSize} cy={padding + r * cellSize} r={3} fill="#3d2b1f" />
        ))}
        {board.map((row, r) => row.map((cell, c) => (
          <g key={`cell-${r}-${c}`} onClick={() => onCellClick(r, c)} className="cursor-pointer">
            <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={cellSize / 2} fill="transparent" />
            {cell === Player.NONE && (
              <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={cellSize / 2 - 2} fill={nextPlayer === Player.BLACK ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'} className="opacity-0 hover:opacity-100 transition-opacity" />
            )}
            <Stone player={cell} cx={padding + c * cellSize} cy={padding + r * cellSize} radius={cellSize / 2 - 1} />
          </g>
        )))}
      </svg>
    </div>
  );
};