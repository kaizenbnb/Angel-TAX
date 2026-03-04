# 🤝 Guía de Contribución — Angel Tax

¡Gracias por querer contribuir a Angel Tax! Este proyecto nace de la comunidad cripto española y vive gracias a ella.

---

## Antes de contribuir

### Código de conducta

- Trato respetuoso en todo momento
- Las discusiones técnicas son bienvenidas, los ataques personales no
- El objetivo común es ayudar a los contribuyentes españoles con criptos

### ¿Qué tipo de contribuciones buscamos?

✅ **Bienvenidas**
- Correcciones de bugs
- Mejoras de precisión fiscal (con referencia a normativa AEAT o DGT)
- Soporte para nuevos exchanges en el importador CSV
- Mejoras de accesibilidad (a11y)
- Traducciones y mejoras de texto
- Tests y documentación

⚠️ **Discutir primero (abre un Issue)**
- Nuevas funcionalidades grandes
- Cambios en la arquitectura
- Cambios en el diseño visual

❌ **No aceptadas**
- Código que envíe datos del usuario a servidores externos
- Dependencias con licencias no compatibles con MIT
- Analytics, tracking o publicidad de cualquier tipo
- Código obfuscado o minificado sin fuente original

---

## Proceso de contribución

### 1. Fork y configuración

```bash
# Fork el repo desde GitHub, luego clona tu fork
git clone https://github.com/TU_USUARIO/Angel-TAX.git
cd Angel-TAX

# Añade el repo original como upstream
git remote add upstream https://github.com/kaizenbnb/Angel-TAX.git
```

### 2. Crea tu rama de trabajo

```bash
# Sincroniza con upstream antes de crear la rama
git fetch upstream
git checkout -b feat/nombre-descriptivo upstream/main

# Ejemplos de nombres de rama:
# feat/importador-kraken
# fix/calculo-fifo-permuta
# docs/guia-defi-actualizada
# style/mobile-responsive-header
```

### 3. Nomenclatura de commits

Usamos **Conventional Commits**:

```
tipo(ámbito): descripción corta en español

[cuerpo opcional]

[referencias a issues: Fixes #123]
```

| Tipo | Cuándo usarlo |
|------|---------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Solo documentación |
| `style` | Formato, espacios (sin cambio lógico) |
| `refactor` | Refactoring sin nueva funcionalidad |
| `fiscal` | Actualización de normativa o cálculos fiscales |
| `security` | Corrección de seguridad |

**Ejemplos:**
```
feat(importador): añadir soporte para CSV de Kraken

fix(fifo): corregir cálculo cuando hay múltiples compras el mismo día
Fixes #42

fiscal(casillas): actualizar tramos IRPF 2025 según Ley PGE
Ref: BOE-A-2024-XXXXX
```

### 4. Pull Request

- Crea el PR hacia la rama `main`
- Rellena la plantilla de PR completamente
- Asegúrate de que tu código pasa la revisión de seguridad básica (ver abajo)
- Un mantenedor revisará en un plazo de 7 días

---

## Checklist de seguridad para PRs

Antes de enviar tu PR, verifica:

```
[ ] No añado ninguna nueva dependencia externa sin discutirlo
[ ] No envío datos del usuario a ningún servidor externo
[ ] Si añado un nuevo CDN, incluyo el hash SRI (integrity)
[ ] No incluyo API keys, tokens ni secretos en el código
[ ] No incluyo código obfuscado
[ ] Los datos fiscales que añado están respaldados por normativa AEAT o consultas DGT
[ ] He probado en Chrome y Firefox
```

---

## Checklist para actualizaciones fiscales

Si contribuyes con cambios en cálculos o normativa fiscal:

```
[ ] Incluyo referencia a la norma: Ley, RD, Consulta DGT, o resolución AEAT
[ ] He verificado que la información es vigente para el ejercicio indicado
[ ] He actualizado la Guía Fiscal en la app si corresponde
[ ] He añadido un test manual con un caso concreto
```

**Referencias fiscales útiles:**
- [AEAT — IRPF](https://www.agenciatributaria.es/AEAT.internet/Inicio/La_Agencia_Tributaria/Campanas/Renta/Renta.shtml)
- [Consultas DGT — Criptomonedas](https://petete.tributos.hacienda.gob.es/)
- [Modelo 721](https://www.agenciatributaria.es/AEAT.internet/Inicio/Ayuda/Modelos__Procedimientos_y_Servicios/Ayuda_Modelo_721/Ayuda_Modelo_721.shtml)

---

## Estructura del proyecto

```
Angel-TAX/
├── index.html          # Aplicación completa (single-file vanilla JS)
├── SECURITY.md         # Política de seguridad
├── CONTRIBUTING.md     # Esta guía
├── README.md           # Documentación principal
└── LICENSE             # Licencia MIT
```

Todo el código de producción vive en `index.html` — es intencionadamente un único archivo para:
- Máxima portabilidad (se puede guardar localmente)
- Sin build step (GitHub Pages sirve directamente)
- Facilitar la auditoría de seguridad (un solo archivo que revisar)

---

## ¿Preguntas?

Abre un [Discussion](https://github.com/kaizenbnb/Angel-TAX/discussions) o contáctanos en la comunidad de Binance España en Telegram.
