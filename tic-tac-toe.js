// Full project JavaScript (complete, no placeholders)
(function () {
    // DOM elements
    const boardEl = document.getElementById('board');
    const gameStatusEl = document.getElementById('gameStatus');
    const currentTurnEl = document.getElementById('currentTurn');
    const btnRestart = document.getElementById('btnRestart');
    const btnUndo = document.getElementById('btnUndo');
    const btnStart = document.getElementById('btnStart');
    const modeSelect = document.getElementById('modeSelect');
    const difficultySelect = document.getElementById('difficultySelect');
    const symbolSelect = document.getElementById('symbolSelect');
    const historyEl = document.getElementById('history');
    const btnFillRandom = document.getElementById('btnFillRandom');
    const btnClearHistory = document.getElementById('btnClearHistory');

    // Game state
    let board = Array(9).fill(null); // indices 0..8
    let human = 'X';
    let ai = 'O';
    let currentPlayer = 'X';
    let mode = 'pve'; // 'pve' or 'pvp'
    let difficulty = 'hard'; // easy, medium, hard
    let gameOver = false;
    let history = []; // list of {player, pos}
    let lastStates = []; // for undo: stack of previous states

    // Utility: winning lines
    const WIN_LINES = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    // Render the board UI
    function renderBoard() {
        boardEl.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-index', String(i));
            cell.setAttribute('role', 'button');
            cell.setAttribute('aria-label', 'Cell ' + (i + 1));
            const val = board[i];
            if (val) {
                cell.classList.add(val.toLowerCase());
                const span = document.createElement('span');
                span.textContent = val;
                cell.appendChild(span);
                cell.classList.add('disabled');
            } else {
                cell.innerHTML = '';
            }
            cell.addEventListener('click', onCellClick);
            boardEl.appendChild(cell);
        }
        updateStatusUI();
        renderHistory();
    }

    // Update textual status and turn display
    function updateStatusUI(message) {
        const winner = checkWinner(board);
        if (message) {
            gameStatusEl.textContent = message;
        } else if (winner) {
            if (winner === 'tie') {
                gameStatusEl.textContent = 'It\'s a tie!';
            } else {
                gameStatusEl.textContent = winner + ' wins!';
            }
        } else {
            gameStatusEl.textContent = mode === 'pvp' ? 'Playing (PvP)' : 'Playing (PvE)';
        }
        if (winner) {
            currentTurnEl.textContent = '—';
        } else {
            currentTurnEl.textContent = currentPlayer;
        }
        // Highlight winning line if there is a winner
        clearWinHighlights();
        if (winner && winner !== 'tie') {
            const line = winningLine(board);
            if (line) {
                line.forEach(i => {
                    const el = boardEl.querySelector('.cell[data-index="' + i + '"]');
                    if (el) el.classList.add('win');
                });
            }
        }
    }

    function clearWinHighlights() {
        const nodes = boardEl.querySelectorAll('.cell.win');
        nodes.forEach(n => n.classList.remove('win'));
    }

    // Click handler for cells
    function onCellClick(e) {
        if (gameOver) return;
        const idx = Number(e.currentTarget.getAttribute('data-index'));
        // if occupied -> ignore
        if (board[idx]) return;
        if (mode === 'pve' && currentPlayer === ai) return; // not player's turn
        saveStateForUndo();
        makeMove(idx, currentPlayer);
        postMove();
    }

    // Save a deep copy for undo
    function saveStateForUndo() {
        lastStates.push({
            board: board.slice(),
            currentPlayer,
            history: history.slice()
        });
        // Cap undo states to avoid memory growth
        if (lastStates.length > 50) lastStates.shift();
    }

    // Undo last move
    function undo() {
        if (lastStates.length === 0) return;
        const last = lastStates.pop();
        board = last.board;
        currentPlayer = last.currentPlayer;
        history = last.history;
        gameOver = false;
        renderBoard();
    }

    // Make a move (no checks here)
    function makeMove(pos, player) {
        if (board[pos]) return false;
        board[pos] = player;
        history.push({ player, pos });
        return true;
    }

    // After a move is made, check winner, update UI, and trigger AI if needed
    function postMove() {
        const winner = checkWinner(board);
        if (winner) {
            gameOver = true;
            if (winner === 'tie') {
                updateStatusUI('Game over: tie');
            } else {
                updateStatusUI('Game over: ' + winner + ' wins');
            }
            renderBoard();
            return;
        }
        // switch player
        currentPlayer = opposite(currentPlayer);
        renderBoard();

        // AI move if PvE and it's AI's turn
        if (!gameOver && mode === 'pve' && currentPlayer === ai) {
            // small delay to feel natural
            setTimeout(() => {
                aiPlay();
            }, 260);
        }
    }

    // Opposite player
    function opposite(p) { return p === 'X' ? 'O' : 'X'; }

    // Check winner: returns 'X' or 'O' or 'tie' or null
    function checkWinner(b) {
        for (const ln of WIN_LINES) {
            const [a, b1, c] = ln;
            if (b[a] && b[a] === b[b1] && b[a] === b[c]) {
                return b[a];
            }
        }
        // any empty?
        if (b.some(v => !v)) return null;
        return 'tie';
    }

    // Return winning line indices or null
    function winningLine(b) {
        for (const ln of WIN_LINES) {
            const [a, b1, c] = ln;
            if (b[a] && b[a] === b[b1] && b[a] === b[c]) return ln;
        }
        return null;
    }

    // Render history list
    function renderHistory() {
        historyEl.innerHTML = '';
        if (history.length === 0) {
            historyEl.textContent = 'No moves yet.';
            return;
        }
        history.forEach((mv, i) => {
            const row = document.createElement('div');
            row.className = 'history-item';
            const left = document.createElement('div');
            left.textContent = `#${i + 1} ${mv.player}`;
            const right = document.createElement('div');
            const r = Math.floor(mv.pos / 3) + 1;
            const c = (mv.pos % 3) + 1;
            right.textContent = `r${r}c${c}`;
            row.appendChild(left);
            row.appendChild(right);
            historyEl.appendChild(row);
        });
    }

    // AI logic: choose move by difficulty
    function aiPlay() {
        if (gameOver) return;
        const avail = availableMoves(board);
        if (avail.length === 0) return;
        let move;
        if (difficulty === 'easy') {
            // random
            move = avail[Math.floor(Math.random() * avail.length)];
        } else if (difficulty === 'medium') {
            // 60% minimax, 40% random
            if (Math.random() < 0.6) {
                move = bestMove(board, ai, human).index;
            } else {
                move = avail[Math.floor(Math.random() * avail.length)];
            }
        } else {
            // hard: perfect play
            move = bestMove(board, ai, human).index;
        }
        if (move === undefined || move === null) {
            move = avail[Math.floor(Math.random() * avail.length)];
        }
        saveStateForUndo();
        makeMove(move, ai);
        postMove();
    }

    // Available moves
    function availableMoves(b) {
        const res = [];
        for (let i = 0; i < 9; i++) if (!b[i]) res.push(i);
        return res;
    }

    // Minimax algorithm with depth-based scoring; returns {index, score}
    // We use alpha-beta pruning for efficiency.
    function bestMove(boardState, playerAI, playerHuman) {
        // returns best {index, score}
        // We'll implement recursive minimax with alpha-beta.
        function minimax(b, depth, isMaximizing, alpha, beta) {
            const win = checkWinner(b);
            if (win === playerAI) return { score: 10 - depth };
            if (win === playerHuman) return { score: depth - 10 };
            if (win === 'tie') return { score: 0 };

            const avail = availableMoves(b);
            if (isMaximizing) {
                let best = { score: -Infinity, index: null };
                for (const idx of avail) {
                    b[idx] = playerAI;
                    const res = minimax(b, depth + 1, false, alpha, beta);
                    b[idx] = null;
                    if (res.score > best.score) {
                        best = { score: res.score, index: idx };
                    }
                    alpha = Math.max(alpha, res.score);
                    if (beta <= alpha) break; // prune
                }
                return best;
            } else {
                let best = { score: Infinity, index: null };
                for (const idx of avail) {
                    b[idx] = playerHuman;
                    const res = minimax(b, depth + 1, true, alpha, beta);
                    b[idx] = null;
                    if (res.score < best.score) {
                        best = { score: res.score, index: idx };
                    }
                    beta = Math.min(beta, res.score);
                    if (beta <= alpha) break;
                }
                return best;
            }
        }
        // clone board because minimax mutates then restores; safe to pass original as we'll restore
        const cloned = boardState.slice();
        return minimax(cloned, 0, true, -Infinity, Infinity);
    }

    // UI controls wiring
    btnRestart.addEventListener('click', () => {
        startNewGame();
    });

    btnUndo.addEventListener('click', () => {
        undo();
    });

    btnStart.addEventListener('click', () => {
        startNewGame();
    });

    modeSelect.addEventListener('change', (e) => {
        mode = e.target.value;
        // if PvP, disable difficulty UI visually
        difficultySelect.disabled = (mode === 'pvp');
    });

    difficultySelect.addEventListener('change', (e) => {
        difficulty = e.target.value;
    });

    symbolSelect.addEventListener('change', (e) => {
        human = e.target.value;
        ai = opposite(human);
    });

    btnFillRandom.addEventListener('click', () => {
        // Demo: auto-play random moves until game over
        startNewGame();
        const playInterval = setInterval(() => {
            if (gameOver) { clearInterval(playInterval); return; }
            const avail = availableMoves(board);
            if (avail.length === 0) { clearInterval(playInterval); return; }
            const move = avail[Math.floor(Math.random() * avail.length)];
            saveStateForUndo();
            makeMove(move, currentPlayer);
            postMove();
        }, 220);
    });

    btnClearHistory.addEventListener('click', () => {
        history = [];
        renderHistory();
    });

    // Start a new game with settings
    function startNewGame() {
        board = Array(9).fill(null);
        currentPlayer = 'X';
        gameOver = false;
        history = [];
        lastStates = [];
        // read settings from UI
        mode = modeSelect.value;
        difficulty = difficultySelect.value;
        human = symbolSelect.value;
        ai = opposite(human);
        // If human chose O, then X (AI) starts if PvE and mode pve
        renderBoard();
        updateStatusUI('New game started');
        // If PvE and AI is X, make AI play first
        if (mode === 'pve' && currentPlayer === ai) {
            setTimeout(() => aiPlay(), 260);
        }
    }

    // Initialize UI board elements
    function initBoardSkeleton() {
        renderBoard();
        gameStatusEl.textContent = 'Select settings and press Start';
        currentTurnEl.textContent = '—';
    }

    // Initialize defaults
    (function init() {
        mode = modeSelect.value;
        difficulty = difficultySelect.value;
        human = symbolSelect.value;
        ai = opposite(human);
        initBoardSkeleton();
    })();

})();
