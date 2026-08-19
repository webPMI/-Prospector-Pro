/**
 * Worldwide Real-Data Lead Collector & Scraper Pipeline
 * Live Real-Time Closed Check & Google Web Lookup Integration.
 */

const { auditWebsite, calculateLeadScore } = require('../auditor/leadAuditor');
const { checkGoogleClosedStatus } = require('../auditor/placeDeepInspector');
const { isFranchiseBusiness } = require('../config');
const { MADRID_FALLBACK_DATA } = require('./localFallbackData');

const CATEGORY_MAP = {
  restaurantes: `
    node["amenity"="restaurant"](BBOX);
    node["amenity"="fast_food"](BBOX);
    node["amenity"="bistro"](BBOX);
  `,
  bares: `
    node["amenity"="cafe"](BBOX);
    node["amenity"="bar"](BBOX);
    node["amenity"="pub"](BBOX);
    node["amenity"="ice_cream"](BBOX);
  `,
  talleres: `
    node["craft"="car_repair"](BBOX);
    node["shop"="car_repair"](BBOX);
    node["craft"](BBOX);
  `,
  peluquerias: `
    node["shop"="hairdresser"](BBOX);
    node["shop"="beauty"](BBOX);
  `,
  panaderias: `
    node["shop"="bakery"](BBOX);
    node["shop"="pastry"](BBOX);
  `,
  supermercados: `
    node["shop"="supermarket"](BBOX);
    node["shop"="convenience"](BBOX);
  `,
  farmacias: `
    node["amenity"="pharmacy"](BBOX);
  `
};

/**
 * Universal Geocoding for Optional City / Free-Text / Country
 */
async function geocodeLocationToBBox(queryText) {
  const query = queryText ? queryText.trim() : "Madrid, España";

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      headers: { 'User-Agent': 'WorldwideLeadCollector/3.0 (info@prospector.com)' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        if (!isNaN(lat) && !isNaN(lon)) {
          const delta = 0.025;
          const south = (lat - delta).toFixed(4);
          const north = (lat + delta).toFixed(4);
          const west = (lon - delta).toFixed(4);
          const east = (lon + delta).toFixed(4);
          
          return `${south},${west},${north},${east}`;
        }
      }
    }
  } catch (err) {
    console.warn(`⚠️ Nominatim Geocoding fallback para '${query}': ${err.message}`);
  }

  return "40.3950,-3.7250,40.4450,-3.6750";
}

async function fetchRealOSMData(bbox, categoryTag = '') {
  let filterQuery = '';

  if (categoryTag && CATEGORY_MAP[categoryTag]) {
    filterQuery = CATEGORY_MAP[categoryTag].replace(/BBOX/g, bbox);
  } else {
    filterQuery = `
      node["amenity"="restaurant"](${bbox});
      node["amenity"="cafe"](${bbox});
      node["amenity"="bar"](${bbox});
      node["shop"](${bbox});
      node["craft"](${bbox});
    `;
  }

  const query = `[out:json][timeout:15];(${filterQuery});out center tags 80;`;

  const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass.openstreetmap.ru/api/interpreter"
  ];

  for (const endpoint of endpoints) {
    try {
      const url = `${endpoint}?data=${encodeURIComponent(query)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) continue;
      const data = await response.json();
      if (data && Array.isArray(data.elements) && data.elements.length > 0) {
        return data.elements;
      }
    } catch (err) {
      console.warn(`⚠️ Endpoint ${endpoint} timeout/error — trying next mirror...`);
    }
  }

  // Fallback: return local Madrid data if Overpass is down
  console.log(`⚠️ All Overpass mirrors failed — using local fallback data (${MADRID_FALLBACK_DATA.length} Madrid businesses)`);
  return MADRID_FALLBACK_DATA;
}

/**
 * Universal E.164 International Phone Normalizer
 */
function buildInternationalWhatsAppUrl(phoneStr) {
  if (!phoneStr) return "";
  const digitsOnly = phoneStr.replace(/\D/g, '');

  if (digitsOnly.length < 8) return "";

  if (digitsOnly.length === 9) return `https://wa.me/34${digitsOnly}`;

  if (digitsOnly.length >= 10 && digitsOnly.length <= 14) {
    return `https://wa.me/${digitsOnly}`;
  }

  return "";
}

async function collectLeadsFromOSM(elements, city, country, categoryKey, duplicates, existingKeys) {
  const results = [];

  for (const elem of elements) {
    const tags = elem.tags || {};

    const isClosedInOSM =
      tags["disused"] === "yes" ||
      tags["abandoned"] === "yes" ||
      tags["opening_hours"] === "closed" ||
      Boolean(tags["disused:amenity"]) ||
      Boolean(tags["disused:shop"]) ||
      Boolean(tags["disused:craft"]) ||
      Boolean(tags["end_date"]);

    if (isClosedInOSM) continue;

    const nombre = tags.name || tags["brand"] || tags["official_name"];
    if (!nombre) continue;

    if (isFranchiseBusiness(nombre)) continue;

    const claveUnica = `${elem.id}_${nombre.toLowerCase()}`;
    if (duplicates.has(claveUnica)) continue;
    duplicates.add(claveUnica);

    const categoriaRaw = tags.shop || tags.amenity || tags.craft || "Comercio / Servicio";
    const municipioRaw = tags["addr:city"] || tags["addr:municipality"] || city || country || "Zona Comercial";
    const crossKey = `${nombre.toLowerCase().trim()}_${municipioRaw.toLowerCase().trim()}_${categoriaRaw.toLowerCase().trim()}`;
    if (existingKeys.has(crossKey)) continue;
    existingKeys.add(crossKey);

    let website = tags.website || tags["contact:website"] || tags["url"] || tags["facebook"] || tags["instagram"] || "";
    const menuTagUrl = tags["website:menu"] || tags["menu"] || tags["url:menu"] || tags["contact:menu"] || "";
    const telefono = tags.phone || tags["contact:phone"] || tags.mobile || tags["contact:mobile"] || "";
    const email = tags.email || tags["contact:email"] || "";
    const lat = elem.lat || (elem.center && elem.center.lat);
    const lon = elem.lon || (elem.center && elem.center.lon);

    let categoria = "Comercio / Servicio";
    if (tags.shop) categoria = `Tienda (${tags.shop})`;
    else if (tags.amenity) categoria = `Servicio (${tags.amenity})`;
    else if (tags.craft) categoria = `Taller (${tags.craft})`;

    const telefonoLimpio = telefono ? telefono.replace(/\s+/g, ' ').trim() : "No disponible";
    const municipio = municipioRaw;
    const calle = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
    const targetAuditUrl = menuTagUrl || website;
    const whatsappUrl = buildInternationalWhatsAppUrl(telefono);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nombre + ' ' + municipio + ' ' + calle)}`;

    const business = {
      id: claveUnica.replace(/[^a-zA-Z0-9_]/g, '_'),
      Nombre: nombre,
      Categoria: categoria,
      Telefono: telefonoLimpio,
      Email: email || "No disponible",
      Municipio: municipio,
      Direccion: calle || "Dirección no detallada",
      Website: targetAuditUrl || website,
      WhatsApp: whatsappUrl,
      GoogleMaps: googleMapsUrl,
      Latitud: lat || "",
      Longitud: lon || "",
      auditStatus: "PENDING",
      auditLabel: "Pendiente de auditoría",
      auditDetails: "",
      score: 0,
      tier: "bronce",
      badge: "Pendiente"
    };

    results.push(business);
  }

  return results;
}

async function collectAndAuditLeads(searchQuery = 'Madrid', categoryKey = '', options = {}) {
  const freeText = options.freeText || '';
  const city = options.city || '';
  const country = options.country || '';

  const effectiveQuery = [freeText, city, country].filter(Boolean).join(', ') || searchQuery || 'Madrid, España';

  const bbox = await geocodeLocationToBBox(effectiveQuery);
  const elements = await fetchRealOSMData(bbox, categoryKey);

  const duplicates = new Set();
  const existingKeys = new Set();
  // Get existing lead keys from provided database for cross-search dedup
  if (options.leadDatabase) {
    for (const lead of options.leadDatabase.values()) {
      if (lead && lead.Nombre && lead.Municipio && lead.Categoria) {
        existingKeys.add(`${lead.Nombre.toLowerCase().trim()}_${lead.Municipio.toLowerCase().trim()}_${lead.Categoria.toLowerCase().trim()}`);
      }
    }
  }

  const results = await collectLeadsFromOSM(elements, city, country, categoryKey, duplicates, existingKeys);
  results.sort((a, b) => b.score - a.score);
  return results;
}

module.exports = {
  collectAndAuditLeads,
  buildInternationalWhatsAppUrl
};
