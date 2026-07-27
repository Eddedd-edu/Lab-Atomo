/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - LEADERBOARD & MODAL CONTROLLER (leaderboard.js)
 * ============================================================================
 * Contiene: La clase LeaderboardManager para controlar la apertura/cierre de 
 * modales, el renderizado de las tablas de clasificación y la gestión de pestañas.
 */

class LeaderboardManager {
    constructor() {
        // Elementos del DOM para el sistema de modales y tablas
        this.dom = {
            modalSystem: document.getElementById('modal-system'),
            modalLogin: document.getElementById('modal-login'),
            modalLeaderboard: document.getElementById('modal-leaderboard'),
            modalResults: document.getElementById('modal-results'),
            
            // Leaderboard específico
            leaderboardBody: document.getElementById('leaderboard-body'),
            tabBtns: document.querySelectorAll('#modal-leaderboard .tab-btn'),
            closeModalBtns: document.querySelectorAll('.close-modal-btn'),
            
            // Resultados de partida
            resultTitle: document.getElementById('result-title'),
            finalScore: document.getElementById('final-score'),
            btnContinue: document.getElementById('btn-continue'),
            
            // Login / Auth
            authCodeInput: document.getElementById('auth-code'),
            btnLogin: document.getElementById('btn-login'),
            authError: document.getElementById('auth-error')
        };

        this.currentActiveBoardMode = 'timed'; // 'timed' (supervivencia) o 'guess' (adivinanza)
        this.init();
    }

    /**
     * Inicializa los eventos de los modales y pestañas.
     */
    init() {
        // Botones de pestañas en el Leaderboard
        this.dom.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (window.sfx && sfx.click) sfx.click();
                
                this.dom.tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Determinar qué modo mostrar basado en el atributo data-target o similar
                const target = btn.dataset.target; // ej. 'board-timed' o 'board-guess'
                this.currentActiveBoardMode = target.includes('timed') ? 'timed' : 'guess';
                
                this.loadLeaderboardData(this.currentActiveBoardMode);
            });
        });

        // Botones de cierre de modales
        this.dom.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.sfx && sfx.click) sfx.click();
                this.closeAllModals();
            });
        });

        // Botón continuar en pantalla de resultados
        if (this.dom.btnContinue) {
            this.dom.btnContinue.addEventListener('click', () => {
                if (window.sfx && sfx.click) sfx.click();
                this.closeAllModals();
                if (window.gameManager) gameManager.resetToBuilder();
            });
        }

        // Click fuera del modal para cerrar (en el overlay)
        this.dom.modalSystem.addEventListener('click', (e) => {
            if (e.target === this.dom.modalSystem) {
                // Opcional: permitir cerrar haciendo click fuera, 
                // excepto si es el login obligatorio.
                if (this.dom.modalLogin.classList.contains('hidden')) {
                    this.closeAllModals();
                }
            }
        });
    }

    /**
     * Muestra un modal específico y oculta los demás.
     * @param {string} modalName - 'login', 'leaderboard', o 'results'
     */
    showModal(modalName) {
        this.dom.modalSystem.classList.remove('hidden');
        
        // Ocultar todos los submodales
        this.dom.modalLogin.classList.add('hidden');
        this.dom.modalLeaderboard.classList.add('hidden');
        this.dom.modalResults.classList.add('hidden');

        // Mostrar el solicitado
        if (modalName === 'login') {
            this.dom.modalLogin.classList.remove('hidden');
            if (this.dom.authCodeInput) this.dom.authCodeInput.focus();
        } else if (modalName === 'leaderboard') {
            this.dom.modalLeaderboard.classList.remove('hidden');
            this.loadLeaderboardData(this.currentActiveBoardMode);
        } else if (modalName === 'results') {
            this.dom.modalResults.classList.remove('hidden');
        }
    }

    /**
     * Cierra completamente el sistema de modales.
     */
    closeAllModals() {
        this.dom.modalSystem.classList.add('hidden');
        this.dom.modalLogin.classList.add('hidden');
        this.dom.modalLeaderboard.classList.add('hidden');
        this.dom.modalResults.classList.add('hidden');
    }

    /**
     * Carga y renderiza los datos del ranking solicitándoselos a la API (o mock si falla).
     * @param {string} mode - 'timed' o 'guess'
     */
    async loadLeaderboardData(mode) {
        // Limpiar tabla y mostrar estado de carga
        this.dom.leaderboardBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    <i class="fas fa-spinner fa-spin"></i> Sincronizando telemetría remota...
                </td>
            </tr>
        `;

        try {
            let data = [];
            if (window.apiClient) {
                data = await apiClient.getRanking(mode);
            }

            // Fallback si la API no responde o retorna vacío
            if (!data || data.length === 0) {
                data = this._getMockLeaderboard(mode);
            }

            this.renderLeaderboardTable(data);
        } catch (error) {
            console.error("Error al cargar récords:", error);
            this.dom.leaderboardBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--status-unstable); padding: 2rem;">
                        <i class="fas fa-exclamation-triangle"></i> Error de conexión con Google Sheets.
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Renderiza las filas de la tabla con formato cibernético.
     * @param {Array<Object>} records - Array de objetos { nombre, puntaje, precision }
     */
    renderLeaderboardTable(records) {
        if (!records || records.length === 0) {
            this.dom.leaderboardBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        No hay registros en esta terminal todavía. ¡Sé el primero!
                    </td>
                </tr>
            `;
            return;
        }

        // Ordenar por puntaje de mayor a menor
        records.sort((a, b) => b.puntaje - a.puntaje);

        let html = '';
        records.forEach((record, index) => {
            const rank = index + 1;
            let rankBadge = `#${rank}`;
            
            // Iconos especiales para el Top 3
            if (rank === 1) rankBadge = `<i class="fas fa-crown" style="color: var(--neon-yellow);"></i> #1`;
            if (rank === 2) rankBadge = `<i class="fas fa-medal" style="color: #c0c0c0;"></i> #2`;
            if (rank === 3) rankBadge = `<i class="fas fa-medal" style="color: #cd7f32;"></i> #3`;

            html += `
                <tr>
                    <td><strong>${rankBadge}</strong></td>
                    <td>${this._escapeHtml(record.nombre || 'Operador Anónimo')}</td>
                    <td><span style="font-family: var(--font-display); font-weight: 700; color: var(--neon-cyan);">${record.puntaje}</span> XP</td>
                    <td>${record.precision ? record.precision + '%' : '100%'}</td>
                </tr>
            `;
        });

        this.dom.leaderboardBody.innerHTML = html;
    }

    /**
     * Muestra la pantalla de resultados al finalizar una partida.
     * @param {number} score - Puntuación obtenida
     * @param {string} title - Título del modal (ej. "¡Supervivencia Completada!")
     */
    showResults(score, title = "Simulación Completada") {
        this.dom.resultTitle.textContent = title;
        this.dom.finalScore.textContent = score;
        this.showModal('results');
    }

    /**
     * Genera datos simulados (Mock) por si la API de Google Sheets aún no está configurada.
     * @private
     */
    _getMockLeaderboard(mode) {
        return [
            { nombre: "Edison Avendaño", puntaje: 3500, precision: 98 },
            { nombre: "Paola Castañeda", puntaje: 3100, precision: 95 },
            { nombre: "Kelly Joana", puntaje: 2850, precision: 90 },
            { nombre: "Estudiante SJ #104", puntaje: 2400, precision: 85 },
            { nombre: "Estudiante SJ #112", puntaje: 1950, precision: 80 }
        ];
    }

    /**
     * Helper para prevenir inyecciones HTML (XSS básico).
     * @private
     */
    _escapeHtml(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
}

// Instanciar globalmente
let leaderboard;
window.addEventListener('DOMContentLoaded', () => {
    leaderboard = new LeaderboardManager();
});
