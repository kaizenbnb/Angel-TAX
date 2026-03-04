# Angel Tax

**Tu fiscalidad cripto, clara y bajo control.**

> Herramienta web open-source, gratuita y 100% local para declarar criptomonedas en España (IRPF).

[![Live Demo](https://img.shields.io/badge/🌐_Demo_Live-Angel_Tax-F0B90B?style=for-the-badge)](https://kaizenbnb.github.io/Angel-TAX)
[![License: MIT](https://img.shields.io/badge/License-MIT-white?style=for-the-badge)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open-Source-0B0E11?style=for-the-badge&logo=github)](https://github.com/kaizenbnb/Angel-TAX)

---

## ¿Por qué existe Angel Tax?

Declarar criptomonedas en España se ha convertido en una fuente constante de estrés.  
No porque la gente quiera hacerlo mal, sino porque nadie explica bien qué va dónde, qué tributa y qué no, y qué espera realmente Hacienda.

Si usas criptomonedas, probablemente te suena esto:

- *"¿Tengo que declarar aunque no haya pasado a euros?"*
- *"¿Una permuta también tributa?"*
- *"¿El staking va como ganancia o como rendimiento?"*
- *"¿Esto va en la 1800… o en otra casilla?"*
- *"¿Me va a salir una paralela si me equivoco?"*

El resultado suele ser uno de tres: declaraciones mal hechas, dependencia total de terceros, o directamente no declarar por miedo.  
**Ninguna es una buena opción.**

**Angel Tax nace para resolver eso. Sin miedo. Sin humo. Sin enviar tus datos a ningún sitio.**

---

## ¿Qué es Angel Tax?

Angel Tax es una aplicación web open-source, gratuita y 100% local que te ayuda a:

- Entender cómo tributan tus criptomonedas en España
- Calcular tu resultado fiscal por casilla IRPF
- Importar operaciones desde los principales exchanges (CSV)
- Analizar documentos fiscales con IA
- Generar un informe claro para tu asesor o para Renta Web

Funciona como si tuvieras un asesor fiscal especializado en cripto, guiándote paso a paso y explicándote el porqué de cada decisión.

**Sin crear cuentas. Sin subir archivos a servidores. Sin depender de plataformas cerradas.**

---

## 🧮 Operaciones soportadas

Angel Tax contempla las principales casuísticas fiscales vigentes en España, incluyendo operaciones DeFi:

| Operación | Casilla IRPF | Notas |
|---|---|---|
| Compraventa cripto → € | 1800 | Método FIFO obligatorio |
| Permuta / DEX Swap | 1800 | Cada swap tributa, aunque sea ETH → BNB |
| Pago con cripto | 1800 | Equivale a una venta al valor de mercado |
| Staking | 0033 | Tributa al recibir las recompensas, no al venderlas |
| Lending DeFi (Aave, Compound…) | 0033 | Solo los intereses; el préstamo en sí no tributa |
| Liquidity Pool — fees cobrados | 0033 | Rendimiento del capital mobiliario |
| LP — Retirada de liquidez | 1800 | Ganancia/pérdida patrimonial al retirar del pool |
| Liquidación (Borrowing) | 1800 | Venta forzosa de colateral — SÍ tributa |
| Envío entre mis propias wallets | — | **NO tributa** · Guarda el txHash como prueba |
| Envío / donación a otra persona | 1800 | Tú tributas como venta al valor de mercado |
| Airdrops / Hardforks | 1626 | G/P no derivada de transmisión |
| NFTs | 1800 | Compraventa o royalties |
| Minería | Act. Económica | Base general, Modelo 130 trimestral |

> **Modelo 721:** Obligatorio si a 31/dic tienes >50.000€ en exchanges **extranjeros**. La cripto en DeFi / self-custody y en Binance (que reporta con Modelos 172/173) **NO está sujeta** al 721.

---

## 🔍 Trazabilidad y Chainalysis — Lo que Hacienda ya sabe

**La blockchain es pública y permanente.**

Hacienda invierte activamente en herramientas como **Chainalysis** para rastrear operaciones on-chain. Sin trazabilidad de tu coste de adquisición, Hacienda puede asumir precio de compra = 0 € y hacerte tributar por el 100% del valor de venta.

**Ejemplo:**
- **CON trazabilidad:** compraste BTC a 1.000 €, lo vendes a 4.000 € → ganancia real **3.000 €**
- **SIN trazabilidad:** Hacienda asume coste 0 € → ganancia "ficticia" **4.000 €** — pagas impuestos por dinero que nunca ganaste

**Recomendaciones básicas:**
- Guarda los CSVs de todos tus exchanges de todos los años
- Documenta los envíos entre wallets con el txHash
- Para DeFi: exporta el historial desde Etherscan / BSCScan
- Usa herramientas de trazabilidad (Koinly, CoinTracking) si tienes actividad DeFi relevante

---

## 🏛️ Tramos del ahorro 2026

Las ganancias patrimoniales y rendimientos del capital (staking, lending, LP fees) tributan en la **base del ahorro**:

| Base liquidable | Tipo |
|---|---|
| Hasta 6.000 € | 19% |
| 6.000 € – 50.000 € | 21% |
| 50.000 € – 200.000 € | 23% |
| 200.000 € – 300.000 € | 27% |
| Más de 300.000 € | **30%** |

*Fuente: Webinar TaxDown × Binance España, 25 febrero 2026.*

---

## ⚖️ Compensación de pérdidas — Las 3 reglas

1. **Directa (100%):** pérdidas y ganancias de la misma base (casilla 1800) se anulan entre sí.
2. **Cruzada (25%):** si siguen quedando pérdidas de transmisión, puedes compensar hasta el **25%** de los rendimientos de capital mobiliario (casilla 0033 — staking, lending).
3. **Regla de los 4 años:** la pérdida neta restante se puede compensar con ganancias de los 4 ejercicios siguientes.

> **Regla anti-elusión:** si vendes con pérdida y recompras el mismo activo en los 2 meses siguientes, no puedes aplicar esa pérdida ese año.

---

## 📥 Importación CSV

Angel Tax importa directamente los extractos de:

- **Binance** — Historial de transacciones (export completo)
- **Coinbase** — Standard CSV
- **Bit2Me** — Formato nativo

### Prueba con ejemplos

**Sin datos reales en mano?** Descarga estos CSVs de ejemplo (ficticios y anonimizados):

📁 **[`/examples/`](examples/)**
- `binance-simple.csv` — 5 compraventas básicas
- `binance-defi.csv` — Staking, airdrops, permutas
- `binance-losses.csv` — Pérdidas y compensación

**Cómo usarlos:**
1. Abre la app → pestaña "Importar"
2. Selecciona tu exchange (Binance)
3. Descarga uno de los ejemplos arriba ↑
4. Sube el CSV a Angel Tax
5. Revisa el cálculo en "Mi Informe"

> Ideal para aprender la interfaz, validar lógica de cálculo y probar casos fiscales reales **sin exponer tus datos**.

---

## 🤖 Análisis con IA

Sube cualquier PDF, Excel o extracto de exchange y el analizador de IA (Claude API) extrae y clasifica automáticamente tus operaciones.

> **Privacidad:** los documentos se procesan de forma puntual. Angel Tax **no almacena** ningún dato en servidores externos.

---

## 🔒 Privacidad por diseño

La privacidad no es una opción. Es un principio.

- ✅ Sin backend ni servidores
- ✅ Sin analytics ni tracking
- ✅ Sin cookies de seguimiento
- ✅ Sin creación de perfiles
- ✅ Todo se ejecuta localmente en tu navegador

Para borrar todos tus datos: borra los datos del sitio desde tu navegador. **No queda nada.**

---

## ⚖️ Base legal y normativa

Angel Tax calcula la fiscalidad conforme a la normativa vigente en España:

**Ley del IRPF (Ley 35/2006)**
- Art. 33 — Ganancias y pérdidas patrimoniales
- Art. 35 — Valoración
- Art. 37.1.h — Permutas
- Arts. 46 y 49 — Base del ahorro e integración

**Consultas vinculantes de la DGT**
- V1766-22 — Staking
- V1948-21 — Airdrops
- V0648-24 — Tokens recibidos sin contraprestación

**Obligaciones informativas**
- Ley 11/2021, Disposición adicional 13ª — Modelo 721

**Marco europeo (contexto regulatorio)**
- Directiva **DAC8** — intercambio automático de información sobre criptoactivos (en vigor 2026)
- Reglamento **MiCA** (UE 2023/1114) — regulación de proveedores y emisión de criptoactivos

---

## ¿Para quién es Angel Tax?

✅ Holders y traders ocasionales  
✅ Usuarios de staking y lending  
✅ Usuarios de DeFi (LP pools, Aave, Uniswap…)  
✅ Usuarios de airdrops, Launchpool y Megadrop  
✅ Cualquiera que quiera hacer la Renta bien, por su cuenta o con su gestor

> Para casos muy complejos (minería profesional, DeFi avanzado de alto volumen, herencias en cripto), Angel Tax no sustituye a un asesor, pero prepara el terreno y evita errores graves.

---

## 🛠️ Tecnología

- **HTML + CSS + JavaScript** nativo — sin frameworks, sin dependencias de compilación
- Un único archivo `index.html` — fácil de auditar, fácil de desplegar y verificar
- **SheetJS** — importación de Excel/CSV
- **jsPDF** — generación de informes PDF
- **Claude API (Anthropic)** — análisis de documentos con IA

---

## 🚀 Uso

```bash
# Opción 1: Sin servidor — abre directamente en el navegador
open index.html

# Opción 2: Servidor local
python3 -m http.server 8080
# Visita http://localhost:8080
```

O usa la versión live: **[kaizenbnb.github.io/Angel-TAX](https://kaizenbnb.github.io/Angel-TAX)**

---

## 🤝 Contribuir

Angel Tax es un proyecto comunitario. Las contribuciones son bienvenidas.

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un PR. Áreas prioritarias:

- Importadores CSV de nuevos exchanges
- Más tipos de operación DeFi
- Tests automáticos
- Mejoras de accesibilidad y UX

---

## 💛 Apoya Angel Tax

Si Angel Tax te ha ahorrado tiempo o dinero, puedes contribuir directamente:

| Red | Dirección |
|---|---|
| ₿ Bitcoin (BTC nativa) | `bc1q6urerf7ncm4khhplxatl9cn8na70shu4lanks6` |
| Ξ Ethereum (ERC-20) | `0x026066a7d38420297881575738Fea1BeB33Ed29f` |
| ◎ Solana (SOL nativa) | `34ERsZd46CozZxiUtoZLTEUAs8Xt7zL9UF4qgyb5Vuse` |
| ⬡ BNB Smart Chain (BEP-20) | `0x11EFFaBCBDd5902eCf66fe93FF5A36B27C3A67Cc` |

---

## ⚠️ Aviso legal

Angel Tax es una herramienta de apoyo orientativo para la autoliquidación fiscal.

Los resultados dependen de la información introducida por el usuario, la correcta clasificación de las operaciones y la normativa vigente en cada ejercicio.

Recomendamos revisar los resultados, contrastarlos si tienes dudas y aplicar criterio antes de presentar la declaración. **La responsabilidad final de la declaración corresponde siempre al contribuyente.**

---

*Construido por builders del ecosistema cripto · Hecho con ❤️ en España*
