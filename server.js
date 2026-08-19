/**
 * Worldwide Lead Auditor & AI Web Demo Server
 * Phase 2 AI Prompt Builder & Multi-Page Dashboard Architecture.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { collectAndAuditLeads } = require('./src/scrapers/leadCollector');
const { enrichProspectWithGoogleData } = require('./src/auditor/placeDeepInspector');
const { auditWebsite, calculateLeadScore } = require('./src/auditor/leadAuditor');
const { generateWebDemoHtml } = require('./src/generator/webGenerator');
const { buildWebPrompt } = require('./src/generator/promptBuilder');

const PORT = 3000;

// Rate limiting - Prevenir ataques DoS
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 100; // máximo 100 peticiones por minuto por IP

// Determine the absolute application root at startup
// (using path.resolve() avoids MSYS path conversion issues on Windows)
const APP_ROOT = path.resolve();

// Global safety net — server must never crash
process.on('uncaughtException', (err) => {
  console.error('⚠️ [UncaughtException]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [UnhandledRejection]', reason?.message || reason);
});

// In-Memory Database for Leads & Demos
const leadDatabase = new Map();
const demoCache = new Map();

// ============================================================
// PERSISTENT CACHE — Avoid re-collecting already enriched data
// ============================================================
const DATA_DIR = path.join(APP_ROOT, 'data');
const PROSPECTS_CACHE_FILE = path.join(DATA_DIR, 'prospects_cache.json');
const DEMOS_CACHE_FILE = path.join(DATA_DIR, 'demos_cache.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadCacheFromDisk() {
  try {
    ensureDataDir();

    // Load ALL cached prospects from disk (not just enriched ones)
    if (fs.existsSync(PROSPECTS_CACHE_FILE)) {
      const raw = fs.readFileSync(PROSPECTS_CACHE_FILE, 'utf-8');
      const cachedProspects = JSON.parse(raw || '{}');
      let loaded = 0;
      for (const [id, lead] of Object.entries(cachedProspects)) {
        if (lead && lead.id) {
          leadDatabase.set(id, lead);
          loaded++;
        }
      }
      if (loaded > 0) {
        const enriched = Object.values(cachedProspects).filter(l => l.deepInspection).length;
        console.log(`♻️ Cargados ${loaded} prospectos (${enriched} enriquecidos) desde caché persistente.`);
      }
    }

    // Load generated demos from disk
    if (fs.existsSync(DEMOS_CACHE_FILE)) {
      const raw = fs.readFileSync(DEMOS_CACHE_FILE, 'utf-8');
      const cachedDemos = JSON.parse(raw || '{}');
      let loadedDemos = 0;
      for (const [id, html] of Object.entries(cachedDemos)) {
        if (html) {
          demoCache.set(id, html);
          loadedDemos++;
        }
      }
      if (loadedDemos > 0) {
        console.log(`♻️ Cargadas ${loadedDemos} demos generadas desde caché persistente.`);
      }
    }
  } catch (err) {
    console.error('⚠️ Error al cargar la caché persistente:', err.message);
  }
}

function persistCacheToDisk() {
  try {
    ensureDataDir();

    // Persist ALL leads (not just enriched ones) to prevent data loss on restart
    const allProspects = {};
    for (const [id, lead] of leadDatabase.entries()) {
      if (lead && lead.id) {
        allProspects[id] = lead;
      }
    }
    fs.writeFileSync(PROSPECTS_CACHE_FILE, JSON.stringify(allProspects, null, 2), 'utf-8');

    // Persist generated demos
    const demos = {};
    for (const [id, html] of demoCache.entries()) {
      demos[id] = html;
    }
    fs.writeFileSync(DEMOS_CACHE_FILE, JSON.stringify(demos, null, 2), 'utf-8');

    const enriched = Object.values(allProspects).filter(l => l.deepInspection).length;
    console.log(`💾 Caché guardada: ${Object.keys(allProspects).length} prospectos (${enriched} enriquecidos), ${Object.keys(demos).length} demos.`);
  } catch (err) {
    console.error('⚠️ Error al guardar la caché persistente:', err.message);
  }
}

function saveLeadToCache(lead) {
  if (lead && lead.id && lead.deepInspection) {
    leadDatabase.set(lead.id, lead);
    persistCacheToDisk();
  }
}

function saveLeadsToStore(leadsArray) {
  if (!Array.isArray(leadsArray)) return;
  for (const lead of leadsArray) {
    if (lead && lead.id) {
      leadDatabase.set(lead.id, lead);
    }
  }
  persistCacheToDisk();
}

function getStoredLeadsArray() {
  return Array.from(leadDatabase.values());
}

function getEnrichedLeadsArray() {
  return Array.from(leadDatabase.values()).filter(l => l && l.deepInspection);
}

function findProspect(queryId) {
  if (!queryId) return null;
  let prospect = leadDatabase.get(queryId);
  if (!prospect) {
    const qLower = String(queryId).toLowerCase();
    for (const item of leadDatabase.values()) {
      if (item.id === queryId || (item.Nombre && item.Nombre.toLowerCase().includes(qLower))) {
        return item;
      }
    }
  }
  return prospect || null;
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Limit request body to 1 MB to prevent memory exhaustion
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Cuerpo de la solicitud demasiado grande (máx 1 MB)'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(new Error('JSON inválido en el cuerpo de la solicitud'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  applySecurityHeaders(res, false); // No CSP for JSON responses
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=UTF-8' });
  res.end(JSON.stringify(data));
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

// Security Headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Access-Control-Allow-Origin': '*', // Allow all origins for API access
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400' // 24 hours
};

// Content Security Policy - restrict content sources
const CSP_HEADER = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.googleapis.com https://*.google.com https://*.openstreetmap.org https://*.osm.org; frame-ancestors 'none';";

// Rate limiting function
function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }
  
  const requests = rateLimitMap.get(ip);
  // Remove old requests outside the window
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim()
    .substring(0, 1000); // Limit length
}

// Basic HTML sanitization for generated demos
function sanitizeHtml(html) {
  if (typeof html !== 'string') return html;
  
  // Remove dangerous script tags and event handlers
  return html
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
    .replace(/on\w+="[^"]*"/g, '') // Remove event handlers like onclick=
    .replace(/on\w+='[^']*'/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
}

// Validate and sanitize lead ID
function isValidLeadId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{1,50}$/.test(id);
}

// Get client IP from request
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// Apply security headers to response
function applySecurityHeaders(res, isHtml = false) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Only apply CSP to HTML responses
  if (isHtml) {
    res.setHeader('Content-Security-Policy', CSP_HEADER);
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const clientIP = getClientIP(req);

  // Apply security headers to all responses (CSP will be added for HTML responses)
  applySecurityHeaders(res, pathname.endsWith('.html') || pathname.startsWith('/demo/'));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rate limiting check
  if (!checkRateLimit(clientIP)) {
    console.warn(`⚠️ Rate limit exceeded for IP: ${clientIP}`);
    res.writeHead(429, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify({ success: false, error: 'Too many requests' }));
    return;
  }

  // Log requests (excluding static assets)
  if (!pathname.startsWith('/styles.css') && !pathname.startsWith('/app.js') && !pathname.startsWith('/creador.js')) {
    console.log(`[${new Date().toTimeString().split(' ')[0]}] ${req.method} ${pathname} [IP: ${clientIP}]`);
  }

  // Live Demo Viewer (/demo/:id)
  if (pathname.startsWith('/demo/')) {
    const demoId = pathname.replace('/demo/', '').trim();

    // Validate demo ID using improved validation
    if (!isValidLeadId(demoId)) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify({ success: false, error: 'ID de demo no válido' }));
      return;
    }

    const demoHtml = demoCache.get(demoId);

    if (demoHtml) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end(demoHtml);
    } else {
      let prospect = findProspect(demoId);

      if (!prospect) {
        sendJson(res, 404, { success: false, error: 'Prospecto no encontrado' });
        return;
      }

      try {
        const enriched = await enrichProspectWithGoogleData(prospect);
        const generatedHtml = generateWebDemoHtml(enriched);
        const sanitizedHtml = sanitizeHtml(generatedHtml);
        demoCache.set(demoId, sanitizedHtml);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(sanitizedHtml);
      } catch (e) {
        console.error('Error generando demo:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: false, error: 'Error al generar la demo web' }));
      }
    }
    return;
  }

  // AI Prompt Generation Endpoint (/api/generate-prompt)
  if (req.method === 'POST' && pathname === '/api/generate-prompt') {
    try {
      const payload = await parseRequestBody(req);
      
      // Validate payload ID
      if (!payload.id || !isValidLeadId(payload.id)) {
        sendJson(res, 400, { success: false, error: 'ID de prospecto no válido' });
        return;
      }
      
      let prospect = findProspect(payload.id);

      if (!prospect) {
        sendJson(res, 404, { success: false, error: 'Prospecto no encontrado en la base de datos' });
        return;
      }

      if (!prospect.deepInspection) {
        prospect = await enrichProspectWithGoogleData(prospect);
        leadDatabase.set(prospect.id, prospect);
        persistCacheToDisk();
      }

      const promptText = buildWebPrompt(prospect);

      sendJson(res, 200, {
        success: true,
        prompt: promptText,
        prospectId: prospect.id,
        nombre: sanitizeInput(prospect.Nombre),
        fromCache: Boolean(prospect.deepInspection),
        dataCollected: {
          campos: Object.keys(prospect).length,
          deepInspection: prospect.deepInspection
        }
      });
    } catch (err) {
      console.error("Error en generate-prompt:", err.message);
      sendJson(res, 500, { success: false, error: 'Error interno del servidor' });
    }
    return;
  }

  // AI Demo Generation Endpoint (/api/generate-demo)
  if (req.method === 'POST' && pathname === '/api/generate-demo') {
    try {
      const payload = await parseRequestBody(req);
      
      // Validate payload ID
      if (!payload.id || !isValidLeadId(payload.id)) {
        sendJson(res, 400, { success: false, error: 'ID de prospecto no válido' });
        return;
      }
      
      let prospect = findProspect(payload.id);

      if (!prospect) {
        sendJson(res, 404, { success: false, error: 'Prospecto no encontrado en la base de datos' });
        return;
      }

      if (!prospect.deepInspection) {
        prospect = await enrichProspectWithGoogleData(prospect);
        leadDatabase.set(prospect.id, prospect);
        persistCacheToDisk();
      }

      const promptText = buildWebPrompt(prospect);
      const demoHtml = generateWebDemoHtml(prospect);
      demoCache.set(prospect.id, demoHtml);
      persistCacheToDisk();

      sendJson(res, 200, {
        success: true,
        demoUrl: `/demo/${prospect.id}`,
        prompt: promptText,
        prospectId: prospect.id,
        nombre: sanitizeInput(prospect.Nombre),
        fromCache: Boolean(prospect.deepInspection)
      });
    } catch (err) {
      console.error("Error en generate-demo:", err.message);
      sendJson(res, 500, { success: false, error: 'Error interno del servidor' });
    }
    return;
  }

  // Audit Single Lead Endpoint (/api/audit-lead)
  if (req.method === 'POST' && pathname === '/api/audit-lead') {
    try {
      const payload = await parseRequestBody(req);
      
      // Validate payload ID
      if (!payload.id || !isValidLeadId(payload.id)) {
        sendJson(res, 400, { success: false, error: 'ID de prospecto no válido' });
        return;
      }
      
      let prospect = findProspect(payload.id);

      if (!prospect) {
        sendJson(res, 404, { success: false, error: 'Prospecto no encontrado' });
        return;
      }

      // Run audit if not already done
      if (!prospect.auditStatus || prospect.auditStatus === 'PENDING') {
        const targetAuditUrl = prospect.Website;
        const auditResult = await auditWebsite(targetAuditUrl);
        const scoreData = calculateLeadScore(prospect, auditResult);

        prospect = {
          ...prospect,
          ...auditResult,
          ...scoreData
        };

        leadDatabase.set(prospect.id, prospect);
        persistCacheToDisk();
      }

      sendJson(res, 200, { success: true, data: prospect });
    } catch (err) {
      console.error("Error en audit-lead:", err.message);
      sendJson(res, 500, { success: false, error: 'Error interno del servidor' });
    }
    return;
  }

  // Get All Audit Leads Endpoint (/api/leads)
  if (req.method === 'GET' && pathname === '/api/leads') {
    const leads = getStoredLeadsArray();
    sendJson(res, 200, { success: true, count: leads.length, data: leads });
    return;
  }

  // Get Enriched Leads Endpoint (/api/leads/enriched)
  if (req.method === 'GET' && pathname === '/api/leads/enriched') {
    const enriched = getEnrichedLeadsArray();
    sendJson(res, 200, { success: true, count: enriched.length, data: enriched });
    return;
  }

  // Live Real-Time Multi-Region Lead Search Endpoint (/api/search)
  if (req.method === 'POST' && pathname === '/api/search') {
    try {
      const payload = await parseRequestBody(req);
      
      // Sanitize input fields
      const regionQuery = sanitizeInput(payload.region || payload.city || payload.freeText || 'Madrid, España');
      const categoryKey = sanitizeInput(payload.category || '');

      const options = {
        freeText: sanitizeInput(payload.freeText || ''),
        city: sanitizeInput(payload.city || ''),
        country: sanitizeInput(payload.country || ''),
        language: sanitizeInput(payload.language || 'es'),
        targetWeb: sanitizeInput(payload.targetWeb || 'all'),
        targetContact: sanitizeInput(payload.targetContact || 'all'),
        targetTier: sanitizeInput(payload.targetTier || 'all')
      };

      console.log(`🔍 API Live Search: '${regionQuery}' [Sector: ${categoryKey || 'Todos'}]`);
      const newLeads = await collectAndAuditLeads(regionQuery, categoryKey, {
        ...options,
        leadDatabase
      });

      saveLeadsToStore(newLeads);

      const allData = getStoredLeadsArray();
      sendJson(res, 200, { success: true, count: allData.length, data: allData, newLeadsCount: newLeads.length });
    } catch (err) {
      console.error("Error en API Live Search:", err.message);
      const allData = getStoredLeadsArray();
      sendJson(res, 200, { success: true, count: allData.length, data: allData });
    }
    return;
  }

  // Deep Inspection Endpoint (/api/prospect/enrich)
  if (req.method === 'POST' && pathname === '/api/prospect/enrich') {
    try {
      const payload = await parseRequestBody(req);
      
      // Validate payload ID
      if (!payload.id || !isValidLeadId(payload.id)) {
        sendJson(res, 400, { success: false, error: 'ID de prospecto no válido' });
        return;
      }
      
      const prospectId = sanitizeInput(payload.id);

      let prospect = findProspect(prospectId);

      if (!prospect) {
        prospect = {
          id: prospectId,
          Nombre: "Negocio Local",
          Municipio: "Mallorca",
          Categoria: "Servicio"
        };
      }

      console.log(`⭐ Realizando Análisis Profundo Google Maps para: ${prospect.Nombre}`);
      const enriched = await enrichProspectWithGoogleData(prospect);

      leadDatabase.set(prospect.id, enriched);
      persistCacheToDisk();

      sendJson(res, 200, { success: true, data: enriched });
    } catch (err) {
      console.error("Error en enrich:", err.message);
      sendJson(res, 500, { success: false, error: 'Error interno del servidor' });
    }
    return;
  }

  // Clean Route Mapping
  // Strip leading slash to avoid Windows path.join treating /file.css as absolute from drive root
  let file = pathname.replace(/^\//, '');
  if (file === '' || file === 'home') {
    file = 'home.html';
  } else if (file === 'buscador') {
    file = 'index.html';
  } else if (file === 'creador') {
    file = 'creador.html';
  }

  // Enhanced path sanitization to prevent directory traversal attacks
  file = path.normalize(file);
  
  // Check for path traversal attempts
  if (file.includes('..') || file.includes('\\') || path.isAbsolute(file) || file.startsWith('/') || file.startsWith('\\')) {
    console.warn(`⚠️ Path traversal attempt detected: ${pathname}`);
    res.writeHead(403, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify({ success: false, error: 'Acceso denegado' }));
    return;
  }

  // Only allow specific file extensions
  const allowedExtensions = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.ico', '.svg', '.gif'];
  const ext = path.extname(file).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    console.warn(`⚠️ Unauthorized file extension attempt: ${ext}`);
    res.writeHead(403, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify({ success: false, error: 'Tipo de archivo no permitido' }));
    return;
  }

  // Static file serving with synchronous read
  // (synchronous to avoid event-loop starvation when background scans run)
  let filePath = path.join(APP_ROOT, 'public', file);

  // Verify the resolved path is still within the public directory
  const resolvedPath = path.resolve(filePath);
  const publicDir = path.resolve(APP_ROOT, 'public');
  
  if (!resolvedPath.startsWith(publicDir)) {
    console.warn(`⚠️ Path traversal attempt detected (resolved path): ${resolvedPath}`);
    res.writeHead(403, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify({ success: false, error: 'Acceso denegado' }));
    return;
  }

  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    applySecurityHeaders(res, ext === '.html'); // Apply CSP only for HTML files
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify({ success: false, error: 'Archivo no encontrado' }));
  }
});

// Load persistent cache BEFORE initial scan
loadCacheFromDisk();

console.log("📡 Escaneando e inicializando base de datos de prospectos...");
collectAndAuditLeads('Madrid')
  .then(leads => {
    saveLeadsToStore(leads);
    console.log(`✅ Base de datos inicializada con ${leadDatabase.size} prospectos guardados.`);
  })
  .catch(err => {
    console.warn("⚠️ Escaneo inicial fallido (sin datos precargados):", err.message);
  });

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`⭐ SERVIDOR CON GENERADOR DE DEMOS WEB IA LISTO ⭐`);
  console.log(`=================================================`);
  console.log(`🌐 Acceso a la Plataforma: http://localhost:${PORT}`);
  console.log(`🔍 Buscador de Leads: http://localhost:${PORT}/buscador`);
  console.log(`🌐 Creador de Webs IA: http://localhost:${PORT}/creador\n`);
});
