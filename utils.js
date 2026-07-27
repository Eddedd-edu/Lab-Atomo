/**
 * Utilidades compartidas para ÁtomoQuest SJ.
 * Proporciona funciones auxiliares simples y seguras para la UI y la lógica del juego.
 */

const utils = {
    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    },

    debounce(fn, delay = 150) {
        let timeoutId = null;
        return (...args) => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
    },

    getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }
};

window.utils = utils;
