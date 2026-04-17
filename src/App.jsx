import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ChessGame } from './lib/game';
import { ChessAI } from './lib/ai';

const PIECE_LABEL = {
  wp: 'ត្រី', wn: 'សេះ', ws: 'គោល', wr: 'ទូក', wm: 'នាង', wk: 'ស្តេច',
  bp: 'ត្រី', bn: 'សេះ', bs: 'គោល', br: 'ទូក', bm: 'នាង', bk: 'ស្តេច',
};

const PIECE_NAME_KH = { p: 'ត្រី', n: 'សេះ', s: 'គោល', r: 'ទូក', m: 'នាង', k: 'ស្តេច' };
const FILE_LABEL_KH = ['ក', 'ខ', 'គ', 'ឃ', 'ង', 'ច', 'ឆ', 'ជ'];
const KHMER_DIGITS = ['', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨'];
const toKhNum = (n) => KHMER_DIGITS[n] ?? String(n);
const AI_LEVELS = [
  { label: 'ក្មេងអាយុ១០ឆ្នាំ 👶', value: 'easy', depth: 1 },
  { label: 'មនុស្សពេញវ័យ 👦', value: 'meduim', depth: 2 },
  { label: 'ស្តេចទៀមកាហ្វេ 🧔', value: 'hard', depth: 3 },
  { label: 'គ្រូតា 👴', value: 'very_hard', depth: 4 },
];

const CELL_SIZE = 'clamp(36px, calc((100vw - 2rem - 4px) / 8), 80px)';
const COORD_FONT_SIZE = 'clamp(0.6rem, calc(0.22 * clamp(36px, calc((100vw - 2rem - 4px) / 8), 80px)), 0.85rem)';

const BOARD_SQUARE_BASE =
  'relative flex cursor-pointer appearance-none items-center justify-center border-none p-0 transition-[filter] duration-100 hover:brightness-110';

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
  if (type === 'n') return <path d="M26 76 L60 76 L60 70 C58 60 56 52 52 42 C48 31 40 22 31 17 L28 21 C32 25 34 29 35 35 C29 37 23 44 22 52 Z" fill={tone} stroke={stroke} strokeWidth="3" />;
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
  return (
    <svg
      className={`pointer-events-none block h-[82%] w-[82%] min-h-0 min-w-0 select-none transition-[transform,filter] duration-150 [will-change:transform,filter] ${selected ? 'scale-[1.12] -translate-y-[4%] drop-shadow-[0_6px_18px_rgba(10,132,255,0.7)]' : ''}`}
      style={animate ? { animation: 'piece-drop 320ms cubic-bezier(0.22, 1, 0.36, 1) forwards' } : undefined}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
    >
      <PieceShape type={piece.type} tone={fill} stroke={stroke} />
    </svg>
  );
});

function formatMove(entry) {
  const pieceName = PIECE_NAME_KH[entry.piece] ?? entry.piece.toUpperCase();
  const from = `${FILE_LABEL_KH[entry.from.col]}${toKhNum(8 - entry.from.row)}`;
  const to = `${FILE_LABEL_KH[entry.to.col]}${toKhNum(8 - entry.to.row)}`;
  return `${pieceName} ${from}${entry.capture ? '×' : '→'}${to}`;
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
    check: () => { beep(700, 0.08, 'square', 0.04); setTimeout(() => beep(840, 0.08, 'square', 0.04), 70); },
  };
}

export default function App() {
  const [game, setGame] = useState(() => new ChessGame());
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiLevel, setAiLevel] = useState('hard');
  const [isThinking, setIsThinking] = useState(false);
  const [animKey, setAnimKey] = useState(null);

  const aiDepth = useMemo(
    () => AI_LEVELS.find((lvl) => lvl.value === aiLevel)?.depth ?? 3,
    [aiLevel],
  );
  const ai = useMemo(() => new ChessAI(aiDepth), [aiDepth]);
  const sound = useMemo(() => createSoundEngine(), []);

  const checkSquares = useMemo(() => {
    if (!game.isInCheck(game.turn)) return [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = game.getPiece(r, c);
        if (p?.type === 'k' && p.color === game.turn) return [{ row: r, col: c }];
      }
    }
    return [];
  }, [game]);

  const checkKeySet = useMemo(() => new Set(checkSquares.map((sq) => `${sq.row}-${sq.col}`)), [checkSquares]);
  const legalMoveTargetSet = useMemo(() => new Set(legalMoves.map((m) => `${m.to.row}-${m.to.col}`)), [legalMoves]);
  const legalMoveCaptureSet = useMemo(() => new Set(legalMoves.filter((m) => !!game.getPiece(m.to.row, m.to.col)).map((m) => `${m.to.row}-${m.to.col}`)), [legalMoves, game]);
  const historyRows = useMemo(() => Array.from({ length: Math.ceil(game.history.length / 2) }, (_, idx) => ({ no: idx + 1, white: game.history[idx * 2]?.move, black: game.history[idx * 2 + 1]?.move })), [game.history]);

  const playMove = useCallback((move, nextGame) => {
    setAnimKey(`${move.to.row}-${move.to.col}`);
    setGame(nextGame);
    setSelected(null);
    setLegalMoves([]);
    const id = setTimeout(() => setAnimKey(null), 350);
    return () => clearTimeout(id);
  }, []);

  const applySounds = useCallback((applied, nextGame) => {
    if (applied.capture) sound.capture();
    else sound.move();
    if (!nextGame.gameOver && nextGame.isInCheck(nextGame.turn)) sound.check();
  }, [sound]);

  useEffect(() => {
    if (!aiEnabled || game.gameOver || game.turn !== 'b') return;
    setIsThinking(true);
    const timer = setTimeout(() => {
      const move = ai.chooseMove(game.clone());
      if (!move) {
        setIsThinking(false);
        return;
      }
      const next = game.clone();
      const applied = next.makeMove(move);
      if (!applied) {
        setIsThinking(false);
        return;
      }
      applySounds(applied, next);
      setIsThinking(false);
      playMove(move, next);
    }, 200);
    return () => clearTimeout(timer);
  }, [game, aiEnabled, ai, applySounds, playMove]);

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
    ? 'bg-[#ff453a]'
    : isThinking
      ? 'bg-[#ff9f0a] animate-pulse'
      : game.turn === 'w'
        ? 'bg-[#f0f0f5]'
        : 'border-[1.5px] border-[#8a8aaa] bg-[#3a3a4a]';

  return (
    <main className="mx-auto flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_30%_10%,#1c1c2e_0%,#0a0a0f_60%,#0d0d1a_100%)] px-4 pb-4 pt-3 text-[#f0f0f5] md:px-5 md:pb-4 md:pt-3 lg:h-dvh lg:overflow-hidden">
      <h1 className="mb-5 h-[52px] bg-gradient-to-br from-[#f5c842] via-[#ff9f0a] to-[#ff6b35] bg-clip-text text-center font-['Moul',sans-serif] text-3xl font-bold tracking-[0.02em] text-transparent md:text-4xl">
        អុក ចត្រង្គ
      </h1>

      <section className="grid w-full max-w-[1200px] grid-cols-1 gap-5 min-[900px]:grid-cols-[max-content_1fr]">
        <div className="mx-auto inline-flex flex-col items-center">
          <div className="flex items-stretch">
            <div className="mr-[2px] flex flex-col">
              {Array.from({ length: 8 }, (_, r) => (
                <div
                  key={r}
                  className="pointer-events-none flex select-none items-center justify-center font-bold leading-none text-[rgba(255,214,10,0.85)] [text-shadow:0_1px_6px_rgba(0,0,0,0.7)]"
                  style={{ width: CELL_SIZE, height: CELL_SIZE, fontSize: COORD_FONT_SIZE }}
                >
                  {toKhNum(8 - r)}
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-[18px] leading-none shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_16px_40px_rgba(0,0,0,0.62),0_4px_16px_rgba(0,0,0,0.5)]">
              <div className="grid" style={{ gridTemplateColumns: `repeat(8, ${CELL_SIZE})`, gridTemplateRows: `repeat(8, ${CELL_SIZE})` }}>
                {Array.from({ length: 64 }, (_, idx) => {
                  const row = Math.floor(idx / 8);
                  const col = idx % 8;
                  const squareKey = `${row}-${col}`;
                  const piece = game.getPiece(row, col);
                  const isSelected = selected?.row === row && selected?.col === col;
                  const isLastFrom = game.lastMove?.from.row === row && game.lastMove?.from.col === col;
                  const isLastTo = game.lastMove?.to.row === row && game.lastMove?.to.col === col;
                  const isTarget = legalMoveTargetSet.has(squareKey);
                  const isCaptureTarget = legalMoveCaptureSet.has(squareKey);
                  const isCheck = checkKeySet.has(squareKey);
                  const shouldAnim = animKey === squareKey;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSquareClick(row, col)}
                      className={`${BOARD_SQUARE_BASE} ${isSelected ? 'shadow-[inset_0_0_0_3px_rgba(10,132,255,0.9)]' : ''}`}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        background: (row + col) % 2 !== 0 ? '#c8902a' : '#f5c842',
                      }}
                      aria-label={piece ? `${piece.color === 'w' ? 'ស' : 'ខ្មៅ'} ${PIECE_LABEL[`${piece.color}${piece.type}`]} ${FILE_LABEL_KH[col]}${toKhNum(8 - row)}` : undefined}
                    >
                      {(isLastFrom || isLastTo) && <span className="pointer-events-none absolute inset-0 bg-[rgba(255,214,10,0.3)]" />}
                      {isCheck && <span className="pointer-events-none absolute inset-0 bg-[rgba(255,59,48,0.4)] shadow-[inset_0_0_20px_rgba(255,59,48,0.5)]" />}
                      {isTarget && !isCaptureTarget && <span className="pointer-events-none absolute inset-[34%] rounded-full bg-[rgba(50,215,75,0.55)] shadow-[0_0_8px_rgba(50,215,75,0.4)]" />}
                      {isTarget && isCaptureTarget && <span className="pointer-events-none absolute inset-[7%] rounded-full border-4 border-[rgba(255,59,48,0.85)] shadow-[inset_0_0_10px_rgba(255,59,48,0.2)]" />}
                      {piece && <PieceIcon piece={piece} selected={isSelected} label={PIECE_LABEL[`${piece.color}${piece.type}`]} animate={shouldAnim} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-[2px] flex items-center">
            <div style={{ width: CELL_SIZE, height: CELL_SIZE }} className="shrink-0" />
            {FILE_LABEL_KH.map((lbl) => (
              <div
                key={lbl}
                className="pointer-events-none flex select-none items-center justify-center font-bold leading-none text-[rgba(255,214,10,0.85)] [text-shadow:0_1px_6px_rgba(0,0,0,0.7)]"
                style={{ width: CELL_SIZE, height: CELL_SIZE, fontSize: COORD_FONT_SIZE }}
              >
                {lbl}
              </div>
            ))}
          </div>
        </div>

        <aside className="w-full h-fit rounded-[18px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-[20px] min-[900px]:flex min-[900px]:max-h-[calc(100dvh-5.6rem)] min-[900px]:min-w-[380px] min-[900px]:max-w-[460px] min-[900px]:flex-col min-[900px]:overflow-hidden md:p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-widest text-white/40">លេងជាមួយ</p>
              <button
                onClick={() => setAiEnabled((p) => !p)}
                className={`inline-flex items-center justify-center rounded-[10px] border-none px-4 py-2 text-sm font-semibold tracking-[0.01em] text-white transition-[transform,filter,box-shadow] duration-100 active:scale-95 ${aiEnabled
                  ? 'bg-gradient-to-br from-[#30d158] to-[#25a244] shadow-[0_0_14px_rgba(48,209,88,0.35)] hover:brightness-110 hover:shadow-[0_0_20px_rgba(48,209,88,0.55)]'
                  : 'bg-gradient-to-br from-[#0a84ff] to-[#0060df] shadow-[0_0_14px_rgba(10,132,255,0.35)] hover:brightness-110 hover:shadow-[0_0_20px_rgba(10,132,255,0.55)]'}`}
              >
                {aiEnabled ? '🤖 AI: បើក' : '👥 AI: បិទ'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-widest text-white/40">កម្រិត AI</p>
              <select
                value={aiLevel}
                onChange={(e) => setAiLevel(e.target.value)}
                className="w-[150px] rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-white/30 focus:bg-white/15"
              >
                {AI_LEVELS.map((level) => (
                  <option key={level.value} value={level.value} className="bg-[#12121b] text-white">
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleUndo} className="inline-flex items-center justify-center rounded-[10px] border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0f0f5] transition active:scale-95 hover:bg-white/15">↩ ថយមួយជំហាន</button>
              <button onClick={handleRestart} className="inline-flex items-center justify-center rounded-[10px] border-none bg-gradient-to-br from-[#ff453a] to-[#c0392b] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_14px_rgba(255,69,58,0.3)] transition active:scale-95 hover:brightness-110 hover:shadow-[0_0_20px_rgba(255,69,58,0.5)]">↺ ចាប់ផ្ដើមជាថ្មី</button>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-1 text-xs uppercase tracking-widest text-white/40">ស្ថានភាព</p>
              <p className="flex items-center gap-1 font-semibold">
                <span className={`mr-1 inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
                {statusText}
              </p>
              <p className="mt-1 text-sm text-white/55">{detailText}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs uppercase tracking-widest text-white/40">ប្រវត្តិការដើរ</p>
              <div className="max-h-[min(280px,34dvh)] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02]">
                <table className="w-full table-fixed border-collapse text-[0.82rem]">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-[2] w-[2.2rem] border-b border-white/10 bg-[rgba(15,15,24,0.9)] px-2 py-[0.45rem] text-left text-white/75">#</th>
                      <th className="sticky top-0 z-[2] border-b border-white/10 bg-[rgba(15,15,24,0.9)] px-2 py-[0.45rem] text-left text-white/75">បង្កោល ស</th>
                      <th className="sticky top-0 z-[2] border-b border-white/10 bg-[rgba(15,15,24,0.9)] px-2 py-[0.45rem] text-left text-white/75">បង្កោល ខ្មៅ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row) => (
                      <tr key={row.no}>
                        <td className="border-b border-white/10 px-2 py-[0.38rem] text-white/45">{toKhNum(row.no)}</td>
                        <td className="truncate border-b border-white/10 px-2 py-[0.38rem] text-white/85">{row.white ? formatMove(row.white) : ''}</td>
                        <td className="truncate border-b border-white/10 px-2 py-[0.38rem] text-white/85">{row.black ? formatMove(row.black) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
