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
    // Ouk Chaktrang/Makruk-like opening arrangement.
    // Back rank: rook, knight, khon, met, king, khon, knight, rook.
    const back = ['r', 'n', 's', 'm', 'k', 's', 'n', 'r'];

    for (let col = 0; col < 8; col += 1) {
      this.board[0][col] = { type: back[col], color: 'b', hasMoved: false };
      this.board[7][col] = { type: back[col], color: 'w', hasMoved: false };
    }

    // Pawns start one rank ahead of the back pieces (not on the 2nd/7th ranks).
    for (let col = 0; col < 8; col += 1) {
      this.board[2][col] = { type: 'p', color: 'b', hasMoved: false };
      this.board[5][col] = { type: 'p', color: 'w', hasMoved: false };
    }
  }

  clone() {
    const copy = new ChessGame();
    copy.board = this.board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
    copy.turn = this.turn;
    copy.lastMove = this.lastMove ? { ...this.lastMove } : null;
    copy.history = this.history.map((entry) => ({ ...entry }));
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

  isEnemyPiece(row, col, color) {
    const piece = this.getPiece(row, col);
    return !!piece && piece.color !== color;
  }

  isEmpty(row, col) {
    return this.getPiece(row, col) === null;
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

  makeMove(move) {
    if (this.gameOver) return false;

    const legalMoves = this.getLegalMovesForSquare(move.from.row, move.from.col, true);
    const selected = legalMoves.find((m) => this.sameMove(m, move));
    if (!selected) return false;

    this.applyMove(selected, true);
    this.updateGameStateAfterMove();
    return selected;
  }

  applyMove(move, recordHistory = false) {
    const piece = this.getPiece(move.from.row, move.from.col);
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

    const capturedPiece = this.getPiece(move.to.row, move.to.col);
    const capture = !!capturedPiece;

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

    if (recordHistory) {
      this.history.push({ prevState, move: { ...this.lastMove } });
    }

    if (this.turn === 'b') this.fullmoveNumber += 1;
    this.turn = this.turn === 'w' ? 'b' : 'w';
  }

  undo() {
    const entry = this.history.pop();
    if (!entry) return false;

    this.board = entry.prevState.board;
    this.turn = entry.prevState.turn;
    this.lastMove = entry.prevState.lastMove;
    this.gameOver = entry.prevState.gameOver;
    this.winner = entry.prevState.winner;
    this.resultReason = entry.prevState.resultReason;
    this.fullmoveNumber = entry.prevState.fullmoveNumber;
    return true;
  }

  toNotation(move, piece, capture) {
    const pieceMap = { p: '', n: 'N', s: 'S', r: 'R', m: 'M', k: 'K' };
    const fromFile = String.fromCharCode(97 + move.from.col);
    const toFile = String.fromCharCode(97 + move.to.col);
    const toRank = 8 - move.to.row;

    let text = pieceMap[piece.type];
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
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const piece = this.board[r][c];
        if (piece && piece.color === color) moves.push(...this.getLegalMovesForSquare(r, c, false, color));
      }
    }
    return moves;
  }

  getLegalMovesForSquare(row, col, enforceTurn = false, forceColor = null) {
    const piece = this.getPiece(row, col);
    if (!piece) return [];
    if (enforceTurn && piece.color !== this.turn) return [];
    if (forceColor && piece.color !== forceColor) return [];

    const pseudo = this.getPseudoLegalMoves(row, col, piece);
    return pseudo.filter((move) => {
      const clone = this.clone();
      clone.applyMove(move, false);
      return !clone.isInCheck(piece.color);
    });
  }

  createMove(fromRow, fromCol, toRow, toCol, extras = {}) {
    return {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      ...extras,
    };
  }

  getPseudoLegalMoves(row, col, piece) {
    switch (piece.type) {
      case 'p':
        return this.getPawnMoves(row, col, piece);
      case 'n':
        return this.getKnightMoves(row, col, piece);
      case 's':
        return this.getSilverMoves(row, col, piece); // Khon
      case 'r':
        return this.getSlidingMoves(row, col, piece, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
      case 'm':
        return this.getMetMoves(row, col, piece); // Queen-equivalent in Ouk Chaktrang
      case 'k':
        return this.getKingMoves(row, col, piece);
      default:
        return [];
    }
  }

  getPawnMoves(row, col, piece) {
    const moves = [];
    const direction = piece.color === 'w' ? -1 : 1;

    const oneStep = row + direction;
    if (this.inBounds(oneStep, col) && this.isEmpty(oneStep, col)) {
      // Makruk/Ouk Chaktrang promotion: pawn promotes to Met when reaching 6th rank
      // from its own side: white promotes on row 2, black on row 5.
      const promotionRow = piece.color === 'w' ? 2 : 5;
      if (oneStep === promotionRow) {
        moves.push(this.createMove(row, col, oneStep, col, { promotion: 'm' }));
      } else {
        moves.push(this.createMove(row, col, oneStep, col));
      }
    }

    [-1, 1].forEach((dc) => {
      const nr = row + direction;
      const nc = col + dc;
      if (!this.inBounds(nr, nc)) return;
      if (this.isEnemyPiece(nr, nc, piece.color)) {
        const promotionRow = piece.color === 'w' ? 2 : 5;
        if (nr === promotionRow) moves.push(this.createMove(row, col, nr, nc, { promotion: 'm' }));
        else moves.push(this.createMove(row, col, nr, nc));
      }
    });

    return moves;
  }

  getKnightMoves(row, col, piece) {
    const moves = [];
    const jumps = [
      [-2, -1], [-2, 1], [2, -1], [2, 1],
      [-1, -2], [-1, 2], [1, -2], [1, 2],
    ];

    jumps.forEach(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      if (!this.inBounds(nr, nc)) return;
      const target = this.getPiece(nr, nc);
      if (!target || target.color !== piece.color) moves.push(this.createMove(row, col, nr, nc));
    });

    return moves;
  }

  // Khon: one-step diagonals + one-step straight forward.
  getSilverMoves(row, col, piece) {
    const moves = [];
    const forward = piece.color === 'w' ? -1 : 1;
    const offsets = [
      [forward, 0],
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    offsets.forEach(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      if (!this.inBounds(nr, nc)) return;
      const target = this.getPiece(nr, nc);
      if (!target || target.color !== piece.color) moves.push(this.createMove(row, col, nr, nc));
    });

    return moves;
  }

  getSlidingMoves(row, col, piece, directions) {
    const moves = [];
    for (const [dr, dc] of directions) {
      let nr = row + dr;
      let nc = col + dc;
      while (this.inBounds(nr, nc)) {
        const target = this.getPiece(nr, nc);
        if (!target) {
          moves.push(this.createMove(row, col, nr, nc));
        } else {
          if (target.color !== piece.color) moves.push(this.createMove(row, col, nr, nc));
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
    return moves;
  }

  // Met (queen-equivalent in this variant): one-step diagonally only.
  getMetMoves(row, col, piece) {
    const moves = [];
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      if (!this.inBounds(nr, nc)) return;
      const target = this.getPiece(nr, nc);
      if (!target || target.color !== piece.color) moves.push(this.createMove(row, col, nr, nc));
    });
    return moves;
  }

  getKingMoves(row, col, piece) {
    const moves = [];
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (!this.inBounds(nr, nc)) continue;
        const target = this.getPiece(nr, nc);
        if (!target || target.color !== piece.color) moves.push(this.createMove(row, col, nr, nc));
      }
    }
    return moves;
  }

  isInCheck(color) {
    let kingPos = null;
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const piece = this.board[r][c];
        if (piece && piece.color === color && piece.type === 'k') {
          kingPos = { row: r, col: c };
          break;
        }
      }
      if (kingPos) break;
    }

    if (!kingPos) return false;
    return this.isSquareAttacked(kingPos.row, kingPos.col, color === 'w' ? 'b' : 'w');
  }

  isSquareAttacked(row, col, byColor) {
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const piece = this.board[r][c];
        if (!piece || piece.color !== byColor) continue;

        if (piece.type === 'p') {
          const dir = byColor === 'w' ? -1 : 1;
          if (r + dir === row && Math.abs(c - col) === 1) return true;
          continue;
        }

        const attacks = piece.type === 'k' ? this.getKingMoves(r, c, piece) : this.getPseudoLegalMoves(r, c, piece);
        if (attacks.some((m) => m.to.row === row && m.to.col === col)) return true;
      }
    }
    return false;
  }
}
