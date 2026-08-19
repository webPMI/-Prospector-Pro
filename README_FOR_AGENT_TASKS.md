# 🚀 Tareas Operacionales para Agentes (Guía de Arranque Rápido)

Bienvenido a Prospector Pro. Este README te indicará el orden óptimo para abordar cualquier funcionalidad o corrección, siguiendo la arquitectura definida en [AGENTS.md](./AGENTS.md).

---

## 💡 Flujo Recomendado por Funcionalidad (Pathing Optimization)

**👉 Si quieres modificar un cálculo de Score:**
1.  **Estudiar Primero:** `src/auditor/leadAuditor.js` $\rightarrow$ Entender la fórmula matemática.
2.  **Verificar Datos Base:** `src/auditor/placeDeepInspector.js` $\rightarrow$ Saber qué datos reales se están alimentando al cálculo (Rating, etc.).
3.  **Validar Estructura:** `src/auditor/googlePlaceService.js` $\rightarrow$ Entender las limitaciones de los servicios externos.

**👉 Si quieres cambiar el diseño visual de una demo:**
1.  **Crear Tema:** Crear o modificar un archivo en `/src/generator/templates/*.html`.
2.  **Actualizar Lógica:** Modificar `webGenerator.js` para que detecte la nueva plantilla y reemplace los *placeholders* correctos.
3.  **Revisar Estilos:** Ajustar `public/styles.css` si se requiere un cambio de color global o tipografía.

**👉 Si quieres modificar una ruta API (Ej: Añadir `/api/nueva-tarea`):**
1.  **Punto de Entrada:** Modificar **exclusivamente** `server.js`. Debe seguir el patrón `if (req.method === 'POST' && pathname === '/api/nueva-ruta') { ... }` y asegurar que se usa un `try...catch` completo.
2.  **Lógica:** Implementar la lógica en los módulos de servicio adecuados (`leadCollector.js`, etc.).

---

## 🐛 Diagnóstico de Fallos (Debugging Workflow)

Cuando encuentres un fallo, sigue este flujo:

1.  **¿Es Pérdida de Datos?** $\rightarrow$ Revisar `server.js` y `persistenceManager.js`.
2.  **¿El Dato es Incorrecto/Incompleto?** $\rightarrow$ Revisar `placeDeepInspector.js` o el módulo scraper responsable, verificando la llamada API externa primero.
3.  **¿La Presentación es Mala?** $\rightarrow$ Revisar las plantillas en `/src/generator/templates/` y cómo `webGenerator.js` rellena los *placeholders*.

---
*Este README debe ser consultado antes de modificar cualquier línea de código.*