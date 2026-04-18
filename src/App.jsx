import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ChessGame } from './lib/game';
import { ChessAI } from './lib/ai';

/* ===================== CONSTANTS ===================== */

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
  { label: 'មនុស្សពេញវ័យ 👨', value: 'meduim', depth: 2 },
  { label: 'ស្តេចទាមកាហ្វេ 🧔', value: 'hard', depth: 3 },
  { label: 'គ្រូតា 👴', value: 'very_hard', depth: 4 },
];

const CELL_SIZE = 'clamp(36px, calc((100vw - 2rem - 4px) / 8), 80px)';
const COORD_FONT_SIZE = 'clamp(0.6rem, calc(0.22 * clamp(36px, calc((100vw - 2rem - 4px) / 8), 80px)), 0.85rem)';

const BOARD_SQUARE_BASE =
  'relative flex cursor-pointer appearance-none items-center justify-center border-none p-0 transition-[filter] duration-100 hover:brightness-110';

/* ===================== SVG PIECES ===================== */

const PawnSVG = memo(({ tone, stroke }) => (
  <>
    <circle cx="50" cy="50" r="40" fill={tone} stroke={stroke} strokeWidth="2" />
    <circle cx="50" cy="50" r="30" fill="none" stroke={stroke} strokeWidth="2" />
    <circle cx="50" cy="50" r="20" fill="none" stroke={stroke} strokeWidth="2" />
    <circle cx="50" cy="50" r="12" fill="none" stroke={stroke} strokeWidth="2" />
  </>
));

/* 🔥 YOUR SVG ROOK (READY) */
const RookSVG = memo(function RookSVG({ tone }) {
  return (
    <g
      transform="translate(0,100) scale(0.0208,-0.0208)"
      fill={tone}
    >
      <path d="M2219 2608 c-213 -174 -479 -399 -497 -420 -10 -13 -7 -16 25 -22 21
      -3 315 -6 653 -6 338 0 632 3 653 6 32 6 35 9 25 22 -37 44 -660 562 -677 562
      -4 0 -86 -64 -182 -142z"/>

      <path d="M1658 2093 c-104 -3 -139 -7 -148 -18 -10 -12 -9 -16 6 -22 31 -13
      1761 -10 1774 3 8 8 6 15 -5 24 -14 11 -151 14 -753 15 -406 1 -798 0 -874 -2z"/>

      <path d="M1398 1953 c-16 -2 -28 -11 -28 -18 0 -8 12 -18 28 -22 35 -10 1969
      -10 2005 0 39 11 34 33 -10 41 -41 6 -1951 6 -1995 -1z"/>

      <path d="M1079 1713 c-129 -132 -169 -186 -207 -276 -22 -54 -25 -77 -26 -182
      0 -110 2 -125 27 -179 51 -111 178 -259 298 -349 l36 -27 1193 0 1193 0 36 27
      c120 90 247 238 298 349 25 54 27 68 27 179 -1 98 -5 130 -23 173 -36 90 -88
      161 -209 284 l-115 118 -1207 0 -1207 0 -114 -117z"/>

      <path d="M1240 465 l0 -165 1160 0 1160 0 0 165 0 165 -1160 0 -1160 0 0 -165z" />
    </g>
  );
});

const KnightSVG = memo(({ tone, stroke }) => (
  <g
    transform="translate(0,100) scale(0.0208,-0.0208)"
    fill={tone}
  >
    <path d="M1269 4453 c-6 -16 -18 -66 -27 -113 -13 -71 -14 -101 -4 -185 13
-116 36 -191 63 -206 29 -15 33 9 14 77 -22 82 -30 245 -16 317 7 31 16 57 21
57 4 0 44 -26 87 -59 80 -60 187 -166 238 -236 47 -65 88 -105 107 -105 10 0
18 6 18 13 0 28 -106 166 -199 257 -91 89 -251 210 -279 210 -7 0 -17 -12 -23
-27z"/>
    <path d="M1363 4183 c6 -91 27 -196 42 -212 9 -8 116 -6 178 3 60 9 61 25 4
102 -52 70 -193 204 -214 204 -14 0 -15 -14 -10 -97z"/>
    <path d="M1613 3911 c-72 -9 -135 -19 -139 -24 -12 -12 161 -172 251 -232 96
-64 180 -104 285 -135 43 -13 99 -39 130 -61 61 -42 84 -49 76 -21 -3 9 -10
37 -16 62 -6 25 -13 53 -16 62 -6 19 27 41 49 32 8 -3 18 -23 21 -45 11 -69
52 -133 149 -238 90 -95 131 -161 190 -300 9 -23 11 -18 18 47 8 86 14 102 33
102 24 0 28 -16 37 -149 14 -204 51 -354 133 -541 50 -113 124 -242 135 -236
4 3 2 42 -6 88 -7 46 -14 131 -15 190 -1 116 8 141 46 136 20 -3 21 -11 27
-158 7 -163 28 -298 58 -365 10 -22 52 -72 96 -113 84 -80 386 -324 393 -317
7 7 -29 296 -54 435 -77 421 -224 784 -435 1070 -84 115 -283 310 -399 392
-181 128 -413 234 -668 304 -142 39 -178 40 -379 15z"/>
    <path d="M1299 3853 c-15 -39 -23 -221 -12 -263 6 -19 15 -34 22 -32 32 7 445
-65 644 -112 75 -18 82 -4 9 18 -145 45 -279 130 -457 291 -142 129 -186 149
-206 98z"/>
    <path d="M1334 3476 c-31 -22 -82 -105 -104 -169 -14 -38 -24 -117 -35 -254
-9 -109 -27 -317 -41 -463 -22 -221 -25 -299 -21 -470 4 -171 8 -217 26 -278
24 -81 61 -160 87 -187 16 -15 20 -14 60 26 24 24 44 47 44 53 0 5 -27 34 -60
64 -81 73 -102 116 -108 220 -2 45 -1 82 3 82 4 0 27 -16 50 -35 62 -50 102
-119 121 -206 8 -41 18 -80 20 -87 3 -9 21 0 57 28 28 23 124 97 212 164 195
147 328 273 378 358 20 35 49 101 64 148 40 131 43 138 107 235 90 136 138
246 144 326 3 39 -1 82 -8 104 -16 47 -78 116 -135 150 -78 45 -248 94 -502
144 -322 64 -333 66 -359 47z m404 -95 c2 -13 0 -27 -5 -31 -4 -5 -44 -13 -87
-19 -188 -26 -284 -114 -346 -319 -24 -78 -30 -86 -60 -77 -26 8 -26 37 4 124
65 191 181 299 361 335 98 20 129 17 133 -13z m46 -83 c21 -30 20 -59 -4 -143
-61 -213 -148 -280 -362 -279 -54 0 -100 3 -103 6 -10 10 36 162 65 213 58
102 167 181 280 204 66 13 93 18 102 20 4 0 14 -9 22 -21z"/>
    <path d="M1640 3233 c-8 -2 -21 -6 -28 -8 -7 -3 6 -22 33 -49 25 -25 45 -50
45 -56 0 -27 19 -5 29 34 19 77 16 86 -26 85 -21 0 -45 -3 -53 -6z"/>
    <path d="M1495 3125 c-55 -54 -13 -145 65 -145 27 0 80 52 80 79 0 78 -92 120
-145 66z"/>
    <path d="M1396 2984 c-13 -34 -7 -54 18 -54 13 0 32 3 41 6 14 6 12 11 -11 35
-32 33 -39 35 -48 13z"/>
    <path d="M2350 3250 c0 -6 12 -31 26 -56 69 -117 34 -266 -119 -511 -35 -55
-72 -127 -81 -160 -54 -181 -98 -256 -226 -383 -47 -47 -146 -133 -220 -190
-272 -209 -399 -330 -456 -432 -29 -52 -29 -55 -28 -208 0 -120 6 -179 23
-260 29 -138 67 -248 105 -313 l31 -52 992 -3 992 -2 21 30 c79 111 132 367
145 695 5 139 4 163 -11 183 -9 13 -96 90 -193 170 -206 171 -405 362 -466
447 -63 88 -122 213 -256 538 -153 370 -203 473 -246 499 -21 12 -33 16 -33 8z"/>
    <path d="M1533 593 c-42 -8 -23 -21 40 -28 86 -9 1704 -2 1713 8 4 4 4 10 0
15 -8 7 -1714 13 -1753 5z"/>
    <path d="M1560 390 l0 -90 840 0 840 0 0 90 0 90 -840 0 -840 0 0 -90z" />
  </g>));

const BishopSVG = memo(({ tone, stroke }) => (
  <g
    transform="translate(0,100) scale(0.0208,-0.0208)"
    fill={tone}
  >
        <path d="M2372 3733 c-36 -99 -50 -162 -77 -343 -15 -96 -33 -211 -40 -255 -7
-44 -10 -83 -6 -88 4 -4 75 -6 157 -5 142 3 149 4 147 23 -6 64 -67 453 -83
525 -20 94 -57 200 -69 200 -5 0 -18 -26 -29 -57z"/>
    <path d="M2023 2950 c-13 -5 -23 -18 -23 -28 0 -16 11 -20 77 -26 42 -3 187
-6 323 -6 136 0 281 3 323 6 66 6 77 10 77 26 0 11 -11 23 -26 28 -32 13 -721
12 -751 0z"/>
    <path d="M1880 2824 c-65 -8 -80 -14 -80 -33 0 -13 10 -20 31 -25 17 -3 273
-6 569 -6 296 0 552 3 569 6 34 7 40 24 14 45 -13 11 -112 14 -542 15 -289 1
-542 0 -561 -2z"/>
    <path d="M1601 2678 c-28 -30 -94 -159 -125 -246 -14 -39 -30 -112 -36 -161
-38 -306 99 -595 477 -1008 l85 -93 398 0 398 0 91 98 c294 318 438 568 471
822 14 108 1 218 -40 342 -33 99 -89 212 -121 247 l-20 21 -779 0 -779 0 -20
-22z"/>
    <path d="M1995 1076 l-20 -15 20 -8 c25 -10 773 -10 799 0 15 6 17 10 7 20 -9
9 -112 13 -399 15 -329 3 -390 1 -407 -12z"/>
    <path d="M1843 741 c-90 -120 -163 -221 -163 -224 0 -4 324 -7 720 -7 396 0
720 3 720 7 0 3 -73 104 -162 224 l-163 218 -395 0 -395 0 -162 -218z"/>
    <path d="M1640 365 l0 -65 760 0 760 0 0 65 0 65 -760 0 -760 0 0 -65z" />

  </g>
));

const QueenSVG = memo(({ tone, stroke }) => (
  <g
    transform="translate(0,100) scale(0.0208,-0.0208)"
    fill={tone}
  >


    <path d="M2386 3308 c-14 -42 -43 -296 -66 -578 -6 -74 -12 -154 -14 -176 l-3
-42 45 -6 c62 -8 140 -8 145 2 8 13 -47 626 -66 736 -11 64 -31 95 -41 64z"/>
    <path d="M2171 2421 c-33 -9 -51 -38 -31 -51 18 -12 499 -13 517 -2 25 16 3
49 -35 56 -49 8 -421 6 -451 -3z"/>
    <path d="M1952 2279 c-15 -5 -22 -16 -20 -26 3 -16 26 -19 236 -26 271 -10
693 2 699 19 2 7 -3 19 -12 28 -15 14 -63 16 -448 15 -242 0 -442 -4 -455 -10z"/>
    <path d="M1750 2140 c-38 -70 -52 -311 -25 -415 40 -152 103 -244 314 -457
l165 -168 196 0 196 0 165 168 c230 232 299 342 321 507 13 97 -1 289 -25 348
l-16 37 -640 0 c-634 0 -640 0 -651 -20z"/>
    <path d="M2217 1023 c-20 -3 -27 -9 -25 -21 5 -26 103 -36 260 -27 130 7 171
15 154 32 -16 16 -307 28 -389 16z"/>
    <path d="M2272 893 c-27 -4 -33 -8 -30 -26 3 -22 6 -22 158 -22 150 0 155 1
158 21 3 18 -4 22 -44 28 -49 6 -185 6 -242 -1z"/>
    <path d="M2106 664 l-88 -94 382 0 382 0 -89 95 -88 95 -205 -1 -205 0 -89
-95z"/>
    <path d="M2047 493 c-50 -3 -70 -8 -74 -19 -3 -9 0 -20 8 -25 18 -11 820 -11
838 0 8 5 11 15 8 23 -4 11 -32 17 -104 21 -97 7 -545 6 -676 0z"/>
    <path d="M1916 347 c-17 -12 -17 -14 0 -28 26 -21 942 -21 968 0 17 14 17 16
0 28 -26 19 -942 19 -968 0z"/>
  </g>
));

const KingSVG = memo(({ tone, stroke }) => (
  <g
    transform="translate(0,100) scale(0.0208,-0.0208)"
    fill={tone}
  >
    <path d="M2355 4397 c-52 -112 -105 -351 -105 -474 l0 -43 150 0 150 0 0 49
c0 160 -106 541 -151 541 -6 0 -25 -33 -44 -73z"/>
    <path d="M2112 3812 c-70 -7 -97 -21 -89 -47 5 -16 281 -26 525 -19 l222 6 0
23 c0 13 -8 26 -17 30 -24 9 -550 15 -641 7z"/>
    <path d="M1863 3673 c-28 -5 -38 -32 -15 -41 28 -11 1099 -9 1111 3 6 6 7 16
1 25 -8 13 -82 15 -542 16 -293 1 -543 0 -555 -3z"/>
    <path d="M1682 3553 c-23 -5 -49 -40 -37 -51 9 -9 1318 -15 1423 -7 77 6 83 8
80 28 -2 13 -13 24 -28 28 -27 7 -1400 9 -1438 2z"/>
    <path d="M1408 3376 c-258 -298 -320 -594 -196 -944 97 -276 282 -538 608
-859 l154 -153 429 0 429 0 159 164 c290 299 430 482 535 701 98 204 130 342
122 523 -9 188 -73 341 -220 523 l-79 99 -948 0 -947 0 -46 -54z"/>
    <path d="M1985 1354 c-46 -12 -48 -13 -34 -30 11 -13 66 -15 445 -12 307 2
436 6 444 14 9 9 8 14 -2 20 -14 9 -819 16 -853 8z"/>
    <path d="M2000 1205 l0 -35 400 0 400 0 0 35 0 35 -400 0 -400 0 0 -35z" />
    <path d="M1750 895 l-215 -215 865 0 865 0 -215 215 -215 215 -435 0 -435 0
-215 -215z"/>
    <path d="M1494 607 c-3 -8 -4 -52 -2 -98 l3 -84 905 0 905 0 0 95 0 95 -903 3
c-747 2 -903 0 -908 -11z"/>
    <path d="M1455 353 c-34 -8 -38 -20 -14 -35 35 -19 1883 -19 1918 0 61 35 23
37 -942 38 -518 1 -951 0 -962 -3z"/>
  </g>
));

/* 🔥 MAP */
const PIECE_SVGS = {
  p: PawnSVG,
  r: RookSVG,
  n: KnightSVG,
  s: BishopSVG,
  m: QueenSVG,
  k: KingSVG,
};

/* ===================== PIECE ICON ===================== */

const PieceIcon = memo(function PieceIcon({ piece, selected, label, animate }) {
  const fill = piece.color === 'w' ? '#EDE0B0' : '#2a2c33';
  const stroke = piece.color === 'w' ? '#7a5c1a' : '#111';

  const Shape = PIECE_SVGS[piece.type];

  return (
    <svg
      className={`pointer-events-none block h-[82%] w-[82%] ${selected ? 'scale-[1.12] -translate-y-[4%]' : ''
        }`}
      style={animate ? { animation: 'piece-drop 320ms cubic-bezier(0.22, 1, 0.36, 1)' } : undefined}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
    >
      {Shape && <Shape tone={fill} stroke={stroke} />}
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
  const [aiLevel, setAiLevel] = useState('meduim');
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
      <h1 className="mb-5 h-[52px] bg-gradient-to-br from-[#f5c842] via-[#ff9f0a] to-[#ff6b35] bg-clip-text text-center font-['Moul',sans-serif] text-4xl font-bold tracking-[0.02em] text-transparent md:text-4xl">
        អុក ចត្រង្គ
      </h1>

      <section className="grid w-full max-w-[1200px] grid-cols-1 gap-5 min-[900px]:grid-cols-[max-content_1fr]">
        <div className="mx-auto inline-flex flex-col items-center">
          <div className="flex items-stretch">
            {/* <div className="mr-[2px] flex flex-col">
              {Array.from({ length: 8 }, (_, r) => (
                <div
                  key={r}
                  className="pointer-events-none flex select-none items-center justify-center font-bold leading-none text-[rgba(255,214,10,0.85)] [text-shadow:0_1px_6px_rgba(0,0,0,0.7)]"
                  style={{ width: CELL_SIZE, height: CELL_SIZE, fontSize: COORD_FONT_SIZE }}
                >
                  {toKhNum(8 - r)}
                </div>
              ))}
            </div> */}

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

          {/* <div className="mt-[2px] flex items-center">
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
          </div> */}
        </div>

        <aside className="w-full h-fit rounded-[18px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-[20px] min-[900px]:flex min-[900px]:max-h-[calc(100dvh-5.6rem)] min-[900px]:min-w-[380px] min-[900px]:max-w-[460px] min-[900px]:flex-col min-[900px]:overflow-hidden md:p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-md uppercase tracking-widest text-white/40">លេងជាមួយ</p>
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
              <p className="text-md uppercase tracking-widest text-white/40">កម្រិត AI</p>
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
              <p className="mb-1 text-md uppercase tracking-widest text-white/40">ស្ថានភាព</p>
              <p className="flex items-center gap-1 font-semibold">
                <span className={`mr-1 inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
                {statusText}
              </p>
              <p className="mt-1 text-sm text-white/55">{detailText}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-md uppercase tracking-widest text-white/40">ប្រវត្តិការដើរ</p>
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
