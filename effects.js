/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - VISUAL EFFECTS MANAGER (effects.js)
 * ============================================================================
 * Contiene: La clase EffectsManager encargada de instanciar feedback visual
 * efímero, como destellos, confeti cuántico (level up), textos flotantes 
 * de puntos (XP) y sacudidas de error.
 */

class EffectsManager {
    constructor() {
        // Paleta de colores Sci-Fi extraída del theme para las partículas
        this.quantumColors = [
            '#00f3ff', // neon-blue
            '#b026ff', // neon-purple
            '#0ff0fc', // neon-cyan
            '#ff007f', // neon-pink
            '#39ff14', // neon-green
            '#ffea00'  // neon-yellow
        ];
    }

    /**
     * Dispara un destello a pantalla completa para indicar un evento (éxito/daño).
     * @param {string} type - 'success' (verde/cian) o 'error' (rojo) o 'levelUp' (dorado)
     */
    screenFlash(type = 'success') {
        const overlay = document.createElement('div');
        let color = 'rgba(0, 243, 255, 0.4)'; // Default cyan
        
        if (type === 'error') color = 'rgba(255, 0, 60, 0.4)'; // Unstable red
        if (type === 'levelUp') color = 'rgba(255, 234, 0, 0.3)'; // Yellow glow
        if (type === 'success') color = 'rgba(57, 255, 20, 0.3)'; // Green glow

        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: radial-gradient(circle at center, ${color} 0%, transparent 80%);
            pointer-events: none;
            z-index: 9999;
            opacity: 1;
        `;
        document.body.appendChild(overlay);

        // Animación de desvanecimiento usando Web Animations API
        const animation = overlay.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 400, easing: 'ease-out' }
        );

        animation.onfinish = () => overlay.remove();
    }

    /**
     * Genera una explosión de "confeti cuántico" para celebrar logros mayores o subidas de nivel.
     * @param {number} amount - Cantidad de partículas a generar
     */
    spawnQuantumConfetti(amount = 80) {
        const container = document.createElement('div');
        container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 9998; overflow: hidden;';
        document.body.appendChild(container);

        for (let i = 0; i < amount; i++) {
            const particle = document.createElement('div');
            const color = this.quantumColors[Math.floor(Math.random() * this.quantumColors.length)];
            const size = Math.random() * 8 + 4; // Entre 4px y 12px
            
            // Forma aleatoria: círculo u obelisco (línea)
            const isCircle = Math.random() > 0.5;
            
            particle.style.cssText = `
                position: absolute;
                top: 50%; left: 50%;
                width: ${size}px; height: ${isCircle ? size : size * 3}px;
                background: ${color};
                border-radius: ${isCircle ? '50%' : '2px'};
                box-shadow: 0 0 10px ${color};
                transform: translate(-50%, -50%);
            `;
            
            container.appendChild(particle);

            // Físicas de explosión radial aleatoria
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 1000 + 300; // Distancia de viaje
            const duration = Math.random() * 1500 + 1000; // 1s a 2.5s
            const rotation = Math.random() * 720 - 360; // Rotación aleatoria

            const destX = Math.cos(angle) * velocity;
            const destY = Math.sin(angle) * velocity;

            // Animar partícula individual
            const animation = particle.animate([
                { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)', opacity: 1 },
                { transform: `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) rotate(${rotation}deg) scale(0)`, opacity: 0 }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)', // Desaceleración rápida
                fill: 'forwards'
            });

            // Limpieza individual no es necesaria, borramos el contenedor completo
        }

        // Limpieza global del contenedor de partículas tras la máxima duración
        setTimeout(() => container.remove(), 2600);
    }

    /**
     * Muestra texto flotante en la pantalla (Ej: "+100 XP" o "¡Combo x3!").
     * @param {string} text - El texto a mostrar
     * @param {Event|Object} origin - El evento del ratón (para coordenadas) o un objeto {x, y}
     * @param {string} type - Tipo de mensaje: 'xp', 'combo', 'error'
     */
    floatingText(text, origin, type = 'xp') {
        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;

        // Si se provee un evento de ratón, usar esas coordenadas
        if (origin && origin.clientX !== undefined) {
            x = origin.clientX;
            y = origin.clientY;
        } else if (origin && origin.x !== undefined) {
            x = origin.x;
            y = origin.y;
        }

        const el = document.createElement('div');
        
        // Estilos base según tipo
        let color = 'var(--neon-green)';
        let fontSize = '1.5rem';
        let shadow = 'var(--neon-green)';
        
        if (type === 'combo') { color = 'var(--neon-yellow)'; fontSize = '2.5rem'; shadow = 'var(--neon-orange)'; }
        if (type === 'error') { color = 'var(--status-unstable)'; fontSize = '1.2rem'; shadow = 'red'; }

        el.textContent = text;
        el.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            color: ${color};
            font-family: var(--font-display);
            font-size: ${fontSize};
            font-weight: 900;
            text-shadow: 0 0 10px ${shadow};
            pointer-events: none;
            z-index: 10000;
            transform: translate(-50%, -50%);
            white-space: nowrap;
        `;
        document.body.appendChild(el);

        // Subir y desvanecer
        const animation = el.animate([
            { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0, offset: 0 },
            { transform: 'translate(-50%, -80%) scale(1.2)', opacity: 1, offset: 0.2 },
            { transform: 'translate(-50%, -150%) scale(1)', opacity: 0, offset: 1 }
        ], {
            duration: 1200,
            easing: 'ease-out'
        });

        animation.onfinish = () => el.remove();
    }

    /**
     * Aplica una animación de sacudida (shake) a un elemento específico para indicar error.
     * Utiliza la clase definida en animations.css.
     * @param {HTMLElement} element - El elemento del DOM a sacudir.
     */
    shakeElement(element) {
        if (!element) return;
        element.classList.remove('shake-error');
        // Forzar reflow para reiniciar la animación
        void element.offsetWidth;
        element.classList.add('shake-error');

        // Limpiar la clase después de que termine la animación (400ms en CSS)
        setTimeout(() => {
            element.classList.remove('shake-error');
        }, 400);
    }
}

// Exportar como Singleton global
let fx;
window.addEventListener('DOMContentLoaded', () => {
    fx = new EffectsManager();
});
