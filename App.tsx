import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GameMode, Player } from './types';
import type { GameState, BoardState } from './types';
import { createEmptyBoard, processMove, findRandomMove, serializeBoard, calculateScores } from './gameLogic';
import { Board } from './components/Board';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [passCount, setPassCount] = useState(0);
  const [serializedHistory, setSerializedHistory] = useState<string[]>([]);
  const [fullHistory, setFullHistory] = useState<BoardState[]>([]);

  const startNewGame = (mode: GameMode) => {
    const empty = createEmptyBoard();
    setGameState({
      board: empty,
      currentPlayer: Player.BLACK,
      mode,
      captures: { [Player.BLACK]: 0, [Player.WHITE]: 0, [Player.NONE]: 0 },
      gameOver: false,
      history: [empty],
      winner: null
    });
    setSerializedHistory([serializeBoard(empty)]);
    setFullHistory([empty]);
    setPassCount(0);
  };

  const handleMove = useCallback((r: number, c: number) => {
    if (!gameState || gameState.gameOver) return;
    
    const result = processMove(gameState.board, r, c, gameState.currentPlayer, serializedHistory);
    if (!result) return;

    const nextPlayer = gameState.currentPlayer === Player.BLACK ? Player.WHITE : Player.BLACK;
    const newSerialized = serializeBoard(result.newBoard);

    setGameState(prev => {
      if (!prev) return null;
      const updatedCaptures = { ...prev.captures };
      updatedCaptures[prev.currentPlayer] += result.capturedCount;
      return { 
        ...prev, 
        board: result.newBoard, 
        currentPlayer: nextPlayer, 
        captures: updatedCaptures,
      };
    });

    setSerializedHistory(prev => [...prev, newSerialized]);
    setFullHistory(prev => [...prev, result.newBoard]);
    setPassCount(0);
  }, [gameState, serializedHistory]);

  const handleUndo = useCallback(() => {
    if (fullHistory.length <= 1 || !gameState || gameState.gameOver) return;

    const newFullHistory = [...fullHistory];
    newFullHistory.pop();
    
    const newSerializedHistory = [...serializedHistory];
    newSerializedHistory.pop();

    const lastBoard = newFullHistory[newFullHistory.length - 1];
    
    setFullHistory(newFullHistory);
    setSerializedHistory(newSerializedHistory);
    setGameState(prev => prev ? {
      ...prev,
      board: lastBoard,
      currentPlayer: prev.currentPlayer === Player.BLACK ? Player.WHITE : Player.BLACK
    } : null);
    setPassCount(0);
  }, [fullHistory, serializedHistory, gameState]);

  const handlePass = useCallback(() => {
    if (!gameState || gameState.gameOver) return;
    
    if (passCount + 1 >= 2) {
      const scores = calculateScores(gameState.board);
      setGameState(prev => prev ? { 
        ...prev, 
        gameOver: true, 
        winner: scores.black > scores.white ? Player.BLACK : Player.WHITE 
      } : null);
    } else {
      setPassCount(prev => prev + 1);
      setGameState(prev => prev ? { 
        ...prev, 
        currentPlayer: prev.currentPlayer === Player.BLACK ? Player.WHITE : Player.BLACK 
      } : null);
    }
  }, [gameState, passCount]);

  useEffect(() => {
  if (gameState?.mode === GameMode.SINGLE && gameState.currentPlayer === Player.WHITE && !gameState.gameOver) {
    const timer = setTimeout(() => {
      const whiteStonesLost = gameState.captures[Player.BLACK];

      // MỐC ĐẦU HÀNG: 30 quân
      if (whiteStonesLost >= 30) {
  const finalResults = calculateScores(gameState.board); // Sử dụng kết quả này
  setGameState(prev => prev ? { 
    ...prev, 
    gameOver: true, 
    winner: Player.BLACK,
    // Nếu trong type GameState của bạn có chỗ lưu score cuối cùng, hãy gán vào đây
  } : null);
  console.log("Máy đầu hàng. Điểm số hiện tại:", finalResults); // Sử dụng biến ở đây sẽ hết lỗi
  return;
  }

      // GỌI AI: Truyền số quân bị mất vào để AI check mốc 10/20 quân
      const move = findRandomMove(gameState.board, serializedHistory, whiteStonesLost);
      
      if (move) {
        handleMove(move[0], move[1]);
      } else {
        handlePass(); // Sẽ chạy vào đây khi whiteStonesLost là 10 hoặc 20
      }
    }, 600);
    return () => clearTimeout(timer);
  }
}, [gameState, handleMove, handlePass, serializedHistory]);

  const finalScores = useMemo(() => {
    if (gameState?.gameOver) return calculateScores(gameState.board);
    return null;
  }, [gameState?.gameOver, gameState?.board]);

  if (!gameState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0c] text-white">
        <h1 className="text-8xl font-black font-serif-jp text-transparent bg-clip-text bg-gradient-to-b from-white to-amber-200/50 mb-2">VÂY TIME</h1>
        <p className="text-slate-500 tracking-[0.3em] uppercase mb-12">Nghệ thuật tĩnh lặng</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button onClick={() => startNewGame(GameMode.SINGLE)} className="group bg-white/5 hover:bg-white/10 border border-white/10 p-8 rounded-3xl transition-all text-left">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <h3 className="text-2xl font-bold">Đánh Đơn</h3>
            <p className="text-slate-500 text-sm mt-2">Thử thách với AI. Máy sẽ tự động đặt quân ngay sau khi bạn đi.</p>
          </button>
          <button onClick={() => startNewGame(GameMode.DOUBLE)} className="group bg-white/5 hover:bg-white/10 border border-white/10 p-8 rounded-3xl transition-all text-left">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <h3 className="text-2xl font-bold">Đánh Đôi</h3>
            <p className="text-slate-500 text-sm mt-2">Hai người chơi đối kháng trên cùng màn hình. Thay phiên nhau đặt quân.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c111d] text-slate-100 flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-4xl flex justify-between items-center mb-8 bg-slate-800/30 backdrop-blur-md p-6 rounded-3xl border border-white/5">
        <div className={`p-4 rounded-2xl transition-all ${gameState.currentPlayer === Player.BLACK ? 'bg-black ring-2 ring-amber-500/50 scale-110 shadow-lg' : 'opacity-30'}`}>
          <div className="text-[10px] font-bold mb-1 tracking-widest">BLACK</div>
          <div className="text-4xl font-black">{gameState.captures[Player.BLACK]}</div>
          <div className="text-[10px] mt-1 text-slate-400">Captures</div>
        </div>
        
        <div className="text-center">
          <h2 className="text-2xl font-serif-jp font-bold text-amber-500/80 tracking-widest">VÂY TIME</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${passCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
              {passCount === 1 ? 'One side passed' : 'Match in progress'}
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl transition-all ${gameState.currentPlayer === Player.WHITE ? 'bg-white text-black ring-2 ring-amber-500/50 scale-110 shadow-lg' : 'opacity-30'}`}>
          <div className="text-[10px] font-bold mb-1 tracking-widest">WHITE</div>
          <div className="text-4xl font-black">{gameState.captures[Player.WHITE]}</div>
          <div className="text-[10px] mt-1 text-slate-600">Captures</div>
        </div>
      </div>

      <div className="transform scale-90 md:scale-100 origin-top">
        <Board board={gameState.board} onCellClick={handleMove} nextPlayer={gameState.currentPlayer} />
      </div>

      <div className="w-full max-w-4xl mt-12 grid grid-cols-4 gap-4">
        <button onClick={handleUndo} disabled={fullHistory.length <= 1} className="bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-20 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">Hoàn tác</button>
        <button onClick={handlePass} className="bg-slate-800/50 hover:bg-slate-700/50 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">Bỏ lượt</button>
        <button onClick={() => setGameState(null)} className="bg-red-950/20 text-red-400 hover:bg-red-950/40 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">Đầu hàng</button>
        <button onClick={() => setGameState(null)} className="bg-slate-800/50 hover:bg-slate-700/50 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">Thoát</button>
      </div>

      {gameState.gameOver && finalScores && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-50 p-6">
          <div className="text-center max-w-sm w-full animate-in fade-in zoom-in duration-500">
            <h2 className="text-7xl font-black font-serif-jp text-amber-500 mb-2">HẠ MÀN</h2>
            <p className="text-slate-500 uppercase tracking-[0.4em] text-xs mb-12">Kết quả trận đấu</p>
            
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                <div className="text-xs text-slate-500 mb-2 uppercase font-bold">Quân Đen</div>
                <div className="text-4xl font-black">{finalScores.black}</div>
              </div>
              <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                <div className="text-xs text-slate-500 mb-2 uppercase font-bold">Quân Trắng</div>
                <div className="text-4xl font-black">{finalScores.white}</div>
                <div className="text-[10px] text-amber-500/50 mt-1">Gồm 6.5 Komi</div>
              </div>
            </div>

            <div className="mb-12">
              <div className="text-2xl font-serif-jp font-bold text-white uppercase tracking-widest">
                {finalScores.black > finalScores.white ? 'QUÂN ĐEN THẮNG' : 'QUÂN TRẮNG THẮNG'}
              </div>
              <div className="text-slate-500 text-sm mt-2">
                Chênh lệch {Math.abs(finalScores.black - finalScores.white).toFixed(1)} điểm
              </div>
            </div>

            <button onClick={() => setGameState(null)} className="w-full bg-amber-500 text-black py-5 rounded-full font-black tracking-[0.2em] hover:scale-105 transition-transform">
              CHƠI VÁN MỚI
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;