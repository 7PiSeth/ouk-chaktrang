// ===== ui.js =====

import { ChessGame } from './game.js';
import { BoardRenderer } from './board.js';
import { ChessAI } from './ai.js';

class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  ensureContext() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  beep({ freq = 440, duration = 0.08, type = 'sine', gain = 0.04 }) {
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = gain;

    osc.connect(amp);
    amp.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  move() {
    this.beep({ freq: 560, duration: 0.06, type: 'triangle', gain: 0.035 });
  }

  capture() {
    this.beep({ freq: 220, duration: 0.12, type: 'sawtooth', gain: 0.045 });
  }

  check() {
    this.beep({ freq: 720, duration: 0.08, type: 'square', gain: 0.04 });
    setTimeout(() => this.beep({ freq: 880, duration: 0.08, type: 'square', gain: 0.04 }), 70);
  }
}

class ChessUI {
  constructor() {
    this.game = new ChessGame();
    this.ai = new ChessAI(3);
    this.board = new BoardRenderer(document.getElementById('board'));
    this.sound = new SoundEngine();

    this.state = {
      selected: null,
      legalMoves: [],
      aiEnabled: false,
    };

    this.statusEl = document.getElementById('status');
    this.detailEl = document.getElementById('detail');
    this.historyEl = document.getElementById('history');
    this.aiToggleBtn = document.getElementById('aiToggle');
    this.undoBtn = document.getElementById('undoBtn');
    this.restartBtn = document.getElementById('restartBtn');

    this.bindEvents();
    this.refresh();
  }

  bindEvents() {
    this.board.setSquareClickHandler((row, col) => this.handleSquareClick(row, col));

    this.aiToggleBtn.addEventListener('click', () => {
      this.state.aiEnabled = !this.state.aiEnabled;
      this.aiToggleBtn.textContent = `AI: ${this.state.aiEnabled ? 'On' : 'Off'}`;
      this.aiToggleBtn.className = `px-3 py-1.5 rounded-lg transition text-sm font-semibold ${
        this.state.aiEnabled ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'
      }`;

      this.refresh();
      this.tryAIMove();
    });

    this.undoBtn.addEventListener('click', () => {
      const didUndo = this.game.undo();
      if (!didUndo) return;

      if (this.state.aiEnabled && this.game.turn === 'b') {
        this.game.undo();
      }

      this.clearSelection();
      this.refresh();
    });

    this.restartBtn.addEventListener('click', () => {
      this.game.reset();
      this.clearSelection();
      this.refresh();
    });
  }

  handleSquareClick(row, col) {
    if (this.game.gameOver) return;
    if (this.state.aiEnabled && this.game.turn === 'b') return;

    const clickedPiece = this.game.getPiece(row, col);

    if (this.state.selected) {
      const candidate = this.state.legalMoves.find((m) => m.to.row === row && m.to.col === col);
      if (candidate) {
        this.executeMove(candidate);
        return;
      }
    }

    if (clickedPiece && clickedPiece.color === this.game.turn) {
      this.state.selected = { row, col };
      this.state.legalMoves = this.game.getLegalMovesForSquare(row, col);
    } else {
      this.clearSelection();
    }

    this.refresh();
  }

  executeMove(move) {
    const applied = this.game.makeMove(move);
    if (!applied) return;

    if (applied.capture) this.sound.capture();
    else this.sound.move();

    if (!this.game.gameOver && this.game.isInCheck(this.game.turn)) {
      this.sound.check();
    }

    this.clearSelection();
    this.refresh();
    this.tryAIMove();
  }

  tryAIMove() {
    if (!this.state.aiEnabled || this.game.gameOver || this.game.turn !== 'b') return;

    this.detailEl.textContent = 'AI is thinking...';
    setTimeout(() => {
      const move = this.ai.chooseMove(this.game.clone());
      if (!move) return;

      const applied = this.game.makeMove(move);
      if (!applied) return;

      if (applied.capture) this.sound.capture();
      else this.sound.move();

      if (!this.game.gameOver && this.game.isInCheck(this.game.turn)) {
        this.sound.check();
      }

      this.refresh();
    }, 220);
  }

  clearSelection() {
    this.state.selected = null;
    this.state.legalMoves = [];
  }

  getCheckSquares() {
    if (!this.game.isInCheck(this.game.turn)) return [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.game.getPiece(r, c);
        if (piece && piece.type === 'k' && piece.color === this.game.turn) {
          return [{ row: r, col: c }];
        }
      }
    }

    return [];
  }

  renderHistory() {
    this.historyEl.innerHTML = '';

    for (let i = 0; i < this.game.history.length; i += 2) {
      const white = this.game.history[i]?.move?.notation || '';
      const black = this.game.history[i + 1]?.move?.notation || '';
      const li = document.createElement('li');
      li.className = 'grid grid-cols-[2rem_1fr_1fr] gap-2 border-b border-slate-700/60 pb-1';
      li.innerHTML = `<span class="text-slate-400">${Math.floor(i / 2) + 1}.</span><span>${white}</span><span>${black}</span>`;
      this.historyEl.appendChild(li);
    }
  }

  refreshStatus() {
    if (this.game.gameOver) {
      if (this.game.resultReason === 'checkmate') {
        this.statusEl.textContent = `Checkmate! ${this.game.winner === 'w' ? 'White' : 'Black'} wins.`;
      } else {
        this.statusEl.textContent = 'Draw by stalemate.';
      }
      this.detailEl.textContent = 'Press Restart to play again.';
      return;
    }

    const turnName = this.game.turn === 'w' ? 'White' : 'Black';
    this.statusEl.textContent = `${turnName} to move`;

    if (this.game.isInCheck(this.game.turn)) {
      this.detailEl.textContent = `${turnName} king is in check.`;
      return;
    }

    if (this.state.aiEnabled && this.game.turn === 'b') {
      this.detailEl.textContent = 'AI is calculating a move.';
      return;
    }

    this.detailEl.textContent = 'Select a piece to see legal moves.';
  }

  refresh() {
    this.board.render(this.game, {
      selected: this.state.selected,
      legalMoves: this.state.legalMoves,
      checkSquares: this.getCheckSquares(),
    });

    this.renderHistory();
    this.refreshStatus();
  }
}

new ChessUI();
