/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - MISSION & OBJECTIVE MANAGER (missions.js)
 * ============================================================================
 * Contiene: La clase MissionManager que orquesta los modos de juego, valida 
 * las condiciones de victoria del átomo construido y genera las trivias.
 */

// ==========================================
// BASES DE DATOS DE MISIONES
// ==========================================

const MISSION_POOLS = Object.freeze({
    // Modo Práctica: Secuencia guiada y fija (Tutorial)
    PRACTICE: [
        { title: "El origen", text: "Construye un átomo de Hidrógeno-1 neutro", target: { p: 1, n: 0, e: 1 }, hint: "Z=1 (1 protón), A=1 (0 neutrones). Neutro = mismos e⁻ que p⁺." },
        { title: "Pérdida de energía", text: "Transforma el átomo en un Ión H⁺", target: { p: 1, n: 0, e: 0 }, hint: "La carga es +1. Significa que perdió su único electrón." },
        { title: "Isótopos", text: "Construye Deuterio (H-2 neutro)", target: { p: 1, n: 1, e: 1 }, hint: "Masa (A) = 2. Como Z=1, necesitas 1 neutrón. Mantén la carga neutra." },
        { title: "Gas Noble", text: "Construye un átomo de Helio-4 neutro", target: { p: 2, n: 2, e: 2 }, hint: "El Helio tiene Z=2. Masa 4 = 2p + 2n. Capa 1s completa." },
        { title: "Metales Alcalinos", text: "Construye un Catión Litio Li⁺ (A=7)", target: { p: 3, n: 4, e: 2 }, hint: "Litio (Z=3). Masa 7 implica 4 neutrones. Carga +1 implica perder 1 electrón." }
    ],

    // Modo Supervivencia: Misiones aleatorias, sin pistas
    SURVIVAL: [
        { text: "Carbono-12 neutro", target: { p: 6, n: 6, e: 6 } },
        { text: "Anión Óxido O²⁻ (A=16)", target: { p: 8, n: 8, e: 10 } },
        { text: "Tritio (H-3 neutro)", target: { p: 1, n: 2, e: 1 } },
        { text: "Catión Litio Li⁺ (A=7)", target: { p: 3, n: 4, e: 2 } },
        { text: "Partícula Alfa (He-4 sin electrones)", target: { p: 2, n: 2, e: 0 } },
        { text: "Anión Cloruro Cl⁻ (A=35)", target: { p: 17, n: 18, e: 18 } },
        { text: "Catión Calcio Ca²⁺ (A=40)", target: { p: 20, n: 20, e: 18 } },
        { text: "Neón-20 neutro", target: { p: 10, n: 10, e: 10 } },
        { text: "Berilio-9 neutro", target: { p: 4, n: 5, e: 4 } },
        { text: "Catión Magnesio Mg²⁺ (A=24)", target: { p: 12, n: 12, e: 10 } }
    ],

    // Modo Adivinanza: Pistas teóricas y respuestas (Z)
    GUESS: [
        { clue: "Z = 1. El elemento más ligero y abundante del universo.", answer: 1 },
        { clue: "Z = 6. Base de la química orgánica y la vida en la Tierra.", answer: 6 },
        { clue: "Z = 8. Esencial para respirar y forma el 88% de la masa del agua.", answer: 8 },
        { clue: "Z = 11. Metal alcalino que reacciona violentamente con agua.", answer: 11 },
        { clue: "Z = 17. Halógeno usado comúnmente como desinfectante.", answer: 17 },
        { clue: "A = 4, Z = 2. Su núcleo se emite en la radiación alfa.", answer: 2 },
        { clue: "A = 23, Z = 11. Enlace iónico clave en la sal de mesa.", answer: 11 },
        { clue: "Configuración: 1s² 2s² 2p⁶. Gas noble del período 2.", answer: 10 },
        { clue: "Configuración: 1s² 2s² 2p³. Elemento principal del grupo 15.", answer: 7 },
        { clue: "Z = 20. Metal alcalinotérreo esencial para la estructura ósea.", answer: 20 }
    ]
});

class MissionManager {
    constructor() {
        this.currentMode = null;
        this.missionPool = [];
        this.currentIndex = 0;
        this.missionsPerGame = 5; // Cantidad de misiones por partida en modos competitivos
    }

    /**
     * Inicializa un modo de juego cargando y preparando su pool de misiones.
     * @param {string} mode - 'practice', 'timed', o 'guess'
     */
    startMode(mode) {
        this.currentMode = mode;
        this.currentIndex = 0;

        switch (mode) {
            case 'practice':
                // Práctica usa el orden original para aprendizaje progresivo
                this.missionPool = [...MISSION_POOLS.PRACTICE];
                break;
            case 'timed':
                // Supervivencia mezcla las misiones y toma un subconjunto
                this.missionPool = this._shuffleArray([...MISSION_POOLS.SURVIVAL]).slice(0, this.missionsPerGame);
                break;
            case 'guess':
                // Adivinanza mezcla las trivias y toma un subconjunto
                this.missionPool = this._shuffleArray([...MISSION_POOLS.GUESS]).slice(0, this.missionsPerGame);
                break;
            default:
                this.missionPool = [];
        }
    }

    /**
     * @returns {Object|null} La misión actual o null si ya se completaron todas.
     */
    getCurrentMission() {
        if (this.currentIndex >= this.missionPool.length) return null;
        return this.missionPool[this.currentIndex];
    }

    /**
     * @returns {Object} Estado del progreso { current, total, percentage }
     */
    getProgress() {
        return {
            current: this.currentIndex + 1,
            total: this.missionPool.length,
            percentage: ((this.currentIndex) / this.missionPool.length) * 100
        };
    }

    /**
     * Avanza a la siguiente misión.
     * @returns {boolean} True si hay una siguiente misión, False si el juego terminó.
     */
    advanceMission() {
        this.currentIndex++;
        return this.currentIndex < this.missionPool.length;
    }

    /**
     * Valida si el estado actual del átomo (Lab) cumple los requisitos de la misión.
     * @param {AtomState} atomState - La instancia actual del motor lógico.
     * @returns {boolean}
     */
    validateAtomBuild(atomState) {
        const mission = this.getCurrentMission();
        if (!mission || !mission.target) return false;

        const t = mission.target;
        return (atomState.protons === t.p && 
                atomState.neutrons === t.n && 
                atomState.electrons === t.e);
    }

    /**
     * Valida si el Z seleccionado por el jugador en Adivinanza es correcto.
     * @param {number} selectedZ - Número atómico elegido.
     * @returns {boolean}
     */
    validateGuess(selectedZ) {
        const mission = this.getCurrentMission();
        if (!mission || !mission.answer) return false;
        
        return selectedZ === mission.answer;
    }

    /**
     * Genera las opciones para el modo adivinanza (1 correcta + N incorrectas).
     * @param {number} optionsCount - Cantidad total de opciones a generar (default: 6)
     * @returns {Array<number>} Array mezclado de Números Atómicos (Z).
     */
    generateGuessOptions(optionsCount = 6) {
        const mission = this.getCurrentMission();
        if (!mission) return [];

        const correctZ = mission.answer;
        const options = [correctZ];
        
        // Crear pool de elementos válidos (1 a 20) excluyendo el correcto
        let availableZ = [];
        for (let i = 1; i <= 20; i++) {
            if (i !== correctZ) availableZ.push(i);
        }

        // Mezclar las opciones disponibles
        availableZ = this._shuffleArray(availableZ);

        // Añadir las necesarias para alcanzar optionsCount
        for (let i = 0; i < optionsCount - 1; i++) {
            options.push(availableZ[i]);
        }

        // Devolver el array final mezclado
        return this._shuffleArray(options);
    }

    /**
     * Implementación moderna del algoritmo Fisher-Yates Shuffle.
     * @private
     * @param {Array} array 
     * @returns {Array} Array mezclado (in-place)
     */
    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

// Instanciar globalmente
let missions;
window.addEventListener('DOMContentLoaded', () => {
    missions = new MissionManager();
});
