# 📬 Feedback de Usuario — Angel Tax v1.1.0
**Fecha:** Marzo 2026  
**Fuente:** Usuario avanzado, operativa real multi-año en Binance España  
**Clasificado y analizado por:** kaizenbnb

---

## Contexto del usuario
Operativa real desde antes de Binance. Historial multi-año, múltiples tipos de activo.
No usa Margin, Alpha ni DCA. Reduce tokens, vende Launchpool/HODLer en el día.
Lleva su propia trazabilidad manual en Excel por desconfianza en herramientas externas.
69 lanzamientos gestionados en 2025 (Launchpool + HODLer + Megadrop).

---

## 🔴 Errores factuales detectados en la UI actual

### 1. Fecha de inicio de campaña incorrecta
- **Reportado:** La app muestra `02/04` como fecha de apertura
- **Correcto:** La campaña Renta 2025 abre el **08/04/2026**
- **Archivo afectado:** `app.js` → función `getDeadlineInfo()` línea ~232
- **Fix:** `new Date(yr, 3, 2)` → `new Date(yr, 3, 8)`

### 2. Cuenta atrás genera ansiedad innecesaria
- **Reportado:** El contador regresivo agobia al usuario
- **Propuesta:** Sustituir por texto estático con fechas clave:
  - Plazo ordinario: **30/06/2026**
  - Domiciliación bancaria: **hasta 25/06/2026**
- **Archivo afectado:** `app.js` → función `renderHeader()` línea ~273 (Countdown pill)

### 3. Información incompleta sobre Impuesto de Patrimonio en Madrid
- **Reportado:** Solo dice "bonificación 100%" para Madrid
- **Correcto:** A partir de **3.000.000€** de patrimonio neto entra el **Impuesto de Solidaridad de las Grandes Fortunas** (Ley 38/2022, estatal). La vivienda habitual está exenta hasta 300.000€.
- **Archivo afectado:** `app.js` → objeto CCAA línea ~61 + `renderGuide()` línea ~1053

---

## 🟡 Mejoras informativas confirmadas (no hay en la app actualmente)

### 4. Aviso sobre presentación tardía vs. declaración incorrecta
- **Propuesta:** Añadir en la guía y/o en el header de campaña:
  *"Es mejor presentar tarde que presentar mal. Recargo del 1% mensual hasta 12 meses (Art. 27 LGT). Hacienda reclamando antes de presentar: sanción del 50%–150%."*
- No existe actualmente en ninguna sección de la app.

### 5. Disclaimer de normativa cambiante por CCAA
- **Propuesta:** Añadir pie de página en la guía fiscal:
  *"Las obligaciones fiscales —informativas y de tributación— cambian constantemente y varían por Comunidad Autónoma. Esta herramienta refleja la normativa vigente en la fecha de su última actualización."*

---

## 🟢 Mejoras funcionales para versiones futuras

### 6. Agrupador de rendimientos Simple Earn por períodos [v1.2.0]
- El usuario necesita agrupar miles de filas diarias de Earn entre fechas de compra/conversión
- Input: CSV "Historial de Simple Earn" de Binance (descarga local del usuario)
- Lógica: acumular rendimientos entre hitos, precio = media del período
- Compatible con motor FIFO existente → lotes tipo `staking` → casilla 0033
- **Limitación resuelta:** KNOWN_LIMITATIONS.md #6

### 7. Distinción HODLer Airdrop vs Airdrop puro [v1.1.0 — Fase 2]
- Actualmente todo va a casilla 1626
- El usuario señala que HODLer/Launchpool debería ir a 0033 (capital mobiliario)
- **Propuesta:** selector de subtipo al añadir operación de tipo airdrop
- Sin cambiar comportamiento por defecto (compatibilidad con golden cases)
- **Limitación relacionada:** KNOWN_LIMITATIONS.md #4

### 8. Gestión de conversiones residuales (dust) [v1.1.0 — Fase 4]
- Quedan fracciones de token que no se pueden vender en Spot (<0,10€)
- El usuario las consolida manualmente a fin de año
- **Propuesta:** detector automático de dust + agrupador por 31/12

### 9. Soporte multi-año en inventario FIFO [v1.2.0]
- Usuarios con historial desde antes de 2023 no pueden mantener trazabilidad continua
- **Propuesta:** estructura multi-ejercicio en localStorage + migración automática desde v1
- **Limitación resuelta:** KNOWN_LIMITATIONS.md #13

### 10. Analizador IA por chunks para archivos grandes [v1.2.0]
- 80.000 caracteres insuficientes para múltiples históricos de Binance
- **Propuesta:** procesamiento secuencial por chunks con barra de progreso
- Recomendación UI: subir por separado (Earn / Operaciones / Conversiones)

---

## 📋 Clasificación fiscal validada por el usuario (coincide con normativa)

| Operación | Casilla app actual | Casilla correcta | Estado |
|---|---|---|---|
| Compraventa | 1800 | 1800 | ✅ Correcto |
| Staking / Simple Earn | 0033 | 0033 | ✅ Correcto |
| Airdrop puro (regalo) | 1626 | 1626 | ✅ Correcto |
| HODLer Airdrop / Launchpool | 1626 | 0033 (discutible) | ⚠️ Mejorable — ver #7 |
| Venta posterior de Launchpool | — | 1800 (coste = precio apertura) | ⚠️ No documentado claramente |

---

## ⚠️ Aviso legal sobre este feedback
Este documento recoge criterios de un usuario con experiencia práctica.
Las clasificaciones fiscales marcadas como "discutibles" reflejan ambigüedad real no resuelta por la AEAT.
Consultar siempre con asesor fiscal para casos complejos.
Las obligaciones fiscales cambian. Verificar normativa vigente antes de presentar.
