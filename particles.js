/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - PARALLAX BACKGROUND ENGINE (particles.js)
 * ============================================================================
 * Contiene: Motor de renderizado espacial estático y dinámico. Simula 
 * polvo estelar, nebulosas y un campo de estrellas con profundidad (eje Z)
 * que reacciona sutilmente al movimiento del ratón/dispositivo.
 */

class BackgroundEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        // alpha: false para el fondo principal, el navegador optimiza el renderizado al saber que no hay transparencia detrás.
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        
        this.width = 0;
        this.height = 0;
        
        // Configuración de la simulación
        this.stars = [];
        this.nebulas = [];
        this.starCount = 350; // Cantidad de estrellas (ajustado para rendimiento AAA)
        
        // Interacción Parallax (Mouse)
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetMouseX = 0;
        this.targetMouseY = 0;
        this.isInteracting = false;

        // Paleta de colores cósmica (extraída del theme)
        this.starColors = ['#ffffff', '#00f3ff', '#b026ff', '#e0e0f0'];
        this.nebulaColors = [
            'rgba(176, 38, 255, 0.03)', // Purple
            'rgba(0, 243, 255, 0.03)',  // Cyan
            'rgba(255, 0, 127, 0.02)'   // Pink
        ];

        this.init();
    }

    /**
     * Inicializa el motor, genera el universo y establece listeners.
     */
    init() {
        this.resize();
        this.generateUniverse();
        
        window.addEventListener('resize', () => this.resize());
        
        // Listeners para el Parallax
        window.addEventListener('mousemove', (e) => {
            this.targetMouseX = (e.clientX - this.width / 2) * 0.05;
            this.targetMouseY = (e.clientY - this.height / 2) * 0.05;
            this.isInteracting = true;
        });

        window.addEventListener('mouseleave', () => {
            this.targetMouseX = 0;
            this.targetMouseY = 0;
            this.isInteracting = false;
        });

        // Iniciar el Game Loop del fondo
        this.loop();
    }

    /**
     * Maneja el redimensionamiento del canvas preservando la densidad de píxeles.
     */
    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);

        // Regenerar nebulosas si la pantalla cambia dramáticamente de tamaño
        if (this.nebulas.length > 0) {
            this.nebulas.forEach(nebula => {
                nebula.x = Math.random() * this.width;
                nebula.y = Math.random() * this.height;
            });
        }
    }

    /**
     * Crea las entidades espaciales (Estrellas y Nebulosas).
     */
    generateUniverse() {
        this.stars = [];
        this.nebulas = [];

        // Generar Estrellas con profundidad (eje Z)
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                z: Math.random() * 2 + 0.1, // Profundidad (0.1 a 2.1)
                radius: Math.random() * 1.5,
                color: this.starColors[Math.floor(Math.random() * this.starColors.length)],
                alpha: Math.random(),
                blinkSpeed: Math.random() * 0.02 + 0.005,
                driftX: (Math.random() - 0.5) * 0.2, // Deriva natural
                driftY: (Math.random() - 0.5) * 0.2
            });
        }

        // Generar Nebulosas (Nubes de gas cósmico)
        for (let i = 0; i < 3; i++) {
            this.nebulas.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 400 + 300, // Grandes nubes
                color: this.nebulaColors[i],
                driftX: (Math.random() - 0.5) * 0.1,
                driftY: (Math.random() - 0.5) * 0.1
            });
        }
    }

    /**
     * Interpolación lineal (Lerp) para suavizar el movimiento del mouse.
     * @param {number} start 
     * @param {number} end 
     * @param {number} amt 
     * @returns {number}
     */
    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    /**
     * Ciclo principal de renderizado del fondo.
     */
    loop() {
        // Limpiar fondo (Espacio profundo)
        this.ctx.fillStyle = '#05050A'; // --space-darkest
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Suavizar input del mouse
        this.mouseX = this.lerp(this.mouseX, this.targetMouseX, 0.05);
        this.mouseY = this.lerp(this.mouseY, this.targetMouseY, 0.05);

        // 1. Renderizar Nebulosas (Fondo lejano)
        this.nebulas.forEach(nebula => {
            // Movimiento natural lento
            nebula.x += nebula.driftX;
            nebula.y += nebula.driftY;

            // Envolver pantalla (Wraparound)
            if (nebula.x > this.width + nebula.radius) nebula.x = -nebula.radius;
            if (nebula.x < -nebula.radius) nebula.x = this.width + nebula.radius;
            if (nebula.y > this.height + nebula.radius) nebula.y = -nebula.radius;
            if (nebula.y < -nebula.radius) nebula.y = this.height + nebula.radius;

            // Parallax ultra-lento para el fondo
            const px = nebula.x + (this.mouseX * 0.2);
            const py = nebula.y + (this.mouseY * 0.2);

            const gradient = this.ctx.createRadialGradient(px, py, 0, px, py, nebula.radius);
            gradient.addColorStop(0, nebula.color);
            gradient.addColorStop(1, 'rgba(5, 5, 10, 0)'); // Desvanecer a fondo transparente

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(px, py, nebula.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // 2. Renderizar Estrellas (Varias capas de profundidad)
        this.stars.forEach(star => {
            // Movimiento natural
            star.x += star.driftX;
            star.y += star.driftY;

            // Efecto Parpadeo (Twinkle)
            star.alpha += star.blinkSpeed;
            if (star.alpha > 1 || star.alpha < 0.2) {
                star.blinkSpeed *= -1; // Invertir dirección del parpadeo
            }

            // Efecto Parallax: Las estrellas más grandes (mayor Z) se mueven más rápido
            // simulando que están más cerca de la cámara.
            const px = star.x + (this.mouseX * star.z);
            const py = star.y + (this.mouseY * star.z);

            // Wraparound con compensación de parallax
            if (star.x > this.width) star.x = 0;
            if (star.x < 0) star.x = this.width;
            if (star.y > this.height) star.y = 0;
            if (star.y < 0) star.y = this.height;

            // Dibujar estrella
            this.ctx.globalAlpha = star.alpha;
            this.ctx.fillStyle = star.color;
            this.ctx.beginPath();
            
            // Las estrellas cercanas (z > 1.5) tienen un ligero brillo extra
            if (star.z > 1.5) {
                this.ctx.shadowBlur = 5;
                this.ctx.shadowColor = star.color;
            } else {
                this.ctx.shadowBlur = 0;
            }

            this.ctx.arc(px, py, star.radius * star.z, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Resetar global alpha y shadow
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;

        // Solicitar siguiente frame
        requestAnimationFrame(() => this.loop());
    }
}

// Inicializar automáticamente cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
    // Evitamos bloquear el renderizado inicial de la UI dándole un pequeño retraso
    setTimeout(() => {
        window.bgEngine = new BackgroundEngine('universe-bg');
    }, 100);
});
