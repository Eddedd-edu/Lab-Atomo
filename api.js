/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - CLOUD API CLIENT (api.js)
 * ============================================================================
 * Contiene: La clase ApiClient para la comunicación segura con Google Apps Script 
 * y Google Sheets, incluyendo manejo de timeouts y peticiones asíncronas POST/GET.
 */

class ApiClient {
    constructor() {
        this.scriptUrl = API_CONFIG.URL;
        this.timeoutMs = API_CONFIG.TIMEOUT_MS;
    }

    /**
     * Realiza una petición POST genérica al Web App de Google Apps Script.
     * @private
     * @param {string} action - Nombre de la acción requerida por el script (ej. 'verificar', 'guardarPuntaje')
     * @param {Object} payload - Datos a enviar en el cuerpo de la petición
     * @returns {Promise<Object>} Respuesta JSON del servidor
     */
    async _post(action, payload = {}) {
        const isPlaceholderUrl = !this.scriptUrl || this.scriptUrl.includes('TU_URL') || this.scriptUrl.includes('/s/TU_URL/');
        if (isPlaceholderUrl) {
            console.warn(`[ApiClient] URL de Google Apps Script no configurada. Simulando respuesta local para la acción: "${action}".`);
            return this._getMockResponse(action, payload);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                // Nota: Google Apps Script requiere text/plain o no-cors para evitar problemas de preflight OPTIONS,
                // enviamos JSON stringificado.
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({ action, ...payload }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Error de servidor HTTP: ${response.status}`);
            }

            const responseText = await response.text();
            if (!responseText) {
                return {};
            }

            try {
                return JSON.parse(responseText);
            } catch (error) {
                return { raw: responseText };
            }

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.error('[ApiClient] La petición excedió el tiempo límite (Timeout).');
                throw new Error('El servidor tardó demasiado en responder. Verificá tu conexión.');
            }
            console.error(`[ApiClient] Error en la petición "${action}":`, error);
            // Retornar un fallback seguro para no romper la ejecución del juego
            return { error: true, message: error.message };
        }
    }

    /**
     * Verifica si el código ZipGrade ingresado corresponde a un estudiante registrado.
     * @param {string|number} codigo - Código del estudiante
     * @returns {Promise<Object>} { valido: boolean, nombre: string }
     */
    async verificarCodigo(codigo) {
        const result = await this._post(API_CONFIG.ENDPOINTS.VERIFY, { codigo });
        const normalized = this._normalizeVerifyResponse(result);
        return {
            valido: normalized.valido,
            nombre: normalized.nombre,
            message: normalized.message || ''
        };
    }

    /**
     * Comprueba si el estudiante ya completó un intento en el modo de juego competitivo.
     * @param {string|number} codigo - Código del estudiante
     * @param {string} modo - 'timed' (supervivencia) o 'guess' (adivinanza)
     * @returns {Promise<boolean>} True si ya jugó, False si puede participar.
     */
    async yaJugo(codigo, modo) {
        const result = await this._post(API_CONFIG.ENDPOINTS.CHECK_PLAYED, { codigo, modo });
        const normalized = this._normalizeBooleanResponse(result, 'yaJugo');
        return normalized;
    }

    /**
     * Guarda el puntaje del estudiante en Google Sheets de forma permanente.
     * @param {string|number} codigo - Código del estudiante
     * @param {string} nombre - Nombre completo
     * @param {number} puntaje - Puntuación total obtenida
     * @param {string} modo - 'timed' o 'guess'
     * @returns {Promise<Object>} Respuesta del servidor
     */
    async guardarPuntaje(codigo, nombre, puntaje, modo) {
        return await this._post(API_CONFIG.ENDPOINTS.SAVE_SCORE, {
            codigo,
            nombre,
            puntaje,
            modo
        });
    }

    /**
     * Obtiene el ranking global de puntajes para un modo específico.
     * @param {string} modo - 'timed' o 'guess'
     * @returns {Promise<Array<Object>>} Lista de operadores ordenada por puntaje.
     */
    async getRanking(modo) {
        const result = await this._post(API_CONFIG.ENDPOINTS.GET_RANKING, { modo });
        if (Array.isArray(result)) return result;
        if (result && Array.isArray(result.ranking)) return result.ranking;
        if (result && Array.isArray(result.datos)) return result.datos;
        if (result && Array.isArray(result.data)) return result.data;
        return [];
    }

    _normalizeVerifyResponse(result) {
        const fallback = { valido: false, nombre: 'Estudiante SJ', message: '' };
        if (!result || typeof result !== 'object') return fallback;

        const direct = result;
        const data = result.data && typeof result.data === 'object' ? result.data : null;
        const source = data || direct;

        const valido = typeof source.valido === 'boolean'
            ? source.valido
            : (typeof source.valid === 'boolean' ? source.valid : false);

        return {
            valido,
            nombre: source.nombre || source.name || source.estudiante || source.student || fallback.nombre,
            message: source.message || source.msg || source.error || ''
        };
    }

    _normalizeBooleanResponse(result, fallbackKey) {
        if (!result || typeof result !== 'object') return false;
        const data = result.data && typeof result.data === 'object' ? result.data : null;
        const source = data || result;
        if (typeof source[fallbackKey] === 'boolean') return source[fallbackKey];
        if (typeof source.yaJugo === 'boolean') return source.yaJugo;
        if (typeof source.played === 'boolean') return source.played;
        if (typeof source.jugo === 'boolean') return source.jugo;
        return false;
    }

    /**
     * Genera respuestas simuladas (Mock) si la URL de Google Apps Script no ha sido enlazada,
     * permitiendo probar todas las funcionalidades offline durante el desarrollo.
     * @private
     */
    _getMockResponse(action, payload) {
        return new Promise((resolve) => {
            setTimeout(() => {
                switch (action) {
                    case 'verificar':
                        resolve({ valido: true, nombre: `Operador Mock (${payload.codigo})` });
                        break;
                    case 'yaJugo':
                        resolve({ yaJugo: false });
                        break;
                    case 'guardarPuntaje':
                        resolve({ success: true, message: 'Puntaje guardado en modo simulación.' });
                        break;
                    case 'obtenerRanking':
                        resolve([
                            { nombre: "Edison Avendaño", puntaje: 4200 },
                            { nombre: "Paola Castañeda", puntaje: 3850 },
                            { nombre: "Kelly Joana", puntaje: 3100 },
                            { nombre: `Operador (${payload.modo})`, puntaje: payload.puntaje || 2500 }
                        ]);
                        break;
                    default:
                        resolve({ success: true });
                }
            }, 400); // Simular latencia de red de 400ms
        });
    }
}

// Instanciar globalmente
let apiClient;
window.addEventListener('DOMContentLoaded', () => {
    apiClient = new ApiClient();
    window.apiClient = apiClient;
});
