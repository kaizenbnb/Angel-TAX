# 🛡️ Angel Tax — Fiscalidad Cripto España

> **La herramienta definitiva para que cualquier persona con criptomonedas en España duerma tranquila con su fiscalidad.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local-green)](https://github.com/angel-tax/angel-tax)
[![España](https://img.shields.io/badge/País-España-red)](https://sede.agenciatributaria.gob.es)
[![Ejercicio](https://img.shields.io/badge/Ejercicio-2024%2F2025-blue)](https://github.com/angel-tax/angel-tax)

---

## ✨ ¿Qué es Angel Tax?

Angel Tax es una aplicación web **open source**, **gratuita** y **100% local** (sin servidores, sin cuentas, sin envío de datos) que ayuda a cualquier persona en España a entender y gestionar su fiscalidad en criptomonedas.

Está diseñada como si fuera tu propio asesor fiscal experto en cripto, guiándote paso a paso por cada tipo de operación, calculando tu base imponible y diciéndote exactamente **en qué casilla de la Renta** debes declarar cada cosa.

### ¿Por qué Angel Tax?

Las criptomonedas tienen una fiscalidad compleja en España con múltiples casuísticas:
- 🔄 Una permuta BTC→ETH **también tributa** (¡aunque no hayas convertido a euros!)
- 📈 El staking va a una casilla diferente que las ventas
- 🎁 Los airdrops van a una tercera casilla distinta
- 🌍 Si tienes >50.000€ en exchanges extranjeros, debes el Modelo 721
- ⛏️ Si minas, tributas en base general, no base del ahorro

Angel Tax te lo explica todo de forma clara, te hace las preguntas correctas y calcula tu fiscalidad automáticamente.

---

## 🔒 Privacidad — Principio Fundamental

**Angel Tax nunca envía tus datos a ningún servidor.**

Toda la lógica de cálculo, todos tus datos de operaciones, y todos tus informes se generan y almacenan **exclusivamente en tu navegador**. No hay backend, no hay base de datos, no hay analytics.

Para borrar completamente todos tus datos: borra el historial y los datos del sitio en tu navegador.

---

## 🚀 Características

### Operaciones soportadas
| Tipo | Casilla IRPF | Base |
|------|-------------|------|
| Compraventa (cripto → €) | 1800–1814 | Ahorro |
| Permuta (cripto ↔ cripto) | 1800–1814 | Ahorro |
| Pago con cripto (por bienes/servicios) | 1800–1814 | Ahorro |
| Staking y Lending | 0033 | Ahorro |
| Airdrops y Hardforks | 1626 | Ahorro |
| Minería | Actividad Económica | General |
| NFTs | 1800–1814 | Ahorro |
| DeFi / Liquidity Pools | 0033 / 1800 | Ahorro |

### Funcionalidades
- 🧮 **Calculadora fiscal** con método FIFO y detección automática de casilla
- 📊 **Dashboard** con resumen de base imponible, impuesto estimado y tramos aplicables
- 📄 **Informe exportable** en formato texto para llevar al asesor o a la renta web
- 🌍 **Verificador Modelo 721** para saber si debes declarar tus cripto en el extranjero
- 📚 **Guía fiscal exhaustiva** basada en normativa AEAT y consultas DGT vinculantes
- ⚖️ **Calculadora de compensación de pérdidas**
- ⚠️ Alertas automáticas para evitar errores comunes

---

## 🧑‍⚖️ Base Legal

Esta aplicación está construida sobre normativa vigente española:

- **Ley 35/2006 IRPF** — Arts. 33 (Ganancias patrimoniales), 35 (Valoración), 37.1.h (Permuta), 46 (Base ahorro), 49 (Integración y compensación)
- **Consulta DGT V1766-22** — Tratamiento fiscal del staking (equiparado a depósito retribuido)
- **Consulta DGT V1948-21** — Airdrops como ganancia patrimonial no derivada de transmisión
- **Consulta DGT V0648-24** — Tokens recibidos sin contraprestación
- **Disposición Adicional 13ª Ley 11/2021** — Modelo 721 (criptomonedas en el extranjero)
- **Manual Práctico IRPF 2024 AEAT** — Instrucciones casilla 1800 y siguientes
- **Directiva DAC8** — Marco europeo de intercambio de información sobre criptoactivos

### Tramos IRPF Base del Ahorro 2024
| Tramo | Tipo |
|-------|------|
| Hasta 6.000 € | 19% |
| 6.000 € – 50.000 € | 21% |
| 50.000 € – 200.000 € | 23% |
| 200.000 € – 300.000 € | 27% |
| Más de 300.000 € | 30% |

---

## 📦 Instalación y uso

### Opción A — Usar directamente (recomendado)
Copia el archivo `AngelTax.jsx` en cualquier proyecto React o pégalo como artifact en Claude.ai.

### Opción B — Standalone React App

```bash
# Clona el repositorio
git clone https://github.com/angel-tax/angel-tax.git
cd angel-tax

# Instala dependencias
npm install

# Lanza en local
npm run dev

# Build para producción
npm run build
```

### Opción C — GitHub Pages (sin instalación)
Visita: [https://angel-tax.github.io/angel-tax](https://angel-tax.github.io/angel-tax)

### Dependencias
```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0"
}
```
Solo React. Sin dependencias adicionales. Sin librerías de UI externas.

---

## 🏗️ Arquitectura

```
angel-tax/
├── AngelTax.jsx          # Aplicación completa (single-file)
├── README.md             # Este archivo
├── LICENSE               # MIT License
├── package.json          # Config React + Vite
├── index.html            # Entry point
└── docs/
    ├── FISCALIDAD.md     # Documentación fiscal exhaustiva
    ├── CASOS_USO.md      # Ejemplos prácticos
    └── CONTRIBUIR.md     # Guía de contribución
```

### Decisiones de diseño
- **Single file**: Todo en un JSX para máxima portabilidad y facilidad de uso
- **No backend**: Privacidad absoluta, sin infraestructura que mantener
- **No localStorage**: Los datos viven en memoria (sesión) para mayor privacidad
- **No dependencias de terceros**: Solo React core, zero supply chain risk

---

## 🤝 Cómo Contribuir

Angel Tax es un proyecto de la comunidad cripto española. ¡Tu contribución es bienvenida!

### Áreas donde más ayuda hace falta

1. **Actualización normativa** — La fiscalidad cripto cambia rápido. Si detectas cambios en la AEAT, abre un issue.
2. **Casos edge** — DeFi avanzado, wrapped tokens, bridges cross-chain, liquid staking...
3. **Importación de exchanges** — Parsers para CSV de Binance, Coinbase, Kraken, Bybit...
4. **Traducción** — Catalán, Gallego, Euskera
5. **Tests** — Casos de prueba para los cálculos fiscales
6. **Accesibilidad** — WCAG 2.1 compliance

### Proceso de contribución

```bash
# Fork del repo
git clone https://github.com/TU_USUARIO/angel-tax.git

# Crea una rama para tu feature
git checkout -b feature/importacion-binance-csv

# Haz tus cambios y commits
git commit -m "feat: importación CSV desde Binance"

# Push y abre Pull Request
git push origin feature/importacion-binance-csv
```

---

## ⚠️ Disclaimer Legal

> Angel Tax es una herramienta orientativa de apoyo para la autoliquidación fiscal. Los cálculos son estimaciones basadas en la normativa vigente interpretada a mejor criterio.
> 
> **Esta herramienta NO sustituye el asesoramiento de un profesional fiscal certificado.** Para casos complejos (minería profesional, traders con alto volumen, operaciones en DeFi avanzado, NFT con royalties, herencias con cripto, etc.) consulta siempre con un asesor fiscal o gestor colegiado.
> 
> Los autores de Angel Tax no se responsabilizan de errores u omisiones en las declaraciones fiscales presentadas basándose en esta herramienta.

---

## 📄 Licencia

MIT License — Úsala, modifícala, distribúyela libremente. Solo mantén la atribución.

```
Copyright (c) 2025 Angel Tax Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software...
```

---

## 🙏 Agradecimientos

- **AEAT** — Por los manuales prácticos del IRPF
- **AFCripto** — Por su excelente guía de referencia
- **TaxDown** — Por democratizar la declaración de la renta
- **Comunidad cripto española** — Por hacer las preguntas correctas

---

*Hecho con ❤️ para la comunidad cripto española. Duerme tranquilo con tu fiscalidad.*
