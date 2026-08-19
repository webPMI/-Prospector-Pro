const { GOOGLE_API_KEYS, BUSINESS_CONFIG } = require('../config');

/**
 * @module googlePlaceService
 * @description Servicio encargado de interactuar con la Google Places API usando fetch nativo.
 * Aísla las llamadas externas y el manejo de fallos (rate limiting, errores HTTP).
 */

class PlaceApiService {
    constructor() {
        this.apiKey = GOOGLE_API_KEYS.PLACES;
    }

    /**
     * Comprueba si la API key configurada es válida (no simulada).
     */
    isConfigured() {
        return Boolean(this.apiKey && this.apiKey !== 'FALLBACK_PLACE_KEY_SIMULATED');
    }

    /**
     * Realiza la llamada principal para obtener detalles detallados del negocio usando lat/lng.
     * @param {number} latitude - Latitud del prospecto.
     * @param {number} longitude - Longitud del prospecto.
     * @returns {Promise<object | null>} Objeto con los datos enriquecidos o null si falla.
     */
    async fetchDetails(latitude, longitude) {
        if (!this.isConfigured()) {
            console.warn("⚠️ [Google API] Clave de Places API no configurada. Omitiendo llamada externa.");
            return null;
        }

        const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?location=${latitude},${longitude}&key=${this.apiKey}`;
        console.log(`🔎 [Google API] Solicitando detalles para (${latitude}, ${longitude})...`);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(apiUrl, {
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`⚠️ [Google API] Respuesta HTTP no exitosa (${response.status}).`);
                return null;
            }

            const data = await response.json();

            if (data.status !== 'OK' || !data.result) {
                console.warn(`⚠️ [Google API] Fallo en Place Details. Status: ${data.status}.`);
                return null;
            }

            const result = data.result;

            return {
                name: result.name,
                formatted_address: result.formatted_address,
                opening_hours: result.opening_hours ? result.opening_hours.weekday_text : null,
                rating: result.rating ? parseFloat(result.rating).toFixed(1) : null,
                user_ratings_total: result.user_ratings_total || 0,
                geometry: result.geometry,
            };

        } catch (error) {
            console.error("❌ Error al contactar la API de Google Places:", error.message);
            return null;
        }
    }

    /**
     * Método para búsqueda textual.
     */
    static async searchByText(query) {
        console.log(`🔍 [Google API] Búsqueda textual simulada para: ${query}`);
        return null;
    }
}

module.exports = new PlaceApiService();