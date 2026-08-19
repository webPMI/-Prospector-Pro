# 🛡️ REGLAS DE ORO DEL PROYECTO (GOLDEN RULES)

### Regla 1: Cero Datos Sintéticos o Falsos (Zero Mock Data)
Todos los datos de leads, negocios, teléfonos y ubicaciones deben provenir al 100% de fuentes reales en tiempo real (Google Maps & OpenStreetMap).

### Regla 2: Seguridad y Autonomía de Servidor
El servidor `server.js` debe funcionar con controladores de excepciones globales sin caerse jamás.

### Regla 3: Clasificación Transparente por Lead Score (0-100 pts)
Los leads se evalúan bajo una matriz objetiva en 4 dimensiones (Urgencia Digital, Contacto Directo, Activos y Estado Operativo).

### Regla 4: Filtro Estricto Anti-Franquicias y Multinacionales
Negocios corporativos (Mercadona, Carrefour, Decathlon, Eroski, etc.) deben recibir Score 0 (Descartado) automáticamente.

### Regla 5: Detección Real de Negocios Cerrados Permanentemente
Negocios clausurados en Google Maps deben recibir Score 0 (Descartado) con el distintivo `⛔ Cerrado en Google Maps`.

### Regla 6: Normalización Telefónica Internacional E.164 (WhatsApp Mundial)
Generación de enlaces a WhatsApp Web con detección automática de prefijos (+34, +1, +52, +54, +44, +33, +81).

### Regla 7: Arquitectura Limpia Sin Parches Hardcodeados
No se permite introducir arrays con nombres de negocios específicos de prueba. El código debe ser 100% dinámico.

### Regla 8: Cero Simulación en Testing (100% Real Live Google Maps Requests)
El motor de testing debe realizar llamadas HTTP reales a Google Maps / Places / Overpass y auditar las respuestas HTML/JSON obtenidas en vivo. Queda estrictamente prohibido simular o inventar respuestas sintéticas en la suite de pruebas.
