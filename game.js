/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - MASTER GAME MANAGER (game.js)
 * ============================================================================
 */

class GameManager {
    constructor() {
        this.student = { code: null, name: null, xp: 0, level: 1 };
        this.currentMode = 'builder';
        this.pendingMode = null;
        
        this.score = 0;
        this.timeLeft = 0;
        this.timerInterval = null;
        this.combo = 1;
        
        this.dom = {
            modeBanner: document.getElementById('mode-banner'),
            missionHud: document.getElementById('mission-hud'),
            missionTitle: document.getElementById('mission-title'),
            missionObjective: document.getElementById('mission-objective'),
            missionSteps: document.getElementById('mission-steps'),
            btnHint: document.getElementById('btn-hint'),
            missionTimer: document.getElementById('mission-timer'),
            timeRemaining: document.getElementById('time-remaining'),
            comboContainer: document.getElementById('combo-container'),
            comboMultiplier: document.getElementById('combo-multiplier'),
            
            authCodeInput: document.getElementById('auth-code'),
            btnLogin: document.getElementById('btn-login'),
            authError: document.getElementById('auth-error'),
            playerProfile: document.getElementById('player-profile'),
            playerName: document.getElementById('player-name'),
            playerLevel: document.getElementById('player-level'),
            xpBarFill: document.getElementById('xp-bar-fill'),

            navBtns: document.querySelectorAll('.nav-btn')
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadLocalProgress();
    }

    bindEvents() {
        if (this.dom.btnLogin) {
            this.dom.btnLogin.addEventListener('click', () => this.handleLogin());
        }
        if (this.dom.authCodeInput) {
            this.dom.authCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }

        if (this.dom.btnHint) {
            this.dom.btnHint.addEventListener('click', () => {
                const mission = missions.getCurrentMission();
                if (mission && mission.hint && window.fx) {
                    window.fx.floatingText(`Pista: ${mission.hint}`, { x: window.innerWidth / 2, y: 150 }, 'combo');
                    if (window.sfx && sfx.click) sfx.click();
                }
            });
        }

        // Listener robusto para los botones superiores de navegación
        this.dom.navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.sfx && sfx.click) sfx.click();
                
                this.dom.navBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');

                const mode = btn.dataset.mode;
                this.switchMode(mode);
            });
        });
    }

    loadLocalProgress() {
        try {
            const savedXP = localStorage.getItem('atomoquest_xp');
            if (savedXP) {
                this.student.xp = parseInt(savedXP, 10) || 0;
                this.updatePlayerStatsUI();
            }
        } catch (e) {
            console.warn("LocalStorage no disponible:", e);
        }
    }

    saveLocalProgress() {
        try {
            localStorage.setItem('atomoquest_xp', this.student.xp);
        } catch (e) {
            console.warn("No se pudo guardar en LocalStorage:", e);
        }
    }

    addXP(amount) {
        const oldLevel = this.student.level;
        this.student.xp += amount;
        this.student.level = LEVELS_DB.calculateLevel(this.student.xp);

        this.saveLocalProgress();
        this.updatePlayerStatsUI();

        if (this.student.level > oldLevel) {
            if (window.sfx && sfx.levelUp) sfx.levelUp();
            if (window.fx) {
                window.fx.screenFlash('levelUp');
                window.fx.spawnQuantumConfetti(100);
                window.fx.floatingText(`¡Nivel ${this.student.level}!`, { x: window.innerWidth / 2, y: window.innerHeight / 3 }, 'combo');
            }
        }
    }

    updatePlayerStatsUI() {
        if (!this.dom.playerProfile) return;
        if (this.student.name) {
            this.dom.playerProfile.classList.remove('hidden');
            this.dom.playerName.textContent = this.student.name;
            this.dom.playerLevel.textContent = this.student.level;

            const currentLevelXP = LEVELS_DB.calculateNextLevelXP(this.student.level - 1);
            const nextLevelXP = LEVELS_DB.calculateNextLevelXP(this.student.level);
            const progress = ((this.student.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
            
            if (this.dom.xpBarFill) {
                this.dom.xpBarFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
            }
        } else {
            this.dom.playerProfile.classList.add('hidden');
        }
    }

    updateModeBanner(mode) {
        if (!this.dom.modeBanner) return;
        const labels = {
            builder: 'Modo Laboratorio: construye átomos y explora la estructura.',
            practice: 'Modo Práctica: sigue la misión guiada paso a paso.',
            timed: 'Modo Supervivencia: completa misiones antes de que se agote el tiempo.',
            guess: 'Modo Adivinanza: responde la pista y elige el elemento correcto.',
            leaderboard: 'Modo Récords: revisa los mejores resultados registrados.'
        };
        this.dom.modeBanner.textContent = labels[mode] || 'Explora los distintos modos de juego.';
        this.dom.modeBanner.classList.toggle('hidden', !mode);
    }

    async switchMode(mode) {
        this.stopTimer();
        this.currentMode = mode;
        this.hideAllGameHUDs();
        this.updateModeBanner(mode);

        if (mode === 'builder') {
            this.resetToBuilder();
            return;
        }

        if (mode === 'leaderboard') {
            if (window.leaderboard) leaderboard.showModal('leaderboard');
            return;
        }

        // Modos competitivos (Supervivencia y Adivinanza) requieren código ZipGrade
        if (mode === 'timed' || mode === 'guess') {
            if (!this.student.code) {
                this.pendingMode = mode;
                if (window.leaderboard) leaderboard.showModal('login');
                return;
            }
        }

        this.startActiveMode(mode);
    }

    startActiveMode(mode) {
        missions.startMode(mode);

        if (mode === 'practice' || mode === 'timed') {
            this.dom.missionHud.classList.remove('hidden');
            if (mode === 'timed') {
                this.dom.missionTimer.classList.remove('hidden');
                this.dom.comboContainer.classList.remove('hidden');
                this.timeLeft = GAME_CONFIG.TIMERS.SURVIVAL_BASE;
                this.startTimer();
            } else {
                if (this.dom.btnHint) this.dom.btnHint.style.display = 'inline-block';
            }
            this.renderMissionStep();
        } else if (mode === 'guess') {
            this.dom.missionHud.classList.add('hidden');
            this.startGuessModeUI();
        }
    }

    renderMissionStep() {
        const mission = missions.getCurrentMission();
        if (!mission) {
            this.handleGameVictory();
            return;
        }

        if (this.dom.missionTitle) this.dom.missionTitle.textContent = mission.title || `Misión ${missions.currentIndex + 1}`;
        if (this.dom.missionObjective) this.dom.missionObjective.textContent = mission.text;

        const progress = missions.getProgress();
        let stepsHtml = '';
        for (let i = 0; i < progress.total; i++) {
            let className = 'step-indicator';
            if (i < progress.current - 1) className += ' completed';
            else if (i === progress.current - 1) className += ' active';
            stepsHtml += `<div class="${className}"></div>`;
        }
        if (this.dom.missionSteps) {
            this.dom.missionSteps.innerHTML = stepsHtml;
        }
    }

    checkMissionConditions() {
        if (this.currentMode !== 'practice' && this.currentMode !== 'timed') return;

        const isCorrect = missions.validateAtomBuild(labAtom);
        if (isCorrect) {
            if (window.sfx && sfx.success) sfx.success();
            if (window.fx) {
                window.fx.screenFlash('success');
                window.fx.floatingText('+100 XP', { x: window.innerWidth / 2, y: window.innerHeight / 2 }, 'xp');
            }

            const basePoints = GAME_CONFIG.SCORING.BASE_POINTS;
            const timeBonus = this.currentMode === 'timed' ? this.timeLeft * GAME_CONFIG.SCORING.TIME_BONUS_MULTIPLIER : 0;
            const earnedPoints = Math.round((basePoints + timeBonus) * this.combo);
            
            this.score += earnedPoints;
            this.addXP(earnedPoints);

            if (this.currentMode === 'timed') {
                this.combo = Math.min(GAME_CONFIG.SCORING.MAX_COMBO, this.combo + GAME_CONFIG.SCORING.COMBO_STEP);
                if (this.dom.comboMultiplier) this.dom.comboMultiplier.textContent = `x${this.combo}`;
            }

            const hasMore = missions.advanceMission();
            if (!hasMore) {
                this.handleGameVictory();
            } else {
                setTimeout(() => this.renderMissionStep(), 600);
            }
        }
    }

    startGuessModeUI() {
        const panel = document.getElementById('guess-mode-panel');
        if (!panel) {
            return;
        }
        panel.classList.remove('hidden');
        this.renderGuessQuestion();
    }

    renderGuessQuestion() {
        const mission = missions.getCurrentMission();
        const panel = document.getElementById('guess-mode-panel');
        if (!mission || !panel) {
            this.handleGameVictory();
            return;
        }

        const options = missions.generateGuessOptions(6);
        const progress = missions.getProgress();

        let optionsHtml = '';
        options.forEach(z => {
            const el = ELEMENTS_DB[z];
            optionsHtml += `
                <button class="cyber-btn guess-option-btn" data-z="${z}" style="margin: 0.5rem; display: inline-flex; width: 45%;">
                    ${el.sym} - ${el.name} (Z=${z})
                </button>
            `;
        });

        panel.innerHTML = `
            <div class="guess-panel-header">
                <span class="guess-panel-step">Pregunta ${progress.current} de ${progress.total}</span>
                <h3>${mission.clue}</h3>
            </div>
            <div class="guess-options-grid">
                ${optionsHtml}
            </div>
        `;

        panel.querySelectorAll('.guess-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedZ = parseInt(btn.dataset.z, 10);
                this.handleGuessSubmission(selectedZ, btn);
            });
        });
    }

    handleGuessSubmission(selectedZ, btnElement) {
        const isCorrect = missions.validateGuess(selectedZ);
        const panel = document.getElementById('guess-mode-panel');

        if (isCorrect) {
            if (window.sfx && sfx.success) sfx.success();
            if (window.fx) {
                window.fx.screenFlash('success');
                window.fx.floatingText('+150 XP', btnElement.getBoundingClientRect(), 'xp');
            }
            btnElement.style.background = 'rgba(57, 255, 20, 0.4)';
            btnElement.style.borderColor = 'var(--neon-green)';
            
            const earned = 150;
            this.score += earned;
            this.addXP(earned);

            setTimeout(() => {
                const hasMore = missions.advanceMission();
                if (!hasMore) {
                    if (panel) panel.classList.add('hidden');
                    this.handleGameVictory();
                } else {
                    this.renderGuessQuestion();
                }
            }, 800);
        } else {
            if (window.sfx && sfx.error) sfx.error();
            if (window.fx) {
                window.fx.shakeElement(btnElement);
                window.fx.screenFlash('error');
            }
            btnElement.style.background = 'rgba(255, 0, 60, 0.4)';
            btnElement.style.borderColor = 'var(--status-unstable)';
            this.combo = 1;
        }
    }

    startTimer() {
        this.stopTimer();
        const startTime = Date.now();
        const durationMs = this.timeLeft * 1000;

        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            this.timeLeft = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
            
            if (this.dom.timeRemaining) {
                const mins = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
                const secs = String(this.timeLeft % 60).padStart(2, '0');
                this.dom.timeRemaining.textContent = `${mins}:${secs}`;
            }

            if (this.timeLeft <= 0) {
                this.stopTimer();
                this.handleGameOver();
            }
        }, 200);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    async handleGameVictory() {
        this.stopTimer();
        if (window.sfx && sfx.victory) sfx.victory();
        if (window.fx) {
            window.fx.screenFlash('levelUp');
            window.fx.spawnQuantumConfetti(120);
        }

        await this.persistScoreIfNeeded();

        if (window.leaderboard) {
            leaderboard.showResults(this.score, "¡Simulación Exitosa!");
        }
    }

    async handleGameOver() {
        if (window.sfx && sfx.error) sfx.error();
        await this.persistScoreIfNeeded();
        if (window.leaderboard) {
            leaderboard.showResults(this.score, "Tiempo Agotado");
        }
        this.resetToBuilder();
    }

    async persistScoreIfNeeded() {
        if (!this.student.code || !window.apiClient) return;
        if (this.currentMode !== 'timed' && this.currentMode !== 'guess') return;

        try {
            const result = await apiClient.guardarPuntaje(
                this.student.code,
                this.student.name || 'Estudiante SJ',
                this.score,
                this.currentMode
            );

            if (result && result.success === false) {
                console.warn('No se pudo guardar el puntaje:', result);
            }
        } catch (error) {
            console.error('Error al guardar el puntaje:', error);
        }
    }

    async handleLogin() {
        const code = this.dom.authCodeInput ? this.dom.authCodeInput.value.trim() : '';
        if (!code) return;

        this.dom.authError.classList.add('hidden');
        this.dom.btnLogin.textContent = 'Verificando...';

        try {
            let res = { valido: false, nombre: '' };
            if (window.apiClient) {
                res = await apiClient.verificarCodigo(code);
            } else {
                res = { valido: true, nombre: `Operador #${code}` };
            }

            if (res.valido) {
                this.student.code = code;
                this.student.name = res.nombre || 'Estudiante SJ';
                
                if (window.leaderboard) leaderboard.closeAllModals();
                this.updatePlayerStatsUI();

                if (window.sfx && sfx.success) sfx.success();

                if (this.pendingMode) {
                    const modeToStart = this.pendingMode;
                    this.pendingMode = null;
                    this.switchMode(modeToStart);
                }
            } else {
                if (window.sfx && sfx.error) sfx.error();
                if (window.fx) window.fx.shakeElement(this.dom.authCodeInput);
                const serverMessage = res.message ? ` ${res.message}` : '';
                this.dom.authError.textContent = `Código de acceso no reconocido.${serverMessage}`;
                this.dom.authError.classList.remove('hidden');
            }
        } catch (e) {
            console.error("Error en login:", e);
            this.dom.authError.textContent = 'Error de conexión con el servidor escolar.';
            this.dom.authError.classList.remove('hidden');
        } finally {
            this.dom.btnLogin.textContent = 'Acceder';
        }
    }

    hideAllGameHUDs() {
        if (this.dom.modeBanner) this.dom.modeBanner.classList.add('hidden');
        if (this.dom.missionHud) this.dom.missionHud.classList.add('hidden');
        if (this.dom.missionTimer) this.dom.missionTimer.classList.add('hidden');
        if (this.dom.comboContainer) this.dom.comboContainer.classList.add('hidden');
        if (this.dom.btnHint) this.dom.btnHint.style.display = 'none';
        
        const guessPanel = document.getElementById('guess-mode-panel');
        if (guessPanel) guessPanel.classList.add('hidden');
    }

    resetToBuilder() {
        this.stopTimer();
        this.currentMode = 'builder';
        this.score = 0;
        this.combo = 1;
        this.hideAllGameHUDs();
        
        this.dom.navBtns.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
            if (btn.dataset.mode === 'builder') {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            }
        });
    }
}

let gameManager;
window.addEventListener('DOMContentLoaded', () => {
    gameManager = new GameManager();
    window.gameManager = gameManager;
});