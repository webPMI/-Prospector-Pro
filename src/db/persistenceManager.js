const path = require('path');
const fs = require('fs').promises;

/**
 * @typedef {Map<string, Object>} LeadDatabase - Almacena los leads por ID.
 * @typedef {Map<string, string>} DemoCache - Almacena las demos HTML por ID.
 */

// Directorio donde se guardará el estado serializado. 
// Debe estar al mismo nivel que src/ o en un directorio de datos específico.
const STATE_FILE = path.join(__dirname, '..', '..', 'data', 'state.json');

/**
 * @description Inicializa y carga el estado global del sistema desde disco.
 * Si el archivo no existe, inicializa mapas vacíos para mantener la resiliencia.
 * @returns {{leadDatabase: Map<string, Object>, demoCache: Map<string, string>}} El estado cargado o por defecto.
 */
async function loadState() {
    console.log("💾 [Persistence] Intentando cargar el estado del sistema...");
    try {
        // Crear el directorio 'data' si no existe. Esto asegura que saveState funcione después.
        await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
        
        const data = await fs.readFile(STATE_FILE, 'utf-8');
        const state = JSON.parse(data);

        // Reconstruir los Maps a partir del objeto cargado en JSON
        const leadDatabase = new Map(Object.entries(state.leadDatabase || {}));
        const demoCache = new Map(Object.entries(state.demoCache || {}));

        console.log(`✅ [Persistence] Estado cargado exitosamente. Leads: ${leadDatabase.size}, Demos: ${demoCache.size}`);
        return { leadDatabase, demoCache };

    } catch (error) {
        if (error.code === 'ENOENT') {
            // Este es el caso esperado si la primera vez que se ejecuta el servidor.
            console.warn("⚠️ [Persistence] Archivo de estado no encontrado. Iniciando con datos en memoria vacíos.");
        } else {
            // Otro error de lectura (ej: permisos, JSON corrupto). Se trata como advertencia pero se continúa.
            console.error(`❌ [Persistence] Error al cargar el estado del sistema (${error.message}). Usando mapas vacíos.`);
        }
        // Siempre retornar estructuras válidas para que server.js pueda seguir funcionando.
        return { leadDatabase: new Map(), demoCache: new Map() };
    }
}

/**
 * @description Guarda el estado actual (Lead DB y Demo Cache) en disco.
 * Esto debe ser llamado cuando el servidor recibe señal de cierre.
 * @param {{leadDatabase: Map<string, Object>, demoCache: Map<string, string>}} state - El estado a guardar.
 */
async function saveState({ leadDatabase, demoCache }) {
    console.log("\n💾 [Persistence] Guardando el estado actual del sistema...");
    try {
        const serializableState = {
            leadDatabase: Object.fromEntries(leadDatabase), // Convertir Map a objeto JSON serializables
            demoCache: Object.fromEntries(demoCache)
        };

        await fs.writeFile(STATE_FILE, JSON.stringify(serializableState, null, 2));
        console.log(`✅ [Persistence] Estado guardado exitosamente en ${STATE_FILE}`);
    } catch (error) {
        // Es importante registrar el error para que el desarrollador sepa por qué falló la persistencia.
        console.error(`❌ [Persistence] ¡ERROR CRÍTICO al guardar el estado! Se perdió la sesión de trabajo:`, error);
    }
}

module.exports = {
    loadState,
    saveState
};