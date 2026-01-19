export const GameMode = {
  SINGLE: 'SINGLE',
  DOUBLE: 'DOUBLE'
} as const;

export type GameMode = (typeof GameMode)[keyof typeof GameMode];

export const Player = {
  BLACK: 1,
  WHITE: 2,
  NONE: 0
} as const;

export type Player = (typeof Player)[keyof typeof Player];

export type BoardState = Player[][];

export interface GameState {
  board: BoardState;
  currentPlayer: Player;
  mode: GameMode;
  captures: { [key in Player]: number };
  gameOver: boolean;
  history: BoardState[];
  winner: Player | null;
}