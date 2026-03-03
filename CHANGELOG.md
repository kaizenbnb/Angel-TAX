# Changelog — Angel Tax

Todos los cambios notables en este proyecto se documentan en este archivo.
Formato: [Keep a Changelog](https://keepachangelog.com/es/) · Versionado: [SemVer](https://semver.org/)

---

## [1.0.1] — 2026-03-03

### 🔧 CI y calidad

#### GitHub Actions
- Workflow CI que ejecuta `selfCheck()` via Puppeteer headless (PR-07)
- El CI valida los 10 golden cases en cada push/PR a main
- Badge de estado del CI disponible en README

#### Dependabot
- `.github/dependabot.yml` configurado para npm y GitHub Actions
- Actualizaciones automáticas de dependencias semanales

#### Documentacion
- `AUDIT_REPORT.md` actualizado a v1.0.1: puntuación 60/60
- `KNOWN_LIMITATIONS.md` actualizado: limitación #11 resuelta

---

## [1.0.0] — 2026-03-03

### 🚀 Primera versión estable

#### Fiscal
- Motor FIFO completo con inventario de lotes por activo
- Identificación específica como alternativa al FIFO (Sentencia TSJPV 2025)
- Soporte para todos los tipos fiscales: compraventa (1800), staking (0033), airdrop (1626), minería, DeFi, NFT, LP, permutas, pagos en cripto
- Cálculo automático de tramos IRPF base del ahorro (19%–30%) con impacto por CCAA
- Modelo 721 real: saldo por exchange a 31/dic, umbral 50.000 €, listado exportable
- 9 CCAA con impuesto de patrimonio correctamente parametrizadas

#### Importadores CSV
- Top 10 exchanges del mercado español: Binance, Coinbase, Bit2Me, Kraken, Revolut, eToro, Bitvavo, OKX, Bitpanda, Bitget
- 14 parsers distintos (algunos exchanges tienen múltiples formatos)
- Compras importadas auto-crean lotes FIFO automáticamente
- Detección de separador (`,` `;` `\t`), normalización de fechas y decimales europeos
- Deduplificación automática por fecha+activo+tipo+importe

#### IA (opcional)
- Analizador de documentos: PDF, CSV, Excel, imágenes → extracción automática vía Anthropic Claude
- Transparencia: qué se envía, a quién, enlace a política de privacidad de Anthropic

#### Informe
- Informe TXT descargable con operaciones, lotes FIFO, saldos M721 y método de coste
- Generación de PDF con tabla fiscal completa

#### Calidad y seguridad
- `APP_VERSION`, `RULESET_VERSION`, `BUILD_DATE` visibles en UI y en todos los exports
- CSP (`Content-Security-Policy`) en cabecera HTML
- `crossorigin="anonymous"` en todos los CDN externos (preparado para SRI)
- `sanitize()` en todos los valores externos renderizados como HTML
- `selfCheck()` con 10 golden cases ejecutables desde la UI
- Modo demo con datos de ejemplo precargados
- Persistencia `localStorage` con key versionada `angeltax_v1`
- Single-file ejecutable: todo el producto en `index.html`

---

## [0.x] — Baseline (pre-1.0)

Versión de desarrollo inicial con parsers Binance, Coinbase y Bit2Me, calculadora manual IRPF y guía fiscal integrada.

---

> **Nota:** Si un cambio afecta a resultados de cálculo históricos, se documenta explícitamente con `⚠️ BREAKING CALCULATION` y la versión desde la que aplica.
