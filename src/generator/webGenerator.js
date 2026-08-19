/**
 * AI Web Demo Generator Module (Step 2 of Master System)
 * Generates mobile-first HTML5/CSS3 dynamic websites customized for local businesses
 * using the structured prompt from promptBuilder.js (Phase 2).
 */

const fs = require('fs');
const path = require('path');
const { buildWebPrompt, mapCategoryToTemplate } = require('./promptBuilder');
const { getSectorKey, SECTOR_PHOTO_SETS, SECTOR_SERVICES } = require('../research/leadResearch');
const THEMES = require('./templates/themes.json');

function generateWebDemoHtml(prospect) {
  if (!prospect) throw new Error("Prospecto no válido para generación de demo.");

  const nombre = prospect.Nombre || "Negocio Local";
  const municipio = prospect.Municipio || "Localidad";
  const direccion = (prospect.Direccion && prospect.Direccion !== 'Dirección no detallada') ? prospect.Direccion : municipio;
  const telefono = (prospect.Telefono && prospect.Telefono !== 'No disponible') ? prospect.Telefono : "";
  const email = (prospect.Email && prospect.Email !== 'No disponible') ? prospect.Email : "";
  const whatsappUrl = prospect.WhatsApp || (telefono ? `https://wa.me/${telefono.replace(/\D/g, '')}` : "#");
  const googleMapsUrl = prospect.GoogleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nombre + ' ' + municipio)}`;

  const templateKey = mapCategoryToTemplate(prospect.Categoria, prospect.auditStatus);
  const theme = THEMES[templateKey] || THEMES.generica;

  const sectorKey = getSectorKey(prospect.Categoria);
  const defaultPhotos = SECTOR_PHOTO_SETS[sectorKey] || SECTOR_PHOTO_SETS.generica;
  const defaultServices = SECTOR_SERVICES[sectorKey] || SECTOR_SERVICES.generica;

  const deep = prospect.deepInspection || {};
  const rating = deep.rating || null;  // null = no data available (don't fake)
  const reviewsCount = deep.reviewsCount || null;
  const topReview = deep.topReview || null;
  const openingHours = deep.openingHours || 'No disponible';

  const photos = (deep.photos && deep.photos.length > 0) ? deep.photos : defaultPhotos;
  const services = (prospect.research && prospect.research.services) ? prospect.research.services : defaultServices;

  const starsHtml = rating !== null ? '⭐'.repeat(Math.round(rating)) : '';
  const ratingDisplay = rating !== null ? `${rating} / 5.0` : 'Sin valoraciones';
  const reviewsDisplay = reviewsCount !== null ? `${reviewsCount} opiniones en Google Maps` : '';
  const topReviewHtml = topReview ? `<p style="font-style: italic; color: #cbd5e1; margin-top: 0.5rem;">"${topReview}"</p>` : '';

  // Build service cards HTML
  const servicesCardsHtml = services.map(s => `
    <div class="service-card">
      <div class="service-icon"><i class="fa-solid ${s.icon || 'fa-star'}"></i></div>
      <h3>${s.title}</h3>
      <p>${s.desc}</p>
    </div>
  `).join('');

  // Build photo gallery items
  const galleryHtml = photos.slice(0, 4).map((p, idx) => `
    <div class="gallery-item" style="background-image: url('${p}');" title="Foto ${idx + 1} de ${nombre}"></div>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${nombre} — Sitio Web Oficial</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <meta name="description" content="${nombre} en ${municipio}. ${theme.heroTagline}. Teléfono: ${telefono}">
  <meta name="generator" content="Prospector Pro AI Web Engine v6.0">
  
  <style>
    :root {
      --primary: ${theme.primaryColor};
      --accent: ${theme.accentColor};
      --bg-dark: ${theme.bgDark};
      --bg-card: rgba(30, 41, 59, 0.75);
      --border-card: rgba(255, 255, 255, 0.1);
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg-dark);
      color: var(--text);
      line-height: 1.6;
      padding-bottom: 95px;
      overflow-x: hidden;
    }
    
    /* Navigation Bar */
    .top-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(16px);
      background: rgba(15, 23, 42, 0.85);
      border-bottom: 1px solid var(--border-card);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.9rem 1.5rem;
    }
    .brand-name {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 1.25rem;
      background: linear-gradient(135deg, #fff 40%, var(--primary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nav-hours {
      font-size: 0.8rem;
      color: var(--primary);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    /* Hero Section */
    .hero {
      position: relative;
      min-height: 75vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 3.5rem 1.5rem;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.65) 0%, var(--bg-dark) 100%), url('${photos[0]}') center/cover no-repeat;
    }
    .badge-top {
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid var(--primary);
      color: var(--primary);
      padding: 0.4rem 1rem;
      border-radius: 50px;
      font-size: 0.85rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .hero h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 2.75rem;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin-bottom: 0.9rem;
      text-shadow: 0 4px 20px rgba(0,0,0,0.8);
      max-width: 800px;
    }
    .hero p {
      font-size: 1.15rem;
      color: #cbd5e1;
      max-width: 620px;
      margin-bottom: 2rem;
      text-shadow: 0 2px 10px rgba(0,0,0,0.6);
    }
    .hero-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
    }
    .btn-primary {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: #ffffff;
      padding: 0.9rem 1.8rem;
      border-radius: 12px;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 1rem;
      box-shadow: 0 10px 25px rgba(34, 197, 94, 0.4);
      transition: all 0.25s ease;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 30px rgba(34, 197, 94, 0.55);
    }
    .btn-secondary {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      color: #fff;
      padding: 0.9rem 1.8rem;
      border-radius: 12px;
      font-weight: 600;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      transition: all 0.25s ease;
    }
    /* Demo Hours Bar */
    .demo-hours-bar {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 0.5rem 1rem;
      text-align: center;
      font-size: 0.9rem;
      color: #6ee7b7;
      font-weight: 600;
    }

    /* Features / Services Grid */
    .grid-features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      max-width: 1100px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem;
    }

    .section-title {
      text-align: center;
      font-family: 'Outfit', sans-serif;
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 2rem;
      color: #ffffff;
    }

    .feature-card {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      padding: 2rem;
      border-radius: 16px;
      backdrop-filter: blur(12px);
      transition: transform 0.2s, border-color 0.2s;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
    }

    .feature-card h3 {
      font-size: 1.25rem;
      margin-bottom: 0.6rem;
    }

    .feature-card p {
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    /* Gallery */
    .gallery-img {
      width: 100%;
      height: 220px;
      object-fit: cover;
      border-radius: 14px;
      border: 1px solid var(--border-card);
    }

    .btn-cta {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: #ffffff;
      padding: 0.9rem 1.8rem;
      border-radius: 12px;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 1rem;
      box-shadow: 0 10px 25px rgba(34, 197, 94, 0.4);
      transition: all 0.25s ease;
    }

    .btn-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 30px rgba(34, 197, 94, 0.55);
    }

    /* Section Container */
    .section-wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 3.5rem 1.5rem;
    }
    .section-header {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    .section-header h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
    }
    .section-header p {
      color: var(--text-muted);
      font-size: 1rem;
    }

    /* Services Grid */
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    .service-card {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      padding: 2rem;
      border-radius: 16px;
      backdrop-filter: blur(12px);
      transition: transform 0.2s, border-color 0.2s;
    }
    .service-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
    }
    .service-icon {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-card);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      color: var(--primary);
      margin-bottom: 1.25rem;
    }
    .service-card h3 {
      font-size: 1.25rem;
      margin-bottom: 0.6rem;
    }
    .service-card p {
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    /* Gallery */
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .gallery-item {
      height: 220px;
      border-radius: 14px;
      background-size: cover;
      background-position: center;
      border: 1px solid var(--border-card);
      transition: transform 0.25s;
    }
    .gallery-item:hover {
      transform: scale(1.02);
    }

    /* Google Reviews Card */
    .review-box {
      padding: 1.5rem;
      border-radius: 16px;
      text-align: center;
      margin-top: 2rem;
    }
    .review-stars { font-size: 1.3rem; margin-bottom: 0.5rem; }

    /* Sticky Bottom Bar for Mobile */
    .sticky-wa-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      border-top: 1px solid rgba(255,255,255,0.1);
      padding: 0.85rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 9999;
    }
    .sticky-wa-btn {
      background: #25d366;
      color: #ffffff;
      padding: 0.7rem 1.2rem;
      border-radius: 10px;
      font-weight: 800;
      font-size: 0.9rem;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
  </style>
</head>
<body>

  <!-- HERO SECTION -->
  <section class="hero">
    <div class="badge-top"><i class="fa-solid fa-certificate"></i> Sitio Web Oficial • ${municipio}</div>
    <h1>${nombre}</h1>
    <p>${theme.heroTagline}</p>
    <a href="${whatsappUrl}" target="_blank" class="btn-cta">
      <i class="fa-brands fa-whatsapp"></i> Contactar por WhatsApp
    </a>
  </section>

  <!-- HOURS SECTION (only if real data) -->
  ${openingHours !== 'No disponible' ? `
  <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); padding: 0.5rem 1rem; text-align: center; font-size: 0.9rem; color: #6ee7b7; font-weight: 600;">
    <i class="fa-solid fa-clock"></i> ${openingHours}
  </div>
  ` : ''}

  <!-- FEATURES / SERVICIOS SECTION -->
  <section class="section">
    <h2 class="section-title">Nuestros Servicios & Especialidades</h2>
    <div class="grid-features">
      ${services.map(s => `
        <div class="feature-card">
          <h3>${s.title}</h3>
          <p>${s.desc}</p>
        </div>
      `).join('')}
    </div>

    <!-- GOOGLE MAPS RATING & REVIEW REPUTATION BOX (only show real data) -->
    <div class="review-box">
      ${starsHtml ? `<div class="review-stars">${starsHtml}</div>` : ''}
      <p style="font-weight: 700; font-size: 1.1rem; color: #ffffff;">${ratingDisplay}${reviewsDisplay ? ` (${reviewsDisplay})` : ''}</p>
      ${topReviewHtml}
    </div>
  </section>

  <!-- GALERÍA DE IMÁGENES DESTACADAS -->
  ${photos.length > 0 ? `
  <section class="section" style="padding-top: 0;">
    <h2 class="section-title">Galería & Instalaciones</h2>
    <div class="gallery-grid">
      ${photos.slice(0, 4).map(p => `<img src="${p}" class="gallery-img" alt="${nombre}" />`).join('')}
    </div>
  </section>
  ` : ''}

  <!-- UBICACIÓN & CONTACTO -->
  <section class="section" style="padding-top: 0;">
    <div class="feature-card" style="text-align: center; background: rgba(56, 189, 248, 0.05); border-color: rgba(56, 189, 248, 0.3);">
      <h3 style="font-size: 1.4rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-location-dot" style="color: #ef4444;"></i> ¿Dónde Estamos?</h3>
      <p style="font-size: 1.05rem; color: #ffffff; margin-bottom: 1rem;">📍 ${direccion}</p>
      ${telefono ? `<p style="font-size: 1rem; color: #a5b4fc;">📞 Teléfono: ${telefono}</p>` : ''}
      <div style="margin-top: 1.5rem;">
        <a href="${prospect.GoogleMaps || '#'}" target="_blank" class="btn-cta" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); font-size: 0.9rem;">
          <i class="fa-solid fa-map-location-dot" style="color: #ef4444;"></i> Abrir en Google Maps GPS
        </a>
      </div>
    </div>
  </section>

  <!-- STICKY BOTTOM BAR FOR MOBILE -->
  <div class="sticky-wa-bar">
    <div>
      <div style="font-weight: 800; font-size: 0.9rem; color: #ffffff;">${nombre}</div>
      <div style="font-size: 0.75rem; color: var(--text-muted);">📍 ${municipio}</div>
    </div>
    <a href="${whatsappUrl}" target="_blank" class="sticky-wa-btn">
      <i class="fa-brands fa-whatsapp"></i> Chat WhatsApp
    </a>
  </div>

</body>
</html>`;

  return html;
}

module.exports = {
  generateWebDemoHtml
};