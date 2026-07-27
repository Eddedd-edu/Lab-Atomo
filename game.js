/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - MASTER GAME MANAGER (game.js)
 * ============================================================================
 * Contiene: La clase GameManager que unifica todos los módulos (UI, Engine, 
 * Audio, Missions, Effects, ApiClient) para coordinar el ciclo de vida completo 
 * de la aplicación y sus modos de juego.
 */

class GameManager {
    constructor() {
        // Estado de sesión del estudiante / operador
        this.student = {
            code: null,
            name: null,
            xp: 0,
            level: 1
        };

        this.currentMode = 'builder'; // 'builder', 'practice', 'timed', 'guess'
        this.pendingMode = null;      // Modo al que intentaba entrar antes de loguearse
        
        // Estado de la partida activa
        this.score = 0;
        this.timeLeft = 0;
        this.timerInterval = null;
        this.combo = 1;
        
        // Elementos específicos del DOM para HUDs de juego
        this.dom = {
            missionHud: document.getElementById('mission-hud'),
            missionTitle: document.getElementById('mission-title'),
            missionObjective: document.getElementById('mission-objective'),
            missionSteps: document.getElementById('mission-steps'),
            btnHint: document.getElementById('btn-hint'),
            
            // Temporizador y Combo
            missionTimer: document.getElementById('mission-timer'),
            timeRemaining: document.getElementById('time-remaining'),
            comboContainer: document.getElementById('combo-container'),
            comboMultiplier: document.getElementById('combo-multiplier'),
            
            // Paneles de juego interactivo alternativos (Adivinanza)
            guessPanel: null, // Se puede inyectar o manejar por DOM directo
            
            // Login Modal elements
            authCodeInput: document.getElementById('auth-code'),
            btnLogin: document.getElementById('btn-login'),
            authError: document.getElementById('auth-error'),
            playerProfile: document.getElementById('player-profile'),
            playerName: document.getElementById('player-name'),
            playerLevel: document.getElementById('player-level'),
            xpBarFill: document.getElementById('xp-bar-fill')
        };

        this.init();
    }

    /**
     * Inicializa los escuchas globales y prepara el sistema.
     */
    init() {
        this.bindEvents();
        this.loadLocalProgress();
    }

    /**
     * Enlaza eventos de autenticación y controles de misiones.
     */
    bindEvents() {
        // Botón de login en el modal
        if (this.dom.btnLogin) {
            this.dom.btnLogin.addEventListener('click', () => this.handleLogin());
        }
        if (this.dom.authCodeInput) {
            this.dom.authCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }

        // Botón de pista en modo práctica
        if (this.dom.btnHint) {
            this.dom.btnHint.addEventListener('click', () => {
                const mission = missions.getCurrentMission();
                if (mission && mission.hint && window.fx) {
                    window.fx.floatingText(`Pista: ${mission.hint}`, { x: window.innerWidth / 2, y: 150 }, 'combo');
                    if (window.sfx && sfx.click) sfx.click();
                }
            });
        }
    }

    /**
     * Carga el progreso local (XP y Nivel) desde el LocalStorage del navegador.
     */
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

    /**
     * Guarda la XP actual en LocalStorage.
     */
    saveLocalProgress() {
        try {
            localStorage.setItem('atomoquest_xp', this.student.xp);
        } catch (e) {
            console.warn("No se pudo guardar en LocalStorage:", e);
        }
    }

    /**
     * Otorga XP al operador, calcula subidas de nivel y dispara efectos visuales.
     * @param {number} amount 
     */
    addXP(amount) {
        const oldLevel = this.student.level;
        this.student.xp += amount;
        this.student.level = LEVELS_DB.calculateLevel(this.student.xp);

        this.saveLocalProgress();
        this.updatePlayerStatsUI();

        // Si subió de nivel, celebrar por todo lo alto
        if (this.student.level > oldLevel) {
            if (window.sfx && sfx.levelUp) sfx.levelUp();
            if (window.fx) {
                window.fx.screenFlash('levelUp');
                window.fx.spawnQuantumConfetti(100);
                window.fx.floatingText(`¡Nivel ${this.student.level}!`, { x: window.innerWidth / 2, y: window.innerHeight / 3 }, 'combo');
            }
        }
    }

    /**
     * Actualiza la interfaz del perfil del jugador (barra de XP y nivel).
     */
    updatePlayerStatsUI() {
        if (!this.dom.playerProfile) return;

        if (this.student.name) {
            this.dom.playerProfile.classList.remove('hidden');
            this.dom.playerName.textContent = this.student.name;
            this.dom.playerLevel.textContent = this.student.level;

            // Calcular porcentaje para la barra de XP
            const currentLevelXP = LEVELS_DB.calculateNextLevelXP(this.student.level - 1);
            const nextLevelXP = LEVELS_DB.calculateNextLevelXP(this.student.level);
            const progress = ((this.student.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
            
            if (this.dom.xpBarFill) {
                this.dom.xpBarFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
            }
        }
    }

    /**
     * Cambia el modo de juego activo desde la barra de navegación superior.
     * @param {string} mode - 'builder', 'practice', 'timed', 'guess', o 'leaderboard'
     */
    async switchMode(mode) {
        this.stopTimer();
        this.currentMode = mode;
        this.hideAllGameHUDs();

        if (mode === 'builder') {
            // Laboratorio libre
            this.resetToBuilder();
            return;
        }

        if (mode === 'leaderboard') {
            if (window.leaderboard) leaderboard.showModal('leaderboard');
            return;
        }

        // Modos que requieren autenticación previa (ZipGrade)
        if (mode === 'timed' || mode === 'guess') {
            if (!this.student.code) {
                this.pendingMode = mode;
                if (window.leaderboard) leaderboard.showModal('login');
                return;
            }

            // Comprobar si ya jugó en la nube
            if (window.apiClient) {
                const alreadyPlayed = await apiClient.yaJugo(this.student.code, mode);
                if (alreadyPlayed) {
                    alert(`El operador ${this.student.name} ya completó su intento en este modo competitivo.`);
                    this.switchMode('builder');
                    return;
                }
            }
        }

        // Inicializar el modo seleccionado
        this.startActiveMode(mode);
    }

    /**
     * Inicia un modo de juego tras pasar validaciones.
     * @param {string} mode 
     */
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
                this.dom.btnHint.style.display = 'inline-block';
            }
            this.renderMissionStep();
        } else if (mode === 'guess') {
            // Mostrar interfaz de adivinanza (creada dinámicamente o gestionada)
            this.startGuessModeUI();
        }
    }

    /**
     * Renderiza la misión actual en el HUD inferior.
     */
    renderMissionStep() {
        const mission = missions.getCurrentMission();
        if (!mission) {
            this.handleGameVictory();
            return;
        }

        this.dom.missionTitle.textContent = mission.title || `Misión ${missions.currentIndex + 1}`;
        this.dom.missionObjective.textContent = mission.text;

        // Renderizar barritas de progreso
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

    /**
     * Llamado desde ui.js cada vez que el usuario modifica el átomo en el laboratorio.
     */
    checkMissionConditions() {
        if (this.currentMode !== 'practice' && this.currentMode !== 'timed') return;

        const isCorrect = missions.validateAtomBuild(labAtom);
        if (isCorrect) {
            // ¡Misión cumplida!
            if (window.sfx && sfx.success) sfx.success();
            if (window.fx) {
                window.fx.screenFlash('success');
                window.fx.floatingText('+100 XP', { x: window.innerWidth / 2, y: window.innerHeight / 2 }, 'xp');
            }

            // Calcular Puntos y XP
            const basePoints = GAME_CONFIG.SCORING.BASE_POINTS;
            const timeBonus = this.currentMode === 'timed' ? this.timeLeft * GAME_CONFIG.SCORING.TIME_BONUS_MULTIPLIER : 0;
            const earnedPoints = Math.round((basePoints + timeBonus) * this.combo);
            
            this.score += earnedPoints;
            this.addXP(earnedPoints);

            // Incrementar combo en modo survival
            if (this.currentMode === 'timed') {
                this.combo = Math.min(GAME_CONFIG.SCORING.MAX_COMBO, this.combo + GAME_CONFIG.SCORING.COMBO_STEP);
                if (this.dom.comboMultiplier) this.dom.comboMultiplier.textContent = `x${this.combo}`;
            }

            // Avanzar a la siguiente misión
            const hasMore = missions.advanceMission();
            if (!hasMore) {
                this.handleGameVictory();
            } else {
                // Breve pausa y cargar siguiente
                setTimeout(() => this.renderMissionStep(), 600);
            }
        }
    }

    // ==========================================
    // MODO ADIVINANZA (GUESS)
    // ==========================================
    startGuessModeUI() {
        // Crear un panel flotante dinámico para adivinanzas si no existe
        let panel = document.getElementById('guess-mode-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'guess-mode-panel';
            panel.className = 'glass-panel slide-in-bottom';
            panel.style.cssText = `
                position: absolute; top: 100px; left: 50%; transform: translateX(-50%);
                width: 90%; max-width: 600px; z-index: 50; text-align: center; padding: 2rem;
            `;
            document.getElementById('app-container').appendChild(panel);
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
            <span style="color: var(--neon-cyan); font-family: var(--font-display);">Pregunta ${progress.current} de ${progress.total}</span>
            <h3 style="margin: 1rem 0; font-size: 1.3rem; color: var(--text-highlight);">${mission.clue}</h3>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin-top: 1.5rem;">
                ${optionsHtml}
            </div>
        `;

        // Asignar eventos a los botones de opción
        panel.querySelectorAll('.guess-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
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

    // ==========================================
    // TEMPORIZADORES Y FLUJO DE PARTIDA
    // ==========================================
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

        // Guardar puntaje en la nube si está logueado en modo competitivo
        if ((this.currentMode === 'timed' || this.currentMode === 'guess') && this.student.code && window.apiClient) {
            try {
                await apiClient.guardarPuntaje(this.student.code, this.student.name, this.score, this.currentMode);
            } catch (e) {
                console.error("No se pudo guardar el puntaje en Google Sheets:", e);
            }
        }

        if (window.leaderboard) {
            leaderboard.showResults(this.score, "¡Simulación Exitosa!");
        }
    }

    handleGameOver() {
        if (window.sfx && sfx.error) sfx.error();
        if (window.leaderboard) {
            leaderboard.showResults(this.score, "Tiempo Agotado");
        }
        this.resetToBuilder();
    }

    /**
     * Autenticación del estudiante mediante código ZipGrade.
     */
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
                this.student.name = res.nombre;
                
                if (window.leaderboard) leaderboard.closeAllModals();
                this.updatePlayerStatsUI();

                if (window.sfx && sfx.success) sfx.success();

                // Reanudar el modo pendiente que intentaba abrir
                if (this.pendingMode) {
                    const modeToStart = this.pendingMode;
                    this.pendingMode = null;
                    this.switchMode(modeToStart);
                }
            } else {
                if (window.sfx && sfx.error) sfx.error();
                if (window.fx) window.fx.shakeElement(this.dom.authCodeInput);
                this.dom.authError.textContent = 'Código de acceso no reconocido.';
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
        
        // Sincronizar botones de navegación en la UI
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === 'builder') btn.classList.add('active');
        });
    }
}

// Instanciar globalmente y exponer como window.gameManager
let gameManager;
window.addEventListener('DOMContentLoaded', () => {
    gameManager = new GameManager();
});
