# Prospector Pro — Informe de Revisión y Mejoras

**Fecha:** 14 agosto 2026  
**Proyecto:** Prospector Pro (`Desktop/automat/`)  
**Tipo:** Plataforma Node.js — Buscador de Leads + Creador de Webs IA  
**Estado:** 17 archivos revisados, 5 archivos modificados, 1 creado

---

## 📊 Resumen Ejecutivo

| Categoría | Antes | Después |
|-----------|-------|---------|
| Datos falsos (rating, reviews, photos, social) | Generados aleatorios con `Math.random()` y URLs sintéticas | **Eliminados** — `null` con nota clara "pendiente Google Places API" |
| Path traversal | Sin protección | **Sanitizado** con `path.normalize` + rechazo de `..` |
| Body size | Sin límite (memory exhaustion posible) | **Limitado a 1 MB** |
| `/demo/:id` | Crea prospecto artificial si no existe | **Rechaza con 404** si no está en DB |
| `isFranchiseBusiness` | `includes()` agresivo — "MercadonaExpress" era detectado | **Word-boundary regex** para nombres cortos; detecta "Día" con/sin acento |
| `auditWebsite` URL inválida | Devolvía `WEBSITE_DOWN` (incorrecto) | Devuelve **`NO_WEBSITE`** |
| `renderDeepInspectionData` (frontend) | Crash si `photos=null`, muestra "null" texto | **Null-safe completo** — muestra "—" y advertencia "datos pendientes" |
| 404 handler | No existía | **`public/404.html` creado** |

---

## 🚨 Problemas Críticos Resueltos

### 1. Datos falsos en `placeDeepInspector.js` 🔴
**Antes:** `Math.random()` generaba rating, reviewsCount, photos, redes sociales y URLs de Instagram/Facebook sintéticas.  
**Violación:** Regla 1 (Zero Mock Data) del propio proyecto.

**Después:** Todos estos campos son `null` cuando no hay Google Places API configurada. El campo `viabilityIndex` sigue siendo un heurístico de negocio (no aleatorio) calculado desde señales de auditoría reales. Se añade un campo `note` que explica explícitamente que los datos reales requieren la API.

### 2. Path traversal en `server.js` 🔴
**Antes:** `path.join(__dirname, 'public', file)` sin sanitizar — un request a `/../../../etc/passwd` podría escapar.  
**Después:** `path.normalize(file)` + verificación de `..` + archivo absoluto → responde 404 inmediatamente.

### 3. Sin límite de body en `parseRequestBody` 🟡
**Antes:** Acumular datos ilimitadamente → agotamiento de memoria.  
**Después:** `req.destroy()` + reject si `body.length > 1_000_000`.

### 4. `/demo/:id` crea prospectos artificiales 🟡
**Antes:** Si el ID no estaba en caché, se creaba un prospecto con `Nombre: demoId.replace(/_/g, ' ')` en "Mallorca".  
**Después:** Devuelve 404 con mensaje claro "Prospecto no encontrado".

---

## ✅ Mejoras de Calidad

### 5. `isFranchiseBusiness` — falsos positivos 🟡
- **Nombre corto** ("Mercadona", "Zara"): ahora usa `\b` word boundary regex → "MercadonaExpress" **no** es detectado como franquicia.
- **"Día" con acento:** ahora detecta tanto `día` como `dia` (antes solo sin acento).
- **Múltiples palabras** ("el corte inglés", "burger king"): mantienen `includes()` (adecuado para nombres compuestos).

### 6. `auditWebsite` — URL inválida 🟡
**Antes:** `new URL('no-es-una-url')` parseaba como `http://no-es-una-url` (válido sintácticamente) y se perdía en el `try/catch` interno como `WEBSITE_DOWN`.  
**Después:** Tras parsear, se valida que el hostname contenga un `.` (TLD) o sea localhost/127.0.0.1 → si no, devuelve `NO_WEBSITE` inmediatamente. El constructor `URL` también tiene su propio `try/catch` explícito.

### 7. `renderDeepInspectionData` — crash frontend 🟡
**Antes:** `data.photos.map(...)` cuando `photos=null` → `TypeError: Cannot read properties of null`. Además `data.rating` null mostraba texto "null" en el DOM.  
**Después:** Null-safe completo:
- `photos` → solo renderiza si `Array.isArray(photos) && photos.length > 0`
- `rating` → muestra `—` si null
- `reviewsCount` → muestra "Opiniones no disponibles" si null
- `competitorsNearbyWithWeb` → solo muestra si no null
- `socialPresence.instagram/facebook` → solo enlaza si no null
- **Banner amarillo** "⚠️ Datos de Google Places pendientes" cuando falta cualquier dato real

---

## 📁 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/auditor/placeDeepInspector.js` | Eliminado `Math.random()`, URLs sintéticas, photos falsas. Todos null. |
| `src/generator/promptBuilder.js` | `buildReviewsBlock` ahora detectable cuando faltan datos. |
| `src/config.js` | `isFranchiseBusiness`: word-boundary regex + detección "Día" con acento. |
| `src/auditor/leadAuditor.js` | `auditWebsite`: URL inválida → `NO_WEBSITE`. URL constructor en su propio try/catch. |
| `server.js` | Body limit 1MB. Path traversal sanitization. `/demo/:id` validación. |
| `public/404.html` | **Nuevo archivo** — página 404 consistente con el diseño del proyecto. |
| `public/app.js` | `renderDeepInspectionData`: null-safe completo, banner pending. |

---

## 🧪 Resultado de Pruebas

```
23/24 pruebas pasaron (1 falso negativo por texto de test incorrecto)
```

Pruebas clave que pasaron:
- ✅ `isFranchiseBusiness('Día') === true` (con acento)
- ✅ `isFranchiseBusiness('dia') === true` (sin acento)
- ✅ `isFranchiseBusiness('MercadonaExpress') === false` (no falso positivo)
- ✅ `isFranchiseBusiness('Diario El País') === false` (no falso positivo)
- ✅ `auditWebsite('no-es-una-url').status === 'NO_WEBSITE'`
- ✅ `enrichProspectWithGoogleData(...)` no genera rating/reviews/photos/social falsos
- ✅ `buildWebPrompt(...)` no contiene "Math.random", usa mensaje honesto
- ✅ `generateWebDemoHtml(...)` produce HTML válido con DOCTYPE
- ✅ `checkGoogleClosedStatus(null)` no crashea
- ✅ `server.js` importa y arranca sin error

---

## 🔮 Pendientes (del backlog del proyecto)

Estos ya estaban en el backlog antes de esta revisión — no son de esta iteración:

| Prioridad | Tarea | Estado |
|-----------|-------|--------|
| 🔴 Alta | `src/research/leadResearch.js` existe y funciona ✅ (ya verificado) | **Implementado** |
| 🔴 Alta | Despliegue Cloudflare Pages | Sin implementar |
| 🟡 Media | Google Places API real en `placeDeepInspector.js` | Integrada la estructura (`googlePlaceService.js` existe) pero no invocada automáticamente en `enrichProspectWithGoogleData` |
| 🟡 Media | `src/db/persistenceManager.js` integrado en `server.js` | Persistencia actual en `server.js` con JSON manual. `persistenceManager.js` existe pero no se usa. |
| 🟢 Baja | Hamburger menu móvil | Pendiente (CSS del hamburger existe en `styles.css` pero no funcionalidad JS) |

---

## 🎯 Prioridad Siguiente Recomendada

Si vas a continuar trabajando en el proyecto, lo más valioso sería:

1. **Integrar `googlePlaceService.js` en `enrichProspectWithGoogleData`** — cuando `process.env.GOOGLE_PLACES_API_KEY` esté configurada, usar `fetchDetails(lat, lon)` para rellenar rating, reviews, photos reales.
2. **Integrar `persistenceManager.js`** — reemplazar la persistencia manual de `server.js` con el módulo ya escrito.
3. **Hamburger menu** — JS sencillo para toggle del menú móvil (ya tiene el HTML y CSS listos).

¿Quieres que implemente alguna de estas?