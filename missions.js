/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - MISSION & OBJECTIVE MANAGER (missions.js)
 * ============================================================================
 * Contiene: La clase MissionManager que orquesta los modos de juego, valida 
 * las condiciones de victoria del átomo construido y genera trivias y prácticas dinámicas.
 */

const MISSION_POOLS = Object.freeze({
    // Modo Práctica: Ampliado y con soporte para selección aleatoria infinita
    PRACTICE: [
        { title: "El origen", text: "Construye un átomo de Hidrógeno-1 neutro", target: { p: 1, n: 0, e: 1 }, hint: "Z=1 (1 protón), A=1 (0 neutrones). Neutro = mismos e⁻ que p⁺." },
        { title: "Pérdida de energía", text: "Transforma el átomo en un Ión H⁺", target: { p: 1, n: 0, e: 0 }, hint: "La carga es +1. Significa que perdió su único electrón." },
        { title: "Isótopos", text: "Construye Deuterio (H-2 neutro)", target: { p: 1, n: 1, e: 1 }, hint: "Masa (A) = 2. Como Z=1, necesitas 1 neutrón. Mantén la carga neutra." },
        { title: "Gas Noble", text: "Construye un átomo de Helio-4 neutro", target: { p: 2, n: 2, e: 2 }, hint: "El Helio tiene Z=2. Masa 4 = 2p + 2n. Capa 1s completa." },
        { title: "Metales Alcalinos", text: "Construye un Catión Litio Li⁺ (A=7)", target: { p: 3, n: 4, e: 2 }, hint: "Litio (Z=3). Masa 7 implica 4 neutrones. Carga +1 implica perder 1 electrón." },
        { title: "Átomo de Carbono", text: "Construye Carbono-12 neutro", target: { p: 6, n: 6, e: 6 }, hint: "Carbono: Z=6, N=6, e⁻=6." },
        { title: "Molécula de Vida", text: "Construye Nitrógeno-14 neutro", target: { p: 7, n: 7, e: 7 }, hint: "Nitrógeno: Z=7, N=7, e⁻=7." },
        { title: "Comburente", text: "Construye Oxígeno-16 neutro", target: { p: 8, n: 8, e: 8 }, hint: "Oxígeno: Z=8, N=8, e⁻=8." },
        { title: "Gas Reactivo", text: "Construye Neón-20 neutro", target: { p: 10, n: 10, e: 10 }, hint: "Neón: Gas noble con Z=10, N=10, e⁻=10." },
        { title: "Sal de Mesa (Ion)", text: "Construye Anión Cloruro Cl⁻ (A=35)", target: { p: 17, n: 18, e: 18 }, hint: "Cloro (Z=17, N=18). Al ser Cl⁻ gana 1 electrón (e⁻=18)." }
    ],

    // Modo Supervivencia: Misiones aleatorias
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

    // Modo Adivinanza
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
        this.missionsPerGame = 5;
    }

    startMode(mode) {
        this.currentMode = mode;
        this.currentIndex = 0;

        if (mode === 'practice') {
            // Mezclar aleatoriamente las prácticas para que cada partida sea distinta y dinámica
            this.missionPool = this._shuffleArray([...MISSION_POOLS.PRACTICE]).slice(0, this.missionsPerGame);
        } else if (mode === 'timed') {
            this.missionPool = this._shuffleArray([...MISSION_POOLS.SURVIVAL]).slice(0, this.missionsPerGame);
        } else if (mode === 'guess') {
            this.missionPool = this._shuffleArray([...MISSION_POOLS.GUESS]).slice(0, this.missionsPerGame);
        } else {
            this.missionPool = [];
        }
    }

    getCurrentMission() {
        if (this.currentIndex >= this.missionPool.length) return null;
        return this.missionPool[this.currentIndex];
    }

    getProgress() {
        return {
            current: this.currentIndex + 1,
            total: this.missionPool.length,
            percentage: ((this.currentIndex) / this.missionPool.length) * 100
        };
    }

    advanceMission() {
        this.currentIndex++;
        return this.currentIndex < this.missionPool.length;
    }

    validateAtomBuild(atomState) {
        const mission = this.getCurrentMission();
        if (!mission || !mission.target) return false;
        const t = mission.target;
        return (atomState.protons === t.p && atomState.neutrons === t.n && atomState.electrons === t.e);
    }

    validateGuess(selectedZ) {
        const mission = this.getCurrentMission();
        if (!mission || !mission.answer) return false;
        return selectedZ === mission.answer;
    }

    generateGuessOptions(optionsCount = 6) {
        const mission = this.getCurrentMission();
        if (!mission) return [];
        const correctZ = mission.answer;
        const options = [correctZ];
        
        let availableZ = [];
        for (let i = 1; i <= 20; i++) {
            if (i !== correctZ) availableZ.push(i);
        }
        availableZ = this._shuffleArray(availableZ);

        for (let i = 0; i < optionsCount - 1; i++) {
            options.push(availableZ[i]);
        }
        return this._shuffleArray(options);
    }

    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

let missions;
window.addEventListener('DOMContentLoaded', () => {
    missions = new MissionManager();
});
