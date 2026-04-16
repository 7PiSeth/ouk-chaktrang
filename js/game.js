// ===== game.js =====

export class ChessGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    this.turn = 'w';
    this.castlingRights = {
      w: { kingSide: true, queenSide: true },
      b: { kingSide: true, queenSide: true },
    };
    this.enPassantTarget = null;
    this.lastMove = null;
    this.history = [];
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.gameOver = false;
    this.winner = null;
    this.resultReason = null;

    this.setupInitialPosition();
  }

  setupInitialPosition() {
    const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let col = 0; col < 8; col++) {
      this.board[0][col] = { type: back[col], color: 'b', hasMoved: false };
      this.board[1][col] = { type: 'p', color: 'b', hasMoved: false };
      this.board[6][col] = { type: 'p', color: 'w', hasMoved: false };
      this.board[7][col] = { type: back[col], color: 'w', hasMoved: false };
    }
  }

  clone() {
    const copy = new ChessGame();
    copy.board = this.board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
    copy.turn = this.turn;
    copy.castlingRights = JSON.parse(JSON.stringify(this.castlingRights));
    copy.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
    copy.lastMove = this.lastMove ? { ...this.lastMove } : null;
    copy.history = this.history.map((entry) => ({ ...entry }));
    copy.halfmoveClock = this.halfmoveClock;
    copy.fullmoveNumber = this.fullmoveNumber;
    copy.gameOver = this.gameOver;
    copy.winner = this.winner;
    copy.resultReason = this.resultReason;
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

  makeMove(move) {
    const legalMoves = this.getLegalMovesForSquare(move.from.row, move.from.col);
    const selected = legalMoves.find((m) => this.sameMove(m, move));
    if (!selected || this.gameOver) return false;

    this.applyMove(selected, true);
    this.updateGameStateAfterMove();
    return selected;
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

  applyMove(move, recordHistory = false) {
    const piece = this.getPiece(move.from.row, move.from.col);
    if (!piece) return;

    const prevState = {
      board: this.board.map((row) => row.map((p) => (p ? { ...p } : null))),
      castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
      enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
      turn: this.turn,
      halfmoveClock: this.halfmoveClock,
      fullmoveNumber: this.fullmoveNumber,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      gameOver: this.gameOver,
      winner: this.winner,
      resultReason: this.resultReason,
    };

    const targetPiece = this.getPiece(move.to.row, move.to.col);
    let capture = !!targetPiece;

    this.board[move.from.row][move.from.col] = null;

    if (move.isEnPassant) {
      const direction = piece.color === 'w' ? 1 : -1;
      this.board[move.to.row + direction][move.to.col] = null;
      capture = true;
    }

    if (move.isCastleKingSide) {
      const rook = this.board[move.from.row][7];
      this.board[move.from.row][7] = null;
      this.board[move.from.row][5] = { ...rook, hasMoved: true };
    }

    if (move.isCastleQueenSide) {
      const rook = this.board[move.from.row][0];
      this.board[move.from.row][0] = null;
      this.board[move.from.row][3] = { ...rook, hasMoved: true };
    }

    const movedPiece = { ...piece, hasMoved: true };
    if (move.promotion) movedPiece.type = move.promotion;

    this.board[move.to.row][move.to.col] = movedPiece;

    this.updateCastlingRights(move, piece, targetPiece);

    if (piece.type === 'p' && Math.abs(move.to.row - move.from.row) === 2) {
      this.enPassantTarget = {
        row: (move.from.row + move.to.row) / 2,
        col: move.from.col,
        color: piece.color,
      };
    } else {
      this.enPassantTarget = null;
    }

    if (piece.type === 'p' || capture) this.halfmoveClock = 0;
    else this.halfmoveClock += 1;

    const notation = this.toAlgebraic(move, piece, capture);

    this.lastMove = {
      from: { ...move.from },
      to: { ...move.to },
      piece: piece.type,
      color: piece.color,
      capture,
      notation,
    };

    if (recordHistory) {
      this.history.push({
        prevState,
        move: { ...this.lastMove },
      });
    }

    if (this.turn === 'b') this.fullmoveNumber += 1;
    this.turn = this.turn === 'w' ? 'b' : 'w';
  }

  updateCastlingRights(move, piece, capturedPiece) {
    const { color } = piece;

    if (piece.type === 'k') {
      this.castlingRights[color].kingSide = false;
      this.castlingRights[color].queenSide = false;
    }

    if (piece.type === 'r') {
      if (move.from.col === 0) this.castlingRights[color].queenSide = false;
      if (move.from.col === 7) this.castlingRights[color].kingSide = false;
    }

    if (capturedPiece && capturedPiece.type === 'r') {
      if (move.to.col === 0) this.castlingRights[capturedPiece.color].queenSide = false;
      if (move.to.col === 7) this.castlingRights[capturedPiece.color].kingSide = false;
    }
  }

  undo() {
    const entry = this.history.pop();
    if (!entry) return false;

    this.board = entry.prevState.board;
    this.castlingRights = entry.prevState.castlingRights;
    this.enPassantTarget = entry.prevState.enPassantTarget;
    this.turn = entry.prevState.turn;
    this.halfmoveClock = entry.prevState.halfmoveClock;
    this.fullmoveNumber = entry.prevState.fullmoveNumber;
    this.lastMove = entry.prevState.lastMove;
    this.gameOver = entry.prevState.gameOver;
    this.winner = entry.prevState.winner;
    this.resultReason = entry.prevState.resultReason;

    return true;
  }

  toAlgebraic(move, piece, capture) {
    if (move.isCastleKingSide) return 'O-O';
    if (move.isCastleQueenSide) return 'O-O-O';

    const pieceMap = { p: '', n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' };
    const fromFile = String.fromCharCode(97 + move.from.col);
    const toFile = String.fromCharCode(97 + move.to.col);
    const toRank = 8 - move.to.row;

    let text = pieceMap[piece.type];
    if (piece.type === 'p' && capture) text += fromFile;
    if (capture) text += 'x';
    text += `${toFile}${toRank}`;
    if (move.promotion) text += `=${pieceMap[move.promotion]}`;
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
          moves.push(...this.getLegalMovesForSquare(r, c));
        }
      }
    }
    return moves;
  }

  getLegalMovesForSquare(row, col) {
    const piece = this.getPiece(row, col);
    if (!piece || piece.color !== this.turn) return [];

    const pseudoMoves = this.getPseudoLegalMoves(row, col, piece);

    return pseudoMoves.filter((move) => {
      const clone = this.clone();
      clone.applyMove(move, false);
      return !clone.isInCheck(piece.color);
    });
  }

  getPseudoLegalMoves(row, col, piece) {
    switch (piece.type) {
      case 'p':
        return this.getPawnMoves(row, col, piece);
      case 'n':
        return this.getKnightMoves(row, col, piece);
      case 'b':
        return this.getSlidingMoves(row, col, piece, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
      case 'r':
        return this.getSlidingMoves(row, col, piece, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
      case 'q':
        return this.getSlidingMoves(row, col, piece, [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
      case 'k':
        return this.getKingMoves(row, col, piece);
      default:
        return [];
    }
  }

  createMove(fromRow, fromCol, toRow, toCol, extras = {}) {
    return {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      ...extras,
    };
  }

  getPawnMoves(row, col, piece) {
    const moves = [];
    const direction = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    const promotionRow = piece.color === 'w' ? 0 : 7;

    const oneStep = row + direction;
    if (this.inBounds(oneStep, col) && this.isEmpty(oneStep, col)) {
      if (oneStep === promotionRow) {
        ['q', 'r', 'b', 'n'].forEach((promo) =>
          moves.push(this.createMove(row, col, oneStep, col, { promotion: promo }))
        );
      } else {
        moves.push(this.createMove(row, col, oneStep, col));
      }

      const twoStep = row + direction * 2;
      if (row === startRow && this.isEmpty(twoStep, col)) {
        moves.push(this.createMove(row, col, twoStep, col));
      }
    }

    [-1, 1].forEach((dc) => {
      const nr = row + direction;
      const nc = col + dc;
      if (!this.inBounds(nr, nc)) return;

      if (this.isEnemyPiece(nr, nc, piece.color)) {
        if (nr === promotionRow) {
          ['q', 'r', 'b', 'n'].forEach((promo) =>
            moves.push(this.createMove(row, col, nr, nc, { promotion: promo }))
          );
        } else {
          moves.push(this.createMove(row, col, nr, nc));
        }
      }

      if (
        this.enPassantTarget &&
        this.enPassantTarget.row === nr &&
        this.enPassantTarget.col === nc &&
        this.enPassantTarget.color !== piece.color
      ) {
        moves.push(this.createMove(row, col, nr, nc, { isEnPassant: true }));
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
      if (!target || target.color !== piece.color) {
        moves.push(this.createMove(row, col, nr, nc));
      }
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
          if (target.color !== piece.color) {
            moves.push(this.createMove(row, col, nr, nc));
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    return moves;
  }

  getKingMoves(row, col, piece) {
    const moves = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (!this.inBounds(nr, nc)) continue;
        const target = this.getPiece(nr, nc);
        if (!target || target.color !== piece.color) {
          moves.push(this.createMove(row, col, nr, nc));
        }
      }
    }

    if (!piece.hasMoved && !this.isInCheck(piece.color)) {
      const rights = this.castlingRights[piece.color];
      const homeRow = piece.color === 'w' ? 7 : 0;

      if (rights.kingSide && this.canCastleThrough(homeRow, [5, 6], piece.color)) {
        moves.push(this.createMove(row, col, homeRow, 6, { isCastleKingSide: true }));
      }

      if (rights.queenSide && this.canCastleThrough(homeRow, [3, 2, 1], piece.color, true)) {
        moves.push(this.createMove(row, col, homeRow, 2, { isCastleQueenSide: true }));
      }
    }

    return moves;
  }

  canCastleThrough(row, colsToCheck, color, queenSide = false) {
    const rookCol = queenSide ? 0 : 7;
    const rook = this.getPiece(row, rookCol);
    if (!rook || rook.type !== 'r' || rook.color !== color || rook.hasMoved) return false;

    if (!colsToCheck.every((col) => this.isEmpty(row, col))) return false;

    const passCols = queenSide ? [3, 2] : [5, 6];
    return passCols.every((col) => !this.isSquareAttacked(row, col, color === 'w' ? 'b' : 'w'));
  }

  isInCheck(color) {
    let kingPos = null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
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
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (!piece || piece.color !== byColor) continue;

        if (piece.type === 'p') {
          const dir = byColor === 'w' ? -1 : 1;
          if (r + dir === row && Math.abs(c - col) === 1) return true;
          continue;
        }

        const attacks = piece.type === 'k'
          ? this.getKingAttackSquares(r, c)
          : this.getPseudoLegalMoves(r, c, piece);

        if (attacks.some((m) => m.to.row === row && m.to.col === col)) return true;
      }
    }

    return false;
  }

  getKingAttackSquares(row, col) {
    const squares = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (this.inBounds(nr, nc)) {
          squares.push(this.createMove(row, col, nr, nc));
        }
      }
    }
    return squares;
  }
}
