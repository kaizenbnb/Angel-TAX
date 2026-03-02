# 🔍 Auditoría de Seguridad — Angel Tax v1.0
**Fecha:** Marzo 2026  
**Auditor:** Revisión automática + manual  
**Resultado:** ✅ APROBADO con observaciones menores

---

## Resumen ejecutivo

Angel Tax es una aplicación **single-file, client-side** sin backend propio. La superficie de ataque es mínima por diseño. No hay base de datos, no hay autenticación, no hay sesiones de servidor. Los únicos riesgos identificados son de categoría **BAJA-MEDIA** y tienen mitigación disponible.

---

## 1. Análisis de secretos y credenciales

| Hallazgo | Severidad | Estado |
|----------|-----------|--------|
| API keys hardcodeadas | — | ✅ NINGUNA ENCONTRADA |
| Tokens o contraseñas | — | ✅ NINGUNO ENCONTRADO |
| Datos de usuario en código | — | ✅ NINGUNO ENCONTRADO |

**Resultado:** ✅ LIMPIO

---

## 2. Dependencias externas (Supply Chain)

### 2a. Google Fonts
- **URL:** `https://fonts.googleapis.com`
- **Tipo:** CSS (tipografía)
- **Riesgo:** 🟢 BAJO — Solo carga fuentes visuales, no ejecuta JavaScript
- **Mitigación:** Ninguna necesaria. En el peor caso, la app carga con fuente del sistema.

### 2b. SheetJS v0.18.5
- **URL:** `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`
- **Tipo:** JavaScript ejecutable
- **Riesgo:** 🟡 MEDIO — Si el CDN fuera comprometido, podría ejecutar código arbitrario
- **Mitigación disponible:** Añadir hash SRI (Subresource Integrity)
- **Acción requerida:** ⚠️ Añadir atributo `integrity` con hash SHA-512
```html
<!-- Actual (vulnerable a supply chain) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

<!-- Correcto (con SRI) -->
<script 
  src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
  integrity="sha512-[HASH_AQUÍ]"
  crossorigin="anonymous">
</script>
```
**Cómo obtener el hash:**
```bash
curl -s https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js | \
  openssl dgst -sha512 -binary | openssl base64 -A
# Prefija el resultado con "sha512-"
```
O visita: https://cdnjs.com/libraries/xlsx/0.18.5

### 2c. jsPDF v2.5.1
- **URL:** `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
- **Tipo:** JavaScript ejecutable
- **Riesgo:** 🟡 MEDIO — Igual que SheetJS
- **Acción requerida:** ⚠️ Añadir atributo `integrity` con hash SHA-512

**Nota sobre cdnjs:** Cloudflare CDN (cdnjs) es uno de los CDNs más seguros y monitorizados del mundo. El riesgo real de compromiso es extremadamente bajo, pero la práctica de SRI es el estándar de la industria y debe implementarse.

---

## 3. Comunicaciones de red

| Destino | Cuándo | Datos enviados | Riesgo |
|---------|--------|----------------|--------|
| `fonts.googleapis.com` | Siempre (carga de página) | IP del usuario (sin datos fiscales) | 🟢 Bajo |
| `cdnjs.cloudflare.com` | Siempre (carga de página) | IP del usuario (sin datos fiscales) | 🟢 Bajo |
| `api.anthropic.com` | Solo si usa el Analizador IA | Contenido del documento subido | 🟡 Medio* |

*El usuario elige activamente usar el Analizador IA y es informado de que el documento se envía a Anthropic. Se recomienda anonimizar el nombre antes de subir.

**NO hay comunicación con:**
- Servidores propios de Angel Tax ✅
- Analytics (Google Analytics, etc.) ✅
- Redes publicitarias ✅
- Servicios de error tracking ✅

---

## 4. Procesamiento de archivos (XSS / Injection)

El mayor riesgo de una app que procesa archivos CSV/Excel/PDF del usuario es la inyección.

| Vector | Mitigación presente | Estado |
|--------|--------------------|----|
| CSV con fórmulas Excel (`=CMD()`) | No se evalúan fórmulas en el parser | ✅ |
| HTML en campos CSV | Datos mostrados via template literals | ⚠️ Revisar |
| Script injection en nombre de archivo | No se renderiza el nombre como HTML | ✅ |

### Observación sobre template literals

El código usa template literals de JavaScript para renderizar datos del CSV directamente en el DOM:
```javascript
doc.text(op.asset.substring(0,8), ...)  // ✅ Truncado
`<td>${op.asset}</td>`  // ⚠️ Podría inyectar HTML si asset contiene <script>
```

**Acción recomendada:** Añadir función de sanitización para datos procedentes de archivos externos:
```javascript
function sanitize(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

---

## 5. Almacenamiento de datos del usuario

| Mecanismo | Usado | Datos almacenados |
|-----------|-------|-------------------|
| localStorage | ❌ No | — |
| sessionStorage | ❌ No | — |
| Cookies | ❌ No | — |
| IndexedDB | ❌ No | — |
| Variables JS en memoria | ✅ Sí | Operaciones del ejercicio fiscal |

**Resultado:** Los datos del usuario solo viven en memoria durante la sesión. Al cerrar la pestaña, todo se borra. ✅

---

## 6. Content Security Policy (CSP)

**Estado actual:** ⚠️ Sin CSP configurado

**Recomendación:** Añadir meta tag CSP en el `<head>`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  connect-src https://api.anthropic.com;
  img-src 'self' data:;
">
```

---

## 7. Resumen de acciones recomendadas

| Prioridad | Acción | Dificultad |
|-----------|--------|------------|
| 🔴 Alta | Añadir SRI hashes a SheetJS y jsPDF | Baja |
| 🟡 Media | Añadir función `sanitize()` para datos de CSV | Media |
| 🟡 Media | Añadir Content Security Policy header | Baja |
| 🟢 Baja | Activar Dependabot en GitHub | Trivial |
| 🟢 Baja | Activar Private Vulnerability Reporting | Trivial |

---

## Puntuación general

| Categoría | Puntuación |
|-----------|------------|
| Secretos y credenciales | 10/10 ✅ |
| Dependencias externas | 7/10 ⚠️ |
| Comunicaciones de red | 9/10 ✅ |
| Procesamiento de archivos | 8/10 ⚠️ |
| Almacenamiento de datos | 10/10 ✅ |
| **TOTAL** | **44/50 — BUENO** |

---

*Esta auditoría cubre la versión v1.0 del archivo `index.html`. Se recomienda repetirla en cada release mayor.*
