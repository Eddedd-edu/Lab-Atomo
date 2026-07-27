/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - CONFIGURATION (config.js)
 * ============================================================================
 * Contiene: Variables globales inmutables, configuración del motor de físicas,
 * base de datos química (elementos, isótopos) y sistema de progresión.
 */

/**
 * @constant {Object} API_CONFIG
 * @description Configuración de la conexión con Google Apps Script (Base de datos remota).
 */
const API_CONFIG = Object.freeze({
    // REEMPLAZAR CON LA URL DE DEPLOYMENT DE GOOGLE APPS SCRIPT
    URL: 'https://script.google.com/macros/s/TU_URL/exec',
    TIMEOUT_MS: 10000,
    ENDPOINTS: {
        VERIFY: 'verificar',
        CHECK_PLAYED: 'yaJugo',
        SAVE_SCORE: 'guardarPuntaje',
        GET_RANKING: 'obtenerRanking'
    }
});

/**
 * @constant {Object} PHYSICS_CONFIG
 * @description Parámetros del motor de renderizado Canvas y físicas de partículas.
 */
const PHYSICS_CONFIG = Object.freeze({
    FPS: 60,
    NUCLEUS: {
        BASE_RADIUS: 12,       // Radio base de protones/neutrones
        VIBRATION_INTENSITY: 0.5, // Intensidad de la vibración cuántica del núcleo
        SPACING_FACTOR: 6      // Separación entre nucleones según la fórmula de empaquetamiento
    },
    ORBITS: {
        RADII: [70, 115, 160, 205, 250, 295, 340], // Radios de las órbitas (n=1 hasta n=7)
        CAPACITIES: [2, 8, 18, 32, 32, 18, 8],     // Capacidad máxima de electrones por capa
        BASE_SPEED: 0.02,      // Velocidad base orbital
        SPEED_DECAY: 0.0025,   // Cuánto se ralentizan las órbitas más externas
        TRAIL_LENGTH: 15       // Longitud de la estela de los electrones
    },
    ELECTRON: {
        RADIUS: 6,
        GLOW_SIZE: 12
    },
    COLORS: {
        PROTON: '#ff3366',
        NEUTRON: '#7b8cba',
        ELECTRON: '#00e5ff',
        ORBIT: 'rgba(0, 229, 255, 0.15)'
    }
});

/**
 * @constant {Object} GAME_CONFIG
 * @description Parámetros y reglas de los modos de juego.
 */
const GAME_CONFIG = Object.freeze({
    TIMERS: {
        SURVIVAL_BASE: 420, // Segundos para el modo supervivencia
        GUESS_BASE: 420,    // Segundos para el modo adivinanza
    },
    SCORING: {
        BASE_POINTS: 100,
        TIME_BONUS_MULTIPLIER: 10,
        GUESS_TIME_MULTIPLIER: 5,
        COMBO_STEP: 0.5,
        MAX_COMBO: 4.0
    }
});

/**
 * @constant {Object} LEVELS_DB
 * @description Sistema de progresión, XP requerida por nivel.
 */
const LEVELS_DB = Object.freeze({
    calculateLevel: (xp) => {
        // Fórmula RPG estándar: nivel = raíz cuadrada de (XP / 100)
        return Math.floor(Math.sqrt(xp / 100)) + 1;
    },
    calculateNextLevelXP: (level) => {
        return Math.pow(level, 2) * 100;
    }
});

/**
 * @constant {Array<Object>} ELEMENTS_DB
 * @description Base de datos estricta de los primeros 20 elementos (Periodos 1 al 4).
 * El índice del array coincide con el Número Atómico (Z).
 */
const ELEMENTS_DB = Object.freeze([
    null, // Índice 0 vacío para alinear el índice con Z (Número atómico)
    { z: 1,  sym: "H",  name: "Hidrógeno" },
    { z: 2,  sym: "He", name: "Helio" },
    { z: 3,  sym: "Li", name: "Litio" },
    { z: 4,  sym: "Be", name: "Berilio" },
    { z: 5,  sym: "B",  name: "Boro" },
    { z: 6,  sym: "C",  name: "Carbono" },
    { z: 7,  sym: "N",  name: "Nitrógeno" },
    { z: 8,  sym: "O",  name: "Oxígeno" },
    { z: 9,  sym: "F",  name: "Flúor" },
    { z: 10, sym: "Ne", name: "Neón" },
    { z: 11, sym: "Na", name: "Sodio" },
    { z: 12, sym: "Mg", name: "Magnesio" },
    { z: 13, sym: "Al", name: "Aluminio" },
    { z: 14, sym: "Si", name: "Silicio" },
    { z: 15, sym: "P",  name: "Fósforo" },
    { z: 16, sym: "S",  name: "Azufre" },
    { z: 17, sym: "Cl", name: "Cloro" },
    { z: 18, sym: "Ar", name: "Argón" },
    { z: 19, sym: "K",  name: "Potasio" },
    { z: 20, sym: "Ca", name: "Calcio" }
]);

/**
 * @constant {Object} ISOTOPE_DB
 * @description Diccionario de estabilidad isotópica.
 * Estructura: Z: { N: 'estado' }
 * 'S' = Stable (Estable), 'R' = Radioactive (Radiactivo)
 */
const ISOTOPE_DB = Object.freeze({
    1:  { 0: 'S', 1: 'S', 2: 'R' }, // Protio, Deuterio (estables), Tritio (radiactivo)
    2:  { 1: 'S', 2: 'S', 4: 'R' },
    3:  { 3: 'S', 4: 'S', 5: 'R' },
    4:  { 5: 'S', 3: 'R', 6: 'R' }, // Berilio estable solo con N=5
    5:  { 5: 'S', 6: 'S' },
    6:  { 6: 'S', 7: 'S', 8: 'R' }, // C-12, C-13 (estables), C-14 (radiactivo)
    7:  { 7: 'S', 8: 'S' },
    8:  { 8: 'S', 9: 'S', 10: 'S' },
    9:  { 10: 'S' },
    10: { 10: 'S', 11: 'S', 12: 'S' },
    11: { 12: 'S' },
    12: { 12: 'S', 13: 'S', 14: 'S' },
    13: { 14: 'S' },
    14: { 14: 'S', 15: 'S', 16: 'S' },
    15: { 16: 'S' },
    16: { 16: 'S', 17: 'S', 18: 'S', 20: 'S' },
    17: { 18: 'S', 20: 'S' },
    18: { 18: 'S', 20: 'S', 22: 'S' },
    19: { 20: 'S', 22: 'S' },
    20: { 20: 'S', 22: 'S', 23: 'S', 24: 'S', 26: 'S' }
});

/**
 * @constant {Object} ORBITALS_DB
 * @description Distribución de niveles y subniveles para la configuración electrónica (Madelung rule).
 */
const ORBITALS_DB = Object.freeze([
    { name: '1s', max: 2 },
    { name: '2s', max: 2 },
    { name: '2p', max: 6 },
    { name: '3s', max: 2 },
    { name: '3p', max: 6 },
    { name: '4s', max: 2 },
    { name: '3d', max: 10 },
    { name: '4p', max: 6 },
    { name: '5s', max: 2 },
    { name: '4d', max: 10 },
    { name: '5p', max: 6 },
    { name: '6s', max: 2 }
]);
