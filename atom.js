/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - QUANTUM RENDER ENGINE (atom.js)
 * ============================================================================
 * Contiene: Motor de renderizado Canvas 2D. Dibuja órbitas, electrones con
 * estelas (trails) y un núcleo con disposición empaquetada y vibración.
 */

/**
 * @class Nucleon
 * @description Representa un protón o neutrón en el núcleo.
 */
class Nucleon {
    /**
     * @param {string} type - 'p' (protón) o 'n' (neutrón)
     * @param {number} index - Índice para el cálculo de la Espiral de Fermat
     */
    constructor(type, index) {
        this.type = type;
        this.radius = PHYSICS_CONFIG.NUCLEUS.BASE_RADIUS;
        this.color = type === 'p' ? PHYSICS_CONFIG.COLORS.PROTON : PHYSICS_CONFIG.COLORS.NEUTRON;
        
        // Cálculo de posición usando la Espiral de Fermat para un empaquetamiento natural
        const goldenAngle = 137.508 * (Math.PI / 180);
        const radiusOffset = PHYSICS_CONFIG.NUCLEUS.SPACING_FACTOR * Math.sqrt(index);
        const theta = index * goldenAngle;
        
        this.baseX = Math.cos(theta) * radiusOffset;
        this.baseY = Math.sin(theta) * radiusOffset;
        
        // Factores de fase aleatorios para desfasar la vibración
        this.phaseX = Math.random() * Math.PI * 2;
        this.phaseY = Math.random() * Math.PI * 2;
    }

    /**
     * Actualiza y dibuja el nucleón aplicando vibración cuántica.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} centerX 
     * @param {number} centerY 
     * @param {number} time - Tiempo global del motor
     */
    render(ctx, centerX, centerY, time) {
        // Añadir vibración tipo movimiento browniano/cuántico
        const vibX = Math.sin(time * 5 + this.phaseX) * PHYSICS_CONFIG.NUCLEUS.VIBRATION_INTENSITY;
        const vibY = Math.cos(time * 4.5 + this.phaseY) * PHYSICS_CONFIG.NUCLEUS.VIBRATION_INTENSITY;
        
        const x = centerX + this.baseX + vibX;
        const y = centerY + this.baseY + vibY;

        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        
        // Efecto de iluminación y sombreado
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset para no afectar otros elementos
    }
}

/**
 * @class Electron
 * @description Representa un electrón en órbita con cálculos de estela (trail).
 */
class Electron {
    /**
     * @param {number} orbitRadius - Radio de la capa (n)
     * @param {number} initialAngle - Ángulo inicial de fase
     * @param {number} speed - Velocidad angular
     */
    constructor(orbitRadius, initialAngle, speed) {
        this.radius = orbitRadius;
        this.angle = initialAngle;
        this.speed = speed;
        this.history = []; // Almacena posiciones previas para la estela
        this.color = PHYSICS_CONFIG.COLORS.ELECTRON;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} centerX 
     * @param {number} centerY 
     */
    render(ctx, centerX, centerY) {
        // 1. Actualizar física
        this.angle += this.speed;
        const x = centerX + Math.cos(this.angle) * this.radius;
        const y = centerY + Math.sin(this.angle) * this.radius;

        // 2. Actualizar historial de estela
        this.history.push({ x, y });
        if (this.history.length > PHYSICS_CONFIG.ORBITS.TRAIL_LENGTH) {
            this.history.shift(); // Mantener tamaño fijo del array
        }

        // 3. Dibujar estela (Trail)
        if (this.history.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for (let i = 1; i < this.history.length; i++) {
                ctx.lineTo(this.history[i].x, this.history[i].y);
            }
            
            // Gradiente lineal simple a lo largo del path para desvanecimiento
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = PHYSICS_CONFIG.ELECTRON.RADIUS;
            
            // Simular desvanecimiento cambiando la opacidad (alpha) progresivamente
            // Para alto rendimiento, usamos lineTo en lugar de dibujar esferas separadas
            ctx.strokeStyle = `rgba(0, 229, 255, 0.4)`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // 4. Dibujar el núcleo del electrón (punto brillante)
        ctx.beginPath();
        ctx.arc(x, y, PHYSICS_CONFIG.ELECTRON.RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; // Centro blanco supercaliente
        ctx.shadowBlur = PHYSICS_CONFIG.ELECTRON.GLOW_SIZE;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

/**
 * @class QuantumEngine
 * @description Gestor principal del Canvas, orquesta el ciclo de vida (render loop).
 */
class QuantumEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        // alpha: false mejora el rendimiento si el canvas tiene fondo sólido, pero aquí necesitamos transparencia
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        
        this.width = 0;
        this.height = 0;
        this.centerX = 0;
        this.centerY = 0;
        this.time = 0;
        this.animationFrameId = null;
        
        // Pools de entidades
        this.nucleons = [];
        this.electrons = [];
        this.activeOrbits = 0;

        this.init();
    }

    /**
     * Inicializa el motor, maneja el pixel ratio y arranca el ciclo.
     */
    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.loop();
    }

    /**
     * Ajusta el canvas considerando la densidad de píxeles (Retina/4K).
     */
    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        
        // Dimensiones lógicas
        this.width = rect.width;
        this.height = rect.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;

        // Dimensiones físicas
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        
        // Escalar el contexto para trabajar con dimensiones lógicas
        this.ctx.scale(dpr, dpr);
    }

    /**
     * Reconstruye las entidades gráficas a partir del estado lógico del átomo.
     * @param {AtomState} atomState - Instancia global labAtom
     */
    updateStructure(atomState) {
        // 1. Reconstruir Núcleo
        this.nucleons = [];
        // Mezclar protones y neutrones para que no queden agrupados por tipo
        const totalNucleons = atomState.protons + atomState.neutrons;
        let pCount = 0;
        let nCount = 0;
        
        for (let i = 0; i < totalNucleons; i++) {
            // Alternar para asegurar distribución homogénea
            if ((i % 2 === 0 && pCount < atomState.protons) || nCount >= atomState.neutrons) {
                this.nucleons.push(new Nucleon('p', i));
                pCount++;
            } else {
                this.nucleons.push(new Nucleon('n', i));
                nCount++;
            }
        }
        
        // Ordenar inversamente por distancia para que los elementos centrales se dibujen al final (arriba)
        this.nucleons.reverse();

        // 2. Reconstruir Electrones
        this.electrons = [];
        const shells = atomState.shellDistribution;
        this.activeOrbits = shells.length;
        
        shells.forEach((electronCount, shellIndex) => {
            const radius = PHYSICS_CONFIG.ORBITS.RADII[shellIndex];
            // Disminuir la velocidad en órbitas exteriores
            const speed = PHYSICS_CONFIG.ORBITS.BASE_SPEED - (shellIndex * PHYSICS_CONFIG.ORBITS.SPEED_DECAY);
            
            for (let i = 0; i < electronCount; i++) {
                // Distribuir equitativamente en el ángulo de la órbita
                const initialAngle = (i / electronCount) * Math.PI * 2;
                this.electrons.push(new Electron(radius, initialAngle, speed));
            }
        });
    }

    /**
     * Dibuja los anillos tenues de los orbitales activos.
     */
    renderOrbits() {
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = PHYSICS_CONFIG.COLORS.ORBIT;
        // setLineDash crea el efecto de línea punteada tecnológica
        this.ctx.setLineDash([4, 6]); 

        for (let i = 0; i < this.activeOrbits; i++) {
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, PHYSICS_CONFIG.ORBITS.RADII[i], 0, Math.PI * 2);
            this.ctx.stroke();
        }
        this.ctx.setLineDash([]); // Reset
    }

    /**
     * Ciclo principal de renderizado (60 FPS).
     */
    loop() {
        this.time += 0.016; // Aproximadamente 1/60th de segundo
        
        // Limpiar el fotograma anterior
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Dibujar background glow del núcleo
        if (this.nucleons.length > 0) {
            const bgGlow = this.ctx.createRadialGradient(
                this.centerX, this.centerY, 0,
                this.centerX, this.centerY, 100
            );
            bgGlow.addColorStop(0, 'rgba(0, 229, 255, 0.15)');
            bgGlow.addColorStop(1, 'rgba(0, 229, 255, 0)');
            this.ctx.fillStyle = bgGlow;
            this.ctx.fillRect(this.centerX - 100, this.centerY - 100, 200, 200);
        }

        // 2. Dibujar órbitas
        this.renderOrbits();

        // 3. Renderizar electrones (y sus estelas)
        this.electrons.forEach(electron => electron.render(this.ctx, this.centerX, this.centerY));

        // 4. Renderizar nucleones
        this.nucleons.forEach(nucleon => nucleon.render(this.ctx, this.centerX, this.centerY, this.time));

        // Solicitar el siguiente fotograma
        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }
}

// Instanciar el motor globalmente (esperando a que el DOM esté listo)
let engine;
window.addEventListener('DOMContentLoaded', () => {
    engine = new QuantumEngine('quantum-engine');
    // Forzamos un primer renderizado basándonos en el estado inicial de labAtom
    engine.updateStructure(labAtom);
});
