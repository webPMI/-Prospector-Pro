# 🔍 Documentación Técnica & Auditoría Profunda del Buscador de Leads

---

## 📌 Introducción

Este documento detalla la arquitectura actual, la auditoría de puntos flojos identificados y el plan de acción para transformar nuestro motor de prospección en un **buscador de leads comercial de nivel empresarial**.

---

## 🚨 Auditoría de Puntos Flojos Identificados

A pesar de haber logrado respuestas rápidas (< 2s) y cero datos falsos, el buscador actual presenta las siguientes **limitaciones operativas y de cobertura**:

---

### 1. ⚠️ Geofencing Rígido (Dependencia de Coordenadas Fijas)
- **El Problema**: Actualmente, las coordenadas rectangulares (`REGION_BBOXES`) están prefijadas manualmente para 6 zonas fijas (Palma, Mallorca centro, Ibiza, Menorca, Manacor e Inca).
- **Consecuencia**: Si un usuario busca municipios importantes como **Calvià, Alcúdia, Sóller, Andratx, Felanitx o Ciutadella**, el sistema recae por defecto en el centro de Palma.
- **Solución Necesaria**: Integrar la API de Geocodificación Automática (Nominatim/OSM Geocoder) para convertir cualquier pueblo, municipio o dirección del mundo en su **Bounding Box exacta en tiempo real**.

---

### 2. ⚠️ Límite Artificial de Resultados por Consulta (`out center tags 50`)
- **El Problema**: Para garantizar respuestas por debajo de 2 segundos, limitamos la consulta a un número reducido de nodos comerciales.
- **Consecuencia**: En zonas de alta densidad comercial como el centro de Palma, existen más de 300 locales comerciales, pero solo capturamos los primeros 40-50.
- **Solución Necesaria**: Implementar **Paginación Inteligente por Cuadrantes** y división de sub-consultas en paralelo por sector.

---

### 3. ⚠️ Rigidez en el Mapeo Semántico de Categorías
- **El Problema**: Si el usuario selecciona *"Restaurantes"*, Overpass ejecuta únicamente la etiqueta estricta `amenity=restaurant`.
- **Consecuencia**: Se quedan fuera locales como **Pizzerías, Hamburgueserías, Marisquerías, Bistrós o Gastrobares** que en OpenStreetMap figuran catalogados bajo `amenity=fast_food`, `amenity=pub` o `shop=bakery`.
- **Solución Necesaria**: Matriz de **Sinónimos Semánticos Agrupados** por categoría de negocio.

---

### 4. ⚠️ Falta de Normalización Completa de Teléfonos
- **El Problema**: En zonas insulares con alto turismo, los teléfonos aparecen registrados en formatos heterogéneos (`+34 971...`, `0034 971...`, `971-12-34-56`, `+44...`).
- **Consecuencia**: Algunos enlaces a WhatsApp Web (`wa.me`) fallan o no forman correctamente el prefijo internacional `34`.
- **Solución Necesaria**: Normalizador de números de teléfono basado en formato estándar E.164.

---

### 5. ⚠️ Ausencia de Caché Geográfica Persistente
- **El Problema**: Consultar dos veces la misma zona (ej: *"Palma Restaurantes"*) vuelve a lanzar peticiones HTTP externas a los servidores de Overpass.
- **Consecuencia**: Consumo innecesario de red y tiempo de espera evitable.
- **Solución Necesaria**: Sistema de **Caché Híbrida (Memoria + Cloudflare D1)** con TTL de 24 horas.

---

## 🛠️ Plan de Acción para la Versión 2.0 del Buscador

| Módulo | Estado Actual | Objetivo v2.0 |
| :--- | :--- | :--- |
| **Geocodificación** | 6 BBOXES fijas | Nominatim API (Cualquier municipio mundial) |
| **Volumen de Leads** | 40-50 nodos por consulta | Paginación y escaneo profundo por cuadrantes (200+ leads) |
| **Semántica Categorías** | Coincidencia exacta de etiqueta | Matriz de sinónimos semánticos expandidos |
| **Normalización WA** | Regex básica de 9 dígitos | Parser E.164 internacional |
| **Caché de Búsqueda** | Solo en memoria local | Caché D1 SQL con invalidación TTL (24h) |

---

## 🚀 Próximos Pasos Recomendados

1. Implementar la integración con **Nominatim Geocoding API** para búsquedas universales por nombre de municipio.
2. Expandir el diccionario semántico de categorías en `src/scrapers/leadCollector.js`.
3. Crear el parser de normalización de teléfonos E.164.
