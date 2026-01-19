import { Player } from './types';
import type { BoardState } from './types';
import { BOARD_SIZE } from './constants';

export const createEmptyBoard = (): BoardState => {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.NONE));
};

export const serializeBoard = (board: BoardState): string => {
  return board.map(row => row.join(',')).join('|');
};

export const getLiberties = (
  board: BoardState,
  r: number,
  c: number,
  visited: Set<string> = new Set()
): { liberties: Set<string>, group: Set<string> } => {
  const player = board[r][c];
  const group = new Set<string>();
  const liberties = new Set<string>();
  const stack: [number, number][] = [[r, c]];
  visited.add(`${r},${c}`);

  while (stack.length > 0) {
    const [currR, currC] = stack.pop()!;
    group.add(`${currR},${currC}`);

    const neighbors = [
      [currR - 1, currC], [currR + 1, currC],
      [currR, currC - 1], [currR, currC + 1],
    ];

    for (const [nR, nC] of neighbors) {
      if (nR >= 0 && nR < BOARD_SIZE && nC >= 0 && nC < BOARD_SIZE) {
        if (board[nR][nC] === Player.NONE) {
          liberties.add(`${nR},${nC}`);
        } else if (board[nR][nC] === player && !visited.has(`${nR},${nC}`)) {
          visited.add(`${nR},${nC}`);
          stack.push([nR, nC]);
        }
      }
    }
  }

  return { liberties, group };
};

export const processMove = (
  board: BoardState,
  r: number,
  c: number,
  player: Player,
  history: string[] = []
): { newBoard: BoardState, capturedCount: number } | null => {
  if (board[r][c] !== Player.NONE) return null;

  const tempBoard = board.map(row => [...row]);
  tempBoard[r][c] = player;

  const opponent = player === Player.BLACK ? Player.WHITE : Player.BLACK;
  let totalCaptured = 0;
  const capturedGroups: Set<string>[] = [];

  const neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
  const checked = new Set<string>();

  for (const [nR, nC] of neighbors) {
    if (nR >= 0 && nR < BOARD_SIZE && nC >= 0 && nC < BOARD_SIZE && tempBoard[nR][nC] === opponent) {
      if (!checked.has(`${nR},${nC}`)) {
        const { liberties, group } = getLiberties(tempBoard, nR, nC);
        if (liberties.size === 0) {
          capturedGroups.push(group);
          totalCaptured += group.size;
        }
        group.forEach(pos => checked.add(pos));
      }
    }
  }

  capturedGroups.forEach(group => {
    group.forEach(pos => {
      const [gr, gc] = pos.split(',').map(Number);
      tempBoard[gr][gc] = Player.NONE;
    });
  });

  const { liberties } = getLiberties(tempBoard, r, c);
  if (liberties.size === 0) return null;

  const currentSerialized = serializeBoard(tempBoard);
  if (history.includes(currentSerialized)) return null;

  return { newBoard: tempBoard, capturedCount: totalCaptured };
};

export const calculateScores = (board: BoardState) => {
  let blackPoints = 0;
  let whitePoints = 0;
  const visited = new Set<string>();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === Player.BLACK) blackPoints++;
      else if (board[r][c] === Player.WHITE) whitePoints++;
      else if (!visited.has(`${r},${c}`)) {
        const { territory, owner } = getTerritory(board, r, c, visited);
        if (owner === Player.BLACK) blackPoints += territory.size;
        else if (owner === Player.WHITE) whitePoints += territory.size;
      }
    }
  }

  return { black: blackPoints, white: whitePoints + 6.5 };
};

const getTerritory = (board: BoardState, r: number, c: number, visitedGlobal: Set<string>) => {
  const territory = new Set<string>();
  const stack: [number, number][] = [[r, c]];
  const seen = new Set<string>();
  const owners = new Set<Player>();
  
  seen.add(`${r},${c}`);
  visitedGlobal.add(`${r},${c}`);

  while (stack.length > 0) {
    const [currR, currC] = stack.pop()!;
    territory.add(`${currR},${currC}`);

    const neighbors = [[currR-1, currC], [currR+1, currC], [currR, currC-1], [currR, currC+1]];
    for (const [nR, nC] of neighbors) {
      if (nR >= 0 && nR < BOARD_SIZE && nC >= 0 && nC < BOARD_SIZE) {
        if (board[nR][nC] === Player.NONE) {
          if (!seen.has(`${nR},${nC}`)) {
            seen.add(`${nR},${nC}`);
            visitedGlobal.add(`${nR},${nC}`);
            stack.push([nR, nC]);
          }
        } else {
          owners.add(board[nR][nC]);
        }
      }
    }
  }

  // Explicitly type owner as Player to prevent narrow inference to Player.NONE (0)
  let owner: Player = Player.NONE;
  if (owners.size === 1) {
    owner = Array.from(owners)[0];
  }
  return { territory, owner };
};

export const findRandomMove = (
  board: BoardState, 
  history: string[], 
  opponentCapturedCount: number 
): [number, number] | null => {
  
  // MÁY BỎ LƯỢT TẠI MỐC 10 VÀ 20 QUÂN
  // Nếu số quân bị ăn là 10 hoặc 20, máy sẽ trả về null để Pass
  if (opponentCapturedCount === 10 || opponentCapturedCount === 20) {
    return null; 
  }

  // Nếu không rơi vào các mốc trên (và chưa đến mốc đầu hàng), máy tìm nước đi tiếp
  const emptyCells: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === Player.NONE) emptyCells.push([r, c]);
    }
  }
  
  emptyCells.sort(() => Math.random() - 0.5);

  for (const [r, c] of emptyCells) {
    const result = processMove(board, r, c, Player.WHITE, history);
    if (result) return [r, c];
  }

  return null;
};