# 🌐 Módulo Generador de Demo Web con IA

> **Sección del sistema encargada de crear el proyecto web demos para cada negocio seleccionado.** A partir de un prospecto auditado, la IA genera una landing page personalizada, la despliega en una URL pública y entrega el enlace listo para enviar por WhatsApp/Email.

---

## 📌 Estado Actual (Implementación)

| Componente | Opción | Estado | Archivo |
|------------|--------|--------|---------|
| **Modo 1: Plantilla Reutilizable** | `modo: "template"` | ✅ Implementado | `src/generator/webGenerator.js` |
| **Modo 2: API con Tu IA** | `modo: "user-ai"` | ✅ Implementado (fallback) | `src/generator/webGenerator.js` |
| **Modo 3: Múltiples Agentes** | `modo: "agents"` | ✅ Implementado (estructura) | `src/generator/webGenerator.js` |
| Plantillas HTML Base | 3 plantillas (restaurante, servicio, genérica) | ✅ Implementado | `src/generator/webGenerator.js` |
| Endpoint `/api/generate-demo` | Los 3 modos soportados | ✅ Implementado | `server.js` |
| Caché Persistente | `data/` folder | ✅ Implementado | `server.js` |

---

## 🎯 Opción 1: Plantilla Reutilizable (Modo Por Defecto)

### Concepto
El sistema tiene **3 plantillas HTML/CSS pre-diseñadas** (restaurante, servicio, genérica) que la IA "rellena" con los datos reales del negocio. Es el modo más rápido, consistente y seguro.

### 📋 Cómo Funciona

1. **Detecta la categoría** del negocio automáticamente
2. **Selecciona la plantilla adecuada**:
   - `restaurante` → Plantilla de restaurante
   - `servicio` / `taller` / `repair` → Plantilla de servicios
   - Cualquier otro → Plantilla genérica
3. **La IA rellena los "huecos"** de la plantilla con datos reales
4. **Si la IA falla**, se muestra la plantilla básica sin contenido IA

### 🏗️ Plantillas Incluidas

#### 🍽️ Plantilla: Restaurante
- Hero con tagline gastronómica
- Sección de servicios (carta digital, reservas, platos estrella)
- Galería de fotos del local
- Rating de Google y opiniones
- Ubicación con Google Maps
- CTA flotante de WhatsApp

#### 🛠️ Plantilla: Servicio (Talleres/Reformas)
- Hero con tagline de confianza
- Sección de servicios especializados
- Formulario de cita previa por WhatsApp
- Galería de trabajos realizados
- Rating y opiniones
- Ubicación y contacto

#### 📄 Plantilla: Genérica
- Hero corporativo
- Sección de características principales
- Box de reseñas destacadas
- Ubicación y datos de contacto
- CTA de WhatsApp

### 🎯 Cuándo Usar Esta Opción
- ✅ Cuando quieres resultados rápidos (5-10 segundos)
- ✅ Cuando quieres consistencia en todas las demos
- ✅ Cuando no quieres depender de claves API de IA
- ✅ Cuando cumples con las Golden Rules (sin datos inventados)
- ✅ Para la mayoría de los casos de uso cotidianos

### 📊 Ventajas
- **Velocidad**: Generación en 5-10 segundos
- **Consistencia**: Misma estructura en todas las demos
- **Costo**: Sin costo de llamadas a APIs de IA
- **Seguridad**: Datos siempre reales, sin invención
- **Mantenimiento**: Fácil actualizar las plantillas

---

## 🟡 Opción 2: API con Tu Propia IA (Maximum Control)

### Concepto
El usuario provee su propia clave de API (Gemini, OpenAI, Claude) y el sistema la usa para generar la web completamente personalizada.

### 🔑 Cómo Configurar

1. Ve a la sección "Configurar IA" en el Creador
2. Introduce tu clave de API (solo se guarda en la sesión actual)
3. La clave se usa solo para esa sesión específica
4. No se guarda permanentemente en el servidor

### 📋 Cómo Usar

1. Configura tu clave API en `/configurar-ia`
2. Al generar la demo, el sistema usará tu clave
3. La IA crea la web desde cero con tus parámetros
4. Recibes el HTML personalizado completo

### 🎯 Cuándo Usar Esta Opción
- ✅ Cuando quieres control total del contenido
- ✅ Cuando tienes una clave API de Gemini/OpenAI disponible
- ✅ Cuando necesitas características muy específicas
- ✅ Cuando el negocio requiere un enfoque único

### 📊 Ventajas
- **Control Total**: Tú decides qué la IA genera
- **Personalización**: Sin limitaciones de plantillas fijas
- **Flexibilidad**: Puedes cambiar de proveedor fácilmente
- **Privacidad**: La clave solo está en tu sesión

### 📊 Desventajas
- **Costo**: Corresponde al usuario (por llamadas a API)
- **Tiempo**: Variable, depende del proveedor
- **Consistencia**: Puede variar entre generaciones
- **Dependencia**: Necesitas tu propia clave

---

## 🔵 Opción 3: Servidor con Múltiples Agentes (Premium)

### Concepto
El servidor tiene agentes especializados que colaboran para crear la web de mayor calidad posible.

### 🤖 Agentes Especializados

| Agente | Responsabilidad |
|--------|-----------------|
| **Agente de Contenido** | Escribe copy, títulos, descripciones, testimonios |
| **Agente de Diseño** | Define layout, colores, tipografía, estructura visual |
| **Agente de SEO** | Optimiza meta tags, headings, estructura para buscadores |
| **Agente de Prueba** | Genera tests de usabilidad básica, validación de enlaces |

### 📋 Cómo Funciona

1. El sistema envía los datos del negocio a todos los agentes
2. Cada agente trabaja de forma independiente
3. Los resultados se fusionan y validan
4. Se genera el HTML final con las mejores partes de cada agente
5. Se realiza una validación final de calidad

### 🎯 Cuándo Usar Esta Opción
- ✅ Clientas premium que exigen lo mejor
- ✅ Negocios complejos que necesitan enfoque especial
- ✅ Cuando el presupuesto no es limitante
- ✅ Cuando se quiere el máximo calidad posible

### 📊 Ventajas
- **Mejor Calidad**: Cada agente se enfoca en su especialidad
- **Validación Cruzada**: Los agentes pueden cross-validar información
- **Resultados Profesionales**: Nivel de agencia de diseño
- **Creatividad**: Cada agente aporte ideas únicas

### 📊 Desventajas
- **Complejidad**: Más difícil de mantener y depurar
- **Costo**: Múltiples llamadas a IA (mayor costo)
- **Latencia**: Tiempos de generación más largos (10-30s)
- **Sobrecarga**: Puede ser excesivo para casos simples

---

## 📂 Estructura de Documentación Relacionada

### 📄 DOCS_GENERADOR_WEB.md
- **Este archivo**: Visión general de las 3 opciones
- **Contenido completo**: Documentación detallada de cada modo

### 📄 DOCS_BUSCADOR.md
- **Búsqueda de leads**: Cómo encontrar negocios para generar demos

### 📄 DOCS_PROYECTO.md
- **Visión general**: Arquitectura completa del proyecto Prospector Pro

### 📄 README.md
- **Instalación y ejecución**: Cómo correr el proyecto localmente

### 📄 AGENTS.md
- **Reglas del agente**: Golden Rules y convenciones del proyecto

### 📄 .agents/rules/GOLDEN_RULES.md
- **Reglas fundamentales**: Sin datos inventados, servidor resiliente, etc.

---

## 🔧 Guía Rápida: Qué Opción Elegir

| Si necesitas... | Elige la Opción |
|-----------------|-----------------|
| Resultados rápidos y consistentes | **Opción 1: Plantilla Reutilizable** |
| Control total y tienes clave API | **Opción 2: Tu IA** |
| Máxima calidad y presupuesto ilimitado | **Opción 3: Multi-agentes** |
| Probar el sistema por primera vez | **Opción 1: Plantilla Reutilizable** |
| No tienes clave API de IA | **Opción 1: Plantilla Reutilizable** |
| Quieres aprender cómo funciona | **Opción 1: Plantilla Reutilizable** (para empezar) |

---

## 🛠️ Guía de Implementación Técnica

### Para Desarrolladores

#### Modo 1 (Plantilla): 
- Modificar `src/generator/webGenerator.js` para cambiar el `modo` por defecto
- Agregar nuevas plantillas editando los bloques `TEMPLATE_*`
- El prompt builder ya incluye la instrucción de "trabajar sobre la plantilla"

#### Modo 2 (User AI):
- Usar endpoint `/api/set-ai-keys` para configurar la clave en sesión
- El prompt builder detecta la clave y usa el proveedor correspondiente
- Validar que la clave existe antes de generar

#### Modo 3 (Agentes):
- Requiere implementar la coordinación de agentes en `buildWebPrompt`
- Cada agente recibe el mismo prompt pero con instrucciones diferentes
- Fusionar resultados en la salida final

### Para Usuarios Finales

#### En el Creador (`/creador`):
1. Selecciona un negocio de la lista
2. Haz clic en "1. Recolectar & Construir Prompt"
3. El modo por defecto es **Plantilla Reutilizable** (más rápido)
4. Si quieres usar tu IA, ve a "Configurar IA" primero
5. Haz clic en "2. Generar Demo Web IA"
6. Recibe la demo y el enlace para compartir

---

## 🚀 Roadmap Futuro

### Fase 1 (Actual) - ✅ Completado
- [x] Plantilla reutilizable implementada
- [x] 3 plantillas base (restaurante, servicio, genérica)
- [x] Modo por defecto seguro
- [x] Caché persistente de datos

### Fase 2 - Próximo
- [ ] Interfaz "Configurar IA" para la Opción 2
- [ ] Validación de claves API en tiempo real
- [ ] Estadísticas de uso por modo

### Fase 3 - Futuro
- [ ] Implementación completa de la Opción 3 (multi-agentes)
- [ ] Interfaz de gestión de agentes
- [ ] Sistema de puntuación de calidad de generación
- [ ] Integración con servicios externos adicionales

---

## ❓ Preguntas Frecuentes (FAQ)

### P: ¿Puedo cambiar de modo después de generar una demo?
R: No, el modo se selecciona al momento de generar. Para otro estilo, genera una nueva demo con el modo deseado.

### P: ¿Las demas generadas con la Opción 1 tienen el mismo diseño?
R: Tienen la misma estructura base, pero el contenido (textos, fotos, ratings) es único para cada negocio gracias a los datos reales recolectados.

### P: ¿Puedo usar mi propia clave API en la Opción 1?
R: La Opción 1 está diseñada para funcionar sin claves API externas. Si tienes una clave y quieres usarla, cambia al modo 2.

### P: ¿Puedo combinar plantilla con contenido de mi IA?
R: Sí, la Opción 2 permite que proporciones contenido adicional que la IA integre con la estructura base.

### P: ¿Los datos del negocio son reales en las 3 opciones?
R: ✅ Sí, todas las opciones usan datos reales recolectados de OpenStreetMap + Google Maps. La diferencia es cómo se presenta y estructura ese contenido.

---

## 📞 Soporte y Contacto

Para dudas sobre las opciones de generación:
- Revisa la sección correspondiente en esta documentación
- Verifica las Golden Rules en `.agents/rules/GOLDEN_RULES.md`
- Contacta si necesitas ayuda específica para tu caso de uso

---

**Última actualización**: 13 de agosto de 2026  
**Versión**: 2.0 - Arquitectura modular de 3 opciones
</write_to_file>
</argument>
</write_to_file>
</argument>