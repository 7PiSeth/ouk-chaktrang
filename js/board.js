// ===== board.js =====

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

export class BoardRenderer {
  constructor(boardElement) {
    this.boardElement = boardElement;
    this.onSquareClick = null;
    this.squareEls = [];
    this.createBoardSkeleton();
  }

  createBoardSkeleton() {
    this.boardElement.innerHTML = '';
    this.squareEls = Array.from({ length: 8 }, () => Array(8).fill(null));

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('button');
        square.type = 'button';
        square.className = `board-square relative w-full h-full flex items-center justify-center ${
          (row + col) % 2 === 0 ? 'bg-amber-100/95' : 'bg-slate-700/95'
        }`;
        square.dataset.row = String(row);
        square.dataset.col = String(col);
        square.addEventListener('click', () => {
          if (this.onSquareClick) this.onSquareClick(row, col);
        });

        this.squareEls[row][col] = square;
        this.boardElement.appendChild(square);
      }
    }
  }

  setSquareClickHandler(handler) {
    this.onSquareClick = handler;
  }

  render(game, uiState) {
    const legalTargets = new Set((uiState.legalMoves || []).map((m) => `${m.to.row}-${m.to.col}`));
    const selected = uiState.selected;
    const checkSquares = uiState.checkSquares || [];
    const lastMove = game.lastMove;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = this.squareEls[row][col];
        square.innerHTML = '';

        const baseDark = (row + col) % 2 !== 0;
        square.className = `board-square relative w-full h-full flex items-center justify-center ${
          baseDark ? 'bg-slate-700/95 hover:bg-slate-600' : 'bg-amber-100/95 hover:bg-amber-200'
        }`;

        if (selected && selected.row === row && selected.col === col) {
          square.classList.add('selected-square');
        }

        if (lastMove && (
          (lastMove.from.row === row && lastMove.from.col === col) ||
          (lastMove.to.row === row && lastMove.to.col === col)
        )) {
          square.classList.add('last-move');
        }

        if (legalTargets.has(`${row}-${col}`)) {
          const move = uiState.legalMoves.find((m) => m.to.row === row && m.to.col === col);
          if (move && game.getPiece(row, col)) square.classList.add('capture-hint');
          else square.classList.add('move-hint');
        }

        if (checkSquares.some((sq) => sq.row === row && sq.col === col)) {
          square.classList.add('check-king');
        }

        const piece = game.getPiece(row, col);
        if (piece) {
          const img = document.createElement('img');
          img.className = `piece ${selected && selected.row === row && selected.col === col ? 'selected' : ''}`;
          img.src = PIECE_SVG[`${piece.color}${piece.type}`];
          img.alt = `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`;
          square.appendChild(img);
        }
      }
    }

    if (lastMove) {
      const destination = this.squareEls[lastMove.to.row][lastMove.to.col];
      const trail = document.createElement('span');
      trail.className = 'trail';
      destination.appendChild(trail);
    }
  }
}
