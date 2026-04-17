import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ChessGame } from './lib/game';
import { ChessAI } from './lib/ai';

// ── Piece labels (Khmer) ──────────────────────────────────────────
const PIECE_LABEL = {
  wp: 'ត្រី', wn: 'សេះ', ws: 'គោល', wr: 'ទូក', wm: 'នាង', wk: 'ស្តេច',
  bp: 'ត្រី', bn: 'សេះ', bs: 'គោល', br: 'ទូក', bm: 'នាង', bk: 'ស្តេច',
};

// ── SVG piece shapes ──────────────────────────────────────────────
const PieceShape = memo(function PieceShape({ type, tone, stroke }) {
  if (type === 'p') return (
    <>
      <circle cx="50" cy="50" r="40" fill={tone} stroke={stroke} strokeWidth="3.5" />
      <circle cx="50" cy="50" r="30" fill="none" stroke={stroke} strokeWidth="3.5" />
      <circle cx="50" cy="50" r="20" fill="none" stroke={stroke} strokeWidth="3.5" />
      <circle cx="50" cy="50" r="12" fill="none" stroke={stroke} strokeWidth="3.5" />
    </>
  );
  if (type === 'r') return (
    <>
      <rect x="20" y="60" width="60" height="18" rx="2" fill={tone} stroke={stroke} strokeWidth="3" />
      <path d="M18 60 L32 46 L68 46 L82 60 Z" fill={tone} stroke={stroke} strokeWidth="3" />
      <path d="M36 46 L50 35 L64 46 Z" fill={tone} stroke={stroke} strokeWidth="3" />
    </>
  );
  if (type === 'n') return (
    <path
      d="M26 76 L60 76 L60 70 C58 60 56 52 52 42 C48 31 40 22 31 17 L28 21 C32 25 34 29 35 35 C29 37 23 44 22 52 Z"
      fill={tone} stroke={stroke} strokeWidth="3"
    />
  );
  if (type === 's') return (
    <>
      <path d="M50 18 L56 31 L66 38 L66 48 C66 60 58 68 50 74 C42 68 34 60 34 48 L34 38 L44 31 Z" fill={tone} stroke={stroke} strokeWidth="3" />
      <rect x="40" y="74" width="20" height="8" fill={tone} stroke={stroke} strokeWidth="3" />
    </>
  );
  if (type === 'm') return (
    <>
      <path d="M50 14 L55 30 L70 38 L70 52 C70 62 60 70 50 78 C40 70 30 62 30 52 L30 38 L45 30 Z" fill={tone} stroke={stroke} strokeWidth="3" />
      <rect x="36" y="78" width="28" height="7" fill={tone} stroke={stroke} strokeWidth="3" />
    </>
  );
  // King
  return (
    <>
      <path d="M50 12 L55 24 L62 24 L62 28 L68 32 L68 36 L32 36 L32 32 L38 28 L38 24 L45 24 Z" fill={tone} stroke={stroke} strokeWidth="3" />
      <path d="M50 36 C64 36 71 46 71 56 C71 64 63 72 50 80 C37 72 29 64 29 56 C29 46 36 36 50 36 Z" fill={tone} stroke={stroke} strokeWidth="3" />
      <rect x="34" y="80" width="32" height="7" fill={tone} stroke={stroke} strokeWidth="3" />
    </>
  );
});

const PieceIcon = memo(function PieceIcon({ piece, selected, label, animate }) {
  const fill = piece.color === 'w' ? '#EDE0B0' : '#2a2c33';
  const stroke = piece.color === 'w' ? '#7a5c1a' : '#111';
  const cls = `piece${selected ? ' selected' : ''}${animate ? ' piece-animate' : ''}`;
  return (
    <svg className={cls} viewBox="0 0 100 100" role="img" aria-label={label}>
      <PieceShape type={piece.type} tone={fill} stroke={stroke} />
    </svg>
  );
});

// ── Human-readable move formatter ────────────────────────────────
const PIECE_NAME_KH = { p: 'ត្រី', n: 'សេះ', s: 'គោល', r: 'ទូក', m: 'នាង', k: 'ស្តេច' };
// Khmer horizontal labels: ក ខ គ ឃ ង ច ឆ ជ
const FILE_LABEL_KH = ['ក', 'ខ', 'គ', 'ឃ', 'ង', 'ច', 'ឆ', 'ជ'];
// Khmer digits: ១ ២ ៣ ៤ ៥ ៦ ៧ ៨
const KHMER_DIGITS = ['', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨'];
const toKhNum = (n) => KHMER_DIGITS[n] ?? String(n);

function formatMove(entry) {
  // entry: { from, to, piece, color, capture, notation }
  const pieceName = PIECE_NAME_KH[entry.piece] ?? entry.piece.toUpperCase();
  const from = `${FILE_LABEL_KH[entry.from.col]}${toKhNum(8 - entry.from.row)}`;
  const to = `${FILE_LABEL_KH[entry.to.col]}${toKhNum(8 - entry.to.row)}`;
  const action = entry.capture ? '×' : '→';
  return `${pieceName} ${from}${action}${to}`;
}

// ── Sound engine (lazy init) ──────────────────────────────────────
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
    check: () => { beep(700, 0.08, 'square', 0.04); setTimeout(() => beep(840, 0.08, 'square', 0.04), 70); },
  };
}

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const [game, setGame] = useState(() => new ChessGame());
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [animKey, setAnimKey] = useState(null); // "row-col" of destination to animate

  const ai = useMemo(() => new ChessAI(3), []);
  const sound = useMemo(() => createSoundEngine(), []);

  const checkSquares = useMemo(() => {
    if (!game.isInCheck(game.turn)) return [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = game.getPiece(r, c);
        if (p?.type === 'k' && p.color === game.turn) return [{ row: r, col: c }];
      }
    return [];
  }, [game]);
  const checkKeySet = useMemo(() => new Set(checkSquares.map((sq) => `${sq.row}-${sq.col}`)), [checkSquares]);
  const legalMoveTargetSet = useMemo(() => new Set(legalMoves.map((m) => `${m.to.row}-${m.to.col}`)), [legalMoves]);
  const legalMoveCaptureSet = useMemo(() => (
    new Set(legalMoves.filter((m) => !!game.getPiece(m.to.row, m.to.col)).map((m) => `${m.to.row}-${m.to.col}`))
  ), [legalMoves, game]);
  const historyRows = useMemo(
    () => Array.from({ length: Math.ceil(game.history.length / 2) }, (_, idx) => ({
      no: idx + 1,
      white: game.history[idx * 2]?.move,
      black: game.history[idx * 2 + 1]?.move,
    })),
    [game.history],
  );

  // ── Play a move and trigger destination animation
  const playMove = useCallback((move, nextGame) => {
    // nextGame already prepared by caller (avoids double clone)
    setAnimKey(`${move.to.row}-${move.to.col}`);
    setGame(nextGame);
    setSelected(null);
    setLegalMoves([]);
    // Clear anim key after animation duration (320ms)
    const id = setTimeout(() => setAnimKey(null), 350);
    return () => clearTimeout(id);
  }, []);

  // ── Sounds helper
  const applySounds = useCallback((applied, nextGame) => {
    if (applied.capture) sound.capture();
    else sound.move();
    if (!nextGame.gameOver && nextGame.isInCheck(nextGame.turn)) sound.check();
  }, [sound]);

  // ── AI turn
  useEffect(() => {
    if (!aiEnabled || game.gameOver || game.turn !== 'b') return;
    setIsThinking(true);
    const timer = setTimeout(() => {
      const move = ai.chooseMove(game.clone());
      if (!move) { setIsThinking(false); return; }
      const next = game.clone();
      const applied = next.makeMove(move);
      if (!applied) { setIsThinking(false); return; }
      applySounds(applied, next);
      setIsThinking(false);
      playMove(move, next);
    }, 200);
    return () => clearTimeout(timer);
  }, [game, aiEnabled, ai, sound, applySounds, playMove]);

  // ── Human click handler
  const handleSquareClick = useCallback((row, col) => {
    if (game.gameOver) return;
    if (aiEnabled && game.turn === 'b') return;

    if (selected) {
      const candidate = legalMoves.find((m) => m.to.row === row && m.to.col === col);
      if (candidate) {
        const next = game.clone();
        const applied = next.makeMove(candidate);
        if (applied) {
          applySounds(applied, next);
          playMove(candidate, next);
        }
        return;
      }
    }

    const piece = game.getPiece(row, col);
    if (piece && piece.color === game.turn) {
      setSelected({ row, col });
      setLegalMoves(game.getLegalMovesForSquare(row, col));
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  }, [game, selected, legalMoves, aiEnabled, applySounds, playMove]);

  const handleUndo = useCallback(() => {
    const next = game.clone();
    if (!next.undo()) return;
    if (aiEnabled && next.turn === 'b') next.undo();
    setGame(next);
    setSelected(null);
    setLegalMoves([]);
    setAnimKey(null);
  }, [game, aiEnabled]);

  const handleRestart = useCallback(() => {
    setGame(new ChessGame());
    setSelected(null);
    setLegalMoves([]);
    setIsThinking(false);
    setAnimKey(null);
  }, []);

  // ── Derived UI state
  const statusText = game.gameOver
    ? game.resultReason === 'checkmate'
      ? `គីម! ${game.winner === 'w' ? 'បង្កោល ស' : 'បង្កោល ខ្មៅ'} ឈ្នះ។`
      : 'ស្មើ (stalemate)'
    : `${game.turn === 'w' ? 'បង្កោល ស' : 'បង្កោល ខ្មៅ'} ដើរ`;

  const detailText = game.gameOver
    ? 'ចុច ចាប់ផ្ដើម ម្ដងទៀត'
    : game.isInCheck(game.turn)
      ? `ស្តេច ${game.turn === 'w' ? 'ស' : 'ខ្មៅ'} ត្រូវគំរាម!`
      : isThinking
        ? 'AI កំពុងគិត…'
        : 'អុក ចត្រង្គ · Ouk Chaktrang';

  const dotClass = game.gameOver
    ? 'status-dot gameover'
    : isThinking
      ? 'status-dot thinking'
      : game.turn === 'w'
        ? 'status-dot white-turn'
        : 'status-dot black-turn';

  return (
    <main className="app-root">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 title-gradient font-khmer">
        អុក ចត្រង្គ
      </h1>

      <section className="app-grid">
          <div className="board-outer">
          <div className="coord-body">
            <div className="coord-col coord-left">
              {Array.from({ length: 8 }, (_, r) => (
                <div key={r} className="coord-cell">{toKhNum(8 - r)}</div>
              ))}
            </div>

            <div className="board-wrap">
              <div className="board-grid">
                {Array.from({ length: 64 }, (_, idx) => {
                  const row = Math.floor(idx / 8);
                  const col = idx % 8;
                  const squareKey = `${row}-${col}`;
                  const piece = game.getPiece(row, col);
                  const isDark = (row + col) % 2 !== 0;
                  const isSelected = selected?.row === row && selected?.col === col;
                  const isLastFrom = game.lastMove?.from.row === row && game.lastMove?.from.col === col;
                  const isLastTo = game.lastMove?.to.row === row && game.lastMove?.to.col === col;
                  const isLastMove = isLastFrom || isLastTo;
                  const isTarget = legalMoveTargetSet.has(squareKey);
                  const isCaptureTarget = legalMoveCaptureSet.has(squareKey);
                  const isCheck = checkKeySet.has(squareKey);
                  const shouldAnim = animKey === squareKey;

                  const bg = isDark ? '#c8902a' : '#f5c842';

                  let cls = 'board-square';
                  if (isSelected) cls += ' selected-square';
                  if (isLastMove) cls += ' last-move';
                  if (isCheck) cls += ' check-king';
                  if (isTarget) cls += isCaptureTarget ? ' capture-hint' : ' move-hint';

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSquareClick(row, col)}
                      className={cls}
                      style={{ background: bg }}
                      aria-label={piece ? `${piece.color === 'w' ? 'ស' : 'ខ្មៅ'} ${PIECE_LABEL[`${piece.color}${piece.type}`]} ${FILE_LABEL_KH[col]}${toKhNum(8 - row)}` : undefined}
                    >
                      {piece && (
                        <PieceIcon
                          piece={piece}
                          selected={isSelected}
                          label={PIECE_LABEL[`${piece.color}${piece.type}`]}
                          animate={shouldAnim}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="coord-row coord-bottom">
            <div className="coord-corner" />
            {FILE_LABEL_KH.map((lbl) => (
              <div key={lbl} className="coord-cell">{lbl}</div>
            ))}
          </div>
        </div>

        {/* ── Side panel ── */}
        <aside className="glass-panel p-4 md:p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-widest text-white/40">របៀប</p>
            <button
              onClick={() => setAiEnabled((p) => !p)}
              className={`btn ${aiEnabled ? 'btn-ai-on' : 'btn-ai-off'}`}
            >
              {aiEnabled ? '🤖 AI: បើក' : '👥 AI: បិទ'}
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleUndo} className="btn btn-undo">↩ មកវិញ</button>
            <button onClick={handleRestart} className="btn btn-restart">↺ ចាប់ផ្ដើម</button>
          </div>

          {/* Status */}
          <div className="rounded-xl bg-white/5 border border-white/8 p-3">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-1">ស្ថានភាព</p>
            <p className="font-semibold flex items-center gap-1">
              <span className={dotClass} />
              {statusText}
            </p>
            <p className="text-sm text-white/55 mt-1">{detailText}</p>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/8 p-3">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-2">ប្រវត្តិការដើរ</p>
            <div className="move-history-list">
              <table className="move-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>បង្កោល ស</th>
                    <th>បង្កោល ខ្មៅ</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => (
                    <tr key={row.no}>
                      <td>{toKhNum(row.no)}</td>
                      <td>{row.white ? formatMove(row.white) : ''}</td>
                      <td>{row.black ? formatMove(row.black) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
