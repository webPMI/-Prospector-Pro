# 🤖 AGENTS.md — Guía Maestra para Agentes IA

> **Lee este archivo ANTES de tocar cualquier código.**
> Es el mapa completo del proyecto: arquitectura, flujo de datos, convenciones y reglas de oro.
> Actualizado: 2026-08-13

---

## 1. Visión General del Proyecto

**Prospector Pro** es una plataforma de agencia digital con dos funcionalidades principales:

1. **Buscador de Leads** (`/buscador`): Escanea negocios locales en tiempo real via OpenStreetMap + Google, los audita (¿tienen web? ¿funciona? ¿están cerrados?) y los puntúa de 0–100 para identificar oportunidades de venta.

2. **Creador de Webs IA** (`/creador`): Toma un lead auditado, enriquece sus datos con información de Google Maps, construye un prompt estructurado para IA y genera una demo web HTML5 personalizada, accesible en `/demo/:id`.

**Stack técnico:** Node.js puro (sin frameworks), servidor HTTP nativo, fetch nativo (Node 18+), HTML/CSS/JS vanilla en frontend. **Sin base de datos persistente en producción** (todo en memoria `Map`).

---

## 2. Estructura de Archivos

```
automat/
├── server.js                        # Servidor HTTP principal — rutas y endpoints API
├── AGENTS.md                        # ← ESTE ARCHIVO
├── DOCS_GENERADOR_WEB.md            # Documentación detallada del módulo generador
├── DOCS_BUSCADOR.md                 # Documentación del módulo buscador
├── .agents/
│   └── rules/
│       └── GOLDEN_RULES.md          # Reglas de oro — LEER SIEMPRE
│
├── public/                          # Frontend estático servido por server.js
│   ├── home.html                    # Página de inicio / hub de navegación  (ruta: / o /home)
│   ├── index.html                   # Buscador de Leads                     (ruta: /buscador)
│   ├── creador.html                 # Creador de Webs IA                    (ruta: /creador)
│   ├── app.js                       # Controlador frontend del buscador
│   ├── creador.js                   # Controlador frontend del creador
│   └── styles.css                   # Estilos globales unificados (Dark Mode, navbar, etc.)
│
└── src/
    ├── scrapers/
    │   └── leadCollector.js         # Pipeline de recolección OSM + geocoding + auditoría
    ├── auditor/
    │   ├── leadAuditor.js           # Motor de auditoría web + motor de scoring 0-100
    │   └── placeDeepInspector.js    # Enriquecimiento Google: cierre, rating, fotos, salud
    ├── generator/
    │   ├── promptBuilder.js         # Fase 2: construye el prompt estructurado para IA
    │   └── webGenerator.js          # Genera HTML5 demo personalizada por sector
    ├── db/
    │   └── d1Client.js              # Cliente Cloudflare D1 (solo para deploy CF Workers)
    └── tester/
        └── selfTestEngine.js        # Suite de tests reales (llamadas HTTP reales a OSM/Google)
```

---

## 3. Rutas del Servidor (`server.js`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` o `/home` | Sirve `public/home.html` |
| `GET` | `/buscador` | Sirve `public/index.html` |
| `GET` | `/creador` | Sirve `public/creador.html` |
| `GET` | `/demo/:id` | Sirve HTML demo generada (desde `demoCache` o genera on-demand) |
| `GET` | `/api/leads` | Devuelve todos los leads en memoria (`leadDatabase`) |
| `POST` | `/api/search` | Lanza escaneo en tiempo real |
| `POST` | `/api/prospect/enrich` | Enriquece un lead con Google Maps data. Body: `{id}` |
| `POST` | `/api/generate-demo` | Genera demo HTML + prompt IA. Body: `{id}` |
| `POST` | `/api/generate-prompt` | Solo genera el prompt IA (sin demo). Body: `{id}` |

### Body de `/api/search`
```json
{
  "freeText": "restaurante",
  "city": "Palma",
  "country": "España",
  "category": "restaurantes",
  "language": "es",
  "targetWeb": "all",
  "targetContact": "all",
  "targetTier": "all"
}
```

### Almacenamiento en memoria (server.js)
```js
const leadDatabase = new Map();   // key: lead.id → value: lead object
const demoCache    = new Map();   // key: lead.id → value: HTML string
```
⚠️ **Estos datos se pierden al reiniciar el servidor.** Persistencia pendiente.

---

## 4. Flujo de Datos Completo

### A. Flujo del Buscador de Leads

```
Usuario (frontend app.js)
  → POST /api/search {freeText, city, country, category, ...options}
    → leadCollector.js::collectAndAuditLeads(query, category, options)
      → geocodeLocationToBBox(query)        [Nominatim OSM API]
      → fetchRealOSMData(bbox, category)    [Overpass API — 3 mirrors failover]
      → Para cada elemento OSM:
          → checkGoogleClosedStatus()       [DuckDuckGo HTML scrape ~3.5s timeout]
          → auditWebsite(url)               [HTTP/HTTPS check directo ~6s timeout]
          → calculateLeadScore(biz, audit)  [scoring 0-100]
      → return leads[] ordenados por score DESC
    → saveLeadsToStore(leads)
  ← JSON: { success, count, data: leads[], newLeadsCount }
```

### B. Flujo del Creador de Webs IA

```
Usuario (frontend creador.js)
  → POST /api/generate-demo {id}
    → leadDatabase.get(id)                 [busca lead en memoria]
    → enrichProspectWithGoogleData(lead)   [placeDeepInspector.js]
    → buildWebPrompt(enrichedLead)         [promptBuilder.js → string de prompt]
    → generateWebDemoHtml(enrichedLead)    [webGenerator.js → HTML string]
    → demoCache.set(id, html)
  ← JSON: { success, demoUrl: '/demo/:id', prompt, prospectId, nombre }

Usuario
  → GET /demo/:id
  ← HTML demo en vivo completa (mobile-first, sin deps)
```

---

## 5. Módulos en Detalle

### 5.1 `src/scrapers/leadCollector.js`

**Exporta:** `collectAndAuditLeads(query, categoryKey, options)`, `buildInternationalWhatsAppUrl(phone)`

**`CATEGORY_MAP`** — llaves válidas para `categoryKey`:
`restaurantes`, `bares`, `talleres`, `peluquerias`, `panaderias`, `supermercados`, `farmacias`

**`options` object:**
```js
{
  freeText: '',         // texto libre de búsqueda
  city: '',             // ciudad / municipio
  country: '',          // país
  language: 'es',       // idioma
  targetWeb: 'all',     // 'all' | 'only_no_web' | 'only_pdf' | 'only_down'
  targetContact: 'all', // 'all' | 'only_phone'
  targetTier: 'all'     // 'all' | 'only_oro' | 'only_plata'
}
```

**Mirrors Overpass (failover automático):**
1. `https://overpass-api.de/api/interpreter`
2. `https://overpass.kumi.systems/api/interpreter`
3. `https://overpass.private.coffee/api/interpreter`

---

### 5.2 `src/auditor/leadAuditor.js`

**Exporta:** `auditWebsite(url)`, `calculateLeadScore(business, auditResult)`, `isMenuOrPdfUrl(url)`, `isSocialMediaUrl(url)`

#### Estados de auditoría (`auditResult.status`)

| Status | Label | scoreBonus | Cuándo se aplica |
|--------|-------|-----------|-----------------|
| `NO_WEBSITE` | 🔴 Sin Web | +45 | Sin URL registrada |
| `SOCIAL_ONLY` | 📲 Solo Red Social | +40 | Instagram / Facebook / Linktree como web |
| `WEBSITE_DOWN` | ⚡ Web Rota | +40 | HTTP 4xx o servidor no responde |
| `PDF_MENU` | 📄 Carta en PDF | +35 | PDF directo o plataforma menú digital |
| `WEBSITE_TIMEOUT` | ⏳ Tiempo Agotado | +30 | >6s sin respuesta |
| `NO_SSL` | 🔒 No Segura | +25 | HTTP sin certificado SSL |
| `SLOW_WEBSITE` | 🐢 Web Lenta | +20 | >3.5s de carga |
| `WEBSITE_OK` | 🟢 Web Funcional | 0 | Lead descartado automáticamente |

#### Fórmula de Score

```
Base:                +10 pts
auditResult.bonus:   +0 a +45 pts
WhatsApp válido:     +20 pts
Solo teléfono:       +10 pts
Sin contacto:        -20 pts
Email disponible:    +5 pts
Dirección detallada: +5 pts
Rating ≥4.2:         +5 pts  (requiere deepInspection)
Reviews ≥30:         +5 pts  (requiere deepInspection)
```

#### Tiers

| Score | Tier | Badge |
|-------|------|-------|
| ≥85 | `oro` | 🥇 Lead ORO ELITE |
| 75–84 | `oro` | 🥇 Lead ORO |
| 55–74 | `plata` | 🥈 Lead Plata |
| <55 | `bronce` | 🥉 Lead Bronce |
| 0 | `descartado` | (ver motivo) |

#### Motivos de descarte automático (score = 0)
- Es franquicia/multinacional (lista en `leadCollector.js` y `leadAuditor.js`)
- Cerrado permanentemente en Google Maps
- Cerrado temporalmente en Google Maps
- `auditStatus === 'WEBSITE_OK'` → ya tiene web, no necesita propuesta

---

### 5.3 `src/auditor/placeDeepInspector.js`

**Exporta:** `checkGoogleClosedStatus(prospect)`, `enrichProspectWithGoogleData(prospect)`

#### `checkGoogleClosedStatus({Nombre, Municipio})`
- Fetch a DuckDuckGo HTML: query `"NombreNegocio Ciudad google maps"`
- Detecta: "cerrado permanentemente", "permanently closed", "cerrado temporalmente", etc.
- Extrae posible URL web oficial de los resultados de búsqueda
- Timeout: **3.5s** — falla gracefully sin crash
- **Retorna:** `{ isClosedPermanently, isClosedTemporarily, foundWebsite }`

#### `enrichProspectWithGoogleData(prospect)`
- ⚠️ **rating y reviewsCount son estimados simulados** — pendiente integrar Google Places API real
- Genera `deepInspection`: rating, reviewsCount, openingHours, businessHealth, viabilityIndex, photos, socialPresence
- Retorna prospect con `deepInspection` añadido

---

### 5.4 `src/generator/promptBuilder.js`

**Exporta:** `buildWebPrompt(prospect)`

- Mapea categoría → tipo de plantilla: `restaurante`, `bar`, `servicio`, `salud`, `tienda`, `generica`, `renovacion`
- Adapta el ángulo de venta al estado digital: `NO_WEBSITE`, `PDF_MENU`, `WEBSITE_DOWN`, `NO_SSL`, `SLOW_WEBSITE`, `SOCIAL_ONLY`
- **Input:** prospect enriquecido con `deepInspection`
- **Output:** string de prompt estructurado para enviar a ChatGPT / Claude / Gemini

---

### 5.5 `src/generator/webGenerator.js`

**Exporta:** `generateWebDemoHtml(prospect)`

- HTML5 completo, responsive, mobile-first, sin dependencias externas
- Temas visuales por sector (colores, iconos, copys)
- Inyecta datos reales: nombre, municipio, teléfono, dirección, sector, WhatsApp CTA
- **Output:** string HTML listo para servir en `/demo/:id` o guardar en disco

---

## 6. Navbar — Reglas de Implementación

El navbar **DEBE** seguir estas reglas en TODAS las páginas HTML:

```html
<!-- ✅ CORRECTO: header FUERA del .container -->
<body>
  <header class="main-header">
    ...
  </header>
  <div class="container">
    ...contenido de página...
  </div>
</body>
```

```html
<!-- ❌ INCORRECTO: header DENTRO del .container -->
<body>
  <div class="container">
    <header class="main-header">...</header>   <!-- NO hacer esto -->
  </div>
</body>
```

### Tab activo por página

| Página | Tab con clase `active` |
|--------|----------------------|
| `home.html` | `a[href='/home']` |
| `index.html` | `a[href='/buscador']` |
| `creador.html` | `a[href='/creador']` |

### CSS del navbar (en `styles.css`)
- `.main-header`: `position: sticky; top: 0; backdrop-filter: blur(18px)`
- Color activo buscador: `rgba(56, 189, 248, 0.18)` (sky blue)
- Color activo creador: `rgba(168, 85, 247, 0.18)` (purple)
- Color activo home: `rgba(99, 102, 241, 0.18)` (indigo)

---

## 7. Convenciones de Código

### Estructura del objeto Lead (schema completo)

```js
{
  // Datos base (siempre presentes)
  id: 'osm_123456_la_tasca',        // OSM ID + nombre snake_case
  Nombre: 'La Tasca',
  Categoria: 'Servicio (restaurant)',
  Telefono: '+34 971 123 456',      // 'No disponible' si vacío
  Email: 'info@example.com',        // 'No disponible' si vacío
  Municipio: 'Palma',
  Direccion: 'Calle Mayor 12',      // 'Dirección no detallada' si vacío
  Website: 'https://...',           // '' si no hay web
  WhatsApp: 'https://wa.me/34...',  // '' si no hay teléfono válido
  GoogleMaps: 'https://www.google.com/maps/search/?api=1&query=...',
  Latitud: 39.5696,
  Longitud: 2.6502,
  isClosedPermanently: false,
  isClosedTemporarily: false,

  // Datos de scoring (añadidos por calculateLeadScore)
  score: 75,
  tier: 'oro',                      // 'oro' | 'plata' | 'bronce' | 'descartado'
  badge: '🥇 Lead ORO',
  color: '#fde047',
  auditLabel: '🔴 Sin Web',
  auditStatus: 'NO_WEBSITE',
  auditDetails: 'El negocio no tiene sitio web registrado.',

  // Datos enriquecidos (opcionales, añadidos por enrichProspectWithGoogleData)
  deepInspection: {
    rating: 4.5,
    reviewsCount: 87,
    openingHours: 'Abierto ahora (09:00 - 20:00)',
    businessHealth: '🌟 Negocio Top',
    healthCode: 'TOP',              // 'TOP' | 'HEALTHY' | 'WARNING' | 'CLOSED_PERMANENTLY' | 'CLOSED_TEMPORARILY'
    viabilityIndex: 90,             // 0-100
    isClosedPermanently: false,
    isClosedTemporarily: false,
    topReview: '...',
    photos: ['url1', 'url2'],
    socialPresence: {
      instagram: 'https://instagram.com/...',
      facebook: 'https://facebook.com/...'
    },
    isEnriched: true
  }
}
```

### Nomenclatura
- Archivos fuente: `camelCase.js`
- IDs de leads: solo `[a-zA-Z0-9_]` — nunca caracteres especiales
- CSS: `kebab-case`
- Constantes: `UPPER_SNAKE_CASE`

### Añadir nuevos endpoints en `server.js`
Siempre **antes** del bloque de archivos estáticos (actualmente ~línea 292). Usar siempre este patrón:
```js
if (req.method === 'POST' && pathname === '/api/nueva-ruta') {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');
      // ... lógica ...
      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
  return;
}
```

---

## 8. Reglas de Oro (Resumen para Agentes)

> Archivo completo: `.agents/rules/GOLDEN_RULES.md`

| # | Regla | Implicación práctica |
|---|-------|---------------------|
| 1 | **Zero Mock Data** | Nunca inventar leads, teléfonos ni direcciones. Solo OSM + Google reales. |
| 2 | **Servidor resiliente** | try/catch en TODOS los endpoints. El servidor no puede caerse. |
| 3 | **Score transparente 0-100** | No cambiar la matriz de scoring sin documentar el cambio. |
| 4 | **Anti-franquicias** | Mercadona, Carrefour, Zara, etc. → score 0 siempre. |
| 5 | **Anti-cerrados** | Cerrado en Google Maps → score 0, excluir de resultados. |
| 6 | **E.164 WhatsApp** | Siempre usar `buildInternationalWhatsAppUrl()` para teléfonos. |
| 7 | **Sin hardcoding** | Cero arrays con nombres específicos de negocios de prueba en el código. |
| 8 | **Testing real** | `selfTestEngine.js` hace peticiones HTTP reales. Sin mocks sintéticos. |
| 9 | **Seguridad primero** | Validar y sanitizar TODAS las entradas. Usar funciones de seguridad implementadas. |
| 10 | **Headers de seguridad** | Aplicar headers de seguridad en todas las respuestas HTTP. |

---

## 9. Pendientes y Backlog

| Prioridad | Tarea | Módulo destino |
|-----------|-------|---------------|
| 🔴 Alta | Crear `src/research/leadResearch.js` — recolección exhaustiva: reviews externas, redes sociales, servicios detallados (Fase 1 generador) | `src/research/` |
| 🔴 Alta | Despliegue Cloudflare Pages — publicar demos en `.pages.dev` via API | `src/deployer/cloudflare.js` |
| 🟡 Media | Persistencia de leads y demos en disco (JSON file) o SQLite | `server.js` + nuevo módulo |
| 🟡 Media | Google Places API real para ratings/reviews en `placeDeepInspector.js` (sustituir datos estimados) | `src/auditor/` |
| 🟡 Media | Plantillas HTML en `src/generator/templates/` (separar del generador monolítico) | `src/generator/` |
| 🟢 Baja | Hamburger menu funcional en navbar para móvil | `public/` |

---

## 10. Cómo Ejecutar

```bash
# Iniciar servidor de desarrollo (puerto 3000)
node server.js

# URLs de acceso
http://localhost:3000           # Hub principal
http://localhost:3000/buscador  # Buscador de Leads
http://localhost:3000/creador   # Creador de Webs IA

# Suite de tests (requiere servidor activo en :3000)
node src/tester/selfTestEngine.js
```

El servidor escanea `Madrid` en OSM al arrancar para precargar datos en `leadDatabase`.
