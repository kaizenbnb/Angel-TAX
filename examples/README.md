# Ejemplos CSV para Angel Tax

Estos archivos CSV ficticios te permiten probar Angel Tax sin datos personales. Todos contienen operaciones anonimizadas y ficticias.

## 📋 Archivos

### `binance-simple.csv`
**Caso básico:** 5 operaciones simples de compraventa.

Útil para:
- Aprender el flujo básico de importación
- Probar el cálculo de ganancias patrimoniales (casilla 1800)
- Validar método FIFO

**Resultado esperado:**
- Ganancias netas: ~8,450€
- Tributación base: ~1,605€ (19% tramo bajo)

---

### `binance-defi.csv`
**Caso complejo:** compraventas + staking + airdrops + permutas.

Útil para:
- Probar importación de operaciones DeFi
- Validar clasificación de staking (casilla 0033)
- Testear airdrops/hardforks (casilla 1626)
- Comprobar permutas como transmisiones (casilla 1800)

**Resultado esperado:**
- Ganancias patrimoniales: ~13,800€
- Rendimientos de capital (staking): ~1,630€
- Impuesto estimado: ~3,100€

---

### `binance-losses.csv`
**Caso con compensación:** ganancia compensada con pérdidas netas.

Útil para:
- Validar la regla de compensación directa (100% en casilla 1800)
- Probar la compensación cruzada (25% de rendimientos)
- Testear correctitud de pérdidas aplicadas al resultado final

**Resultado esperado:**
- Ganancias: +1,500€
- Pérdidas: -3,150€
- Base neta: -1,650€ (pérdida neta)
- Puede compensar con 4 ejercicios posteriores

---

## 🚀 Cómo usar

1. Abre Angel Tax: https://kaizenbnb.github.io/Angel-TAX
2. Ve a **"Importar CSV"**
3. Selecciona el exchange: **Binance**
4. Descarga uno de estos archivos (botón derecho → Guardar como)
5. Sube el CSV a Angel Tax
6. Revisa el cálculo en **"Mi Informe"**

---

## ⚠️ Nota importante

- Estos datos **son ficticios** y solo para demostración
- Los importes NO están optimizados (para ver resultados variados)
- Usa tus propios CSVs reales para declaraciones de verdad
- Si vas a usar Angel Tax en serio, guarda el extracto de balance de tu exchange como respaldo

---

## 📝 Formatos soportados

Angel Tax importa CSV de:
- **Binance** (historial de transacciones)
- **Coinbase** (estándar)
- **Bit2Me** (nativo)

Si tu exchange no está soportado, puedes exportar a formato estándar (Date, Coin, Operation, Amount, Price) o usar el analizador de IA para documentos PDF/Excel.
