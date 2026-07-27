/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - UI & HUD CONTROLLER (ui.js)
 * ============================================================================
 * Contiene: Manejo de eventos del DOM, lógica de botones con presión continua
 * (hold), actualización de la telemetría espacial e integración con el motor gráfico.
 */

class UIController {
    constructor() {
        // Caché de elementos del DOM para máximo rendimiento (evita re-queries)
        this.dom = {
            // Contadores
            countP: document.getElementById('count-p'),
            countN: document.getElementById('count-n'),
            countE: document.getElementById('count-e'),
            
            // Telemetría
            dataA: document.getElementById('data-a'),
            dataZ: document.getElementById('data-z'),
            dataSymbol: document.getElementById('data-symbol'),
            dataCharge: document.getElementById('data-charge'),
            dataName: document.getElementById('data-name'),
            
            // Estados
            statusStability: document.getElementById('status-stability'),
            statusIon: document.getElementById('status-ion'),
            configDisplay: document.getElementById('electronic-config'),
            
            // Controles
            btnNeutralize: document.getElementById('btn-neutralize'),
            stepperBtns: document.querySelectorAll('.stepper-btn'),
            navBtns: document.querySelectorAll('.nav-btn')
        };

        // Variables para la lógica de pulsación continua (Hold)
        this.holdTimeout = null;
        this.holdInterval = null;
        this.isHolding = false;
        
        // Estado previo para detectar cambios de fase (Ej: Inestable -> Estable)
        this.previousStability = 'unstable';
    }

    /**
     * Inicializa los listeners y fuerza un primer renderizado del HUD.
     */
    init() {
        this.bindEvents();
        this.updateHUD(); // Render inicial basado en el labAtom por defecto
    }

    /**
     * Enlaza todos los eventos táctiles, de ratón y de teclado.
     */
    bindEvents() {
        // Eventos para los botones de partículas (+ / -)
        this.dom.stepperBtns.forEach(btn => {
            // Prevenir el menú contextual en móviles al mantener presionado
            btn.addEventListener('contextmenu', e => e.preventDefault());
            
            // Iniciar pulsación (Soporte multi-dispositivo)
            btn.addEventListener('mousedown', e => this.startHold(e, btn));
            btn.addEventListener('touchstart', e => this.startHold(e, btn), { passive: false });
            
            // Finalizar pulsación
            ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => {
                btn.addEventListener(ev, () => this.stopHold());
            });

            // Sonido de hover
            btn.addEventListener('mouseenter', () => {
                if (window.sfx && window.sfx.hover) window.sfx.hover();
            });
        });

        // Botón estabilizar carga (uso de optional chaining por si no existe el elemento)
        this.dom.btnNeutralize?.addEventListener('click', () => {
            if (window.sfx && window.sfx.click) window.sfx.click();
            if (window.labAtom) window.labAtom.neutralize();
            this.processStateChange();
        });

        // Botones de Navegación (Modos de Juego)
        this.dom.navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (window.sfx && window.sfx.click) window.sfx.click();
                
                // Actualizar estado visual de los botones
                this.dom.navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const mode = btn.dataset.mode;
                if (window.gameManager) window.gameManager.switchMode(mode);
            });
            
            btn.addEventListener('mouseenter', () => {
                if (window.sfx && window.sfx.hover) window.sfx.hover();
            });
        });
    }

    /**
     * Lógica para cuando el usuario mantiene presionado un botón de sumar/restar.
     */
    startHold(event, button) {
        event.preventDefault(); // Evitar scroll o zoom en móviles
        if (this.isHolding) return;
        this.isHolding = true;

        const particleType = button.dataset.particle; // 'p', 'n', o 'e'
        const delta = button.classList.contains('plus') ? 1 : -1;

        // Ejecución inmediata del primer click
        this.modifyParticle(particleType, delta);

        // Configurar repetición si mantiene presionado
        this.holdTimeout = setTimeout(() => {
            this.holdInterval = setInterval(() => {
                this.modifyParticle(particleType, delta);
            }, 80); // Velocidad de repetición: 80ms
        }, 350); // Retraso inicial para distinguir entre click y hold: 350ms
    }

    /**
     * Detiene los temporizadores de pulsación continua.
     */
    stopHold() {
        clearTimeout(this.holdTimeout);
        clearInterval(this.holdInterval);
        this.isHolding = false;
    }

    /**
     * Modifica la partícula solicitada, reproduce sonido y actualiza el ecosistema.
     */
    modifyParticle(type, delta) {
        // Verificar que el átomo de laboratorio existe
        if (!window.labAtom) return;

        // Sonidos diferenciados por tipo de acción
        if (window.sfx) {
            if (delta > 0 && window.sfx.addParticle) window.sfx.addParticle();
            else if (delta < 0 && window.sfx.removeParticle) window.sfx.removeParticle();
        }

        // Actualizar modelo de dominio
        window.labAtom.updateParticle(type, delta);
        
        // Disparar cascada de actualizaciones (UI + Canvas)
        this.processStateChange();
    }

    /**
     * Orquesta la actualización de UI y Motor Gráfico tras un cambio de estado.
     */
    processStateChange() {
        this.updateHUD();
        
        // Forzar actualización inmediata del motor gráfico expuesto globalmente
        if (window.engine && window.labAtom) {
            window.engine.updateStructure(window.labAtom);
        }
        
        // Comprobar condiciones del modo de juego actual
        if (window.gameManager) {
            window.gameManager.checkMissionConditions();
        }
    }

    /**
     * Extrae la telemetría de `labAtom` e inyecta los datos en el DOM (HUD).
     */
    updateHUD() {
        if (!window.labAtom) return;
        const data = window.labAtom.getTelemetry();

        // 1. Contadores base
        this.dom.countP.textContent = data.protons;
        this.dom.countN.textContent = data.neutrons;
        this.dom.countE.textContent = data.electrons;

        // 2. Telemetría Principal
        this.dom.dataA.textContent = data.mass;
        this.dom.dataZ.textContent = data.protons;
        this.dom.dataSymbol.textContent = data.symbol;
        
        // Formatear carga (añadir '+' si es positivo)
        const chargeStr = data.charge > 0 ? `+${data.charge}` : `${data.charge}`;
        this.dom.dataCharge.textContent = chargeStr;
        
        // Color dinámico para la carga
        this.dom.dataCharge.style.color = data.charge === 0 
            ? 'var(--status-neutral)' 
            : data.charge > 0 ? 'var(--color-proton)' : 'var(--color-electron)';

        this.dom.dataName.textContent = data.fullName;
        this.dom.configDisplay.innerHTML = data.configuration;

        // 3. Etiquetas de Estado (Estabilidad Nucleónica)
        let stabilityText = 'Desconocido';
        this.dom.statusStability.className = 'status-value'; // Reset classes
        
        if (data.stability === 'stable') {
            stabilityText = 'Estable';
            this.dom.statusStability.classList.add('stable');
            if (this.previousStability !== 'stable') this.triggerStableGlow();
        } else if (data.stability === 'radioactive') {
            stabilityText = 'Radiactivo';
            this.dom.statusStability.classList.add('radioactive');
        } else {
            stabilityText = 'Inestable';
            this.dom.statusStability.classList.add('unstable');
        }
        
        this.dom.statusStability.textContent = stabilityText;
        this.previousStability = data.stability;

        // 4. Etiquetas de Ionización
        this.dom.statusIon.className = 'status-value';
        let ionText = 'Neutro';
        if (data.ionType === 'cation') {
            ionText = 'Catión';
            this.dom.statusIon.classList.add('unstable');
        } else if (data.ionType === 'anion') {
            ionText = 'Anión';
            this.dom.statusIon.classList.add('unstable');
        } else {
            this.dom.statusIon.classList.add('neutral');
        }
        this.dom.statusIon.textContent = ionText;
    }

    /**
     * Dispara un destello visual en la interfaz cuando el usuario forma un átomo estable.
     */
    triggerStableGlow() {
        const viewport = document.getElementById('atom-viewport');
        if (!viewport) return;

        if (window.sfx && window.sfx.stabilize) window.sfx.stabilize();

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background: radial-gradient(circle, rgba(0, 255, 163, 0.4) 0%, transparent 70%);
            pointer-events: none;
            z-index: 99;
            opacity: 1;
            transition: opacity 0.5s ease-out;
        `;
        viewport.appendChild(overlay);

        requestAnimationFrame(() => {
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 500);
            }, 50);
        });
    }
}

// Instanciar y exportar globalmente al cargar el DOM
let ui;
window.addEventListener('DOMContentLoaded', () => {
    ui = new UIController();
    ui.init();
});
