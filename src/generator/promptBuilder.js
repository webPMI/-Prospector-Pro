/**
 * AI Prompt Builder Module - Phase 2 of AI Web Generation
 * ------------------------------------------------
 * Transforms ALL collected business information into the perfect,
 * structured prompt that the AI will use to build the website.
 *
 * PRINCIPLE: Gather maximum info first, then give the AI everything
 * it needs with the correct prompt structure.
 */

/**
 * Maps a real business category to a template/design type.
 */
function mapCategoryToTemplate(categoria, auditStatus = '') {
  if (!categoria) return 'generica';

  const cat = categoria.toLowerCase();

  if (cat.includes('restaurant') || cat.includes('hostel') || cat.includes('food')) return 'restaurante';
  if (cat.includes('bar') || cat.includes('cafe') || cat.includes('pub')) return 'bar';
  if (cat.includes('taller') || cat.includes('repair') || cat.includes('mecanic') || cat.includes('craft')) return 'servicio';
  if (cat.includes('peluquer') || cat.includes('hair') || cat.includes('beaut') || cat.includes('estetic') || cat.includes('spa')) return 'salud';
  if (cat.includes('tienda') || cat.includes('shop') || cat.includes('store')) return 'tienda';

  if (auditStatus === 'PDF_MENU') return 'generica';
  if (auditStatus === 'WEBSITE_DOWN') return 'renovacion';

  return 'generica';
}

/**
 * Builds the appropriate selling angle based on the business's audit status.
 */
function buildSellingAngle(auditStatus) {
  const angles = {
    NO_WEBSITE: {
      headline: 'presencia online desde cero',
      description: 'El negocio NO tiene página web. Es una oportunidad máxima: mostrar cómo se vería su negocio en internet por primera vez.',
      emphasis: 'Destaca que la demo muestra su negocio en internet por primera vez.'
    },
    PDF_MENU: {
      headline: 'menú interactivo adaptado a móvil',
      description: 'El negocio solo tiene una carta en PDF/QR difícil de usar en móvil.',
      emphasis: 'Destaca la evolución de PDF estático a web interactiva móvil.'
    },
    WEBSITE_DOWN: {
      headline: 'web rápida, moderna y siempre disponible',
      description: 'La web actual del negocio no funciona o está caída.',
      emphasis: 'Enfatiza una solución renovada, rápida y fiable.'
    },
    NO_SSL: {
      headline: 'web segura con certificado SSL',
      description: 'La web actual no usa HTTPS (sin seguridad SSL).',
      emphasis: 'Destaca la seguridad y confianza de una web con SSL.'
    },
    SLOW_WEBSITE: {
      headline: 'web ultrarrápida optimizada',
      description: 'La web actual es lenta (más de 3.5s de carga).',
      emphasis: 'Enfatiza velocidad y experiencia de usuario mejorada.'
    },
    default: {
      headline: 'presencia digital profesional',
      description: 'Mejora de la presencia online del negocio con una web moderna.',
      emphasis: 'Destaca profesionalidad, diseño moderno y confianza.'
    }
  };

  return angles[auditStatus] || angles.default;
}

/**
 * Formats the social presence info for the prompt.
 */
function formatSocialPresence(social = {}) {
  const entries = [];
  if (social.instagram) entries.push(`Instagram: ${social.instagram}`);
  if (social.facebook) entries.push(`Facebook: ${social.facebook}`);
  return entries.length > 0 ? entries.join(' | ') : 'No disponibles';
}

/**
 * Extracts brand colors and logo URL from deepInspection if available.
 */
function extractBranding(deep) {
  const colors = [];
  const logoUrl = [];

  // Extract primary color from business health or viability
  if (deep.businessHealth) {
    if (deep.businessHealth.includes('Top') || deep.businessHealth.includes('Excelente')) {
      colors.push('--primary: #fde047'); // Golden for excellent
    } else if (deep.businessHealth.includes('Saludable')) {
      colors.push('--primary: #4ade80'); // Green for healthy
    }
  }

  // Extract logo if photos available
  if (deep.photos && deep.photos.length > 0) {
    logoUrl.push(deep.photos[0]);
  }

  return { colors, logoUrl };
}

/**
 * Detects language and region from prospect data.
 */
function detectLanguageAndRegion(prospect) {
  const locale = prospect.deepInspection && prospect.deepInspection.locale
    ? prospect.deepInspection.locale
    : null;

  const municipio = prospect.Municipio || '';
  const nombre = prospect.Nombre || '';

  // Spanish cities (Spain)
  const spanishCities = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga',
    'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Córdoba', 'A Coruña', 'Alicante',
    'Valladolid', 'Vigo', 'Gijón', 'Granada', 'Elche', 'Cartagena',
    'Marbella', 'Móstoles', 'Almería', 'Burgos', 'Ourense', 'Santander', 'Lleida',
    'Ferrol', 'Huelva', 'Jaén', 'Ceuta', 'Melilla', 'Pamplona', 'Tarragona',
    'San Sebastián', 'Salamanca', 'Albacete', 'Huesca', 'Logroño', 'Badajoz',
    'Ciudad Real', 'Santiago de Compostela', 'Pontevedra', 'Toledo', 'León',
    'Cádiz', 'Castellón', 'Segovia', 'Soria', 'Cuenca', 'Zamora', 'Ávila',
    'Guadalajara', 'Palencia', 'Teruel', 'Cáceres', 'Algeciras', 'Jerez',
    'Donostia', 'Manacor', 'Inca', 'Calvià', 'Alcúdia', 'Sóller', 'Andratx',
    'Felanitx', 'Ciutadella', 'Mahón', 'Ibiza', 'Eivissa'];

  // Latin American countries with major cities for detection
  const latinAmericanCountries = [
    { names: ['México', 'Mexico', 'Ciudad de México', 'CDMX', 'Guadalajara', 'Monterrey', 'Puebla', 'Cancún'], country: 'México' },
    { names: ['Argentina', 'Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata'], country: 'Argentina' },
    { names: ['Colombia', 'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena'], country: 'Colombia' },
    { names: ['Chile', 'Santiago', 'Valparaíso', 'Concepción', 'Viña del Mar'], country: 'Chile' },
    { names: ['Perú', 'Lima', 'Arequipa', 'Cusco', 'Trujillo'], country: 'Perú' },
    { names: ['Venezuela', 'Caracas', 'Maracaibo', 'Valencia'], country: 'Venezuela' },
    { names: ['Ecuador', 'Quito', 'Guayaquil', 'Cuenca'], country: 'Ecuador' },
    { names: ['Bolivia', 'La Paz', 'Santa Cruz', 'Cochabamba', 'Sucre'], country: 'Bolivia' },
    { names: ['Paraguay', 'Asunción', 'Ciudad del Este'], country: 'Paraguay' },
    { names: ['Uruguay', 'Montevideo', 'Punta del Este', 'Salto'], country: 'Uruguay' },
    { names: ['Costa Rica', 'San José', 'Limón', 'Alajuela'], country: 'Costa Rica' },
    { names: ['Panamá', 'Panama City', 'Colón', 'David'], country: 'Panamá' },
    { names: ['Guatemala', 'Guatemala City', 'Quetzaltenango', 'Escuintla'], country: 'Guatemala' },
    { names: ['Honduras', 'Tegucigalpa', 'San Pedro Sula', 'La Ceiba'], country: 'Honduras' },
    { names: ['El Salvador', 'San Salvador', 'Santa Ana', 'San Miguel'], country: 'El Salvador' },
    { names: ['Nicaragua', 'Managua', 'León', 'Granada'], country: 'Nicaragua' },
    { names: ['Cuba', 'La Habana', 'Havana', 'Santiago de Cuba'], country: 'Cuba' },
    { names: ['República Dominicana', 'Santo Domingo', 'Santiago de los Caballeros', 'Punta Cana'], country: 'República Dominicana' },
    { names: ['Puerto Rico', 'San Juan', 'Ponce', 'Mayagüez', 'Caguas'], country: 'Puerto Rico' }
  ];

  // English-speaking countries
  const englishSpeaking = ['United Kingdom', 'United States', 'Canada', 'Australia', 'Ireland'];

  // French-speaking countries
  const frenchSpeaking = ['Francia', 'Bélgica', 'Suiza', 'Canadá'];

  // German-speaking countries
  const germanSpeaking = ['Alemania', 'Austria', 'Suiza'];

  // Try to detect from deepInspection locale first
  if (locale) {
    const localeLower = locale.toLowerCase();
    if (localeLower.includes('es')) {
      // Check if it's a Latin American country
      for (const la of latinAmericanCountries) {
        if (la.names.some(name => municipio.toLowerCase().includes(name.toLowerCase()))) {
          return { language: 'es', region: la.country, locale: locale };
        }
      }
      return { language: 'es', region: 'España', locale: locale };
    }
    if (localeLower.includes('en')) return { language: 'en', region: 'English Speaking', locale: locale };
    if (localeLower.includes('fr')) return { language: 'fr', region: 'Francia', locale: locale };
    if (localeLower.includes('de')) return { language: 'de', region: 'Alemania', locale: locale };
  }

  // Detect from municipality/city names
  if (municipio && municipio.length > 0) {
    // Check Spanish cities
    for (const city of spanishCities) {
      if (municipio.toLowerCase() === city.toLowerCase()) {
        return { language: 'es', region: 'España', locale: 'es-ES' };
      }
    }

    // Check Latin American countries (by name or any city in that country)
    for (const la of latinAmericanCountries) {
      for (const name of la.names) {
        if (municipio.toLowerCase().includes(name.toLowerCase())) {
          return { language: 'es', region: la.country, locale: 'es-MX' };
        }
      }
    }

    // Check English-speaking countries
    for (const country of englishSpeaking) {
      if (municipio.toLowerCase().includes(country.toLowerCase())) {
        return { language: 'en', region: country, locale: 'en-US' };
      }
    }

    // Check French-speaking countries
    for (const country of frenchSpeaking) {
      if (municipio.toLowerCase().includes(country.toLowerCase())) {
        return { language: 'fr', region: country, locale: 'fr-FR' };
      }
    }

    // Check German-speaking countries
    for (const country of germanSpeaking) {
      if (municipio.toLowerCase().includes(country.toLowerCase())) {
        return { language: 'de', region: country, locale: 'de-DE' };
      }
    }
  }

  // Default: Spanish (most common for this platform)
  return { language: 'es', region: 'España', locale: 'es-ES' };
}

/**
 * Builds the reviews block for the prompt.
 */
function buildReviewsBlock(deep) {
  const rating = deep.rating;
  const reviewsCount = deep.reviewsCount;
  const topReview = deep.topReview;

  let reviewsBlock;
  if (rating !== null && reviewsCount !== null) {
    reviewsBlock = `- Valoración Google: ⭐ ${rating} / 5.0 (${reviewsCount} opiniones)`;
  } else {
    reviewsBlock = '- Valoración Google: No disponible (requiere Google Places API configurada)';
  }

  let topReviewBlock = '';
  if (topReview) {
    topReviewBlock = `- Mejor opinión de clientes: "${topReview}"`;
  }

  return { reviewsBlock, topReviewBlock };
}

/**
 * Builds the competitors block for the prompt.
 */
function buildCompetitorsBlock(competitors) {
  const competitorsBlock = (competitors !== null)
    ? `- Competidores directos con web en la zona: ${competitors}`
    : '';

  return competitorsBlock;
}

/**
 * Builds the viability block for the prompt.
 */
function buildViabilityBlock(viabilityIndex) {
  const viabilityBlock = (viabilityIndex !== null)
    ? `- Índice de viabilidad comercial: ${viabilityIndex}%`
    : '';

  return viabilityBlock;
}

/**
 * Builds the photos block for the prompt.
 */
function buildPhotosBlock(photos) {
  const photosBlock = photos && photos.length > 0
    ? `- Fotos reales del local:\n${photos.map(p => `  - ${p}`).join('\n')}`
    : '- Fotos del local: No disponibles (usa imágenes genéricas de stock relacionadas con el sector)';

  return photosBlock;
}

/**
 * Builds the multi-site block for the prompt.
 */
function buildMultiSiteBlock(isMultiSite) {
  const multiSiteBlock = isMultiSite
    ? '- El negocio es parte de un GRUPO MULTI-SEDE. Destacar solidez y expansión.'
    : '';

  return multiSiteBlock;
}

/**
 * Builds the color variables CSS block.
 */
function buildColorVars(colors) {
  const colorVars = colors.length > 0 ? colors.join('\n') : '--primary: #38bdf8; --accent: #a855f7;';

  return colorVars;
}

/**
 * Builds the language/region SEO block.
 */
function buildSeoBlock(language, region) {
  return `
## 🌐 MULTILINGÜISMO Y SEO
- El sitio debe estar optimizado para el idioma ${language} del negocio
- ${language === 'es' ? 'Metadatos y contenido en español para SEO local en España' : 'Metadatos optimizados para ' + language}
- Los datos de Google Maps y contacto deben ser consistentes con la región ${region}
- Las reseñas y testimonios deben reflejar la experiencia del cliente en ${language}
- El CTA de WhatsApp debe usar el idioma apropiado para la región`;
}

/**
 * Builds the design requirements block.
 */
function buildDesignBlock(template, colors, logoUrl) {
  const designBlock = `
## 🎨 REQUISITOS DE DISEÑO
- Plantilla: ${template.toUpperCase()}
- Mobile-first (diseño pensado primero para teléfonos móviles).
- CTA flotante de WhatsApp fijo en la parte inferior en móvil.
- Secciones: Hero, Servicios/Especialidades, Reseñas, Galería, Ubicación y Contacto.
- SEO: title, meta description y og:image con datos reales del negocio.
- Estética: modo oscuro elegante, tipografía moderna, diseño limpio y profesional.
- Todos los enlaces (teléfono, WhatsApp, Google Maps) deben ser REALES y funcionales.
${logoUrl.length > 0 ? '- Incluye el logo del negocio en la sección Hero usando la URL proporcionada.' : ''}
${colors.length > 0 ? colors.join('\n') : ''}`;

  return designBlock;
}

/**
 * Builds the content instructions block.
 */
function buildContentInstructions(angle, rating, topReview) {
  const instructions = `
## 📝 INSTRUCCIONES DE CONTENIDO
1. Ángulo principal: ${angle.headline}.
2. ${angle.emphasis}
3. ${rating !== null ? `Usa la valoración real de Google (${rating}⭐) como prueba social destacada.` : 'Si no hay valoración, no inventes reseñas ni puntuaciones.'}
4. ${topReview ? `Usa la opinión real: "${topReview}" como testimonio destacado.` : ''}
5. Incluye botón de contacto/presupuesto directo por WhatsApp con el número real.
6. Todas las rutas deben ser reales; nunca uses placeholders tipo "tu-empresa.com".`;

  return instructions;
}

/**
 * Builds the output format block.
 */
function buildFormatBlock() {
  return `
## ✅ FORMATO DE SALIDA
Entrega HTML/CSS/JS autocontenido en un único archivo, sin dependencias externas
excepto Google Fonts y Font Awesome. No incluyas explicaciones fuera del código.`;
}

/**
 * Builds the complete AI prompt for website generation.
 *
 * @param {Object} prospect - The enriched lead with ALL collected information.
 * @returns {string} - The complete structured prompt.
 */
function buildWebPrompt(prospect) {
  if (!prospect) {
    throw new Error('❌ No se puede construir el prompt: prospecto no válido.');
  }

  // ─── Datos Base ───
  const nombre = prospect.Nombre || 'Negocio Local';
  const categoria = prospect.Categoria || 'Comercio / Servicio';
  const municipio = prospect.Municipio || 'Localidad';
  const direccion = prospect.Direccion && prospect.Direccion !== 'Dirección no detallada' ? prospect.Direccion : municipio;
  const telefono = prospect.Telefono && prospect.Telefono !== 'No disponible' ? prospect.Telefono : 'No disponible';
  const email = prospect.Email && prospect.Email !== 'No disponible' ? prospect.Email : 'No disponible';
  const whatsapp = prospect.WhatsApp || 'No disponible';
  const googleMaps = prospect.GoogleMaps || 'No disponible';

  // ─── Datos de Auditoría ───
  const auditStatus = prospect.auditStatus || 'NO_WEBSITE';
  const auditLabel = prospect.auditLabel || 'Sin Web Oficial';
  const auditDetails = prospect.auditDetails || '';
  const score = prospect.score || 0;
  const tier = prospect.tier || 'bronce';
  const badge = prospect.badge || '';

  // ─── Datos Enriquecidos (deepInspection) ───
  const deep = prospect.deepInspection || {};
  const rating = deep.rating || null;
  const reviewsCount = deep.reviewsCount || null;
  const topReview = deep.topReview || null;
  const openingHours = deep.openingHours || 'No disponible';
  const photos = (deep.photos && deep.photos.length > 0) ? deep.photos : null;
  const businessHealth = deep.businessHealth || 'No evaluado';
  const viabilityIndex = deep.viabilityIndex ?? null;
  const competitors = deep.competitorsNearbyWithWeb ?? null;
  const isMultiSite = deep.isMultiSiteGroup || false;
  const socialPresence = formatSocialPresence(deep.socialPresence);

  // Extract branding colors and logo
  const { colors, logoUrl } = extractBranding(deep);

  // Detect language and region for multilingual support
  const { language, region, locale } = detectLanguageAndRegion(prospect);

  // ─── Mapping & Ángulo de Venta ───
  const template = mapCategoryToTemplate(categoria, auditStatus);
  const angle = buildSellingAngle(auditStatus);

  const photosBlock = buildPhotosBlock(photos);
  const { reviewsBlock, topReviewBlock } = buildReviewsBlock(deep);
  const competitorsBlock = buildCompetitorsBlock(competitors);
  const viabilityBlock = buildViabilityBlock(viabilityIndex);
  const multiSiteBlock = buildMultiSiteBlock(isMultiSite);
  const colorVars = buildColorVars(colors);
  const seoBlock = buildSeoBlock(language, region);
  const designBlock = buildDesignBlock(template, colors, logoUrl);
  const contentInstructions = buildContentInstructions(angle, rating, topReview);
  const formatBlock = buildFormatBlock();

  const prompt = `# 🏗️ CONSTRUYE UN SITIO WEB PARA ESTE NEGOCIO

## 🎯 TU ROL
Eres un diseñador y desarrollador web experto en landing pages de alta
conversión para negocios locales. Debes crear un sitio completo, moderno
y 100% responsive usando ÚNICAMENTE los datos reales proporcionados.
No inventes información, servicios, precios ni datos que no aparezcan aquí.

## 📋 CONTEXTO DEL NEGOCIO
- Nombre: ${nombre}
- Categoría: ${categoria}
- Ciudad: ${municipio}
- Dirección: ${direccion}
- Teléfono: ${telefono}
- Email: ${email}
- WhatsApp: ${whatsapp}
- Google Maps: ${googleMaps}
- Estado actual: ${auditLabel} (${auditStatus}) ${auditDetails ? `- ${auditDetails}` : ''}
- Puntuación: ${score} pts | Tier: ${tier.toUpperCase()} ${badge ? `| ${badge}` : ''}
- Salud del negocio: ${businessHealth}
- Idioma del negocio: ${language}
- País/Región: ${region}

## 📊 DATOS RECOLECTADOS DEL NEGOCIO
${reviewsBlock}
${topReviewBlock ? topReviewBlock + '\n' : ''}- Horario: ${openingHours}
- Redes sociales: ${socialPresence}
${competitorsBlock ? competitorsBlock + '\n' : ''}${viabilityBlock ? viabilityBlock + '\n' : ''}${isMultiSite ? '- El negocio es parte de un GRUPO MULTI-SEDE. Destacar solidez y expansión.\n' : ''}
${photosBlock}

## 🎨 REQUISITOS DE DISEÑO
- Plantilla: ${template.toUpperCase()}
- Mobile-first (diseño pensado primero para teléfonos móviles).
- CTA flotante de WhatsApp fijo en la parte inferior en móvil.
- Secciones: Hero, Servicios/Especialidades, Reseñas, Galería, Ubicación y Contacto.
- SEO: title, meta description y og:image con datos reales del negocio.
- Estética: modo oscuro elegante, tipografía moderna, diseño limpio y profesional.
- Todos los enlaces (teléfono, WhatsApp, Google Maps) deben ser REALES y funcionales.
${logoUrl.length > 0 ? '- Incluye el logo del negocio en la sección Hero usando la URL proporcionada.' : ''}
${colors.length > 0 ? colors.join('\n') : ''}

${seoBlock}

## 📝 INSTRUCCIONES DE CONTENIDO
1. Ángulo principal: ${angle.headline}.
2. ${angle.emphasis}
3. ${rating !== null ? `Usa la valoración real de Google (${rating}⭐) como prueba social destacada.` : 'Si no hay valoración, no inventes reseñas ni puntuaciones.'}
4. ${topReview ? `Usa la opinión real: "${topReview}" como testimonio destacado.` : ''}
5. Incluye botón de contacto/presupuesto directo por WhatsApp con el número real.
6. Todas las rutas deben ser reales; nunca uses placeholders tipo "tu-empresa.com".

${formatBlock}

## 🎨 DISEÑO PERSONALIZADO
- Usa los colores principales del negocio: ${colors.length > 0 ? colors.join(', ') : 'paleta corporativa'}
${logoUrl.length > 0 ? `- Inserta el logo en el héroe: <img src="${logoUrl[0]}" alt="Logo de ${nombre}" class="logo" />` : ''}
- Mantén la identidad visual consistente con el sector del negocio.

## 📦 ACTIVOS DEL NEGOCIO
- Logo: ${logoUrl.length > 0 ? logoUrl[0] : 'No disponible'}
- Colores corporativos: ${colors.length > 0 ? colors.join(', ') : 'Por definir'}
- Fotos del local: ${photos ? photos.length : 0} imágenes reales disponibles
- Mejores reseñas: ${rating !== null ? `${rating}⭐` : 'No disponibles'}
`;

  return prompt;
}

module.exports = {
  buildWebPrompt,
  mapCategoryToTemplate,
  buildSellingAngle,
  formatSocialPresence,
  extractBranding,
  detectLanguageAndRegion,
  buildReviewsBlock,
  buildCompetitorsBlock,
  buildViabilityBlock,
  buildPhotosBlock,
  buildMultiSiteBlock,
  buildColorVars,
  buildSeoBlock,
  buildDesignBlock,
  buildContentInstructions,
  buildFormatBlock
};