/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - CYBERNETIC AUDIO SYNTHESIZER (audio.js)
 * ============================================================================
 * Contiene: Motor de síntesis de audio procedural. Genera sonidos de sci-fi
 * (clicks, blips, alarmas, arpegios de victoria) utilizando osciladores matemáticos
 * sin depender de ningún archivo de audio externo.
 */

class AudioSynthesizer {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
        
        // Frecuencias base para acordes (Escala Pentatónica y Mayor)
        this.NOTES = {
            C4: 261.63, E4: 329.63, G4: 392.00, C5: 523.25, 
            E5: 659.25, G5: 783.99, A5: 880.00, C6: 1046.50
        };
    }

    /**
     * Inicializa el AudioContext. Debe llamarse tras la primera interacción del usuario
     * para cumplir con las políticas de "Autoplay" de navegadores como Chrome y Safari.
     */
    init() {
        if (this.initialized) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return; // Fallback silencioso si el navegador es muy antiguo

        this.ctx = new AudioContext();
        
        // Nodo maestro de volumen para evitar saturación (clipping)
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Volumen global al 30%
        this.masterGain.connect(this.ctx.destination);
        
        this.initialized = true;
    }

    /**
     * Motor base de síntesis. Crea un oscilador con una envolvente (ADSR simple)
     * para evitar los chasquidos (pops/clicks) al inicio y fin del sonido.
     * 
     * @param {string} type - Tipo de onda: 'sine', 'square', 'sawtooth', 'triangle'
     * @param {number} startFreq - Frecuencia inicial en Hz
     * @param {number} endFreq - Frecuencia final en Hz (para sweeps/deslizamientos)
     * @param {number} duration - Duración en segundos
     * @param {number} vol - Volumen relativo (0.0 a 1.0)
     * @param {number} startTime - Cuándo iniciar (relativo al ctx.currentTime)
     */
    playTone(type, startFreq, endFreq, duration, vol, startTime = 0) {
        if (!this.initialized) this.init();
        if (!this.ctx) return;

        const time = this.ctx.currentTime + startTime;
        
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        // Configuración de la forma de onda y frecuencia
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, time);
        
        if (startFreq !== endFreq) {
            // Deslizamiento exponencial para un sonido más natural (Sci-fi sweep)
            osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);
        }

        // Configuración de la envolvente de volumen (Attack & Release)
        gainNode.gain.setValueAtTime(0.001, time); // Evitar pop inicial
        gainNode.gain.exponentialRampToValueAtTime(vol, time + 0.05); // Attack rápido (50ms)
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration); // Release hasta el final

        // Conexiones
        osc.connect(gainNode);
        gainNode.connect(this.masterGain);

        // Reproducción y limpieza (Garbage Collection)
        osc.start(time);
        osc.stop(time + duration + 0.1);

        // Desconectar nodos al terminar para liberar memoria RAM
        osc.onended = () => {
            osc.disconnect();
            gainNode.disconnect();
        };
    }

    // ==========================================
    // LIBRERÍA DE EFECTOS DE SONIDO (SFX)
    // ==========================================

    /** Sonido sutil y agudo para botones (Hover) */
    hover() {
        this.playTone('sine', 1200, 1200, 0.05, 0.02);
    }

    /** Clic tecnológico, mezcla de triángulo (cuerpo) y cuadrado (agresividad) */
    click() {
        this.playTone('triangle', 800, 600, 0.08, 0.05);
    }

    /** Sonido ascendente y brillante (Añadir partícula) */
    addParticle() {
        this.playTone('sine', 400, 800, 0.15, 0.1);
    }

    /** Sonido descendente y grave (Quitar partícula) */
    removeParticle() {
        this.playTone('triangle', 600, 200, 0.15, 0.1);
    }

    /** Acorde mayor armonioso que se desvanece (Estabilización lograda) */
    stabilize() {
        // Reproduce 3 notas simultáneas para formar un acorde de Do Mayor brillante
        this.playTone('sine', this.NOTES.C5, this.NOTES.C5, 0.6, 0.08, 0);
        this.playTone('sine', this.NOTES.E5, this.NOTES.E5, 0.6, 0.08, 0);
        this.playTone('sine', this.NOTES.G5, this.NOTES.G5, 0.6, 0.08, 0);
    }

    /** Zumbido disonante de baja frecuencia (Error/Alerta) */
    error() {
        // Diente de sierra descendente simula una falla o zumbido eléctrico
        this.playTone('sawtooth', 150, 80, 0.3, 0.15);
        this.playTone('square', 155, 85, 0.3, 0.1); // Ligera disonancia (+5Hz)
    }

    /** Arpegio tecnológico rápido y ascendente (Subida de nivel / XP) */
    levelUp() {
        const speed = 0.08;
        this.playTone('square', this.NOTES.C5, this.NOTES.C5, 0.1, 0.05, 0);
        this.playTone('square', this.NOTES.E5, this.NOTES.E5, 0.1, 0.05, speed);
        this.playTone('square', this.NOTES.G5, this.NOTES.G5, 0.1, 0.05, speed * 2);
        this.playTone('square', this.NOTES.C6, this.NOTES.C6, 0.3, 0.08, speed * 3);
    }

    /** Fanfarria de victoria majestuosa (Fin de partida ganada) */
    victory() {
        const speed = 0.12;
        // Triplete ascendente
        this.playTone('triangle', this.NOTES.G4, this.NOTES.G4, 0.15, 0.1, 0);
        this.playTone('triangle', this.NOTES.C5, this.NOTES.C5, 0.15, 0.1, speed);
        this.playTone('triangle', this.NOTES.E5, this.NOTES.E5, 0.15, 0.1, speed * 2);
        
        // Acorde final sostenido
        const finalTime = speed * 3;
        this.playTone('sine', this.NOTES.C5, this.NOTES.C5, 1.2, 0.1, finalTime);
        this.playTone('sine', this.NOTES.E5, this.NOTES.E5, 1.2, 0.1, finalTime);
        this.playTone('sine', this.NOTES.G5, this.NOTES.G5, 1.2, 0.1, finalTime);
        this.playTone('sine', this.NOTES.C6, this.NOTES.C6, 1.2, 0.1, finalTime);
    }
}

// Instanciar y exportar globalmente al cargar el DOM
let sfx;
window.addEventListener('DOMContentLoaded', () => {
    sfx = new AudioSynthesizer();
    
    // Configurar listener para inicializar el audio en la primera interacción global
    const unlockAudio = () => {
        sfx.init();
        document.removeEventListener('mousedown', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
    };
    
    document.addEventListener('mousedown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio, { passive: true });
    document.addEventListener('keydown', unlockAudio);
});
