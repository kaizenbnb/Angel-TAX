# Política de Seguridad — Angel Tax

## Medidas implementadas (v1.0.0)

### Procesamiento local
Todo el cálculo fiscal se realiza **exclusivamente en el navegador del usuario**. Los archivos CSV nunca se envían a ningún servidor propio.

### Content Security Policy (CSP)
`index.html` incluye una cabecera CSP que:
- Bloquea scripts de origen no autorizado
- Restringe conexiones de red a `api.anthropic.com` (solo si el usuario usa el analizador IA)
- Prohíbe `object-src` (plugins Flash/etc.)
- Restringe `base-uri` al propio documento

### Sanitización de entradas
La función `sanitize()` escapa `&`, `<`, `>`, `"`, `'` en todos los valores externos antes de renderizarlos como HTML. Previene XSS desde archivos CSV maliciosos.

### Dependencias externas (CDN)
| Librería | Versión | crossorigin |
|----------|---------|-------------|
| SheetJS (xlsx) | 0.18.5 | anonymous |
| jsPDF | 2.5.1 | anonymous |

**SRI pendiente:** Versiones fijadas. Hashes SHA-512 por verificar. Ver KNOWN_LIMITATIONS #9.
Para añadir SRI: https://www.srihash.org/

### Clave API (analizador IA)
- Llamada a Anthropic sin clave de usuario — usa sesión Claude.ai
- No se almacena en localStorage ni cookies
- Contenido limitado a 80.000 caracteres

### localStorage
Almacena: operaciones, lotes, saldos M721, año, método.
No almacena: datos personales, DNI, claves API.

## Reportar una vulnerabilidad
No abrir issue público. Contactar via GitHub Security Advisories.
Respuesta: < 72 horas.

## Historial
| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0.0 | 2026-03-03 | CSP, crossorigin CDNs, sanitize(), AI privacy disclosure |
