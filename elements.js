/**
 * ============================================================================
 * ÁTOMOQUEST SJ v3 - CHEMICAL LOGIC ENGINE (elements.js)
 * ============================================================================
 * Contiene: La clase AtomState que maneja la lógica de dominio, cálculos de
 * masa, carga, configuración electrónica, isótopos y distribución orbital.
 */

/**
 * @class AtomState
 * @description Maneja el estado en memoria del átomo construido y calcula sus propiedades en tiempo real.
 */
class AtomState {
    /**
     * @param {number} p - Cantidad inicial de protones (Z)
     * @param {number} n - Cantidad inicial de neutrones (N)
     * @param {number} e - Cantidad inicial de electrones (e⁻)
     */
    constructor(p = 1, n = 0, e = 1) {
        // Límites estrictos para evitar desbordamientos de memoria en el motor gráfico
        this.LIMITS = {
            MIN_P: 1, MAX_P: 20, // Solo los primeros 20 elementos (hasta el Calcio)
            MIN_N: 0, MAX_N: 30, // Límite razonable para neutrones en isótopos ligeros
            MIN_E: 0, MAX_E: 30  // Límite de iones extremos
        };

        this.protons = this._clamp(p, this.LIMITS.MIN_P, this.LIMITS.MAX_P);
        this.neutrons = this._clamp(n, this.LIMITS.MIN_N, this.LIMITS.MAX_N);
        this.electrons = this._clamp(e, this.LIMITS.MIN_E, this.LIMITS.MAX_E);
    }

    /**
     * Helper interno para mantener los valores dentro de los límites seguros.
     * @private
     */
    _clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    /**
     * Actualiza la cantidad de una partícula específica sumando o restando.
     * @param {string} particleType - 'p' (protón), 'n' (neutrón), 'e' (electrón)
     * @param {number} delta - Cantidad a sumar (ej. +1 o -1)
     */
    updateParticle(particleType, delta) {
        switch (particleType) {
            case 'p':
                this.protons = this._clamp(this.protons + delta, this.LIMITS.MIN_P, this.LIMITS.MAX_P);
                break;
            case 'n':
                this.neutrons = this._clamp(this.neutrons + delta, this.LIMITS.MIN_N, this.LIMITS.MAX_N);
                break;
            case 'e':
                this.electrons = this._clamp(this.electrons + delta, this.LIMITS.MIN_E, this.LIMITS.MAX_E);
                break;
        }
    }

    /**
     * Iguala los electrones a los protones para crear un átomo neutro.
     */
    neutralize() {
        this.electrons = this.protons;
    }

    // ==========================================
    // GETTERS QUÍMICOS Y FÍSICOS
    // ==========================================

    /** @returns {number} Número atómico (Z) */
    get z() { return this.protons; }

    /** @returns {number} Número másico (A = Z + N) */
    get mass() { return this.protons + this.neutrons; }

    /** @returns {number} Carga neta (Protones - Electrones) */
    get charge() { return this.protons - this.electrons; }

    /** @returns {Object} Información del elemento desde la base de datos */
    get elementData() {
        return ELEMENTS_DB[this.protons] || { sym: "?", name: "Desconocido" };
    }

    /**
     * Determina la estabilidad del núcleo actual consultando la ISOTOPE_DB.
     * @returns {string} 'stable', 'radioactive', o 'unstable' (si el isótopo no existe en la naturaleza)
     */
    get stability() {
        const isotopesForZ = ISOTOPE_DB[this.protons];
        if (!isotopesForZ || !isotopesForZ[this.neutrons]) {
            return 'unstable'; // Isótopo altamente inestable / inexistente
        }
        return isotopesForZ[this.neutrons] === 'S' ? 'stable' : 'radioactive';
    }

    /**
     * Determina el estado de ionización del átomo.
     * @returns {string} 'neutral', 'cation', o 'anion'
     */
    get ionType() {
        const c = this.charge;
        if (c === 0) return 'neutral';
        return c > 0 ? 'cation' : 'anion';
    }

    /**
     * Genera la etiqueta formateada para el nombre científico (Ej. "Catión Litio-7").
     * @returns {string}
     */
    get fullName() {
        const baseName = `${this.elementData.name}-${this.mass}`;
        if (this.charge === 0) return baseName;
        return `${this.charge > 0 ? 'Catión' : 'Anión'} ${baseName}`;
    }

    /**
     * Calcula la configuración electrónica basándose en el diagrama de Moeller (Madelung).
     * @returns {string} HTML formateado con la configuración (ej. 1s<sup>2</sup> 2s<sup>1</sup>)
     */
    get electronConfiguration() {
        if (this.electrons === 0) return '<span style="color:var(--status-unstable)">Núcleo desnudo (Sin e⁻)</span>';
        
        let config = [];
        let remainingElectrons = this.electrons;
        
        for (const orbital of ORBITALS_DB) {
            if (remainingElectrons <= 0) break;
            const fillCount = Math.min(remainingElectrons, orbital.max);
            config.push(`${orbital.name}<sup>${fillCount}</sup>`);
            remainingElectrons -= fillCount;
        }
        
        return config.join(' ');
    }

    /**
     * Calcula la distribución de electrones por capa (Modelo de Bohr) para el renderizado del Canvas.
     * @returns {Array<number>} Array donde cada índice representa una órbita y su valor los electrones en ella.
     */
    get shellDistribution() {
        let distribution = [];
        let remainingElectrons = this.electrons;
        
        for (const maxCapacity of PHYSICS_CONFIG.ORBITS.CAPACITIES) {
            if (remainingElectrons <= 0) break;
            const fillCount = Math.min(remainingElectrons, maxCapacity);
            distribution.push(fillCount);
            remainingElectrons -= fillCount;
        }
        
        return distribution;
    }

    /**
     * Empaqueta el estado completo para ser consumido por la UI y el motor de render.
     * @returns {Object} Objeto de telemetría completo.
     */
    getTelemetry() {
        return {
            protons: this.protons,
            neutrons: this.neutrons,
            electrons: this.electrons,
            mass: this.mass,
            charge: this.charge,
            symbol: this.elementData.sym,
            name: this.elementData.name,
            fullName: this.fullName,
            stability: this.stability,
            ionType: this.ionType,
            configuration: this.electronConfiguration,
            shells: this.shellDistribution
        };
    }
}

// ==========================================
// SINGLETON STATE EXPORT
// ==========================================
// Instanciamos el estado global del laboratorio.
const labAtom = new AtomState();
