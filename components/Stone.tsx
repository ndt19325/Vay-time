
import React from 'react';
import { Player } from '../types';

interface StoneProps {
  player: Player;
  cx: number;
  cy: number;
  radius: number;
}

export const Stone: React.FC<StoneProps> = ({ player, cx, cy, radius }) => {
  if (player === Player.NONE) return null;

  const isBlack = player === Player.BLACK;

  return (
    <g>
      <defs>
        <radialGradient id={isBlack ? "gradBlack" : "gradWhite"} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={isBlack ? "#4a4a4a" : "#ffffff"} />
          <stop offset="100%" stopColor={isBlack ? "#000000" : "#d1d1d1"} />
        </radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
          <feOffset dx="1" dy="1" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.4" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={`url(#${isBlack ? "gradBlack" : "gradWhite"})`}
        filter="url(#shadow)"
      />
    </g>
  );
};
