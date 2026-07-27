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
    constructor(type, index) {
        this.type = type;
        this.radius = PHYSICS_CONFIG.NUCLEUS.BASE_RADIUS;
        this.color = type === 'p' ? PHYSICS_CONFIG.COLORS.PROTON : PHYSICS_CONFIG.COLORS.NEUTRON;
        
        const goldenAngle = 137.508 * (Math.PI / 180);
        const radiusOffset = PHYSICS_CONFIG.NUCLEUS.SPACING_FACTOR * Math.sqrt(index);
        const theta = index * goldenAngle;
        
        this.baseX = Math.cos(theta) * radiusOffset;
        this.baseY = Math.sin(theta) * radiusOffset;
        
        this.phaseX = Math.random() * Math.PI * 2;
        this.phaseY = Math.random() * Math.PI * 2;
    }

    render(ctx, centerX, centerY, time) {
        const vibX = Math.sin(time * 5 + this.phaseX) * PHYSICS_CONFIG.NUCLEUS.VIBRATION_INTENSITY;
        const vibY = Math.cos(time * 4.5 + this.phaseY) * PHYSICS_CONFIG.NUCLEUS.VIBRATION_INTENSITY;
        
        const x = centerX + this.baseX + vibX;
        const y = centerY + this.baseY + vibY;

        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

/**
 * @class Electron
 * @description Representa un electrón en órbita con cálculos de estela (trail).
 */
class Electron {
    constructor(orbitRadius, initialAngle, speed) {
        this.radius = orbitRadius;
        this.angle = initialAngle;
        this.speed = speed;
        this.history = [];
        this.color = PHYSICS_CONFIG.COLORS.ELECTRON;
    }

    render(ctx, centerX, centerY) {
        this.angle += this.speed;
        const x = centerX + Math.cos(this.angle) * this.radius;
        const y = centerY + Math.sin(this.angle) * this.radius;

        this.history.push({ x, y });
        if (this.history.length > PHYSICS_CONFIG.ORBITS.TRAIL_LENGTH) {
            this.history.shift();
        }

        if (this.history.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for (let i = 1; i < this.history.length; i++) {
                ctx.lineTo(this.history[i].x, this.history[i].y);
            }
            
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = PHYSICS_CONFIG.ELECTRON.RADIUS;
            ctx.strokeStyle = `rgba(0, 229, 255, 0.4)`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(x, y, PHYSICS_CONFIG.ELECTRON.RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
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
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        
        this.width = 0;
        this.height = 0;
        this.centerX = 0;
        this.centerY = 0;
        this.time = 0;
        this.animationFrameId = null;
        
        this.nucleons = [];
        this.electrons = [];
        this.activeOrbits = 0;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.loop();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        
        // Dimensiones lógicas (CSS)
        this.width = rect.width;
        this.height = rect.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;

        // Dimensiones reales del canvas (píxeles físicos)
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;

        // Resetear la transformación para evitar acumulación de escalas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Aplicar la escala de DPR una sola vez
        this.ctx.scale(dpr, dpr);
    }

    updateStructure(atomState) {
        if (!atomState) return; // Seguridad extra

        this.nucleons = [];
        const totalNucleons = atomState.protons + atomState.neutrons;
        let pCount = 0;
        let nCount = 0;
        
        for (let i = 0; i < totalNucleons; i++) {
            if ((i % 2 === 0 && pCount < atomState.protons) || nCount >= atomState.neutrons) {
                this.nucleons.push(new Nucleon('p', i));
                pCount++;
            } else {
                this.nucleons.push(new Nucleon('n', i));
                nCount++;
            }
        }
        
        this.nucleons.reverse();

        this.electrons = [];
        const shells = atomState.shellDistribution;
        this.activeOrbits = shells.length;
        
        shells.forEach((electronCount, shellIndex) => {
            const radius = PHYSICS_CONFIG.ORBITS.RADII[shellIndex];
            const speed = PHYSICS_CONFIG.ORBITS.BASE_SPEED - (shellIndex * PHYSICS_CONFIG.ORBITS.SPEED_DECAY);
            
            for (let i = 0; i < electronCount; i++) {
                const initialAngle = (i / electronCount) * Math.PI * 2;
                this.electrons.push(new Electron(radius, initialAngle, speed));
            }
        });
    }

    renderOrbits() {
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = PHYSICS_CONFIG.COLORS.ORBIT;
        this.ctx.setLineDash([4, 6]); 

        for (let i = 0; i < this.activeOrbits; i++) {
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, PHYSICS_CONFIG.ORBITS.RADII[i], 0, Math.PI * 2);
            this.ctx.stroke();
        }
        this.ctx.setLineDash([]);
    }

    loop() {
        this.time += 0.016;
        
        // Limpiar con dimensiones lógicas (la escala de DPR ya está aplicada)
        this.ctx.clearRect(0, 0, this.width, this.height);

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

        this.renderOrbits();
        this.electrons.forEach(electron => electron.render(this.ctx, this.centerX, this.centerY));
        this.nucleons.forEach(nucleon => nucleon.render(this.ctx, this.centerX, this.centerY, this.time));

        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }
}

// Instanciar el motor al cargar el DOM, usando window.labAtom de forma segura
window.addEventListener('DOMContentLoaded', () => {
    if (window.labAtom) {
        window.engine = new QuantumEngine('quantum-engine');
        window.engine.updateStructure(window.labAtom);
    } else {
        console.warn('labAtom no está disponible al inicializar QuantumEngine');
    }
});
