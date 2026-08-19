/**
 * @module config
 * @description Módulo centralizado para todas las constantes y credenciales de servicio externo.
 * ⚠️ ADVERTENCIA: Nunca se deben hardcodear secretos sensibles en producción. Usar variables de entorno siempre que sea posible.
 */

// --- CONFIGURACIÓN DE SERVICIO EXTERNO (Google Places API) ---
const GOOGLE_API_KEYS = {
    PLACES: process.env.GOOGLE_PLACES_API_KEY || 'FALLBACK_PLACE_KEY_SIMULATED', // Debe ser una variable de entorno real en producción
    GEOCODING: process.env.GOOGLE_GEOCODING_API_KEY || 'FALLBACK_GEO_KEY' 
};

/**
 * @module config
 * @description Configuración global y constantes del negocio.
 */
const KNOWN_FRANCHISES = [
    'mercadona', 'carrefour', 'eroski', 'decathlon', 'once', 'lidl', 'aldi',
    'banc sabadell', 'caixabank', 'bbva', 'santander', 'bankinter', 'repsol', 'bp', 'cepsa', 'shell', 'galp',
    'el corte inglés', 'hipercor', 'mcdonald', 'burger king', 'alcampo', 'granier',
    'sagardi', 'honest greens', 'brasa y leña', 'telepizza', 'domino', 'kfc',
    'subway', 'starbucks', 'taco bell', '100 montaditos', 'la tagliatella',
    'foster', 'vips', 'ginos', 'rodilla', 'clarel', 'primaprix', 'consum',
    'spar', 'alimerka', 'gadis', 'froiz', 'condis', 'bonpreu', 'caprabo',
    'coviran', 'supercor', 'zara', 'pull & bear', 'stradivarius', 'bershka',
    'mango', 'springfield', 'fnac', 'mediamarkt', 'worten', 'leroy merlin',
    'bauhaus', 'obramat', 'ikea', 'conforama', 'kiwoko', 'tiendanimal',
    'norauto', 'feu vert', 'midas', 'rodi', 'first stop', 'euromaster',
    'vodafone', 'orange', 'movistar', 'yoigo', 'digi', 'bang & olufsen', 'milar', 'info coste', 'infocoste',
    'loterías', 'apuestas del estado', 'tabacos', 'expenduria'
];

/**
 * Detecta si un nombre de negocio corresponde a una franquicia o cadena conocida.
 * Usa coincidencia por límites de palabra para nombres cortos (evita falsos positivos
 * como "MercadonaExpress" o "QuioscoMercadona"), e incluye para nombres compuestos.
 */
function isFranchiseBusiness(name) {
  if (!name) return false;
  const nameLower = name.trim().toLowerCase();

  // "Día" (supermercado Día) — solo como palabra completa, no "diario"
  // Manejar tanto "día" (con acento) como "dia" (sin acento)
  const isExactDiaWithAcento = /\bdía\b/i.test(nameLower) && !nameLower.includes('diario');
  const isExactDiaSinAcento = /\bdia\b/i.test(nameLower) && !nameLower.includes('diario');
  const isExactDia = isExactDiaWithAcento || isExactDiaSinAcento;
  if (isExactDia) return true;

  // Franquicias de una palabra: coincidencia por límite de palabra
  const singleWordFranchises = [
    'mercadona', 'carrefour', 'eroski', 'decathlon', 'once', 'lidl', 'aldi',
    'mcdonald', 'domino', 'kfc', 'subway', 'starbucks', 'taco bell',
    'fnac', 'mediamarkt', 'worten', 'ikea', 'vodafone', 'orange',
    'movistar', 'yoigo', 'digi', 'zara', 'mango', 'springfield',
    'aldi', 'lidl'
  ];
  for (const f of singleWordFranchises) {
    // \b coincidencia de palabra completa: "mercadona" sí, "mercadonaexpress" no
    if (new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(nameLower)) {
      return true;
    }
  }

  // Franquicias de múltiples palabras: includes (p. ej. "el corte inglés")
  const multiWordFranchises = [
    'el corte inglés', 'hipercor', 'alcampo', 'granier',
    'sagardi', 'honest greens', 'brasa y leña', 'telepizza',
    'burger king', '100 montaditos', 'la tagliatella',
    'foster', 'vips', 'ginos', 'rodilla', 'clarel', 'primaprix', 'consum',
    'spar', 'alimerka', 'gadis', 'froiz', 'condis', 'bonpreu', 'caprabo',
    'coviran', 'supercor', 'pull & bear', 'stradivarius', 'bershka',
    'leroy merlin', 'bauhaus', 'obramat', 'conforama', 'kiwoko', 'tiendanimal',
    'norauto', 'feu vert', 'midas', 'rodi', 'first stop', 'euromaster',
    'bang & olufsen', 'milar', 'info coste', 'infocoste',
    'loterías', 'apuestas del estado', 'tabacos', 'expenduria',
    'banc sabadell', 'caixabank', 'bbva', 'santander', 'bankinter',
    'repsol', 'bp', 'cepsa', 'shell', 'galp'
  ];
  for (const f of multiWordFranchises) {
    if (nameLower.includes(f)) return true;
  }

  return false;
}

const BUSINESS_CONFIG = {
    // Reglas de Negocio (Regla 4: Anti-franquicias)
    FRANCHISE_NAMES: KNOWN_FRANCHISES,
    isFranchise: isFranchiseBusiness,
    
    // Estructuras API
    OVERPASS_MIRRORS: [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.private.coffee/api/interpreter'
    ],

    // Tiers de puntuación
    SCORE_TIERS: {
        ORO_ELITE_MIN: 85,
        ORO_MIN: 75,
        ORO_MAX: 84,
        PLATA_MIN: 55,
        DESCARTADO: 0
    }
};

module.exports = {
    GOOGLE_API_KEYS,
    BUSINESS_CONFIG,
    KNOWN_FRANCHISES,
    isFranchiseBusiness
};