import { useEffect, useMemo, useState } from 'react';
import { ChessGame } from './lib/game';
import { ChessAI } from './lib/ai';

const PIECE_LABEL = {
  wp: 'ត្រី',
  wn: 'សេះ',
  ws: 'គោល',
  wr: 'ទូក',
  wm: 'នាង',
  wk: 'ស្តេច',
  bp: 'ត្រី',
  bn: 'សេះ',
  bs: 'គោល',
  br: 'ទូក',
  bm: 'នាង',
  bk: 'ស្តេច',
};

function PieceShape({ type, tone, stroke }) {
  if (type === 'p') {
    return (
      <>
        <circle cx="50" cy="50" r="40" fill={tone} stroke={stroke} strokeWidth="3.5" />
        <circle cx="50" cy="50" r="30" fill="none" stroke={stroke} strokeWidth="3.5" />
        <circle cx="50" cy="50" r="20" fill="none" stroke={stroke} strokeWidth="3.5" />
        <circle cx="50" cy="50" r="12" fill="none" stroke={stroke} strokeWidth="3.5" />
      </>
    );
  }

  if (type === 'r') {
    return (
      <>
        <rect x="20" y="60" width="60" height="18" rx="2" fill={tone} stroke={stroke} strokeWidth="3" />
        <path d="M18 60 L32 46 L68 46 L82 60 Z" fill={tone} stroke={stroke} strokeWidth="3" />
        <path d="M36 46 L50 35 L64 46 Z" fill={tone} stroke={stroke} strokeWidth="3" />
      </>
    );
  }

  if (type === 'n') {
    return (
      <path
        d="M26 76 L60 76 L60 70 C58 60 56 52 52 42 C48 31 40 22 31 17 L28 21 C32 25 34 29 35 35 C29 37 23 44 22 52 Z"
        fill={tone}
        stroke={stroke}
        strokeWidth="3"
      />
    );
  }

  if (type === 's') {
    return (
      <>
        <path d="M50 18 L56 31 L66 38 L66 48 C66 60 58 68 50 74 C42 68 34 60 34 48 L34 38 L44 31 Z" fill={tone} stroke={stroke} strokeWidth="3" />
        <rect x="40" y="74" width="20" height="8" fill={tone} stroke={stroke} strokeWidth="3" />
      </>
    );
  }

  if (type === 'm') {
    return (
      <>
        <path d="M50 14 L55 30 L70 38 L70 52 C70 62 60 70 50 78 C40 70 30 62 30 52 L30 38 L45 30 Z" fill={tone} stroke={stroke} strokeWidth="3" />
        <rect x="36" y="78" width="28" height="7" fill={tone} stroke={stroke} strokeWidth="3" />
      </>
    );
  }

  return (
    <>
      <path d="M50 12 L55 24 L62 24 L62 28 L68 32 L68 36 L32 36 L32 32 L38 28 L38 24 L45 24 Z" fill={tone} stroke={stroke} strokeWidth="3" />
      <path d="M50 36 C64 36 71 46 71 56 C71 64 63 72 50 80 C37 72 29 64 29 56 C29 46 36 36 50 36 Z" fill={tone} stroke={stroke} strokeWidth="3" />
      <rect x="34" y="80" width="32" height="7" fill={tone} stroke={stroke} strokeWidth="3" />
    </>
  );
}

function PieceIcon({ piece, selected, label }) {
  const isWhite = piece.color === 'w';
  const fill = isWhite ? '#E9DEB3' : '#34363B';
  const stroke = '#0b0b0b';

  return (
    <svg
      className={`piece ${selected ? 'selected' : ''}`}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
    >
      <PieceShape type={piece.type} tone={fill} stroke={stroke} />
    </svg>
  );
}

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
    move: () => beep(500, 0.06, 'triangle', 0.035),
    capture: () => beep(210, 0.12, 'sawtooth', 0.045),
    check: () => {
      beep(700, 0.08, 'square', 0.04);
      setTimeout(() => beep(840, 0.08, 'square', 0.04), 70);
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
    setGame(new ChessGame());
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
        : 'Cambodia chess (Ouk Chaktrang variant).';

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 md:py-10 text-slate-100">
      <h1 className="text-3xl md:text-4xl font-bold text-center tracking-wide mb-6">🇰🇭 Ouk Chaktrang</h1>

      <section className="grid gap-6 lg:grid-cols-[minmax(280px,640px)_1fr] items-start">
        <div className="board-wrap">
          <div
            className="grid rounded-2xl overflow-hidden shadow-2xl border-2 border-black"
            style={{ gridTemplateColumns: 'repeat(8, var(--cell-size))', gridTemplateRows: 'repeat(8, var(--cell-size))' }}
          >
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
                  className={`board-square relative w-full h-full p-0 border border-black appearance-none flex items-center justify-center ${
                    isDark ? 'bg-[#F4AD4A]' : 'bg-[#F4AD4A]'
                  } ${isSelected ? 'selected-square' : ''} ${isLastMove ? 'last-move' : ''} ${
                    isCheck ? 'check-king' : ''
                  } ${targetMove ? (piece ? 'capture-hint' : 'move-hint') : ''}`}
                >
                  {piece && (
                    <PieceIcon
                      piece={piece}
                      selected={Boolean(isSelected)}
                      label={`${piece.color === 'w' ? 'White' : 'Black'} ${PIECE_LABEL[`${piece.color}${piece.type}`]}`}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
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
