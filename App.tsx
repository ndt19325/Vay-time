import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Peer } from 'peerjs';
import type { DataConnection } from 'peerjs';

import { GameMode, Player } from './types';
import type { GameState } from './types';
import { createEmptyBoard, processMove, findRandomMove, serializeBoard, calculateScores } from './gameLogic';
import { Board } from './components/Board';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [passCount, setPassCount] = useState(0);
  const [serializedHistory, setSerializedHistory] = useState<string[]>([]);
  
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [myRole, setMyRole] = useState<Player | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  // --- HÀNH ĐỘNG ĐẦU HÀNG ---
  const handleSurrender = useCallback((isRemote: boolean = false) => {
    setGameState(prev => {
      if (!prev) return prev;
      if (prev.mode === GameMode.ONLINE && !isRemote && connRef.current) {
        connRef.current.send({ type: 'SURRENDER' });
      }
      const winner = isRemote ? myRole : (myRole === Player.BLACK ? Player.WHITE : Player.BLACK);
      return { ...prev, gameOver: true, winner };
    });
    if (!isRemote) alert("Bạn đã đầu hàng!");
    else alert("Đối thủ đã đầu hàng! Bạn thắng cuộc.");
  }, [myRole]);

  // --- HÀNH ĐỘNG BỎ LƯỢT (CHỈ DÙNG CHO OFFLINE) ---
  const handlePass = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.gameOver || prev.mode === GameMode.ONLINE) return prev;

      if (passCount + 1 >= 2) {
        const scores = calculateScores(prev.board);
        return { 
          ...prev, 
          gameOver: true, 
          winner: scores.black > scores.white ? Player.BLACK : Player.WHITE 
        };
      } else {
        setPassCount(pc => pc + 1);
        return { ...prev, currentPlayer: prev.currentPlayer === Player.BLACK ? Player.WHITE : Player.BLACK };
      }
    });
  }, [passCount]);

  // --- LOGIC KẾT NỐI ---
  const setupConnection = useCallback((conn: DataConnection) => {
    conn.on('data', (data: any) => {
      if (data.type === 'MOVE') {
        handleMove(data.r, data.c, true);
      } else if (data.type === 'SURRENDER') {
        handleSurrender(true);
      }
    });
    conn.on('close', () => {
      alert("Đối thủ đã ngắt kết nối!");
      window.location.reload();
    });
  }, [handleSurrender]);

  const initPeer = () => {
    const peer = new Peer();
    peer.on('open', (id) => setPeerId(id));
    peer.on('connection', (conn) => {
      connRef.current = conn;
      setupConnection(conn);
      setMyRole(Player.BLACK); 
      startNewGame(GameMode.ONLINE);
    });
    peerRef.current = peer;
  };

  const connectToPeer = () => {
    if (!remotePeerId || !peerRef.current) return;
    const conn = peerRef.current.connect(remotePeerId);
    connRef.current = conn;
    setupConnection(conn);
    setMyRole(Player.WHITE);
    startNewGame(GameMode.ONLINE);
  };

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
    setPassCount(0);
  };

  const handleMove = useCallback((r: number, c: number, isRemote: boolean = false) => {
    setGameState(prev => {
      if (!prev || prev.gameOver) return prev;
      if (prev.mode === GameMode.ONLINE && !isRemote && prev.currentPlayer !== myRole) return prev;

      const result = processMove(prev.board, r, c, prev.currentPlayer, serializedHistory);
      if (!result) return prev;

      if (prev.mode === GameMode.ONLINE && !isRemote && connRef.current) {
        connRef.current.send({ type: 'MOVE', r, c });
      }

      setSerializedHistory(h => [...h, serializeBoard(result.newBoard)]);
      setPassCount(0);
      const updatedCaptures = { ...prev.captures };
      updatedCaptures[prev.currentPlayer] += result.capturedCount;

      return { 
        ...prev, 
        board: result.newBoard, 
        currentPlayer: prev.currentPlayer === Player.BLACK ? Player.WHITE : Player.BLACK, 
        captures: updatedCaptures 
      };
    });
  }, [serializedHistory, myRole]);

  const handleExit = () => {
    if (connRef.current) connRef.current.close();
    window.location.reload();
  };

  useEffect(() => {
    if (gameState?.mode === GameMode.SINGLE && gameState.currentPlayer === Player.WHITE && !gameState.gameOver) {
      const timer = setTimeout(() => {
        const move = findRandomMove(gameState.board, serializedHistory, gameState.captures[Player.BLACK]);
        if (move) handleMove(move[0], move[1]);
        else handlePass();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [gameState, handleMove, handlePass, serializedHistory]);

  const finalScores = useMemo(() => {
    if (gameState?.gameOver) return calculateScores(gameState.board);
    return null;
  }, [gameState]);

  if (!gameState && !peerId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a0a0c] text-white">
        <h1 className="text-5xl md:text-8xl font-black font-serif-jp text-transparent bg-clip-text bg-gradient-to-b from-white to-amber-200/50 mb-12 uppercase">Vây Time</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-center">
          <button onClick={() => startNewGame(GameMode.SINGLE)} className="bg-white/5 p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-all font-bold uppercase">Đánh Đơn</button>
          <button onClick={() => startNewGame(GameMode.DOUBLE)} className="bg-white/5 p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-all font-bold uppercase">Đánh Đôi</button>
          <button onClick={initPeer} className="bg-amber-500/10 p-8 rounded-3xl border border-amber-500/20 hover:bg-amber-500/20 transition-all font-bold uppercase text-amber-500">Trực Tuyến</button>
        </div>
      </div>
    );
  }

  if (!gameState && peerId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a0a0c] text-white text-center">
        <div className="bg-white/5 p-8 rounded-3xl border border-white/10 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4 uppercase tracking-widest">Sảnh Trực Tuyến</h2>
          <p className="text-[10px] text-slate-500 mb-2 uppercase">ID của bạn:</p>
          <div className="bg-black p-3 rounded-lg border border-white/10 font-mono text-amber-500 break-all text-sm mb-6 select-all">{peerId}</div>
          <input className="w-full bg-black border border-white/10 p-3 rounded-lg mb-4 outline-none focus:border-amber-500 text-white" placeholder="Nhập ID đối thủ..." value={remotePeerId} onChange={e => setRemotePeerId(e.target.value)} />
          <button onClick={connectToPeer} className="w-full bg-amber-500 text-black py-3 rounded-xl font-bold uppercase">Kết Nối</button>
          <button onClick={() => window.location.reload()} className="w-full mt-4 text-slate-500 text-xs uppercase">Quay lại</button>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  return (
    <div className="min-h-[100dvh] bg-[#0c111d] text-slate-100 flex flex-col items-center p-2 md:p-8">
      {gameState.mode === GameMode.ONLINE && (
        <div className="mb-4 px-4 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-[10px] uppercase tracking-widest text-amber-500 font-bold">
          BẠN LÀ QUÂN: {myRole === Player.BLACK ? 'ĐEN' : 'TRẮNG'}
        </div>
      )}

      <div className="w-full max-w-2xl flex justify-between items-center mb-4 md:mb-8 bg-slate-800/30 p-3 md:p-6 rounded-2xl border border-white/5">
        <div className={`p-2 md:p-4 rounded-xl transition-all ${gameState.currentPlayer === Player.BLACK ? 'bg-black ring-2 ring-amber-500 scale-105' : 'opacity-30'}`}>
          <div className="text-[8px] md:text-[10px] font-bold text-center">BLACK</div>
          <div className="text-2xl md:text-4xl font-black text-center">{gameState.captures[Player.BLACK]}</div>
        </div>
        <h2 className="text-sm md:text-xl font-serif-jp font-bold text-amber-500 tracking-widest uppercase">Vây Time</h2>
        <div className={`p-2 md:p-4 rounded-xl transition-all ${gameState.currentPlayer === Player.WHITE ? 'bg-white text-black ring-2 ring-amber-500 scale-105' : 'opacity-30'}`}>
          <div className="text-[8px] md:text-[10px] font-bold text-center">WHITE</div>
          <div className="text-2xl md:text-4xl font-black text-center">{gameState.captures[Player.WHITE]}</div>
        </div>
      </div>

      <div className="w-full max-w-[min(90vw,600px)] aspect-square flex justify-center items-center">
        <Board board={gameState.board} onCellClick={handleMove} nextPlayer={gameState.currentPlayer} />
      </div>

      <div className="w-full max-w-2xl mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 px-2">
        <button disabled className="hidden md:block bg-slate-800/20 py-3 rounded-xl font-bold text-[10px] opacity-30 cursor-not-allowed uppercase">Hoàn tác</button>
        
        {/* NÚT BỎ LƯỢT: Chỉ hiện và dùng được ở chế độ Offline (Single/Double) */}
        {gameState.mode !== GameMode.ONLINE ? (
          <button onClick={handlePass} className="bg-slate-800/50 py-3 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-700">Bỏ lượt</button>
        ) : (
          <button disabled className="bg-slate-800/10 py-3 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest opacity-20 cursor-not-allowed">Bỏ lượt (Khóa)</button>
        )}

        <button onClick={() => handleSurrender(false)} className="bg-red-950/20 text-red-400 py-3 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-red-900/40">Đầu hàng</button>
        <button onClick={handleExit} className="bg-slate-800/50 py-3 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-700">Thoát</button>
      </div>

      {gameState.gameOver && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4 text-center">
          <div className="w-full max-w-sm">
            <h2 className="text-4xl md:text-7xl font-black font-serif-jp text-amber-500 mb-6 uppercase">HẠ MÀN</h2>
            <p className="text-xl mb-8 font-bold tracking-widest uppercase">
              {gameState.winner === Player.BLACK ? 'Quân Đen Thắng' : 'Quân Trắng Thắng'}
            </p>
            {finalScores && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Đen</div>
                  <div className="text-2xl font-black">{finalScores.black}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Trắng</div>
                  <div className="text-2xl font-black">{finalScores.white}</div>
                </div>
              </div>
            )}
            <button onClick={handleExit} className="w-full bg-amber-500 text-black py-4 rounded-full font-black uppercase tracking-widest hover:bg-amber-400 transition-all">Về Menu</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;