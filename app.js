class ProbabilityEngine {
    constructor(gridX, gridY, shipSize) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.shipSize = shipSize;

        this.hits = [];
        this.misses = [];

        this.placements = [];
        this.totalPlacementsCount = 0;

        this.probabilities = new Array(gridX * gridY).fill(0);
        this.maxProbability = 0;
        this.bestMoves = [];

        this.generatePlacements();
        this.updateProbabilities();
    }

    generatePlacements() {
        this.placements = [];

        // Add all horizontal possibilities
        for (let y = 0; y < this.gridY; y++) {
            for (let x = 0; x <= this.gridX - this.shipSize; x++) {
                this.placements.push({ x: x, y: y, isVertical: false });
            }
        }

        // Add all vertical possibilities
        if (this.shipSize > 1) {
            for (let x = 0; x < this.gridX; x++) {
                for (let y = 0; y <= this.gridY - this.shipSize; y++) {
                    this.placements.push({ x: x, y: y, isVertical: true });
                }
            }
        }

        this.totalPlacementsCount = this.placements.length;
    }

    isInside(placement, x, y) {
        if (placement.isVertical) {
            return x === placement.x && y >= placement.y && y < placement.y + this.shipSize;
        } else {
            return y === placement.y && x >= placement.x && x < placement.x + this.shipSize;
        }
    }

    applyMiss(x, y) {
        this.misses.push(x + "," + y);
        let newList = [];
        // Keep placements that DO NOT touch the miss
        for (let p of this.placements) {
            if (!this.isInside(p, x, y)) {
                newList.push(p);
            }
        }
        this.placements = newList;
        this.updateProbabilities();
    }

    applyHit(x, y) {
        this.hits.push(x + "," + y);
        let newList = [];
        // Keep placements that DO touch the hit
        for (let p of this.placements) {
            if (this.isInside(p, x, y)) {
                newList.push(p);
            }
        }
        this.placements = newList;
        this.updateProbabilities();
    }

    updateProbabilities() {
        this.probabilities.fill(0);
        this.maxProbability = 0;
        this.bestMoves = [];

        if (this.placements.length === 0) return;

        let overlapCounts = new Array(this.gridX * this.gridY).fill(0);

        for (let p of this.placements) {
            if (p.isVertical) {
                for (let i = 0; i < this.shipSize; i++) {
                    let index = (p.y + i) * this.gridX + p.x;
                    overlapCounts[index]++;
                }
            } else {
                for (let i = 0; i < this.shipSize; i++) {
                    let index = p.y * this.gridX + (p.x + i);
                    overlapCounts[index]++;
                }
            }
        }

        let highestCount = 0;
        for (let y = 0; y < this.gridY; y++) {
            for (let x = 0; x < this.gridX; x++) {
                let index = y * this.gridX + x;
                let id = x + "," + y;

                if (this.hits.includes(id) || this.misses.includes(id)) {
                    this.probabilities[index] = 0;
                    continue;
                }

                let percent = overlapCounts[index] / this.placements.length;
                this.probabilities[index] = percent;

                if (percent > highestCount) {
                    highestCount = percent;
                    this.bestMoves = [{ x: x, y: y }];
                } else if (percent === highestCount && percent > 0) {
                    this.bestMoves.push({ x: x, y: y });
                }
            }
        }
        this.maxProbability = highestCount;
    }
}

class CanvasRenderer {
    constructor(canvasId, wrapperId) {
        this.canvas = document.getElementById(canvasId);
        this.wrapper = document.getElementById(wrapperId);
        this.container = this.wrapper.parentElement;
        this.ctx = this.canvas.getContext('2d');

        this.zoomMultiplier = 1.0;

        window.addEventListener('resize', () => this.resizeCanvas());

        document.getElementById('btnZoomIn')?.addEventListener('click', () => this.changeZoom(0.2));
        document.getElementById('btnZoomOut')?.addEventListener('click', () => this.changeZoom(-0.2));

        this.onCellClick = null;
        this.onRightClick = null;

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.onRightClick) this.onRightClick();
        });

        this.canvas.addEventListener('click', (e) => {
            if (!this.onCellClick || !this.gridX) return;
            const rect = this.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left - (this.offsetX || 0);
            const py = e.clientY - rect.top - (this.offsetY || 0);
            const cx = Math.floor(px / this.cellSize);
            const cy = Math.floor(py / this.cellSize);
            if (cx >= 0 && cx < this.gridX && cy >= 0 && cy < this.gridY) {
                this.onCellClick(cx, cy);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.gridX) return;
            const rect = this.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left - (this.offsetX || 0);
            const py = e.clientY - rect.top - (this.offsetY || 0);
            const cx = Math.floor(px / this.cellSize);
            const cy = Math.floor(py / this.cellSize);
            if (this.lastHoverX !== cx || this.lastHoverY !== cy) {
                this.lastHoverX = cx;
                this.lastHoverY = cy;
                if (this.lastState) this.render(this.lastState);
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.lastHoverX = -1;
            this.lastHoverY = -1;
            if (this.lastState) this.render(this.lastState);
        });
    }

    changeZoom(delta) {
        this.zoomMultiplier += delta;
        if(this.zoomMultiplier < 0.2) this.zoomMultiplier = 0.2;
        if(this.zoomMultiplier > 5.0) this.zoomMultiplier = 5.0;
        
        const textElem = document.getElementById('zoomLevelText');
        if (textElem) textElem.textContent = Math.round(this.zoomMultiplier * 100) + '%';
        
        this.resizeCanvas();
    }

    resizeCanvas() {
        if (!this.container) return;
        this.baseWidth = this.container.clientWidth;
        this.baseHeight = this.container.clientHeight;
        if (this.lastState) this.render(this.lastState);
    }

    getColor(prob, isBest) {
        if (prob === 0) return '#1e293b';

        const r = Math.floor(51 + (255 - 51) * prob);
        const g = Math.floor(144 + (51 - 144) * prob);
        const b = Math.floor(255 + (102 - 255) * prob);

        if (isBest) {
            return `rgb(${r}, ${g}, ${b})`;
        }
        return `rgba(${r}, ${g}, ${b}, 0.7)`;
    }

    render(state) {
        this.lastState = state;
        const e = state.engine;
        if (!e) return;

        this.gridX = e.gridX;
        this.gridY = e.gridY;

        if (!this.baseWidth) {
            this.baseWidth = this.container.clientWidth;
            this.baseHeight = this.container.clientHeight;
        }

        let rawCellSize = Math.min((this.baseWidth - 40) / this.gridX, (this.baseHeight - 40) / this.gridY);
        this.cellSize = Math.floor(rawCellSize * this.zoomMultiplier);

        this.width = Math.max(this.baseWidth, this.cellSize * this.gridX + 80);
        this.height = Math.max(this.baseHeight, this.cellSize * this.gridY + 80);
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.offsetX = Math.floor((this.width - (this.cellSize * this.gridX)) / 2);
        this.offsetY = Math.floor((this.height - (this.cellSize * this.gridY)) / 2);

        this.ctx.fillStyle = '#0f111a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);

        let drawLines = this.cellSize >= 6;

        for (let y = 0; y < this.gridY; y++) {
            for (let x = 0; x < this.gridX; x++) {
                let idx = y * this.gridX + x;
                let id = x + "," + y;
                let px = x * this.cellSize;
                let py = y * this.cellSize;

                if (e.hits.includes(id)) {
                    this.ctx.fillStyle = '#ff3366';
                    this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
                } else if (e.misses.includes(id)) {
                    this.ctx.fillStyle = '#1e293b';
                    this.ctx.fillRect(px, py, this.cellSize, this.cellSize);

                    if (this.cellSize > 10) {
                        this.ctx.strokeStyle = '#334155';
                        this.ctx.lineWidth = 1;
                        this.ctx.beginPath();
                        this.ctx.moveTo(px + this.cellSize * 0.3, py + this.cellSize * 0.3);
                        this.ctx.lineTo(px + this.cellSize * 0.7, py + this.cellSize * 0.7);
                        this.ctx.moveTo(px + this.cellSize * 0.7, py + this.cellSize * 0.3);
                        this.ctx.lineTo(px + this.cellSize * 0.3, py + this.cellSize * 0.7);
                        this.ctx.stroke();
                    }
                } else {
                    let prob = e.probabilities[idx];
                    let isBest = (prob === e.maxProbability && prob > 0);
                    let ratio = e.maxProbability > 0 ? (prob / e.maxProbability) : 0;

                    this.ctx.fillStyle = this.getColor(ratio, isBest);

                    if (drawLines) {
                        this.ctx.fillRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);
                    } else {
                        this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
                    }
                }

                if (x === this.lastHoverX && y === this.lastHoverY && !e.hits.includes(id) && !e.misses.includes(id)) {
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);

                    let prob = e.probabilities[idx];
                    if (prob > 0 && this.cellSize >= 20) {
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.font = '12px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText((prob * 100).toFixed(1) + '%', px + this.cellSize / 2, py + this.cellSize / 2);
                    }
                }
            }
        }

        if (state.targetPlacements && state.targetPlacements.length > 0) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = Math.max(2, this.cellSize * 0.1);
            for (let ship of state.targetPlacements) {
                let w = ship.isVertical ? this.cellSize : this.cellSize * state.shipSize;
                let h = ship.isVertical ? this.cellSize * state.shipSize : this.cellSize;
                this.ctx.strokeRect(ship.x * this.cellSize + 2, ship.y * this.cellSize + 2, w - 4, h - 4);
            }
        }

        if (state.isPlacingShip && this.lastHoverX >= 0 && this.lastHoverY >= 0) {
            let isValid = false;
            let w = this.cellSize;
            let h = this.cellSize;

            if (state.placementIsVertical) {
                h = this.cellSize * state.shipSize;
                isValid = (this.lastHoverY + state.shipSize <= this.gridY);
            } else {
                w = this.cellSize * state.shipSize;
                isValid = (this.lastHoverX + state.shipSize <= this.gridX);
            }

            this.ctx.fillStyle = isValid ? 'rgba(255, 255, 255, 0.4)' : 'rgba(239, 68, 68, 0.4)';
            this.ctx.fillRect(this.lastHoverX * this.cellSize, this.lastHoverY * this.cellSize, w, h);
        }

        this.ctx.restore();
    }
}

class BattleshipGame {
    constructor() {
        this.renderer = new CanvasRenderer('gameCanvas', 'canvasWrapper');
        this.renderer.onCellClick = (x, y) => this.handleGridClick(x, y);
        this.renderer.onRightClick = () => this.handleRightClick();

        this.bindEvents();
        setTimeout(() => {
            this.renderer.resizeCanvas();
            this.startGame();
        }, 100);
    }

    bindEvents() {
        this.btnPlayer = document.getElementById('btnPlayerMode');
        this.btnAI = document.getElementById('btnAIMode');
        this.btnInit = document.getElementById('btnInitialize');

        this.btnPlayer.onclick = () => this.changeMode('PLAYER');
        this.btnAI.onclick = () => this.changeMode('AI');
        this.btnInit.onclick = () => this.startGame();

        document.getElementById('btnAIPlay').onclick = () => this.toggleAI();
        document.getElementById('btnAIPause').onclick = () => this.stopAI();
        document.getElementById('btnAIStep').onclick = () => this.stepAI();
        document.getElementById('btnPlayAgain').onclick = () => {
            document.getElementById('gameStateOverlay').classList.add('hidden');
            this.startGame();
        };

        this.mode = 'PLAYER';
        this.timeline = document.getElementById('timelineContainer');
        this.guide = document.getElementById('userGuide');
    }

    changeMode(newMode) {
        this.mode = newMode;
        if (this.mode === 'AI') {
            this.btnAI.classList.add('active');
            this.btnPlayer.classList.remove('active');
            document.getElementById('aiControlsSection').classList.remove('hidden');
        } else {
            this.btnPlayer.classList.add('active');
            this.btnAI.classList.remove('active');
            document.getElementById('aiControlsSection').classList.add('hidden');
        }
        this.stopAI();
        this.startGame();
    }

    toggleAI() {
        if (this.gameOver || this.isPlacingShip) return;
        if (this.aiTimer) this.stopAI();
        else this.startAI();
    }

    startAI() {
        if (this.gameOver || this.isPlacingShip) return;
        let speed = 1000 - parseInt(document.getElementById('aiSpeedSlider').value);
        this.aiTimer = setInterval(() => this.stepAI(), Math.max(10, speed));
    }

    stopAI() {
        if (this.aiTimer) {
            clearInterval(this.aiTimer);
            this.aiTimer = null;
        }
    }

    stepAI() {
        if (this.gameOver || this.isPlacingShip || this.engine.bestMoves.length === 0) {
            this.stopAI();
            return;
        }

        let moves = this.engine.bestMoves;
        let bestMove = moves[0];

        // Advanced AI Tie-breaker: checkerboard pattern
        if (moves.length > 1) {
            let bestScore = -Infinity;
            for (let m of moves) {
                let score = 0;
                // Checkerboard bonus
                if (this.shipSize >= 2 && ((m.x + m.y) % 2 === 0)) {
                    score += 100;
                }
                // Center bonus
                let dx = Math.abs(m.x - (this.engine.gridX / 2));
                let dy = Math.abs(m.y - (this.engine.gridY / 2));
                score -= (dx + dy);

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = m;
                }
            }
        }

        this.applyMove(bestMove.x, bestMove.y);
    }

    log(text, detail = '') {
        const div = document.createElement('div');
        div.className = 'timeline-item';
        let prefix = this.movesMade > 0 ? `<span class="move-idx">#${this.movesMade}</span> ` : "";
        div.innerHTML = `${prefix} ${text} <strong>${detail}</strong>`;
        this.timeline.appendChild(div);
        this.timeline.scrollLeft = this.timeline.scrollWidth;
    }

    startGame() {
        const x = parseInt(document.getElementById('gridSizeX').value);
        const y = parseInt(document.getElementById('gridSizeY').value);
        const s = parseInt(document.getElementById('shipSize').value);

        if (isNaN(x) || isNaN(y) || x > 64 || y > 64 || x < 1 || y < 1) {
            alert("Invalid Grid Size. Max 64x64.");
            return;
        }

        document.getElementById('gameStateOverlay').classList.add('hidden');
        this.timeline.innerHTML = '';
        this.log('System Initialized');

        this.engine = new ProbabilityEngine(x, y, s);
        this.shipSize = s;
        this.movesMade = 0;
        this.startTime = null; // Timer starts on first move
        this.gameOver = false;
        this.stopAI();

        if (this.gameTimer) clearInterval(this.gameTimer);

        if (this.mode === 'AI') {
            this.isPlacingShip = true;
            this.placementIsVertical = false;
            this.targetPlacements = [];
            this.targetShip = null;
            this.guide.textContent = 'AI SEARCH: Left-Click to place ship. Right-Click to rotate.';
            this.log('Please place your ship on the grid.');
        } else {
            this.isPlacingShip = false;
            this.placementIsVertical = false;
            this.guide.textContent = 'PLAYER SEARCH: Click any cell to hunt the Target!';

            // Random hidden ship
            let rnd = Math.floor(Math.random() * this.engine.placements.length);
            this.targetShip = this.engine.placements[rnd];
            this.targetPlacements = [];

            this.gameTimer = setInterval(() => this.updateUI(), 100);
        }

        this.updateUI();
        this.updateVisuals();
    }

    updateUI() {
        if (!this.gameOver) {
            if (this.mode === 'PLAYER') {
                if (this.startTime !== null) {
                    let seconds = (Date.now() - this.startTime) / 1000;
                    document.getElementById('metricTime').textContent = seconds.toFixed(1) + 's';
                } else {
                    document.getElementById('metricTime').textContent = '0.0s';
                }
            } else {
                document.getElementById('metricTime').textContent = '--';
            }
        }

        document.getElementById('statTotalPlacements').textContent = this.engine.totalPlacementsCount;
        document.getElementById('statRemainingPlacements').textContent = this.engine.placements.length;
        document.getElementById('metricMoves').textContent = this.movesMade;

        let pct = (this.engine.maxProbability * 100).toFixed(2);
        document.getElementById('statMaxProb').textContent = pct + '%';

        if (this.engine.bestMoves.length > 0) {
            let m = this.engine.bestMoves[0];
            document.getElementById('statBestMove').textContent = `X:${m.x} Y:${m.y}`;
        } else {
            document.getElementById('statBestMove').textContent = `-`;
        }

        let discovered = this.engine.hits ? this.engine.hits.length : 0;
        let metricDiscovered = document.getElementById('metricDiscovered');
        if (metricDiscovered) {
            metricDiscovered.textContent = `${discovered}/${this.shipSize}`;
        }

        if (this.movesMade > 0) {
            let ideal = Math.max(1, Math.log2(this.engine.totalPlacementsCount));
            let eff = Math.min(100, Math.max(0, (ideal / this.movesMade) * 100));
            document.getElementById('metricEfficiency').textContent = eff.toFixed(0) + '%';
        } else {
            document.getElementById('metricEfficiency').textContent = '100%';
        }
    }

    handleRightClick() {
        if (this.isPlacingShip) {
            this.placementIsVertical = !this.placementIsVertical;
            this.updateVisuals();
        }
    }

    handleGridClick(x, y) {
        if (this.isPlacingShip) {
            let ship = null;
            if (this.placementIsVertical) {
                if (y + this.shipSize <= this.engine.gridY) ship = { x, y, isVertical: true };
            } else {
                if (x + this.shipSize <= this.engine.gridX) ship = { x, y, isVertical: false };
            }

            if (ship !== null) {
                this.targetShip = ship;
                this.targetPlacements = [ship];
                this.isPlacingShip = false;
                this.guide.textContent = 'SHIP LOCKED: Click Play (▶) on the right to start executing AI.';
                this.log('Target ship locked.');

                this.updateVisuals();
            }
            return;
        }

        if (this.gameOver || this.mode === 'AI') return;

        let id = x + "," + y;
        if (this.engine.hits.includes(id) || this.engine.misses.includes(id)) return;

        if (this.startTime === null) {
            this.startTime = Date.now();
        }

        this.applyMove(x, y);
    }

    applyMove(x, y) {
        this.movesMade++;

        let isHit = this.engine.isInside(this.targetShip, x, y);

        if (isHit) {
            this.engine.applyHit(x, y);
            this.log('Direct Hit at', `[${x}, ${y}]`);

            if (this.engine.hits.length === this.shipSize) {
                this.endGame(true);
            }
        } else {
            this.engine.applyMiss(x, y);
            this.log('Miss at', `[${x}, ${y}]`);

            if (this.engine.placements.length === 0) {
                this.endGame(false); // Math error
            }
        }

        this.updateUI();
        this.updateVisuals();
    }

    updateVisuals() {
        this.renderer.render({
            engine: this.engine,
            shipSize: this.shipSize,
            targetPlacements: this.targetPlacements,
            isPlacingShip: this.isPlacingShip,
            placementIsVertical: this.placementIsVertical
        });
    }

    endGame(success) {
        this.gameOver = true;
        clearInterval(this.gameTimer);

        document.getElementById('overlayTitle').textContent = success ? "TARGET DESTROYED" : "SIMULATION ENDED";
        document.getElementById('overlayTitle').style.color = success ? "#15803d" : "#0f766e";
        this.guide.textContent = success ? "Target Successfully Neutralized." : "Simulation failed.";

        if (this.mode === 'PLAYER') {
            let timeStr = ((Date.now() - this.startTime) / 1000).toFixed(1);
            document.getElementById('overlaySubtitle').textContent = `Searched: ${this.movesMade} blocks | Minimum Possible: ${this.shipSize} | Time: ${timeStr}s`;
        } else {
            document.getElementById('overlaySubtitle').textContent = `Searched: ${this.movesMade} blocks | Minimum Possible: ${this.shipSize}`;
        }
        document.getElementById('gameStateOverlay').classList.remove('hidden');

        this.log(`Completed Cycle`);
    }
}

window.onload = () => {
    window.game = new BattleshipGame();
};