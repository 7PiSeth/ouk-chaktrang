// ===== Cambodia Chess (Ouk Chaktrang / Makruk-style) engine =====

export class ChessGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    this.turn = 'w';
    this.lastMove = null;
    this.history = [];
    this.gameOver = false;
    this.winner = null;
    this.resultReason = null;
    this.fullmoveNumber = 1;
    this.setupInitialPosition();
  }

  setupInitialPosition() {
    const back = ['r', 'n', 's', 'k', 'm', 's', 'n', 'r'];
    for (let col = 0; col < 8; col++) {
      this.board[0][col] = { type: back[col], color: 'b', hasMoved: false };
      this.board[7][col] = { type: back[col], color: 'w', hasMoved: false };
      this.board[2][col] = { type: 'p', color: 'b', hasMoved: false };
      this.board[5][col] = { type: 'p', color: 'w', hasMoved: false };
    }
  }

  clone() {
    const copy = new ChessGame();
    copy.board = this.board.map((row) => row.map((p) => (p ? { ...p } : null)));
    copy.turn = this.turn;
    copy.lastMove = this.lastMove ? { ...this.lastMove } : null;
    copy.history = this.history.map((e) => ({ ...e }));
    copy.gameOver = this.gameOver;
    copy.winner = this.winner;
    copy.resultReason = this.resultReason;
    copy.fullmoveNumber = this.fullmoveNumber;
    return copy;
  }

  inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  getPiece(row, col) {
    if (!this.inBounds(row, col)) return null;
    return this.board[row][col];
  }

  isEmpty(row, col) {
    return this.board[row][col] === null;
  }

  isEnemyPiece(row, col, color) {
    const p = this.board[row][col];
    return !!p && p.color !== color;
  }

  sameMove(a, b) {
    return (
      a.from.row === b.from.row &&
      a.from.col === b.from.col &&
      a.to.row === b.to.row &&
      a.to.col === b.to.col &&
      (a.promotion || null) === (b.promotion || null)
    );
  }

  // ── Fast in-place make/unmake for legality checks (no allocation) ──

  _applyTemp(move) {
    const { from, to, promotion } = move;
    const piece = this.board[from.row][from.col];
    const captured = this.board[to.row][to.col];

    this.board[from.row][from.col] = null;
    const moved = promotion ? { ...piece, type: promotion, hasMoved: true } : { ...piece, hasMoved: true };
    this.board[to.row][to.col] = moved;

    return { piece, captured, moved };
  }

  _undoTemp(move, snapshot) {
    const { from, to } = move;
    this.board[from.row][from.col] = snapshot.piece;
    this.board[to.row][to.col] = snapshot.captured;
  }

  // ── Public move API ──

  makeMove(move) {
    if (this.gameOver) return false;

    const legalMoves = this.getLegalMovesForSquare(move.from.row, move.from.col, true);
    const selected = legalMoves.find((m) => this.sameMove(m, move));
    if (!selected) return false;

    this._commitMove(selected);
    this.updateGameStateAfterMove();
    return selected;
  }

  _commitMove(move) {
    const piece = this.board[move.from.row][move.from.col];
    if (!piece) return;

    const prevState = {
      board: this.board.map((row) => row.map((p) => (p ? { ...p } : null))),
      turn: this.turn,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      gameOver: this.gameOver,
      winner: this.winner,
      resultReason: this.resultReason,
      fullmoveNumber: this.fullmoveNumber,
    };

    const capture = !!this.board[move.to.row][move.to.col];
    this.board[move.from.row][move.from.col] = null;
    const movedPiece = { ...piece, hasMoved: true };
    if (move.promotion) movedPiece.type = move.promotion;
    this.board[move.to.row][move.to.col] = movedPiece;

    this.lastMove = {
      from: { ...move.from },
      to: { ...move.to },
      piece: movedPiece.type,
      color: movedPiece.color,
      capture,
      notation: this.toNotation(move, piece, capture),
    };

    this.history.push({ prevState, move: { ...this.lastMove } });

    if (this.turn === 'b') this.fullmoveNumber++;
    this.turn = this.turn === 'w' ? 'b' : 'w';
  }

  // Kept for AI use (clones game and uses _commitMove directly)
  applyMove(move, recordHistory = false) {
    const piece = this.board[move.from.row][move.from.col];
    if (!piece) return;

    const prevState = recordHistory
      ? { board: this.board.map((row) => row.map((p) => (p ? { ...p } : null))), turn: this.turn, lastMove: this.lastMove ? { ...this.lastMove } : null, gameOver: this.gameOver, winner: this.winner, resultReason: this.resultReason, fullmoveNumber: this.fullmoveNumber }
      : null;

    const capture = !!this.board[move.to.row][move.to.col];
    this.board[move.from.row][move.from.col] = null;
    const movedPiece = { ...piece, hasMoved: true };
    if (move.promotion) movedPiece.type = move.promotion;
    this.board[move.to.row][move.to.col] = movedPiece;

    this.lastMove = {
      from: { ...move.from },
      to: { ...move.to },
      piece: movedPiece.type,
      color: movedPiece.color,
      capture,
      notation: this.toNotation(move, piece, capture),
    };

    if (recordHistory) this.history.push({ prevState, move: { ...this.lastMove } });
    if (this.turn === 'b') this.fullmoveNumber++;
    this.turn = this.turn === 'w' ? 'b' : 'w';
  }

  undo() {
    const entry = this.history.pop();
    if (!entry) return false;
    const s = entry.prevState;
    this.board = s.board;
    this.turn = s.turn;
    this.lastMove = s.lastMove;
    this.gameOver = s.gameOver;
    this.winner = s.winner;
    this.resultReason = s.resultReason;
    this.fullmoveNumber = s.fullmoveNumber;
    return true;
  }

  toNotation(move, piece, capture) {
    const map = { p: '', n: 'N', s: 'S', r: 'R', m: 'M', k: 'K' };
    const fromFile = String.fromCharCode(97 + move.from.col);
    const toFile = String.fromCharCode(97 + move.to.col);
    const toRank = 8 - move.to.row;
    let text = map[piece.type];
    if (piece.type === 'p' && capture) text += fromFile;
    if (capture) text += 'x';
    text += `${toFile}${toRank}`;
    if (move.promotion) text += '=M';
    return text;
  }

  updateGameStateAfterMove() {
    const inCheck = this.isInCheck(this.turn);
    const legal = this.getAllLegalMoves(this.turn);

    if (legal.length === 0) {
      this.gameOver = true;
      if (inCheck) {
        this.winner = this.turn === 'w' ? 'b' : 'w';
        this.resultReason = 'checkmate';
      } else {
        this.winner = null;
        this.resultReason = 'stalemate';
      }
      return;
    }

    this.gameOver = false;
    this.winner = null;
    this.resultReason = null;
  }

  getAllLegalMoves(color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.color === color) {
          this._appendLegalMoves(r, c, piece, moves);
        }
      }
    }
    return moves;
  }

  getLegalMovesForSquare(row, col, enforceTurn = false, forceColor = null) {
    const piece = this.getPiece(row, col);
    if (!piece) return [];
    if (enforceTurn && piece.color !== this.turn) return [];
    if (forceColor && piece.color !== forceColor) return [];

    const result = [];
    this._appendLegalMoves(row, col, piece, result);
    return result;
  }

  // Core: generate legal moves using in-place make/unmake — no clone allocation
  _appendLegalMoves(row, col, piece, out) {
    const pseudo = this.getPseudoLegalMoves(row, col, piece);
    for (const move of pseudo) {
      const snap = this._applyTemp(move);
      const safe = !this.isInCheck(piece.color);
      this._undoTemp(move, snap);
      if (safe) out.push(move);
    }
  }

  _mv(fr, fc, tr, tc, extras) {
    return extras
      ? { from: { row: fr, col: fc }, to: { row: tr, col: tc }, ...extras }
      : { from: { row: fr, col: fc }, to: { row: tr, col: tc } };
  }

  getPseudoLegalMoves(row, col, piece) {
    switch (piece.type) {
      case 'p': return this._pawnMoves(row, col, piece);
      case 'n': return this._knightMoves(row, col, piece);
      case 's': return this._silverMoves(row, col, piece);
      case 'r': return this._slidingMoves(row, col, piece, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
      case 'm': return this._metMoves(row, col, piece);
      case 'k': return this._kingMoves(row, col, piece);
      default: return [];
    }
  }

  _pawnMoves(row, col, piece) {
    const moves = [];
    const dir = piece.color === 'w' ? -1 : 1;
    const promoRow = piece.color === 'w' ? 2 : 5;
    const oneStep = row + dir;

    if (this.inBounds(oneStep, col) && this.isEmpty(oneStep, col)) {
      moves.push(this._mv(row, col, oneStep, col, oneStep === promoRow ? { promotion: 'm' } : null));
    }

    for (const dc of [-1, 1]) {
      const nc = col + dc;
      if (!this.inBounds(oneStep, nc)) continue;
      if (this.isEnemyPiece(oneStep, nc, piece.color)) {
        moves.push(this._mv(row, col, oneStep, nc, oneStep === promoRow ? { promotion: 'm' } : null));
      }
    }
    return moves;
  }

  _knightMoves(row, col, piece) {
    const moves = [];
    for (const [dr, dc] of [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]]) {
      const nr = row + dr, nc = col + dc;
      if (!this.inBounds(nr, nc)) continue;
      const t = this.board[nr][nc];
      if (!t || t.color !== piece.color) moves.push(this._mv(row, col, nr, nc));
    }
    return moves;
  }

  _silverMoves(row, col, piece) {
    const moves = [];
    const fwd = piece.color === 'w' ? -1 : 1;
    for (const [dr, dc] of [[fwd, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const nr = row + dr, nc = col + dc;
      if (!this.inBounds(nr, nc)) continue;
      const t = this.board[nr][nc];
      if (!t || t.color !== piece.color) moves.push(this._mv(row, col, nr, nc));
    }
    return moves;
  }

  _slidingMoves(row, col, piece, directions) {
    const moves = [];
    for (const [dr, dc] of directions) {
      let nr = row + dr, nc = col + dc;
      while (this.inBounds(nr, nc)) {
        const t = this.board[nr][nc];
        if (!t) {
          moves.push(this._mv(row, col, nr, nc));
        } else {
          if (t.color !== piece.color) moves.push(this._mv(row, col, nr, nc));
          break;
        }
        nr += dr; nc += dc;
      }
    }
    return moves;
  }

  _metMoves(row, col, piece) {
    const moves = [];
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const nr = row + dr, nc = col + dc;
      if (!this.inBounds(nr, nc)) continue;
      const t = this.board[nr][nc];
      if (!t || t.color !== piece.color) moves.push(this._mv(row, col, nr, nc));
    }
    return moves;
  }

  _kingMoves(row, col, piece) {
    const moves = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr, nc = col + dc;
        if (!this.inBounds(nr, nc)) continue;
        const t = this.board[nr][nc];
        if (!t || t.color !== piece.color) moves.push(this._mv(row, col, nr, nc));
      }
    }
    return moves;
  }

  isInCheck(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === color && p.type === 'k') {
          return this.isSquareAttacked(r, c, color === 'w' ? 'b' : 'w');
        }
      }
    }
    return false;
  }

  isSquareAttacked(row, col, byColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (!piece || piece.color !== byColor) continue;

        // Fast direct attack checks — avoid generating full move lists
        if (piece.type === 'p') {
          const dir = byColor === 'w' ? -1 : 1;
          if (r + dir === row && Math.abs(c - col) === 1) return true;
          continue;
        }

        if (piece.type === 'n') {
          const dr = Math.abs(r - row), dc = Math.abs(c - col);
          if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) return true;
          continue;
        }

        if (piece.type === 'k' || piece.type === 'm') {
          // King: 1-step any; Met: 1-step diagonal
          const dr = Math.abs(r - row), dc = Math.abs(c - col);
          if (piece.type === 'k' && dr <= 1 && dc <= 1 && (dr + dc > 0)) return true;
          if (piece.type === 'm' && dr === 1 && dc === 1) return true;
          continue;
        }

        if (piece.type === 's') {
          const fwd = byColor === 'w' ? -1 : 1;
          const dr = row - r, dc = col - c;
          if ((dr === fwd && dc === 0) || (Math.abs(dr) === 1 && Math.abs(dc) === 1)) return true;
          continue;
        }

        if (piece.type === 'r') {
          if (r === row || c === col) {
            // Check no pieces blocking the ray
            if (r === row) {
              const step = col > c ? 1 : -1;
              let blocked = false;
              for (let nc = c + step; nc !== col; nc += step) {
                if (this.board[r][nc]) { blocked = true; break; }
              }
              if (!blocked) return true;
            } else {
              const step = row > r ? 1 : -1;
              let blocked = false;
              for (let nr = r + step; nr !== row; nr += step) {
                if (this.board[nr][c]) { blocked = true; break; }
              }
              if (!blocked) return true;
            }
          }
          continue;
        }
      }
    }
    return false;
  }
}
