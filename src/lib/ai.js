// ===== ai.js =====

export class ChessAI {
  constructor(depth = 2) {
    this.depth = depth;
    this.pieceValues = {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
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
      return { score: this.evaluateBoard(game), move: null };
    }

    const moves = game.getAllLegalMoves(game.turn);
    if (moves.length === 0) {
      return { score: this.evaluateBoard(game), move: null };
    }

    // Sort captures first so AI feels tactical at shallow depths.
    moves.sort((a, b) => this.movePriority(game, b) - this.movePriority(game, a));

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      let bestMove = moves[0];
      for (const move of moves) {
        const clone = game.clone();
        clone.makeMove(move);
        const { score } = this.minimax(clone, depth - 1, alpha, beta, false);
        if (score > maxEval) {
          maxEval = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return { score: maxEval, move: bestMove };
    }

    let minEval = Infinity;
    let bestMove = moves[0];
    for (const move of moves) {
      const clone = game.clone();
      clone.makeMove(move);
      const { score } = this.minimax(clone, depth - 1, alpha, beta, true);
      if (score < minEval) {
        minEval = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }

  movePriority(game, move) {
    const target = game.getPiece(move.to.row, move.to.col);
    const mover = game.getPiece(move.from.row, move.from.col);

    let score = 0;
    if (target) score += this.pieceValues[target.type] - this.pieceValues[mover.type] / 10;
    if (move.isEnPassant) score += this.pieceValues.p;
    if (move.promotion) score += this.pieceValues[move.promotion];

    return score;
  }

  evaluateBoard(game) {
    if (game.gameOver) {
      if (game.resultReason === 'checkmate') {
        return game.winner === 'w' ? 100000 : -100000;
      }
      return 0;
    }

    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = game.getPiece(r, c);
        if (!piece) continue;

        const base = this.pieceValues[piece.type];
        const positional = this.positionBonus(piece, r, c);
        score += piece.color === 'w' ? base + positional : -(base + positional);
      }
    }

    // Mobility bonus helps avoid cramped positions.
    const whiteMobility = game.getAllLegalMoves('w').length;
    const blackMobility = game.getAllLegalMoves('b').length;
    score += (whiteMobility - blackMobility) * 2;

    return score;
  }

  positionBonus(piece, row, col) {
    const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
    const centerBonus = Math.max(0, 4 - centerDistance) * 4;

    if (piece.type === 'p') {
      const advance = piece.color === 'w' ? 6 - row : row - 1;
      return advance * 6 + centerBonus;
    }

    if (piece.type === 'n' || piece.type === 'b') {
      return centerBonus;
    }

    return centerBonus / 2;
  }
}
