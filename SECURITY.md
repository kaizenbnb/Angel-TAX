# 🔒 Política de Seguridad — Angel Tax

## Versiones soportadas

| Versión | Soporte de seguridad |
|---------|---------------------|
| v1.x (main) | ✅ Activo |
| Versiones anteriores | ❌ Sin soporte |

---

## Arquitectura de seguridad

Angel Tax está diseñado con **privacidad por defecto (Privacy by Design)**:

- ✅ **100% client-side** — Ningún dato del usuario se envía a servidores propios
- ✅ **Sin base de datos** — No hay almacenamiento persistente de operaciones
- ✅ **Sin autenticación** — No se recopilan credenciales
- ✅ **Sin cookies de tracking** — Sin analytics ni publicidad
- ✅ **Open source** — Código auditado públicamente

La única comunicación externa se produce cuando el usuario usa el **Analizador IA**, que envía el documento directamente a la API de Anthropic. Esta llamada se realiza desde el navegador del usuario con su propia API key — nunca a través de un servidor intermediario.

---

## Dependencias externas (CDN)

| Librería | Versión | Fuente | Uso | Riesgo |
|----------|---------|--------|-----|--------|
| Google Fonts | — | fonts.googleapis.com | Tipografía (CSS) | Bajo — sin ejecución JS |
| SheetJS (xlsx) | 0.18.5 | cdnjs.cloudflare.com | Lectura de archivos Excel | Medio — JS ejecutable |
| jsPDF | 2.5.1 | cdnjs.cloudflare.com | Generación de PDF | Medio — JS ejecutable |

> ⚠️ **TODO para contribuidores**: Añadir atributos `integrity` (SRI hash) y `crossorigin="anonymous"` a los scripts de SheetJS y jsPDF. Los hashes correctos están disponibles en https://cdnjs.com

### Cómo verificar los hashes SRI manualmente

```bash
# Descargar y calcular el hash
curl -s https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js | \
  openssl dgst -sha512 -binary | openssl base64 -A

curl -s https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js | \
  openssl dgst -sha512 -binary | openssl base64 -A
```

---

## Reportar una vulnerabilidad

**No abras un Issue público para vulnerabilidades de seguridad.**

### Proceso de reporte responsable (Responsible Disclosure)

1. **Envía un email privado** a: `security@angeltax.es` _(o contacta al mantenedor directamente via GitHub)_
2. Incluye:
   - Descripción detallada de la vulnerabilidad
   - Pasos para reproducirla
   - Impacto potencial estimado
   - Si tienes, una propuesta de solución
3. **Recibirás respuesta en 48 horas**
4. Trabajaremos contigo para resolver el problema antes de cualquier divulgación pública
5. Daremos crédito público al descubridor (si lo desea) una vez corregida la vulnerabilidad

### Qué NO reportar como vulnerabilidad de seguridad

- Bugs funcionales (usa Issues normales)
- Sugerencias de mejora (usa Issues o Discussions)
- Problemas con el cálculo fiscal (usa Issues normales)

---

## Vulnerabilidades que SÍ nos interesan

- XSS (Cross-Site Scripting) en el procesamiento de archivos CSV/Excel
- Inyección de código malicioso a través de archivos subidos
- Exfiltración de datos del usuario a servidores externos no declarados
- Compromiso de las dependencias CDN (supply chain attack)
- Exposición involuntaria de datos fiscales del usuario

---

## Hall of Fame

_Esta sección reconocerá públicamente a los investigadores que reporten vulnerabilidades válidas de forma responsable._

| Investigador | Vulnerabilidad | Fecha | Estado |
|-------------|----------------|-------|--------|
| — | — | — | — |

---

## Licencia y responsabilidad

Angel Tax es una herramienta orientativa. No constituye asesoramiento fiscal profesional. Consulta siempre con un asesor fiscal certificado para decisiones importantes.

Ver [LICENSE](./LICENSE) para más detalles.
