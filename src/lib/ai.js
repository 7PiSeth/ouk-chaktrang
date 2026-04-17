// ===== ai.js =====

export class ChessAI {
  constructor(depth = 3) {
    this.depth = depth;
    this.pieceValues = {
      p: 100,
      n: 320,
      s: 240,
      r: 500,
      m: 120,
      k: 20000,
    };
  }

  chooseMove(game) {
    const maximizing = game.turn === 'w';
    const { move } = this.minimax(game, this.depth, -Infinity, Infinity, maximizing);
    return move;
  }

  minimax(game, depth, alpha, beta, maximizingPlayer) {
    if (depth === 0 || game.gameOver) {
      return { score: this.evaluateBoard(game, null), move: null };
    }

    const moves = game.getAllLegalMoves(game.turn);
    if (moves.length === 0) {
      return { score: this.evaluateBoard(game, null), move: null };
    }

    // Move ordering: captures and promotions first
    moves.sort((a, b) => this._movePriority(game, b) - this._movePriority(game, a));

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      let bestMove = moves[0];
      for (const move of moves) {
        const clone = game.clone();
        clone.applyMove(move, false);
        clone.updateGameStateAfterMove();
        const { score } = this.minimax(clone, depth - 1, alpha, beta, false);
        if (score > maxEval) { maxEval = score; bestMove = move; }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return { score: maxEval, move: bestMove };
    }

    let minEval = Infinity;
    let bestMove = moves[0];
    for (const move of moves) {
      const clone = game.clone();
      clone.applyMove(move, false);
      clone.updateGameStateAfterMove();
      const { score } = this.minimax(clone, depth - 1, alpha, beta, true);
      if (score < minEval) { minEval = score; bestMove = move; }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }

  _movePriority(game, move) {
    const target = game.getPiece(move.to.row, move.to.col);
    const mover = game.getPiece(move.from.row, move.from.col);
    let score = 0;
    if (target) score += this.pieceValues[target.type] - this.pieceValues[mover.type] / 10;
    if (move.promotion) score += this.pieceValues[move.promotion] || 0;
    return score;
  }

  // Mobility excluded at depth > 0 leaves — too expensive; use piece values + positional only
  evaluateBoard(game) {
    if (game.gameOver) {
      if (game.resultReason === 'checkmate') return game.winner === 'w' ? 100000 : -100000;
      return 0;
    }

    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = game.board[r][c];
        if (!piece) continue;
        const value = this.pieceValues[piece.type] + this._posBonus(piece, r, c);
        score += piece.color === 'w' ? value : -value;
      }
    }
    return score;
  }

  _posBonus(piece, row, col) {
    const cd = Math.abs(3.5 - row) + Math.abs(3.5 - col);
    const center = Math.max(0, 4 - cd) * 4;
    if (piece.type === 'p') {
      const advance = piece.color === 'w' ? 5 - row : row - 2;
      return advance * 8 + center;
    }
    if (piece.type === 'n' || piece.type === 's') return center;
    return center / 2;
  }
}
