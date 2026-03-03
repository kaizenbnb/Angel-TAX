# Limitaciones conocidas — Angel Tax
La herramienta permite elegir el método de identificación específica (TSJPV 2025) pero **no valida** que el usuario tenga la documentación necesaria (extractos con IDs de transacción). Es responsabilidad del usuario.

### 3. Permutas — tipo de cambio no verificado
En operaciones de permuta cripto-a-cripto, el valor en EUR en el momento de la permuta lo introduce el usuario. La herramienta no verifica precios históricos automáticamente.

### 4. Staking — clasificación puede variar
La herramienta clasifica todo el staking en casilla 0033 (capital mobiliario). Algunos casos de staking activo o delegado podrían clasificarse diferente según criterio DGT. Consultar asesor fiscal para casos complejos.

### 5. Kraken Ledger — pares de trades
El parser de Kraken Ledger procesa la fila del lado EUR (proceeds) pero omite la fila del activo base. Esto puede generar avisos de "tipo no imponible" en el lado del activo. El resultado fiscal es correcto, pero el log de filas omitidas puede confundir.

---

## 🟡 Limitaciones importantes (funcionalidad reducida)

### 6. Sin integración API de exchanges
Los saldos se calculan a partir de los CSV importados. No hay conexión directa con APIs de exchanges para obtener posiciones en tiempo real.

### 7. DeFi — cobertura parcial
Soporta: LP fees, liquidaciones, lending básico. **No soporta** aún: yield farming complejo, governance tokens, bridges cross-chain, wrapping/unwrapping (WETH/wBTC).

### 8. NFTs — valoración manual
El parser de NFTs clasifica la operación correctamente pero el valor de mercado lo introduce el usuario. Sin acceso a marketplaces (OpenSea, Blur) para precios históricos.

### 9. SRI (Subresource Integrity) no configurado
Los scripts de CDN externos (xlsx, jspdf) tienen `crossorigin="anonymous"` pero los hashes `integrity` están pendientes de verificar. Hasta su configuración, existe un riesgo teórico de supply-chain si cdnjs fuera comprometido.
**Mitigación actual:** versiones fijadas (`xlsx@0.18.5`, `jspdf@2.5.1`) y CSP restrictiva.
**Para configurar:** generar hashes en https://www.srihash.org/ y añadir atributo `integrity="sha512-..."`.

### 10. Google Fonts — carga externa
La fuente Playfair Display se carga desde Google Fonts. Implica una petición a servidores de Google al cargar la app. Para uso 100% local/offline, se puede eliminar y usar `system-ui` como fallback (ya configurado en CSS).

---

## 🟢 Limitaciones menores (sin impacto en resultados)

### 11. ~~Sin GitHub Actions CI~~ ✅ RESUELTO en v1.0.1
~~Los `selfCheck()` golden cases se ejecutan manualmente desde la UI. No hay pipeline automatizado que los ejecute en cada PR.~~

**Implementado**: `.github/workflows/ci.yml` ejecuta selfCheck() via Puppeteer headless en cada push/PR a main.

### 12. Sin fixtures de CSV reales anonimizados
No existe carpeta `/fixtures/` con CSVs de ejemplo por exchange. Los parsers se han desarrollado contra documentación oficial y formatos publicados, pero no hay golden files para regresión automática. Pendiente para PR-00.

### 13. Persistencia — un único ejercicio fiscal activo
`localStorage` guarda el estado de un único ejercicio. Para comparar 2023 vs 2024 hay que exportar y limpiar. Pendiente implementar multi-year en PR futuro.

### 14. Impuesto de patrimonio — cálculo simplificado
El aviso de impuesto de patrimonio usa el patrimonio cripto calculado como proxy. No incluye el resto del patrimonio del usuario (inmuebles, cuentas bancarias, etc.) que también computa para este impuesto.

### 15. eToro — cuentas en USD
El parser de eToro asume conversión directa USD→EUR. Si la cuenta del usuario tiene un tipo de cambio específico aplicado por eToro, puede haber diferencias. Se añade aviso en las notas de cada operación importada.

---

## 📋 Cómo reportar un bug

Ver `docs/BUG_REPORT_TEMPLATE.md` para el template completo. Incluir siempre:
- Versión (`APP_VERSION` visible en el footer)
- Exchange y tipo de CSV
- Comportamiento obtenido vs esperado
- Si es posible, un CSV anonimizado que reproduce el problema
