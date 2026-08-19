/**
 * Advanced Multi-Factor Lead Auditor & Scoring Engine (0-100 pts)
 * Includes Social Media URL Recognition (Instagram, Facebook, TikTok, Linktree, LinkedIn).
 */

const http = require('http');
const https = require('https');
const { isFranchiseBusiness } = require('../config');

// Digital / PDF / QR Menu Pattern Evaluator
function isMenuOrPdfUrl(urlStr) {
  if (!urlStr) return false;
  const lower = urlStr.toLowerCase();

  // 1. Direct PDF file extensions
  if (lower.endsWith('.pdf') || lower.includes('.pdf?') || lower.includes('.pdf#')) return true;

  // 2. Cloud document & PDF viewer platforms
  const cloudPdfDomains = [
    'drive.google.com', 'docs.google.com', 'dropbox.com', 'canva.com/design',
    'issuu.com', 'flipsnack.com', 'calameo.com', 'docdroid.net'
  ];
  if (cloudPdfDomains.some(domain => lower.includes(domain))) return true;

  // 3. Specialized Menu & QR Digital Platforms
  const menuPlatformDomains = [
    'qr.menu', 'menu.me', 'bidi.menu', 'cartadigital', 'mymenupdf', 'micarta',
    'tumenudigital', 'qrmenu', 'bakarta', 'dinesy', 'haztupedido', 'menu.site',
    'menu.app', 'menudigital', 'qr-code', 'covermanager.com/menu'
  ];
  if (menuPlatformDomains.some(domain => lower.includes(domain))) return true;

  // 4. URL Path & Query String Menu Keywords
  const menuPathKeywords = [
    '/carta', '/menu', '/la-carta', '/lacarta', '/nuestra-carta', '/our-menu',
    '/carta-digital', '/menudigital', '/menu-digital', '/tarifa', '/speisekarte', '/carte'
  ];
  if (menuPathKeywords.some(kw => lower.includes(kw))) return true;

  return false;
}

// Social Media URL Evaluator
function isSocialMediaUrl(urlStr) {
  if (!urlStr) return false;
  const lower = urlStr.toLowerCase();
  const socialDomains = [
    'instagram.com', 'instagr.am',
    'facebook.com', 'fb.me', 'fb.com',
    'tiktok.com',
    'linktr.ee', 'beacons.page', 'bio.site', 'carrd.co',
    'linkedin.com', 'twitter.com', 'x.com'
  ];
  return socialDomains.some(domain => lower.includes(domain));
}

async function auditWebsite(url) {
  if (!url || url.trim() === '' || url === 'No disponible') {
    return {
      hasWebsite: false,
      status: 'NO_WEBSITE',
      label: '🔴 Sin Web',
      scoreBonus: 45,
      details: 'El negocio no tiene sitio web registrado. Oportunidad máxima.'
    };
  }

  let formattedUrl = url.trim();

  // 1. Social Media Profile Check (Instagram, Facebook, Linktree)
  if (isSocialMediaUrl(formattedUrl)) {
    return {
      hasWebsite: true,
      isSocialOnly: true,
      status: 'SOCIAL_ONLY',
      label: '📲 Solo Red Social (Sin Web)',
      scoreBonus: 40,
      details: 'El negocio utiliza una red social (Instagram/Facebook/Linktree) como perfil principal en lugar de una web oficial.'
    };
  }

  // 2. Comprehensive Menu / PDF / QR Evaluation
  if (isMenuOrPdfUrl(formattedUrl)) {
    return {
      hasWebsite: true,
      status: 'PDF_MENU',
      label: '📄 Carta en PDF / Menú QR',
      scoreBonus: 35,
      details: 'El negocio dispone de un menú digital/PDF o QR no adaptado a una web oficial.'
    };
  }

  // 3. Ensure URL has a protocol
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'http://' + formattedUrl;
  }

  // 4. Parse the URL — if invalid, treat as no website
  let parsedUrl;
  try {
    parsedUrl = new URL(formattedUrl);
  } catch {
    return {
      hasWebsite: false,
      status: 'NO_WEBSITE',
      label: '🔴 URL Inválida',
      scoreBonus: 45,
      details: 'La URL proporcionada no es válida y no se puede auditar.'
    };
  }

  // Heuristic: if the hostname has no TLD-like dot (and is not localhost/127.0.0.1),
  // treat as invalid — e.g. "no-es-una-url" becomes "http://no-es-una-url" which
  // is syntactically valid but not a real web address.
  if (!parsedUrl.hostname.includes('.') &&
      parsedUrl.hostname !== 'localhost' &&
      parsedUrl.hostname !== '127.0.0.1' &&
      parsedUrl.hostname !== '[::1]') {
    return {
      hasWebsite: false,
      status: 'NO_WEBSITE',
      label: '🔴 URL Inválida',
      scoreBonus: 45,
      details: 'La URL proporcionada no parece una dirección web válida.'
    };
  }

  return new Promise((resolve) => {
    try {
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;
      const startTime = Date.now();

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        },
        timeout: 6000
      };

      const req = client.request(options, (res) => {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;
        const contentType = (res.headers['content-type'] || '').toLowerCase();

        if (contentType.includes('application/pdf')) {
          resolve({
            hasWebsite: true,
            status: 'PDF_MENU',
            label: '📄 Carta en PDF (No Móvil)',
            scoreBonus: 35,
            details: 'El enlace dirige a un documento PDF no adaptado a teléfonos móviles.'
          });
          return;
        }

        if (statusCode === 403 || statusCode === 401) {
          resolve({
            hasWebsite: true,
            status: 'WEBSITE_OK',
            label: '🟢 Web Funcional (Protegida)',
            scoreBonus: 0,
            details: 'La web existe y cuenta con protección anti-bot.'
          });
        } else if (statusCode >= 400) {
          resolve({
            hasWebsite: true,
            status: 'WEBSITE_DOWN',
            label: `⚡ Web Rota (${statusCode})`,
            scoreBonus: 40,
            details: `La web existe pero devuelve un error ${statusCode}.`
          });
        } else if (!isHttps) {
          resolve({
            hasWebsite: true,
            status: 'NO_SSL',
            label: '🔒 No Segura (Sin SSL)',
            scoreBonus: 25,
            details: 'La web funciona pero no utiliza certificado de seguridad SSL (HTTP).'
          });
        } else if (responseTime > 3500) {
          resolve({
            hasWebsite: true,
            status: 'SLOW_WEBSITE',
            label: '🐢 Web Lenta',
            scoreBonus: 20,
            details: `La web tarda ${responseTime}ms en responder.`
          });
        } else {
          resolve({
            hasWebsite: true,
            status: 'WEBSITE_OK',
            label: '🟢 Web Funcional',
            scoreBonus: 0,
            details: 'La web funciona correctamente.'
          });
        }
      });

      req.on('error', () => {
        resolve({
          hasWebsite: true,
          status: 'WEBSITE_DOWN',
          label: '⚡ Web Inaccesible',
          scoreBonus: 40,
          details: 'El servidor de la web no responde o el dominio está caducado.'
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          hasWebsite: true,
          status: 'WEBSITE_TIMEOUT',
          label: '⏳ Tiempo Agotado',
          scoreBonus: 30,
          details: 'La web tardó más de 6 segundos en cargar.'
        });
      });

      req.end();
    } catch (e) {
      resolve({
        hasWebsite: false,
        status: 'NO_WEBSITE',
        label: '🔴 Sin Web',
        scoreBonus: 45,
        details: 'Error inesperado al auditar la URL.'
      });
    }
  });
}

function calculateLeadScore(business, auditResult) {
  const nameRaw = (business.Nombre || '').trim();
  const nameLower = nameRaw.toLowerCase();

  if (isFranchiseBusiness(nameRaw)) {
    return {
      score: 0,
      tier: 'descartado',
      badge: '🏢 Gran Cadena / Franquicia',
      color: '#64748b',
      auditLabel: '🟢 Web Corporativa',
      auditStatus: 'WEBSITE_OK',
      auditDetails: 'Gran cadena / multinacional con presencia corporativa.'
    };
  }

  // CLOSED STATUS CHECK (Permanently or Temporarily)
  if (business.isClosedPermanently || business.isClosedTemporarily) {
    const badgeText = business.isClosedTemporarily ? '⚠️ Cerrado Temporalmente' : '⛔ Cerrado Permanentemente';
    return {
      score: 0,
      tier: 'descartado',
      badge: badgeText,
      color: '#ef4444',
      auditLabel: '⛔ Cerrado en Google Maps',
      auditStatus: business.isClosedTemporarily ? 'CLOSED_TEMPORARILY' : 'CLOSED_PERMANENTLY',
      auditDetails: 'Ficha de Google Maps marcada como Cerrado.'
    };
  }

  // ALREADY HAS FUNCTIONAL SSL WEBSITE CHECK
  if (auditResult && auditResult.status === 'WEBSITE_OK') {
    return {
      score: 0,
      tier: 'descartado',
      badge: '🟢 Ya Tiene Web Funcional',
      color: '#38bdf8',
      auditLabel: '🟢 Web Funcional SSL',
      auditStatus: 'WEBSITE_OK',
      auditDetails: 'El negocio ya dispone de un sitio web funcional con HTTPS SSL. No requiere propuesta comercial.'
    };
  }

  let score = 10; // Base score

  score += (auditResult.scoreBonus || 0);

  // Direct Contact Viability Check (Critical Rule)
  const hasPhone = business.Telefono && business.Telefono !== 'No disponible';
  const hasWhatsApp = Boolean(business.WhatsApp);
  const hasEmail = business.Email && business.Email !== 'No disponible';

  if (hasWhatsApp) {
    score += 20;
  } else if (hasPhone) {
    score += 10;
  } else {
    // Penalty if business has ZERO phone contact information
    score -= 20;
  }

  if (hasEmail) {
    score += 5;
  }

  if (business.Direccion && business.Direccion !== 'Dirección no detallada') {
    score += 5;
  }

  if (business.deepInspection) {
    if (business.deepInspection.rating >= 4.2) score += 5;
    if (business.deepInspection.reviewsCount >= 30) score += 5;
  }

  // Ensure score boundary [0, 100]
  score = Math.min(100, Math.max(0, score));

  let tier = 'bronce';
  let badge = '🥉 Lead Bronce';
  let color = '#f59e0b';

  if (score >= 85) {
    tier = 'oro';
    badge = '🥇 Lead ORO ELITE';
    color = '#eab308';
  } else if (score >= 75) {
    tier = 'oro';
    badge = '🥇 Lead ORO';
    color = '#fde047';
  } else if (score >= 55) {
    tier = 'plata';
    badge = '🥈 Lead Plata';
    color = '#94a3b8';
  }

  return {
    score,
    tier,
    badge,
    color,
    auditLabel: auditResult.label,
    auditStatus: auditResult.status,
    auditDetails: auditResult.details
  };
}

module.exports = {
  auditWebsite,
  calculateLeadScore,
  isMenuOrPdfUrl,
  isSocialMediaUrl
};
