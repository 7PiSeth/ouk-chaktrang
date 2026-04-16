import { useEffect, useMemo, useState } from 'react';
import { ChessGame } from './lib/game';
import { ChessAI } from './lib/ai';

const PIECE_SVG = {
  wp: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  wn: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  wb: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  wr: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  wq: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  wk: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  bp: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
  bn: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  bb: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  br: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  bq: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  bk: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
};

function createSoundEngine() {
  let ctx;

  const beep = (freq, duration, type, gain = 0.04) => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = gain;
    osc.connect(amp);
    amp.connect(ctx.destination);

    const now = ctx.currentTime;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  };

  return {
    move: () => beep(560, 0.06, 'triangle', 0.035),
    capture: () => beep(220, 0.12, 'sawtooth', 0.045),
    check: () => {
      beep(720, 0.08, 'square', 0.04);
      setTimeout(() => beep(880, 0.08, 'square', 0.04), 70);
    },
  };
}

export default function App() {
  const [game, setGame] = useState(() => new ChessGame());
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const ai = useMemo(() => new ChessAI(3), []);
  const sound = useMemo(() => createSoundEngine(), []);

  const checkSquares = useMemo(() => {
    if (!game.isInCheck(game.turn)) return [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = game.getPiece(r, c);
        if (piece?.type === 'k' && piece.color === game.turn) return [{ row: r, col: c }];
      }
    }
    return [];
  }, [game]);

  useEffect(() => {
    if (!aiEnabled || game.gameOver || game.turn !== 'b') return;

    setIsThinking(true);
    const timer = setTimeout(() => {
      const move = ai.chooseMove(game.clone());
      if (!move) return;

      const next = game.clone();
      const applied = next.makeMove(move);
      if (!applied) return;

      if (applied.capture) sound.capture();
      else sound.move();
      if (!next.gameOver && next.isInCheck(next.turn)) sound.check();

      setGame(next);
      setIsThinking(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [game, aiEnabled, ai, sound]);

  const resetSelection = () => {
    setSelected(null);
    setLegalMoves([]);
  };

  const playMove = (move) => {
    const next = game.clone();
    const applied = next.makeMove(move);
    if (!applied) return;

    if (applied.capture) sound.capture();
    else sound.move();
    if (!next.gameOver && next.isInCheck(next.turn)) sound.check();

    setGame(next);
    resetSelection();
  };

  const handleSquareClick = (row, col) => {
    if (game.gameOver) return;
    if (aiEnabled && game.turn === 'b') return;

    if (selected) {
      const candidate = legalMoves.find((m) => m.to.row === row && m.to.col === col);
      if (candidate) {
        playMove(candidate);
        return;
      }
    }

    const piece = game.getPiece(row, col);
    if (piece && piece.color === game.turn) {
      setSelected({ row, col });
      setLegalMoves(game.getLegalMovesForSquare(row, col));
    } else {
      resetSelection();
    }
  };

  const handleUndo = () => {
    const next = game.clone();
    if (!next.undo()) return;
    if (aiEnabled && next.turn === 'b') next.undo();
    setGame(next);
    resetSelection();
  };

  const handleRestart = () => {
    const next = new ChessGame();
    setGame(next);
    setIsThinking(false);
    resetSelection();
  };

  const statusText = game.gameOver
    ? game.resultReason === 'checkmate'
      ? `Checkmate! ${game.winner === 'w' ? 'White' : 'Black'} wins.`
      : 'Draw by stalemate.'
    : `${game.turn === 'w' ? 'White' : 'Black'} to move`;

  const detailText = game.gameOver
    ? 'Press Restart to play again.'
    : game.isInCheck(game.turn)
      ? `${game.turn === 'w' ? 'White' : 'Black'} king is in check.`
      : isThinking
        ? 'AI is thinking...'
        : 'Select a piece to see legal moves.';

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 md:py-10 text-slate-100">
      <h1 className="text-3xl md:text-4xl font-bold text-center tracking-wide mb-6">♟ React Chess</h1>

      <section className="grid gap-6 lg:grid-cols-[minmax(280px,640px)_1fr] items-start">
        <div className="grid grid-cols-8 aspect-square rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
          {Array.from({ length: 8 }).map((_, row) =>
            Array.from({ length: 8 }).map((__, col) => {
              const piece = game.getPiece(row, col);
              const isDark = (row + col) % 2 !== 0;
              const isSelected = selected && selected.row === row && selected.col === col;
              const isLastMove =
                game.lastMove &&
                ((game.lastMove.from.row === row && game.lastMove.from.col === col) ||
                  (game.lastMove.to.row === row && game.lastMove.to.col === col));
              const targetMove = legalMoves.find((m) => m.to.row === row && m.to.col === col);
              const isCheck = checkSquares.some((sq) => sq.row === row && sq.col === col);

              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  onClick={() => handleSquareClick(row, col)}
                  className={`board-square relative w-full h-full flex items-center justify-center ${
                    isDark ? 'bg-slate-700/95 hover:bg-slate-600' : 'bg-amber-100/95 hover:bg-amber-200'
                  } ${isSelected ? 'selected-square' : ''} ${isLastMove ? 'last-move' : ''} ${
                    isCheck ? 'check-king' : ''
                  } ${targetMove ? (piece ? 'capture-hint' : 'move-hint') : ''}`}
                >
                  {piece && (
                    <img
                      className={`piece ${isSelected ? 'selected' : ''}`}
                      src={PIECE_SVG[`${piece.color}${piece.type}`]}
                      alt={`${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>

        <aside className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 md:p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm uppercase tracking-wider text-slate-400">Mode</p>
            <button
              onClick={() => setAiEnabled((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg transition text-sm font-semibold ${
                aiEnabled ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              AI: {aiEnabled ? 'On' : 'Off'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleUndo}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition text-sm font-semibold"
            >
              Undo
            </button>
            <button
              onClick={handleRestart}
              className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 transition text-sm font-semibold"
            >
              Restart
            </button>
          </div>

          <div className="rounded-lg bg-slate-800/80 p-3">
            <p className="text-xs uppercase text-slate-400 tracking-wider mb-1">Status</p>
            <p className="font-medium">{statusText}</p>
            <p className="text-sm text-slate-300 mt-1">{detailText}</p>
          </div>

          <div className="rounded-lg bg-slate-800/80 p-3">
            <p className="text-xs uppercase text-slate-400 tracking-wider mb-2">Move History</p>
            <ol className="text-sm space-y-1 max-h-72 overflow-auto pr-2">
              {Array.from({ length: Math.ceil(game.history.length / 2) }).map((_, idx) => {
                const white = game.history[idx * 2]?.move?.notation || '';
                const black = game.history[idx * 2 + 1]?.move?.notation || '';
                return (
                  <li key={idx} className="grid grid-cols-[2rem_1fr_1fr] gap-2 border-b border-slate-700/60 pb-1">
                    <span className="text-slate-400">{idx + 1}.</span>
                    <span>{white}</span>
                    <span>{black}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </section>
    </main>
  );
}
