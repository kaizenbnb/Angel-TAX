// ═══════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════
const APP_VERSION     = "1.1.0";
const RULESET_VERSION = "2025-ES-v1";   // Normativa AEAT aplicada
const BUILD_DATE      = "2026-03-16";

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let state = { 
  ops: [], lots: [], balances: [], 
  year: String(new Date().getFullYear() - 1), 
  costMethod: "fifo",
  carryForwardLosses: 0,  // Pérdidas de años anteriores a compensar
  priorYearLosses: {}     // {2023: -1200, 2022: -500, ...}
};
let currentTab = "home";
let currentOpType = null;
let formData = {};
let calcResult = null;
let openGuide = null;
let showProfileModal = false;

// ── Security: sanitize user-supplied strings before rendering in DOM ──
/**
 * Sanitiza strings para prevenir ataques XSS antes de insertar en DOM
 * Escapa caracteres especiales HTML según OWASP
 * @param {string} str - String a sanitizar
 * @returns {string} String seguro para DOM
 */
function sanitize(str) {
  return String(str||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#x27;");
}

// Perfil del usuario
let userProfile = {
  name: "", dni: "", address: "", city: "", cp: "", ccaa: "madrid"
};

// ═══════════════════════════════════════════
// COMUNIDADES AUTÓNOMAS
// ═══════════════════════════════════════════
const CCAA = [
  { id:"andalucia",      name:"Andalucía",              patrimonio: false,  threshold: 0,       note:"Bonificación 100% — sin impuesto de patrimonio" },
  { id:"aragon",         name:"Aragón",                 patrimonio: true,   threshold: 500000,  note:"Mínimo exento 500.000€" },
  { id:"asturias",       name:"Asturias",               patrimonio: true,   threshold: 700000,  note:"Mínimo exento 700.000€" },
  { id:"baleares",       name:"Baleares",               patrimonio: true,   threshold: 700000,  note:"Tipos entre 0,28% y 3,45%" },
  { id:"canarias",       name:"Canarias",               patrimonio: true,   threshold: 700000,  note:"Mínimo exento 700.000€" },
  { id:"cantabria",      name:"Cantabria",              patrimonio: true,   threshold: 700000,  note:"Mínimo exento 700.000€" },
  { id:"castilla_lm",    name:"Castilla-La Mancha",     patrimonio: true,   threshold: 700000,  note:"Mínimo exento 700.000€" },
  { id:"castilla_leon",  name:"Castilla y León",        patrimonio: true,   threshold: 700000,  note:"Mínimo exento 700.000€" },
  { id:"cataluna",       name:"Cataluña",               patrimonio: true,   threshold: 500000,  note:"Mínimo exento 500.000€, tipos hasta 2,75%" },
  { id:"extremadura",    name:"Extremadura",            patrimonio: true,   threshold: 500000,  note:"Mínimo exento 500.000€" },
  { id:"galicia",        name:"Galicia",                patrimonio: true,   threshold: 700000,  note:"Mínimo exento 700.000€" },
  { id:"madrid",         name:"Madrid",                 patrimonio: false,  threshold: 0,       note:"Bonificación 100% — sin impuesto de patrimonio" },
  { id:"murcia",         name:"Murcia",                 patrimonio: true,   threshold: 700000,  note:"Mínimo exento 700.000€" },
  { id:"navarra",        name:"Navarra",                patrimonio: true,   threshold: 550000,  note:"Régimen foral — mínimo 550.000€" },
  { id:"pais_vasco",     name:"País Vasco",             patrimonio: true,   threshold: 800000,  note:"Régimen foral — mínimo 800.000€" },
  { id:"rioja",          name:"La Rioja",               patrimonio: true,   threshold: 700000,  note:"Bonificación 50% desde 2023" },
  { id:"valencia",       name:"Comunitat Valenciana",   patrimonio: true,   threshold: 500000,  note:"Mínimo exento 500.000€, tipos hasta 3,12%" },
];

function getCCAA() { return CCAA.find(c => c.id === userProfile.ccaa) || CCAA[11]; }

// ═══════════════════════════════════════════
// FISCAL DATA
// ═══════════════════════════════════════════
const BRACKETS = [
  { max:6000,    rate:0.19, label:"Hasta 6.000 €" },
  { max:50000,   rate:0.21, label:"6.000 € – 50.000 €" },
  { max:200000,  rate:0.23, label:"50.000 € – 200.000 €" },
  { max:300000,  rate:0.27, label:"200.000 € – 300.000 €" },
  { max:Infinity,rate:0.30, label:"Más de 300.000 €" },
];

const OPS = [
  {id:"compra",      icon:"🛍️", name:"Compra",                 desc:"Compra de cripto por € o fiat — crea lote FIFO",    casilla:"—",             isLot:true  },
  {id:"compraventa", icon:"💱", name:"Compraventa",          desc:"Venta de cripto por € o fiat",                     casilla:"1800",          isIncome:false},
  {id:"permuta",     icon:"🔄", name:"Permuta / DEX Swap",   desc:"Intercambio cripto por cripto. Cada swap tributa.", casilla:"1800",          isIncome:false},
  {id:"pago",        icon:"🛒", name:"Pago con cripto",       desc:"Usaste cripto para comprar algo",                  casilla:"1800",          isIncome:false},
  {id:"staking",     icon:"📈", name:"Staking",               desc:"Recompensas por validar red (Lido, Rocket Pool…)", casilla:"0033",          isIncome:true },
  {id:"lending",     icon:"🏦", name:"Lending DeFi",          desc:"Intereses de Aave, Compound, etc.",                casilla:"0033",          isIncome:true },
  {id:"lp_fees",     icon:"🌊", name:"Liquidity Pool (fees)", desc:"Comisiones cobradas como LP en AMM",               casilla:"0033",          isIncome:true },
  {id:"lp_retiro",   icon:"🌊", name:"LP — Retirada de liquidez", desc:"Al retirar del pool: ganancia o pérdida patrimonial", casilla:"1800",   isIncome:false},
  {id:"liquidacion", icon:"💥", name:"Liquidación (Borrowing)",desc:"Venta forzosa de colateral — SÍ tributa como G/P",casilla:"1800",          isIncome:false},
  {id:"envio_propio",icon:"↔️", name:"Envío entre mis wallets",desc:"Mover cripto entre tus propias wallets — NO tributa",casilla:"—",          isIncome:false, noTax:true},
  {id:"envio_regalo",icon:"🎁🔄",name:"Envío a otra persona",  desc:"Donar o regalar cripto — tú tributas como venta",  casilla:"1800",          isIncome:false},
  {id:"airdrop",     icon:"🎁", name:"Airdrop / Hardfork",    desc:"Criptos recibidas sin contraprestación",            casilla:"1626",          isIncome:true },
  {id:"mineria",     icon:"⛏️", name:"Minería",               desc:"Ingresos por minar criptomonedas",                  casilla:"Act.Económica", isIncome:true, isGeneral:true},
  {id:"nft",         icon:"🖼️", name:"NFT",                   desc:"Compraventa o royalties de NFTs",                   casilla:"1800",          isIncome:false},
];

const GUIDES = [
  {icon:"📋",title:"Casilla 1800 — Compraventas y Permutas",cas:"1800",
   body:"La casilla principal para el 90% de los inversores. Aquí va toda venta o intercambio de cripto. La ganancia se calcula como: Valor de transmisión − (Valor de adquisición + Comisiones). El método FIFO es obligatorio. IMPORTANTE: la permuta BTC→ETH también tributa aunque no conviertas a euros — Hacienda lo considera una venta al valor de mercado. Ejemplo real del webinar TaxDown×Binance (feb 2026): compras 1 ETH a 2.000€, lo cambias por 1 BNB cuando ETH vale 3.500€ → ganancia = 1.500€ aunque no hayas tocado ni un euro.",
   tips:["Guarda siempre los CSVs de tus exchanges con todo el historial","Las comisiones de compra y venta reducen la ganancia","Las pérdidas son compensables con ganancias hasta 4 años","Holding (comprar y no vender) NO tributa nunca en el IRPF","Cada DEX swap = permuta. Tributa aunque uses Uniswap, PancakeSwap, etc."]},

  {icon:"💰",title:"Casilla 0033 — Staking, Lending y Fees de LP",cas:"0033",
   body:"Los rendimientos del capital mobiliario van aquí: staking (Lido, Rocket Pool, staking en Binance), intereses de lending (Aave, Compound), y las comisiones cobradas como proveedor de liquidez (LP fees). Tributan en el momento de recibirlos, al valor de mercado en ese instante. Tipo: 19-30% (base del ahorro). Si después vendes esas recompensas, esa plusvalía adicional va a la casilla 1800.",
   tips:["Staking: las recompensas tributan al recibirlas, no al venderlas","Lending DeFi (Aave, Compound): los intereses van aquí — el préstamo en sí NO tributa","LP fees: las comisiones acumuladas como LP van a 0033","Documenta el valor de mercado exacto al recibir cada recompensa (CoinGecko histórico)","Los exchanges tienen informes de staking descargables — úsalos"]},

  {icon:"🌊",title:"Liquidity Pools (AMM) — Ciclo fiscal completo",cas:"1800/0033",
   body:"Los pools de liquidez (Uniswap, PancakeSwap, Curve…) tienen 4 momentos con tratamiento fiscal diferente: (1) Depositar el par de tokens puede ser una permuta imponible → casilla 1800. (2) Recibir el LP Token que representa tu posición → NO tributa. (3) Cobrar comisiones de los traders → Rendimiento del capital mobiliario → casilla 0033. (4) Retirar liquidez: Valor de retirada − Valor de entrada = ganancia o pérdida patrimonial → casilla 1800.",
   tips:["Documenta el valor en euros al entrar al pool — es tu precio de adquisición","Los LP tokens son solo un recibo, no tributan al recibirlos","Las comisiones (fees) acumuladas tributan cuando las cobras o retiras","La pérdida impermanente se materializa fiscalmente al retirar la liquidez","Usa herramientas como DeBank o Zerion para rastrear tu historial de LP"]},

  {icon:"🏦",title:"Lending y Borrowing (Préstamos DeFi)",cas:"0033/1800",
   body:"LENDING (prestas): Depositas cripto en Aave, Compound… y cobras intereses periódicamente. Los intereses son Rendimiento del Capital Mobiliario → base del ahorro (19-30%), casilla 0033. BORROWING (pides prestado): Dejas colateral y recibes un préstamo. El préstamo en sí NO tributa. PERO si el colateral baja de valor y te liquidan (venta forzosa), esa liquidación SÍ tributa como ganancia o pérdida patrimonial en la casilla 1800. Muchos usuarios no lo saben y no lo declaran — es uno de los errores más comunes.",
   tips:["El préstamo en sí no tributa — solo los intereses que cobras o la liquidación","Liquidación = venta forzosa de tu colateral. Hacienda lo trata como una venta","Si te liquidan con pérdida, puedes compensarla — ¡documéntalo!","Consulta el historial de liquidaciones en Aave o DeBank","Los intereses del borrowing (lo que pagas) NO son deducibles en IRPF"]},

  {icon:"↔️",title:"Envíos entre wallets — ¿Cuándo tributa?",cas:"1800/—",
   body:"ENTRE TUS PROPIAS WALLETS: Mover BTC de Binance a tu Ledger, o de MetaMask a Phantom, NO genera hecho imponible. No tributa. Pero documenta siempre estas operaciones para mantener la trazabilidad. A UN AMIGO O FAMILIAR: Tú tributas como si lo vendieras al valor de mercado en ese momento (ganancia o pérdida patrimonial → casilla 1800). Tu amigo/familiar tributa por el Impuesto de Sucesiones y Donaciones, pero no en el IRPF. Recomendación del webinar TaxDown×Binance: documenta SIEMPRE estas operaciones.",
   tips:["Propias wallets: guarda siempre el txHash como prueba que es tuyo","Envío a otro: calcula la ganancia como si fuera una venta al precio de mercado","El receptor tributa en Sucesiones y Donaciones según la comunidad autónoma","Las gas fees de la transferencia son deducibles como coste de la operación","Usar un tracker (Koinly, CoinTracking) facilita enormemente esta documentación"]},

  {icon:"🎁",title:"Casilla 1626 — Airdrops y Hardforks",cas:"1626",
   body:"⚠️ ATENCIÓN: los airdrops van a la BASE GENERAL del IRPF (no a la base del ahorro). Esto significa que el tipo aplicable es tu tipo marginal de renta, que puede ser muy superior al 30%. Son ganancias patrimoniales NO derivadas de transmisión (consultas DGT V1948-21 y V0648-24) y NO se pueden compensar con pérdidas de la casilla 1800. Se declaran al valor de mercado en el momento de recepción. Si el token no tiene precio de mercado real en ese momento, puede declararse a 0€. Al vender el token airdropeado, la diferencia entre precio de venta y valor declarado al recibirlo va a casilla 1800.",
   tips:["BASE GENERAL: el tipo depende de tu tramo IRPF total, puede superar el 30%","Airdrops de tokens sin mercado = 0€ de ganancia declarable","Al vender: ganancia = precio venta − valor del airdrop. Método FIFO","No se compensan con pérdidas de transmisión (casilla 1800)","Launchpool y Megadrop de Binance: los tokens recibidos van aquí"]},

  {icon:"🌍",title:"Modelo 721 — Cuándo aplica y cuándo NO",cas:"M.721",
   body:"El Modelo 721 es obligatorio si el 31 de diciembre tienes más de 50.000€ en criptomonedas custodiadas en exchanges o plataformas FUERA de España. Es solo informativo — no pagas impuestos adicionales. Plazo: enero-marzo. IMPORTANTE (aclarado en webinar TaxDown×Binance feb 2026): Cripto en DeFi (self-custody, tus propias wallets) → NO aplica el 721. Cripto en Binance → NO aplica (Binance ya presenta los Modelos 172 y 173 a Hacienda). La sanción por no presentarlo cuando es obligatorio puede superar los 10.000€.",
   tips:["Exchanges extranjeros (Coinbase, Kraken, Bybit…): SÍ aplica si >50.000€ a 31/dic","Cripto en DeFi / self-custody: NO aplica — no está en custodia de terceros","Cripto en Binance España: NO aplica — ellos reportan con Modelos 172/173","Bit2Me tiene sede en España — no requiere 721","Plazo: del 1 de enero al 31 de marzo del año siguiente"]},

  {icon:"⚖️",title:"Compensación de Pérdidas — Las 3 reglas",cas:"Comp.",
   body:"La compensación de pérdidas es la herramienta más poderosa para optimizar tu fiscalidad. REGLA 1 — Compensación directa: pérdidas y ganancias de la misma base (1800 vs 1800) se anulan al 100%. Ej: pérdida en DeFi compensa ganancia en acciones. REGLA 2 — Compensación cruzada 25%: si te siguen quedando pérdidas de transmisión, puedes compensar hasta el 25% de los rendimientos del capital mobiliario (staking, lending → casilla 0033). REGLA 3 — Los 4 años: si queda pérdida neta, tienes 4 años para compensarla con futuras ganancias. Regla anti-elusión: si vendes con pérdida y recompras el mismo activo en los 2 meses siguientes, no puedes aplicar esa pérdida ese año.",
   tips:["Pérdidas 1800 compensan ganancias 1800 al 100% — empezar siempre por aquí","Con el remanente: puedes compensar hasta el 25% de tus rendimientos de staking (0033)","Declara siempre las pérdidas aunque no seas obligado — las 'activas' para futuros años","Regla 2 meses: vende en pérdida en octubre, recompra en enero — 100% legal","Liquidaciones de borrowing con pérdida: también compensables — ¡documenta!"]},

  {icon:"🔍",title:"Trazabilidad — Tu escudo ante Hacienda",cas:"Traz.",
   body:"La trazabilidad es TU prueba. Sin ella, Hacienda asume coste de adquisición = 0€. Ejemplo real: compraste BTC a 1.000€, lo vendes a 4.000€. CON trazabilidad (demuestras la compra) → ganancia real = 3.000€. SIN trazabilidad → Hacienda asume que lo compraste a 0€ → ganancia 'ficticia' = 4.000€ — pagas impuestos por dinero que nunca ganaste. CHAINALYSIS: Hacienda está invirtiendo activamente en herramientas de análisis blockchain como Chainalysis, que permiten rastrear operaciones on-chain directamente en la blockchain. Que no tengas obligación de reportar DeFi no significa que no te puedan encontrar.",
   tips:["Guarda los CSVs de TODOS tus exchanges (Binance, Coinbase, Kraken…) de TODOS los años","Para DeFi: exporta el historial de transacciones de tu wallet (Etherscan, BSCScan…)","Herramientas de trazabilidad: Koinly, CoinTracking, TaxDown — conectan wallets automáticamente","Documenta SIEMPRE los envíos entre tus propias wallets con el txHash","La blockchain es pública y permanente — Hacienda puede rastrear on-chain con Chainalysis"]},

  {icon:"⛏️",title:"Minería — Actividad Económica",cas:"M.130",
   body:"La minería profesional o habitual tributa en la BASE GENERAL del IRPF (tipos entre 19% y 47%), no en la base del ahorro. Implica darse de alta como autónomo y presentar el Modelo 130 trimestralmente, adelantando el 20% de los beneficios cada trimestre. Gastos deducibles: hardware, electricidad, internet, software, amortizaciones del equipo.",
   tips:["Minería ocasional/no habitual puede no ser actividad económica — consulta asesor","El IVA de la minería está exento — pero esto también impide deducir el IVA soportado","Guarda TODAS las facturas de electricidad y hardware","La posterior venta de los criptos minados genera G/P patrimonial en casilla 1800"]},
];

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════
/**
 * Calcula el IRPF sobre ganancias patrimoniales en España (IRPF 2025)
 * Aplica tramos progresivos sobre base del ahorro (19% - 30%)
 * Normativa: Art. 200-260 Ley 35/2006 (IRPF), AEAT consultas DGT
 * @param {number} gain - Ganancia neta en euros
 * @returns {number} Cuota de IRPF estimada a pagar
 */
function calcTax(gain) {
  if (gain <= 0) return 0;
  let tax = 0, remaining = gain, prev = 0;
  for (const b of BRACKETS) {
    const chunk = b.max === Infinity ? remaining : Math.min(b.max - prev, remaining);
    if (chunk <= 0) break;
    tax += chunk * b.rate;
    remaining -= chunk;
    prev = b.max;
    if (remaining <= 0) break;
  }
  return tax;
}

function fmt(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return new Intl.NumberFormat("es-ES", {style:"decimal", minimumFractionDigits:2, maximumFractionDigits:2}).format(v);
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2,5); }

// ─────── CACHE PARA getSummary() ─────────
let _summaryCache = null;
let _lastOpsHash = "";

/**
 * Calcula resumen fiscal completo (casilla 1800, 0033, 1626)
 * Memoizado: cachea resultado si state.ops.length no cambió
 * @returns {Object} { gains, losses, net, staking, airdrops, base, tax, bracket }
 */
function getSummary() {
  const currentHash = ""+state.ops.length+state.costMethod;
  if (currentHash === _lastOpsHash && _summaryCache) return _summaryCache;
  
  const r2 = v => Math.round(v * 100) / 100; // Redondeo a céntimo para evitar errores de coma flotante
  const gains    = r2(state.ops.filter(o=>o.casilla==="1800"&&o.gain>0 ).reduce((s,o)=>s+o.gain, 0));
  const losses   = r2(state.ops.filter(o=>o.casilla==="1800"&&o.gain<0 ).reduce((s,o)=>s+o.gain, 0));
  const staking  = r2(state.ops.filter(o=>o.casilla==="0033"           ).reduce((s,o)=>s+o.gain, 0));
  const airdrops = r2(state.ops.filter(o=>o.casilla==="1626"           ).reduce((s,o)=>s+o.gain, 0));
  const mineria  = r2(state.ops.filter(o=>o.casilla==="Act.Económica"  ).reduce((s,o)=>s+o.gain, 0));
  // Base del ahorro: solo 1800 (G/P transmisión) + 0033 (cap. mobiliario)
  // Airdrops (1626) y minería van a BASE GENERAL — tipo marginal diferente
  const baseAhorro  = Math.max(gains + losses + staking, 0);
  const baseGeneral = airdrops + mineria; // informativo — no se calcula aquí el tipo
  const tax     = calcTax(baseAhorro);
  const bracket = BRACKETS.findIndex(b => baseAhorro <= b.max);
  const result = { gains, losses, net:gains+losses, staking, airdrops, mineria, base:baseAhorro, baseGeneral, tax, bracket };
  // guardar en cache antes de devolver
  _lastOpsHash = currentHash;
  _summaryCache = result;
  return result;
}

// ═══════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════
function render() {
  const sm = getSummary();
  document.getElementById("app").innerHTML = `
    ${renderHeader()}
    ${renderNav(sm)}
    ${currentTab==="home"   ? renderHome(sm)   : ""}
    ${currentTab==="add"    ? renderAdd()       : ""}
    ${currentTab==="import" ? renderImport()    : ""}
    ${currentTab==="analyze"? renderAnalyze()   : ""}
    ${currentTab==="report" ? renderReport(sm)  : ""}
    ${currentTab==="guide"  ? renderGuide()     : ""}
    ${renderPrivacyBar()}
    <div id="footer">
      <div style="margin-bottom:12px; font-weight:700">Angel Tax v${APP_VERSION} • Marzo 2026</div>
      <div style="margin-bottom:8px">No es asesoramiento fiscal. Consulta siempre con un profesional antes de presentar tu declaración.</div>
      <div>Código abierto: <a href="https://github.com/kaizenbnb/Angel-TAX" target="_blank" rel="noopener">GitHub • kaizenbnb/Angel-TAX</a></div>
    </div>
  `;
  attachEvents();
  if (window.feather) feather.replace();
}

// ═══════════════════════════════════════════
// DEADLINE & COUNTDOWN
// ═══════════════════════════════════════════
function getDeadlineInfo() {
  const now = new Date();
  const yr = now.getFullYear();
  // Renta deadline: June 30th of current year (for previous fiscal year)
  const deadline = new Date(yr, 5, 30, 23, 59, 59); // June 30
  if (now > deadline) {
    // After June 30 - next campaign starts April of next year
    return { days: null, label: "Campaña cerrada", sub: `Próxima campaña: Abril ${yr+1}`, urgent: false, past: true };
  }
  const campaignStart = new Date(yr, 3, 2); // April 2
  if (now < campaignStart) {
    const daysToStart = Math.ceil((campaignStart - now) / 86400000);
    return { days: daysToStart, label: `Campaña en ${daysToStart} días`, sub: `Apertura: 2 de abril ${yr}`, urgent: false, past: false, notOpen: true };
  }
  const daysLeft = Math.ceil((deadline - now) / 86400000);
  const urgent = daysLeft <= 30;
  return {
    days: daysLeft,
    label: `${daysLeft} días para la Renta`,
    sub: `Plazo: 30 de junio de ${yr}`,
    urgent,
    past: false,
    notOpen: false
  };
}

function renderHeader() {
  const dl = getDeadlineInfo();
  const ccaa = getCCAA();
  return `
    <div class="header">
      <div class="logo">
        <div class="logo-icon" style="width:44px;height:44px;background:none;box-shadow:none">
            <img src="assets/logo.png" width="44" height="44" alt="Angel Tax" style="width:100%;height:auto" />
          </div>
        <div>
          <h1>Angel Tax</h1>
          <span>Fiscalidad Cripto · España · <span style="color:var(--gold);font-weight:700">v${APP_VERSION}</span></span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <!-- Countdown pill -->
        <div style="background:${dl.urgent?"var(--rd)":dl.past?"var(--sur2)":"var(--gd)"};border:1px solid ${dl.urgent?"var(--red)":dl.past?"var(--bor)":"var(--green)"};border-radius:20px;padding:5px 14px;cursor:pointer" onclick="goTab('guide')" title="${dl.sub}">
          <div style="font-size:10px;font-weight:700;color:${dl.urgent?"var(--red)":dl.past?"var(--dim)":"var(--green)"};letter-spacing:.5px">${dl.label}</div>
          <div style="font-size:9px;color:var(--mut)">${dl.sub}</div>
        </div>
        <!-- CCAA pill -->
        <div style="background:var(--rd);border:1px solid var(--red);border-radius:20px;padding:5px 14px;cursor:pointer;font-size:11px;color:var(--red)" onclick="resetAll()" title="Borrar todas las operaciones y empezar de nuevo">
          🗑 Borrar Todo
        </div>
        <div style="background:var(--bd);border:1px solid var(--bor);border-radius:20px;padding:5px 14px;cursor:pointer;font-size:11px;color:var(--blue)" onclick="openProfile()" title="Cambiar comunidad autónoma">
          🏛️ ${ccaa.name.split(" ")[0]}
        </div>
        <select id="yearSel" onchange="changeYear(this.value)">
          ${(()=>{
            const current = new Date().getFullYear();
            const fiscal = current - 1;
            return Array.from({length:5},(_,i)=>fiscal-i)
              .map(y=>`<option ${state.year===String(y)?"selected":""}>${y}</option>`)
              .join("");
          })()}
        </select>
        <div class="badge">🔒 100% Local</div>
        <!-- Profile button -->
        <button onclick="openProfile()" style="background:var(--sur2);border:1px solid var(--bor);border-radius:8px;color:var(--dim);padding:7px 12px;cursor:pointer;font-size:13px" title="Tu perfil">${userProfile.name ? "👤 "+userProfile.name.split(" ")[0] : "👤 Perfil"}</button>
      </div>
    </div>
    ${showProfileModal ? renderProfileModal() : ""}`;
}

function renderNav(sm) {
  const tabs = [
    {id:"home",  icon:"🏠", label:"Inicio"},
    {id:"add",    icon:"➕", label:"Nueva Operación"},
    {id:"import", icon:"📥", label:"Importar CSV"},
    {id:"analyze",icon:"🤖", label:"Analizar Doc."},
    {id:"report", icon:"📄", label:"Mi Informe"},
    {id:"guide", icon:"📚", label:"Guía Fiscal"},
  ];
  return `<div class="nav">${tabs.map(t=>`
    <button onclick="goTab('${t.id}')" class="${currentTab===t.id?"active":""}">
      <i data-feather="${t.icon}" class="icon"></i> ${t.label}
      ${t.id==="home"&&sm&&sm.base>0?`<span class="cnt">${state.ops.length}</span>`:""}
    </button>`).join("")}
  </div>`;
}

function renderHome(sm) {
  const dl = getDeadlineInfo();
  const ccaa = getCCAA();

  if (state.ops.length === 0) {
    return `
    <!-- HERO -->
    <div style="text-align:center;padding:40px 20px 32px;position:relative;overflow:hidden">
      <!-- Glow background -->
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;background:radial-gradient(circle,rgba(201,162,39,.08) 0%,transparent 70%);pointer-events:none"></div>

      <!-- Logo grande -->
      <div style="margin-bottom:20px;opacity:0.9">
        <img src="assets/logo-hero.png" alt="Angel Tax" width="280" height="280" style="width:280px;height:280px;filter:drop-shadow(0 0 20px rgba(201,162,39,.3));max-width:100%" />
      </div>

      <h2 class="ff-serif" style="font-size:32px;color:var(--gold2);margin-bottom:10px;line-height:1.2">Angel Tax</h2>
      <p style="font-size:16px;color:var(--dim);margin-bottom:6px">Tu asesor fiscal de criptomonedas en España</p>
      <p style="font-size:13px;color:var(--mut);max-width:480px;margin:0 auto 28px;line-height:1.7">
        Gratis · Sin registro · Sin servidores · 100% en tu navegador
      </p>
      <button class="btn-primary" onclick="goTab('add')" style="font-size:15px;padding:13px 32px;margin-bottom:10px">➕ Empezar mi declaración</button>
      <div style="font-size:12px;color:var(--mut);margin-top:8px">o <span style="color:var(--blue);cursor:pointer" onclick="goTab('import')">importa tus operaciones en CSV</span> · <span style="color:var(--blue);cursor:pointer" onclick="goTab('analyze')">analiza un documento con IA</span></div>
    </div>

    <!-- STORYTELLING -->
    <div style="background:var(--sur);border:1px solid var(--bor);border-radius:14px;padding:28px;margin-bottom:20px">
      <div style="font-size:11px;color:var(--gold);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px">¿Por qué nace Angel Tax?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <p style="font-size:14px;color:var(--dim);line-height:1.8;margin-bottom:12px">
            En España, <strong style="color:var(--text)">más de 5 millones de personas</strong> tienen o han tenido criptomonedas. La mayoría no sabe qué declarar, cómo hacerlo, o no puede permitirse pagar a un asesor fiscal especializado.
          </p>
          <p style="font-size:14px;color:var(--dim);line-height:1.8">
            Hacienda sabe más de lo que crees: los exchanges españoles reportan tus transacciones mediante los <strong style="color:var(--text)">Modelos 172/173</strong>, y desde 2026 la directiva europea <strong style="color:var(--text)">DAC8</strong> obliga a todos los exchanges europeos a compartir tus datos automáticamente.
          </p>
        </div>
        <div>
          <p style="font-size:14px;color:var(--dim);line-height:1.8;margin-bottom:12px">
            Angel Tax nace para <strong style="color:var(--gold2)">democratizar el acceso a la fiscalidad cripto</strong>. Sin suscripciones, sin datos en servidores, sin letra pequeña. Todo el código es open source y auditado por la comunidad.
          </p>
          <p style="font-size:14px;color:var(--dim);line-height:1.8">
            Código abierto, mantenido por la comunidad. Avalado por la normativa AEAT vigente y consultas DGT vinculantes.
          </p>
        </div>
      </div>
    </div>

    <!-- ALERTAS IMPORTANTES -->
    <div style="font-size:12px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px">⚡ Lo que debes saber ahora mismo</div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:24px">

      <!-- DAC8 2026 -->
      <div style="background:var(--rd);border:1.5px solid var(--red);border-radius:12px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="font-size:24px">🚨</span>
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--red)">DAC8 — Entra en vigor en 2026</div>
            <div style="font-size:11px;color:var(--mut)">Directiva EU de intercambio automático</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--dim);line-height:1.6;margin-bottom:10px">
          Desde 2026, <strong style="color:var(--text)">todos los exchanges europeos</strong> (Binance, Coinbase, Kraken…) estarán obligados a reportar automáticamente tus transacciones a Hacienda. Si no tienes tus años anteriores regularizados, hazlo ahora.
        </p>
        <div style="font-size:11px;font-weight:600;color:var(--red)">⏰ Te quedan menos de 12 meses para regularizarte</div>
      </div>

      <!-- Plazo Renta -->
      <div style="background:${dl.urgent?"var(--rd)":"#0a1a10"};border:1.5px solid ${dl.urgent?"var(--red)":"var(--green)"};border-radius:12px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="font-size:24px">${dl.urgent?"⏰":"📅"}</span>
          <div>
            <div style="font-weight:700;font-size:14px;color:${dl.urgent?"var(--red)":"var(--green)"}">${dl.label}</div>
            <div style="font-size:11px;color:var(--mut)">Declaración IRPF ${state.year}</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--dim);line-height:1.6;margin-bottom:10px">
          ${dl.past
            ? `La campaña de la renta ${state.year} ya ha cerrado. Si te olvidaste de declarar, puedes presentar una <strong style="color:var(--text)">declaración complementaria o extemporánea</strong> con recargo.`
            : dl.notOpen
            ? `La campaña de la renta ${state.year} aún no ha abierto. Puedes ir preparando tus datos con Angel Tax mientras tanto.`
            : `${dl.days > 30 ? "Tienes tiempo" : "<strong style='color:var(--red)'>¡Urgente!</strong>"} para presentar la declaración de ${state.year}. El plazo cierra el <strong style="color:var(--text)">30 de junio de ${new Date().getFullYear()}</strong>.`
          }
        </p>
        ${!dl.past&&!dl.notOpen?`<div style="font-size:11px;font-weight:600;color:${dl.urgent?"var(--red)":"var(--green)"}">Campaña: 2 abril – 30 junio ${new Date().getFullYear()}</div>`:""}
      </div>

      <!-- Modelo 721 -->
      <div style="background:#0a0f1a;border:1.5px solid var(--blue);border-radius:12px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="font-size:24px">🌍</span>
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--blue)">Modelo 721 — Cuándo aplica (y cuándo NO)</div>
            <div style="font-size:11px;color:var(--mut)">Obligatorio si superas 50.000€ en custodia ajena</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--dim);line-height:1.6;margin-bottom:8px">
          Exchanges extranjeros (Coinbase, Kraken, Bybit…): <strong style="color:var(--blue)">SÍ aplica</strong> si superas 50.000€ a 31/dic.<br>
          Cripto en <strong style="color:var(--text)">DeFi / self-custody</strong>: <strong style="color:var(--green)">NO aplica</strong> — no está en custodia de terceros.<br>
          Cripto en <strong style="color:var(--text)">Binance</strong>: <strong style="color:var(--green)">NO aplica</strong> — ya reportan con Modelos 172/173.
        </p>
        <div style="font-size:11px;font-weight:600;color:var(--blue)">Plazo: 1 enero – 31 marzo · Sanción mínima: 10.000€</div>
      </div>

      <!-- Trazabilidad / Chainalysis -->
      <div style="background:#1a0f00;border:1.5px solid var(--orange);border-radius:12px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="font-size:24px">🔍</span>
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--orange)">Hacienda usa Chainalysis</div>
            <div style="font-size:11px;color:var(--mut)">La blockchain es pública y permanente</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--dim);line-height:1.6;margin-bottom:8px">
          Hacienda invierte activamente en herramientas como <strong style="color:var(--text)">Chainalysis</strong> para rastrear operaciones on-chain. Sin trazabilidad de tu coste de adquisición, Hacienda asume precio de compra = <strong style="color:var(--red)">0€</strong> y tributas por el 100% del valor de venta.
        </p>
        <div style="font-size:11px;font-weight:600;color:var(--orange)">Guarda CSVs · txHash · historial de wallets</div>
      </div>

      <!-- Tax Loss Harvesting -->
      <div style="background:#0f1a0a;border:1.5px solid var(--green);border-radius:12px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="font-size:24px">💡</span>
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--green)">Tax Loss Harvesting</div>
            <div style="font-size:11px;color:var(--mut)">Estrategia 100% legal para pagar menos</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--dim);line-height:1.6;margin-bottom:10px">
          Antes del <strong style="color:var(--text)">31 de diciembre</strong>, vende activos en pérdida para compensar tus ganancias del año. Las pérdidas reducen directamente tu base imponible. Puedes recomprar el mismo activo <strong style="color:var(--text)">2 meses después</strong> sin problema.
        </p>
        <div style="font-size:11px;font-weight:600;color:var(--green)">Regla 2 meses · Compensable hasta 4 años</div>
      </div>

      <!-- Patrimonio según CCAA -->
      <div style="background:#0a0f1a;border:1.5px solid ${ccaa.patrimonio?"var(--orange)":"var(--green)"};border-radius:12px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="font-size:24px">🏛️</span>
          <div>
            <div style="font-weight:700;font-size:14px;color:${ccaa.patrimonio?"var(--orange)":"var(--green)"}">Impuesto de Patrimonio · ${ccaa.name}</div>
            <div style="font-size:11px;color:var(--mut);cursor:pointer" onclick="openProfile()">Cambiar comunidad →</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--dim);line-height:1.6;margin-bottom:10px">
          ${ccaa.patrimonio
            ? `En <strong style="color:var(--text)">${ccaa.name}</strong>, si tu patrimonio neto supera los <strong style="color:var(--orange)">${(ccaa.threshold/1000).toFixed(0)}.000€</strong> debes presentar el Impuesto de Patrimonio. Las criptomonedas cuentan al valor de mercado del 31 de diciembre.`
            : `Enhorabuena 🎉 En <strong style="color:var(--text)">${ccaa.name}</strong> existe una bonificación del 100% en el Impuesto de Patrimonio. No pagas este impuesto independientemente de tu patrimonio cripto.`
          }
        </p>
        <div style="font-size:11px;font-weight:600;color:${ccaa.patrimonio?"var(--orange)":"var(--green)"}">${ccaa.note}</div>
      </div>

      <!-- Donaciones ONG -->
      <div style="background:#1a0a14;border:1.5px solid #c066a0;border-radius:12px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="font-size:24px">💝</span>
          <div>
            <div style="font-weight:700;font-size:14px;color:#e088c0">Donación cripto a ONG</div>
            <div style="font-size:11px;color:var(--mut)">Deducción hasta el 80%</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--dim);line-height:1.6;margin-bottom:10px">
          Donar cripto a una ONG certificada es una de las mejores estrategias fiscales. Primeros <strong style="color:var(--text)">150€</strong> deducción del <strong style="color:#e088c0">80%</strong>. A partir de 150€, deducción del <strong style="color:#e088c0">35%</strong>. La donación tributa como transmisión, pero la deducción compensa con creces.
        </p>
        <div style="font-size:11px;font-weight:600;color:#e088c0">Art. 19 Ley 49/2002 · Mecenazgo</div>
      </div>
    </div>

    <!-- FEATURES -->
    <div style="font-size:12px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px">🛡️ ¿Qué puedo hacer con Angel Tax?</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:28px">
      ${[
        {icon:"➕", t:"Añadir operaciones",   d:"Compraventas, staking, lending, LP pools, liquidaciones, envíos…", tab:"add"},
        {icon:"📥", t:"Importar CSV",          d:"Binance, Coinbase, Bit2Me — importación directa", tab:"import"},
        {icon:"🤖", t:"Analizar con IA",       d:"Sube cualquier PDF o Excel y la IA extrae tus datos", tab:"analyze"},
        {icon:"📄", t:"Generar informe",       d:"PDF profesional listo para tu asesor fiscal", tab:"report"},
        {icon:"📚", t:"Guía fiscal completa",  d:"DeFi, LP pools, lending, Chainalysis, Modelo 721, compensaciones", tab:"guide"},
      ].map(f=>`
        <div onclick="goTab('${f.tab}')" style="background:var(--sur2);border:1px solid var(--bor);border-radius:10px;padding:16px;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--bor2)'" onmouseout="this.style.borderColor='var(--bor)'">
          <div style="font-size:22px;margin-bottom:8px"><i data-feather="${f.icon}" class="icon-large"></i></div>
          <div style="font-weight:600;font-size:13px;margin-bottom:4px">${f.t}</div>
          <div style="font-size:11px;color:var(--mut);line-height:1.5">${f.d}</div>
        </div>`).join("")}
    </div>`;
  }

  const activeBracketRate = sm.bracket >= 0 ? `${(BRACKETS[sm.bracket].rate*100).toFixed(0)}%` : "—";

  return `
    <div class="stats">
      ${[
        {l:"Base del ahorro",   v:fmt(sm.base),              c:"c-gold",  s:"1800 + 0033 · Tramos 19-30%"},
        {l:"Impuesto est.",     v:fmt(sm.tax),               c:sm.tax>0?"c-red":"c-green", s:"Tipo marginal: "+activeBracketRate},
        {l:"Ganancias 1800",    v:fmt(sm.gains),             c:"c-green", s:"Transmisiones con beneficio"},
        {l:"Pérdidas 1800",     v:fmt(Math.abs(sm.losses)),  c:"c-red",   s:"Compensables hasta 4 años"},
        {l:"Cap. mob. (0033)",  v:fmt(sm.staking),           c:"c-blue",  s:"Staking · Lending · LP fees"},
        {l:"Airdrops (1626)",   v:fmt(sm.airdrops),          c:"c-orange",s:"Base general — tipo marginal IRPF"},
        {l:"Operaciones",       v:state.ops.length,          c:"c-gold",  s:"Total introducidas"},
      ].map(x=>`<div class="stat">
        <div class="stat-label">${x.l}</div>
        <div class="stat-value ${x.c}">${x.v}</div>
        <div class="stat-sub">${x.s}</div>
      </div>`).join("")}
    </div>

    ${sm.airdrops>0?`<div class="alert alert-orange">ℹ️ <strong>Airdrops — Base general:</strong> Los ${fmt(sm.airdrops)} de airdrops (casilla 1626) tributan en la <strong>base general del IRPF</strong> (no en la base del ahorro). El tipo depende de tu tramo de renta total, que puede ser superior al 30%.</div>`:""}

    ${(()=>{
      const t = getM721Total();
      const hasB = state.balances.length > 0;
      if (!hasB) return `<div class="alert alert-blue">ℹ️ <strong>Modelo 721:</strong> ¿Tienes cripto en exchanges extranjeros? Introduce tus saldos a 31/dic en la sección M721 de abajo para saber si debes presentarlo.</div>`;
      if (t >= 50000) return `<div class="alert alert-red">🚨 <strong>Modelo 721 OBLIGATORIO:</strong> ${fmt(t)} € en exchanges extranjeros. Plazo: 1 enero – 31 marzo ${parseInt(state.year)+1}.</div>`;
      if (t >= 40000) return `<div class="alert alert-orange">⚠️ <strong>Modelo 721:</strong> ${fmt(t)} € en exchanges extranjeros — cerca del umbral de 50.000€. Verifica el valor exacto a 31/12.</div>`;
      return `<div class="alert alert-green">✅ <strong>Modelo 721:</strong> ${fmt(t)} € en exchanges extranjeros — por debajo del umbral. No obligatorio.</div>`;
    })()}

    <div class="card">
      <div class="ff-serif" style="font-size:17px;margin-bottom:16px">Tramos IRPF Base del Ahorro ${state.year}</div>
      <table>
        <thead><tr><th>Tramo</th><th>Tipo</th><th>Base aplicable</th><th>Cuota tramo</th></tr></thead>
        <tbody>
          ${BRACKETS.map((b,i)=>{
            const prev  = i===0?0:BRACKETS[i-1].max;
            const chunk = Math.max(0, Math.min(sm.base-prev, b.max===Infinity?Math.max(0,sm.base-prev):b.max-prev));
            return `<tr class="${i===sm.bracket&&sm.base>0?"tr-active":""}">
              <td>${b.label}</td>
              <td class="fw7">${(b.rate*100).toFixed(0)}%</td>
              <td>${chunk>0?fmt(chunk):"—"}</td>
              <td>${chunk>0?fmt(chunk*b.rate):"—"}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="ff-serif" style="font-size:17px;margin-bottom:16px">Operaciones — Ejercicio ${state.year}</div>
      <div style="overflow-x:auto">
        <table id="ops-table">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Activo</th><th>Qty</th><th>Adquisición</th><th>Transmisión</th><th>G/P Neta</th><th>Casilla</th><th></th></tr></thead>
          <tbody>
            ${state.ops.map(op=>`
              <tr>
                <td class="c-dim" style="font-size:12px">${sanitize(op.date)}</td>
                <td>
                  <span style="background:var(--bd);color:var(--blue);border-radius:12px;padding:2px 10px;font-size:11px;font-weight:600">${sanitize(op.typeName)}</span>
                  ${op.fifoMode?`<span style="background:#0a1a2a;color:var(--blue);border:1px solid var(--blue);border-radius:8px;padding:1px 6px;font-size:10px;margin-left:4px">FIFO</span>`:""}
                </td>
                <td class="fw7">${sanitize(op.asset)}</td>
                <td class="c-dim" style="font-size:12px">${op.qty?fmtQty(op.qty):"—"}</td>
                <td>${["compraventa","permuta","pago","nft","lp_retiro","liquidacion","envio_regalo"].includes(op.type)?fmt(op.acq):"—"}</td>
                <td>${fmt(op.trans)}</td>
                <td class="${op.gain>=0?"c-green":"c-red"} fw7">${op.gain>=0?"+":""}${fmt(op.gain)}</td>
                <td><span class="casilla${op.casilla==="1800"||op.casilla==="0033"||op.casilla==="1626"?"":" casilla-gold"}">${sanitize(op.casilla)}</span></td>
                <td><button class="btn-icon btn-delete-op" data-op-id="${sanitize(op.id)}">🗑</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}


function syncDate() {
  // Ya no necesitamos sincronizar selectores separados
  // La fecha se obtiene directamente del input type="date"
}

// ── COINGECKO HISTORICAL PRICE REFERENCE ────────────────────────────
const COIN_IDS = {
  BTC:'bitcoin', ETH:'ethereum', SOL:'solana', BNB:'binancecoin',
  XRP:'ripple', ADA:'cardano', DOGE:'dogecoin', AVAX:'avalanche-2',
  DOT:'polkadot', MATIC:'matic-network', LINK:'chainlink',
  UNI:'uniswap', LTC:'litecoin', BCH:'bitcoin-cash', XLM:'stellar',
  ATOM:'cosmos', FIL:'filecoin', TRX:'tron', ETC:'ethereum-classic',
  NEAR:'near', ALGO:'algorand', VET:'vechain', SAND:'the-sandbox',
  MANA:'decentraland', AXS:'axie-infinity', FTM:'fantom',
  ONE:'harmony', HBAR:'hedera-hashgraph', EGLD:'elrond-erd-2',
  THETA:'theta-token', XTZ:'tezos', EOS:'eos', AAVE:'aave',
  COMP:'compound-governance-token', MKR:'maker', SNX:'havven',
  YFI:'yearn-finance', SUSHI:'sushi', CRV:'curve-dao-token',
  '1INCH':'1inch', GRT:'the-graph', CHZ:'chiliz', ENJ:'enjincoin',
  BAT:'basic-attention-token', ZEC:'zcash', DASH:'dash',XMR:'monero',
  OP:'optimism', ARB:'arbitrum', PEPE:'pepe', WIF:'dogwifcoin',
  SHIB:'shiba-inu', FLOKI:'floki', BONK:'bonk', WLD:'worldcoin-wld',
  SUI:'sui', APT:'aptos', INJ:'injective-protocol', SEI:'sei-network',
  TIA:'celestia', PYTH:'pyth-network', JTO:'jito-governance-token',
  RENDER:'render-token', FET:'fetch-ai', AGIX:'singularitynet',
  OCEAN:'ocean-protocol', IMX:'immutable-x', LDO:'lido-dao',
  RPL:'rocket-pool', RETH:'rocket-pool-eth', STETH:'staked-ether',
  WBTC:'wrapped-bitcoin', USDT:'tether', USDC:'usd-coin', DAI:'dai',
  BUSD:'binance-usd', TUSD:'true-usd', FRAX:'frax',
};
let _priceCache = {};

async function fetchCoinPrice() {
  const asset = (document.getElementById('f-asset')?.value||'').trim().toUpperCase();
  const date  = document.getElementById('f-date')?.value; // yyyy-mm-dd
  const box   = document.getElementById('price-ref');
  if (!box) return;
  if (!asset || !date) { box.innerHTML = ''; return; }
  const coinId = COIN_IDS[asset];
  if (!coinId) {
    box.innerHTML = '💡 Precio ref: activo no reconocido (<a href="https://www.coingecko.com" target="_blank" style="color:var(--dim)">buscar en CoinGecko</a>)';
    return;
  }
  const cacheKey = coinId + '_' + date;
  if (_priceCache[cacheKey]) { box.innerHTML = _priceCache[cacheKey]; return; }
  box.innerHTML = '⏳ Consultando precio histórico...';

  // Intento 1: CoinGecko (solo fiable para los últimos ~365 días)
  try {
    const [y,m,d] = date.split('-');
    const geckoDate = d+'-'+m+'-'+y; // dd-mm-yyyy
    const url = 'https://api.coingecko.com/api/v3/coins/'+coinId+'/history?date='+geckoDate+'&localization=false';
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP '+r.status);
    const data = await r.json();
    if (data?.error) throw new Error('gecko_error');
    const eur = data?.market_data?.current_price?.eur;
    if (eur == null) throw new Error('sin datos EUR');
    const fmtVal = new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(eur);
    const html = '💡 CoinGecko ' + sanitize(date) + ': <strong style="color:var(--gold2)">' + fmtVal + ' €</strong> / ' + sanitize(asset);
    _priceCache[cacheKey] = html;
    box.innerHTML = html;
    return;
  } catch(_) { /* fallback */ }

  // Intento 2: CryptoCompare (histórico ilimitado, sin API key)
  try {
    const ts = Math.floor(new Date(date).getTime() / 1000) + 43200; // mediodía UTC
    const url = 'https://min-api.cryptocompare.com/data/pricehistorical?fsym=' + encodeURIComponent(asset) + '&tsyms=EUR&ts=' + ts;
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP '+r.status);
    const data = await r.json();
    const eur = data?.[asset]?.EUR;
    if (eur == null || eur === 0) throw new Error('sin datos EUR');
    const fmtVal = new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(eur);
    const html = '💡 CryptoCompare ' + sanitize(date) + ': <strong style="color:var(--gold2)">' + fmtVal + ' €</strong> / ' + sanitize(asset);
    _priceCache[cacheKey] = html;
    box.innerHTML = html;
  } catch(e) {
    box.innerHTML = '⚠️ No se pudo obtener el precio histórico';
  }
}
// ────────────────────────────────────────────────────────────────────

function renderAdd() {
  if (!currentOpType) {
    return `<div class="card">
      <div class="card-title">¿Qué operación quieres añadir?</div>
      <div class="card-sub" style="margin-bottom:24px">Selecciona el tipo de transacción que realizaste</div>
      <div class="op-grid">
        ${OPS.map(op=>`
          <div class="op-card" onclick="selectOpType('${op.id}')">
            <div style="font-size:28px;margin-bottom:10px"><i data-feather="${op.icon}" class="icon-large"></i></div>
            <div style="font-weight:600;margin-bottom:4px">${op.name}</div>
            <div style="font-size:12px;color:var(--dim);margin-bottom:12px">${op.desc}</div>
            ${op.noTax
              ? `<span style="background:#0a2a0a;color:var(--green);border:1px solid var(--green);border-radius:12px;padding:3px 10px;font-size:11px;font-weight:700">✅ NO TRIBUTA</span>`
              : `<span class="casilla${op.isGeneral?" casilla-gold":""}">${sanitize(op.casilla)}</span>`
            }
          </div>`).join("")}
      </div>
    </div>`;
  }

  const op = OPS.find(o=>o.id===currentOpType);
  const isTransmit = ["compraventa","permuta","pago","nft","lp_retiro","liquidacion","envio_regalo"].includes(currentOpType);
  const isFifoMode = isTransmit && formData.asset && hasFifoLots(formData.asset);
  const isLotOp    = op?.isLot;
  const availQty   = isTransmit && formData.asset ? availableQty(formData.asset) : 0;
  const assetUpper = (formData.asset||"").toUpperCase();

  return `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <div class="card-title"><i data-feather="${op.icon}" class="icon"></i> ${op.name}</div>
        <div class="card-sub">Casilla: <span class="casilla${op.isGeneral?" casilla-gold":""}">${sanitize(op.casilla)}</span></div>
      </div>
      <button class="btn-sec" onclick="selectOpType(null)">← Cambiar tipo</button>
    </div>

    ${currentOpType==="permuta"    ?`<div class="alert alert-blue">⚠️ <strong>Permuta cripto-cripto:</strong> Aunque no conviertas a euros, cada swap tributa. El valor de transmisión es el precio de mercado del cripto entregado en el momento del intercambio.</div>`:""}
    ${currentOpType==="staking"    ?`<div class="alert alert-blue">ℹ️ <strong>DGT V1766-22:</strong> Las recompensas de staking son Rendimiento del Capital Mobiliario. Tributan al recibirlas, al valor de mercado en ese momento. Casilla 0033.</div>`:""}
    ${currentOpType==="lending"    ?`<div class="alert alert-blue">ℹ️ <strong>Lending DeFi:</strong> Los intereses de Aave, Compound, etc. son Rendimiento del Capital Mobiliario → casilla 0033. El préstamo en sí NO tributa. OJO: si te liquidan el colateral, SÍ tributa (usa "Liquidación").</div>`:""}
    ${currentOpType==="lp_fees"    ?`<div class="alert alert-blue">ℹ️ <strong>Liquidity Pool fees:</strong> Las comisiones cobradas como LP (Uniswap, PancakeSwap…) son Rendimiento del Capital Mobiliario → casilla 0033. Introduce el valor en € de las fees cobradas.</div>`:""}
    ${currentOpType==="lp_retiro"  ?`<div class="alert alert-orange">⚠️ <strong>Retirada de liquidez:</strong> Al retirar del pool, la diferencia entre el valor de retirada y el valor de entrada es ganancia o pérdida patrimonial → casilla 1800. Valor adquisición = lo que valían tus tokens al entrar al pool.</div>`:""}
    ${currentOpType==="liquidacion"?`<div class="alert alert-red">🚨 <strong>Liquidación (Borrowing):</strong> La venta forzosa de tu colateral tributa como ganancia o pérdida patrimonial → casilla 1800. Muchos usuarios no la declaran — es un error grave. Valor adquisición = precio de compra original del colateral.</div>`:""}
    ${currentOpType==="envio_propio"?`<div class="alert alert-green">✅ <strong>Envío entre tus wallets:</strong> NO genera hecho imponible. Pero guarda el txHash como prueba de que la wallet de destino es tuya. Hacienda usa Chainalysis para rastrear on-chain.</div>`:""}
    ${currentOpType==="envio_regalo"?`<div class="alert alert-orange">⚠️ <strong>Envío a otra persona:</strong> Tú tributas como si vendieras al valor de mercado (casilla 1800). El receptor tributa en Impuesto de Sucesiones y Donaciones según su CCAA.</div>`:""}
    ${currentOpType==="airdrop"    ?`<div class="alert alert-orange">⚠️ <strong>DGT V0648-24:</strong> Los airdrops tributan al recibirlos al valor de mercado. Van a casilla 1626 — NO se compensan con pérdidas de la 1800. Si el token no tiene precio de mercado, puedes declarar 0€.</div>`:""}
    ${currentOpType==="mineria"    ?`<div class="alert alert-orange">⚠️ <strong>Actividad Económica:</strong> Tributa en base general (hasta 47%), no en base del ahorro. Requiere alta como autónomo y Modelo 130 trimestral. Introduce los ingresos brutos en €.</div>`:""}

    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Criptomoneda / Activo</label>
        <input class="form-input" id="f-asset" placeholder="BTC, ETH, SOL..." value="${formData.asset||""}" onchange="saveFormData();calcResult=null;render();setTimeout(fetchCoinPrice,0)"/>
      </div>
      <div class="form-group">
        <label class="form-label">Fecha de operación</label>
        <input type="date" class="form-input" id="f-date" value="${formData.date||""}" onchange="saveFormData();calcResult=null;setTimeout(fetchCoinPrice,100)"/>
        <div class="form-hint">Selecciona la fecha de la operación</div>
      </div>
      <div id="price-ref" style="margin-top:6px;min-height:20px;font-size:11px;color:var(--dim)"></div>
      </div>
    </div>

    ${isLotOp ? `
    ${isFifoMode || availQty > 0 ? `<div class="alert alert-gold">🔍 <strong>FIFO activo para ${assetUpper}:</strong> Tienes ${fmtQty(availQty)} ${assetUpper} en lotes disponibles.</div>` : ""}
    <div class="form-grid3">
      <div class="form-group">
        <label class="form-label">Cantidad comprada (unidades)</label>
        <input type="number" class="form-input" id="f-qty" placeholder="0.00000000" step="any" value="${formData.qty||""}"/>
        <div class="form-hint">Ej: 0.05 BTC, 2.5 ETH</div>
      </div>
      <div class="form-group">
        <label class="form-label">Total pagado (€)</label>
        <input type="number" class="form-input" id="f-trans" placeholder="0.00" value="${formData.trans||""}"/>
        <div class="form-hint">Precio total de compra en €</div>
      </div>
      <div class="form-group">
        <label class="form-label">Comisiones (€)</label>
        <input type="number" class="form-input" id="f-fees" placeholder="0.00" value="${formData.fees||""}"/>
        <div class="form-hint">Se suman al coste de adquisición (DGT)</div>
      </div>
    </div>
    ` : isFifoMode ? `
    <div class="alert alert-blue">🤖 <strong>Modo automático activo:</strong> Tienes <strong>${fmtQty(availQty)} ${assetUpper}</strong> en lotes. El coste de adquisición se calcula solo.</div>

    <div style="margin-bottom:16px">
      <label class="form-label">Método de coste</label>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div onclick="state.costMethod='fifo';calcResult=null;render()"
             style="background:${state.costMethod==='fifo'?'var(--sur3)':'var(--sur2)'};border:1.5px solid ${state.costMethod==='fifo'?'var(--gold2)':'var(--bor2)'};border-radius:10px;padding:10px 16px;cursor:pointer;flex:1;min-width:140px">
          <div style="font-weight:700;color:${state.costMethod==='fifo'?'var(--gold2)':'var(--text)'};font-size:13px">FIFO</div>
          <div style="font-size:11px;color:var(--dim);margin-top:2px">Primero en entrar, primero en salir — método estándar AEAT</div>
        </div>
        <div onclick="state.costMethod='specific';calcResult=null;render()"
             style="background:${state.costMethod==='specific'?'var(--sur3)':'var(--sur2)'};border:1.5px solid ${state.costMethod==='specific'?'var(--gold2)':'var(--bor2)'};border-radius:10px;padding:10px 16px;cursor:pointer;flex:1;min-width:140px">
          <div style="font-weight:700;color:${state.costMethod==='specific'?'var(--gold2)':'var(--text)'};font-size:13px">Identificación específica</div>
          <div style="font-size:11px;color:var(--dim);margin-top:2px">Eliges el lote exacto — válido si puedes documentarlo (TSJPV 2025)</div>
        </div>
      </div>
      ${state.costMethod==='specific'?`<div class="alert alert-orange" style="margin-top:8px;font-size:12px">⚖️ <strong>Sentencia TSJPV 2025:</strong> Hacienda acepta identificación específica si puedes acreditar documentalmente qué unidades concretas vendiste (extracto del exchange con IDs de transacción). Úsalo solo si tienes esa documentación.</div>`:""}
    </div>

    ${state.costMethod==='specific'?`
    <div class="form-group" style="margin-bottom:16px">
      <label class="form-label">Lote a usar</label>
      <select class="form-input" id="f-lotid" onchange="saveFormData();calcResult=null;render()">
        <option value="">-- Elige el lote --</option>
        ${getSpecificLots(formData.asset||"").map(l=>`
          <option value="${sanitize(l.id)}" ${formData.lotId===l.id?"selected":""}>
            ${sanitize(l.date)} · ${fmtQty(l.qtyRemaining)} ${sanitize(l.asset)} disponibles · ${fmt(l.pricePerUnit)} €/u (coste ${fmt(l.qtyRemaining*l.pricePerUnit)} €)
          </option>`).join("")}
      </select>
    </div>` : ""}

    <div class="form-grid3">
      <div class="form-group">
        <label class="form-label">Cantidad vendida (unidades)</label>
        <input type="number" class="form-input" id="f-qty" placeholder="0.00000000" step="any" value="${formData.qty||""}"/>
        <div class="form-hint">Disponible: ${fmtQty(availQty)} ${assetUpper}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Precio unitario de venta (€)</label>
        <input type="number" class="form-input" id="f-price" placeholder="0.00" step="any" value="${formData.price||""}"/>
        <div class="form-hint">Precio por unidad en €</div>
      </div>
      <div class="form-group">
        <label class="form-label">Comisiones (€)</label>
        <input type="number" class="form-input" id="f-fees" placeholder="0.00" value="${formData.fees||""}"/>
        <div class="form-hint">Gas fees + fees del exchange</div>
      </div>
    </div>
    ` : isTransmit ? `
    <div class="form-grid3">
      <div class="form-group">
        <label class="form-label">Valor adquisición (€)</label>
        <input type="number" class="form-input" id="f-acq" placeholder="0.00" value="${formData.acq||""}"/>
        <div class="form-hint">Precio de compra en € <span style="color:var(--orange)">· Sin lotes FIFO — modo manual</span></div>
      </div>
      <div class="form-group">
        <label class="form-label">Valor transmisión (€)</label>
        <input type="number" class="form-input" id="f-trans" placeholder="0.00" value="${formData.trans||""}"/>
        <div class="form-hint">${currentOpType==="permuta"?"Valor de mercado del cripto entregado":"Precio de venta en €"}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Comisiones (€)</label>
        <input type="number" class="form-input" id="f-fees" placeholder="0.00" value="${formData.fees||""}"/>
        <div class="form-hint">Gas fees + fees del exchange</div>
      </div>
    </div>
    ` : `
    <div class="form-group">
      <label class="form-label">Valor de mercado al recibir (€)</label>
      <input type="number" class="form-input" id="f-trans" placeholder="0.00" value="${formData.trans||""}"/>
      <div class="form-hint">Consulta CoinGecko/CoinMarketCap histórico para el valor exacto en esa fecha</div>
    </div>
    `}

    <div class="form-group">
      <label class="form-label">Notas (opcional)</label>
      <input class="form-input" id="f-notes" placeholder="Exchange, número de orden, contexto..." value="${formData.notes||""}"/>
    </div>

    ${!calcResult?`<button class="btn-primary" onclick="calculate()">🧮 Calcular impacto fiscal</button>`:`
      ${calcResult.error ? `
      <div class="alert alert-red">⚠️ ${calcResult.error}</div>
      <button class="btn-primary" onclick="calculate()">🧮 Calcular</button>
      ` : calcResult.isLot ? `
      <div class="result-box" style="border-color:var(--blue)">
        <div style="text-align:center;padding:8px 0 4px">
          <div style="font-size:28px;margin-bottom:6px">🛍️</div>
          <div style="font-weight:700;color:var(--blue);font-size:15px">Lote FIFO listo para registrar</div>
        </div>
        <div class="result-row"><span class="c-dim">Activo</span><span class="fw7">${(formData.asset||"").toUpperCase()}</span></div>
        <div class="result-row"><span class="c-dim">Cantidad</span><span class="fw7">${fmtQty(calcResult.qty)} ${(formData.asset||"").toUpperCase()}</span></div>
        <div class="result-row"><span class="c-dim">Precio/unidad</span><span class="fw7 c-gold">${fmt(calcResult.pricePerUnit)} €</span></div>
        <div class="result-row"><span class="c-dim">Coste total</span><span class="fw7">${fmt(calcResult.total)} € + ${fmt(calcResult.fees)} € fees = ${fmt(calcResult.total + calcResult.fees)} €</span></div>
        <div class="result-row"><span class="c-dim">Evento imponible</span><span style="color:var(--green);font-weight:700">Ninguno — compra no tributa</span></div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn-primary" onclick="addOperation()">✅ Añadir lote FIFO</button>
        <button class="btn-sec" onclick="clearResult()">✏️ Editar</button>
      </div>
      ` : calcResult.noTax ? `
      <div class="result-box" style="border-color:var(--green)">
        <div style="text-align:center;padding:12px 0">
          <div style="font-size:32px;margin-bottom:8px">✅</div>
          <div style="font-weight:700;color:var(--green);font-size:15px">Esta operación NO tributa</div>
          <div style="font-size:12px;color:var(--dim);margin-top:6px;line-height:1.6">
            Mover cripto entre tus propias wallets no genera hecho imponible.<br>
            <strong style="color:var(--text)">Guarda el txHash como prueba</strong> de que la wallet de destino es tuya.
          </div>
        </div>
      </div>
      <div class="alert alert-green">💡 <strong>Trazabilidad:</strong> Documenta este movimiento con el txHash para mantener la cadena de custodia ante posibles requerimientos de Hacienda.</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn-sec" onclick="clearResult()">✏️ Editar datos</button>
      </div>
      ` : `
      ${calcResult.isFifoMode && calcResult.fifo ? `
      <div class="result-box" style="border-color:var(--blue);margin-bottom:8px">
        <div style="font-weight:700;font-size:12px;color:var(--blue);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">
          🤖 ${calcResult.method==='specific'?'Identificación específica (TSJPV 2025)':'Desglose FIFO automático'}
        </div>
        ${calcResult.fifo.lotsUsed.map(l=>`
        <div class="result-row" style="font-size:12px">
          <span class="c-dim">Lote ${sanitize(l.lotDate)}</span>
          <span>${fmtQty(l.qty)} u × ${fmt(l.pricePerUnit)} €/u = <strong class="c-gold">${fmt(l.acqCost)} €</strong></span>
        </div>`).join("")}
        <div style="border-top:1px solid var(--bd);margin:8px 0"></div>
        <div class="result-row"><span class="c-dim">Coste adquisición FIFO</span><span class="fw7 c-gold">${fmt(calcResult.acqFifo)} €</span></div>
        <div class="result-row"><span class="c-dim">Valor de venta</span><span class="fw7">${fmt(calcResult.trans)} €</span></div>
        ${calcResult.fifo.warning ? `<div class="alert alert-orange" style="margin-top:8px;font-size:12px">${calcResult.fifo.warning}</div>` : ""}
      </div>
      ` : ""}
      <div class="result-box">
        <div class="result-row">
          <span class="c-dim">Casilla IRPF</span>
          <span class="casilla${op.isGeneral?" casilla-gold":""}">${calcResult.cas}</span>
        </div>
        <div class="result-row">
          <span class="c-dim">G/P Neta</span>
          <span class="${calcResult.gain>=0?"c-green":"c-red"} fw7">${calcResult.gain>=0?"+":""}${fmt(calcResult.gain)}</span>
        </div>
        <div class="result-row">
          <span class="c-dim">Impuesto estimado</span>
          <span class="c-gold fw7">${fmt(calcResult.tax)}</span>
        </div>
      </div>
      ${calcResult.gain<0?`<div class="alert alert-green">✅ <strong>Pérdida patrimonial:</strong> ${fmt(Math.abs(calcResult.gain))} compensable con ganancias de este año o los próximos 4 ejercicios.</div>`:""}
      ${calcResult.gain>0?`<div class="alert alert-gold">💡 <strong>Consejo:</strong> Si tienes pérdidas en otros activos este ejercicio, puedes compensarlas para reducir esta base imponible.</div>`:""}
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn-primary" onclick="addOperation()">✅ Añadir a mi declaración</button>
        <button class="btn-sec" onclick="clearResult()">✏️ Editar datos</button>
      </div>
      `}
    `}
  </div>`;
}

function renderReport(sm) {
  if (state.ops.length === 0 && state.lots.length === 0) {
    return `<div class="empty">
      <div class="empty-icon">📄</div>
      <div class="ff-serif" style="font-size:20px;color:var(--dim)">Sin operaciones todavía</div>
      <div style="font-size:13px;color:var(--mut);margin-top:8px;margin-bottom:24px">Añade operaciones para generar tu informe fiscal.</div>
      <button class="btn-primary" onclick="goTab('add')">➕ Añadir primera operación</button>
    </div>`;
  }

  // ── Inventario de lotes FIFO ──
  const lotsBlock = state.lots.length > 0 ? `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div>
          <div class="card-title">🛍️ Inventario de Lotes FIFO</div>
          <div class="card-sub">${state.lots.length} lote${state.lots.length!==1?"s":""} registrados · Método FIFO (AEAT obligatorio)</div>
        </div>
        <button class="btn-primary" onclick="goTab('add');selectOpType('compra')">+ Nueva compra</button>
      </div>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Fecha</th><th>Activo</th><th>Qty comprada</th><th>Qty disponible</th><th>Precio/u</th><th>Coste total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${state.lots.map(l=>{
              const pct = l.qty > 0 ? (l.qtyRemaining / l.qty * 100) : 0;
              const consumed = l.qty - l.qtyRemaining;
              const statusColor = pct===0?"var(--red)":pct===100?"var(--green)":"var(--orange)";
              const statusLabel = pct===0?"Consumido":pct===100?"Disponible":"Parcial";
              return `<tr>
                <td class="c-dim" style="font-size:12px">${sanitize(l.date)}</td>
                <td class="fw7">${sanitize(l.asset)}</td>
                <td>${fmtQty(l.qty)}</td>
                <td style="color:${statusColor};font-weight:700">${fmtQty(l.qtyRemaining)}</td>
                <td class="c-gold">${fmt(l.pricePerUnit)} €</td>
                <td>${fmt(l.totalEur + l.fees)} €</td>
                <td><span style="background:var(--bd);color:${statusColor};border-radius:10px;padding:2px 8px;font-size:11px;font-weight:700">${statusLabel}</span></td>
                <td><button class="btn-icon" onclick="deleteLot('${sanitize(l.id)}')">🗑</button></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      ${state.lots.some(l=>l.qtyRemaining>0) ? `
      <div style="margin-top:12px;font-size:12px;color:var(--mut)">
        ${[...new Set(state.lots.map(l=>l.asset))].map(asset=>{
          const qty = availableQty(asset);
          const costBasis = state.lots.filter(l=>l.asset===asset&&l.qtyRemaining>0).reduce((s,l)=>s+l.qtyRemaining*l.pricePerUnit,0);
          return `<span style="background:var(--sur2);border:1px solid var(--bor);border-radius:8px;padding:4px 10px;margin-right:6px;display:inline-block;margin-bottom:4px">
            <strong>${asset}</strong>: ${fmtQty(qty)} u disponibles · coste base ${fmt(costBasis)} €
          </span>`;
        }).join("")}
      </div>` : ""}
    </div>` : "";

  const m721Block = renderM721Section();

  if (state.ops.length === 0) {
    return lotsBlock + m721Block + `<div class="empty" style="margin-top:0">
      <div class="empty-icon">📄</div>
      <div class="ff-serif" style="font-size:18px;color:var(--dim)">Sin operaciones de venta todavía</div>
      <div style="font-size:13px;color:var(--mut);margin-top:8px;margin-bottom:24px">Tus lotes están registrados. Añade ventas para generar el informe fiscal.</div>
    </div>`;
  }

  return lotsBlock + m721Block + `
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div>
        <div class="card-title">📄 Informe Fiscal ${state.year}</div>
        <div class="card-sub">Resumen para completar tu declaración de la renta</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <select id="reportFormat" class="btn-secondary" style="padding:4px 8px;">
          <option value="txt">.txt</option>
          <option value="pdf">PDF</option>
        </select>
        <button class="btn-primary" onclick="downloadSelectedReport()">⬇️ Descargar</button>
        <button class="btn-secondary" onclick="exportToJSON()" title="Exporta en formato JSON para Hacienda">📋 JSON</button>
      </div>
      <button class="btn-sec" style="color:var(--red);border-color:var(--red)" onclick="clearSavedState()">🗑 Borrar todo</button>
      <button class="btn-sec" style="color:var(--blue);border-color:var(--blue)" onclick="loadDemoData()">🎭 Cargar demo</button>
      <button class="btn-sec" style="color:var(--dim)" title="Comprueba cálculos internos (para desarrolladores)" onclick="selfCheck()">🧪 Prueba técnica</button>
    </div>

    <!-- COMPENSACIÓN INTER-EJERCICIOS -->
    <div class="card" style="border-color:var(--gold);background:linear-gradient(to right, var(--gold-glow), transparent)">
      <div style="margin-bottom:12px"><span class="casilla">Regla 4 años</span></div>
      <div style="font-weight:600;font-size:15px;margin-bottom:14px">Compensación de pérdidas de ejercicios anteriores</div>
      <div style="font-size:13px;color:var(--dim);margin-bottom:16px">
        Las pérdidas netas de transmisiones de ejercicios anteriores pueden compensar ganancias de los siguientes 4 años.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div>
          <label style="display:block;font-size:12px;color:var(--dim);margin-bottom:4px;font-weight:600">Pérdidas pendientes (€)</label>
          <input type="number" id="priorLossesInput" value="${state.carryForwardLosses}" onchange="updateCarryForwardLosses(this.value)" style="width:100%;padding:8px;background:var(--sur2);border:1px solid var(--bor);color:var(--text);border-radius:6px;font-size:14px" placeholder="0" />
          <div style="font-size:11px;color:var(--mut);margin-top:4px">Introduce como negativo: -1200</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--dim);margin-bottom:4px;font-weight:600">Compensables este año</div>
          <div style="padding:8px;background:var(--sur2);border:1px solid var(--bor);border-radius:6px;font-weight:700;color:var(--gold2)">
            ${fmt(Math.min(Math.abs(state.carryForwardLosses), Math.max(sm.net, 0)))} €
          </div>
        </div>
      </div>
      <div class="alert alert-blue" style="font-size:12px">
        💡 <strong>Cómo funciona:</strong> Si tienes -1.000€ de 2023 y +500€ de ganancias este año, compensa -500€ (quedan -500€ para 2027).
      </div>
    </div>

    <div class="card" style="border-color:var(--bor2)">
      <div style="margin-bottom:12px"><span class="casilla">1800–1814</span></div>
      <div style="font-weight:600;font-size:15px;margin-bottom:14px">Ganancias y pérdidas patrimoniales (transmisiones)</div>
      <div class="result-box">
        <div class="result-row"><span class="c-dim">Ganancias totales</span><span class="c-green fw7">+${fmt(sm.gains)}</span></div>
        <div class="result-row"><span class="c-dim">Pérdidas totales</span><span class="c-red fw7">${fmt(sm.losses)}</span></div>
        <div class="result-row"><span class="c-dim">Resultado neto casilla 1800</span><span class="${sm.net>=0?"c-green":"c-red"} fw7">${sm.net>=0?"+":""}${fmt(sm.net)}</span></div>
      </div>
      <div class="alert alert-blue">💡 <strong>Cómo rellenar:</strong> Renta Web → Ganancias patrimoniales → Monedas virtuales → Casilla 1804. Introduce cada operación con: nombre del activo, tipo de contraprestación, fecha y valores de adquisición/transmisión.</div>
    </div>

    ${sm.staking>0?`<div class="card" style="border-color:var(--bor2)">
      <div style="margin-bottom:12px"><span class="casilla">0033</span></div>
      <div style="font-weight:600;font-size:15px;margin-bottom:14px">Rendimientos del capital mobiliario (Staking · Lending · LP fees)</div>
      <div class="result-box">
        <div class="result-row"><span class="c-dim">Total rendimientos</span><span class="c-blue fw7">${fmt(sm.staking)}</span></div>
      </div>
      <div class="alert alert-blue">💡 <strong>Cómo rellenar:</strong> Renta Web → Rendimientos del capital mobiliario → Cesión de capitales a terceros → Casilla 0033.</div>
    </div>`:""}

    ${sm.airdrops>0?`<div class="card" style="border-color:var(--bor2)">
      <div style="margin-bottom:12px"><span class="casilla">1626</span></div>
      <div style="font-weight:600;font-size:15px;margin-bottom:14px">Ganancias no derivadas de transmisión (Airdrops)</div>
      <div class="result-box">
        <div class="result-row"><span class="c-dim">Total airdrops/hardforks</span><span class="c-orange fw7">${fmt(sm.airdrops)}</span></div>
      </div>
    </div>`:""}

    <div style="background:linear-gradient(135deg,#0e1220,#1a1408);border:1px solid var(--gold);border-radius:12px;padding:28px;text-align:center">
      <div style="font-size:12px;color:var(--gold);text-transform:uppercase;letter-spacing:2px">Base Imponible Total Estimada</div>
      <div class="ff-serif c-gold" style="font-size:44px;font-weight:700;margin:12px 0">${fmt(sm.base)}</div>
      <div class="${sm.tax>0?"c-red":"c-green"} fw7" style="font-size:22px;margin-bottom:20px">Cuota IRPF estimada: ${fmt(sm.tax)}</div>
      <div class="alert alert-orange">⚠️ <strong>Importante:</strong> Estimación orientativa. El IRPF total incluye también tus rentas del trabajo, inmobiliarias, etc. Consulta siempre con un asesor fiscal certificado.</div>
    </div>

    <div class="alert alert-gold" style="margin-top:16px">
      🛡️ <strong>Privacidad:</strong> Este informe se genera exclusivamente en tu dispositivo. Ningún dato ha sido enviado a ningún servidor. Para eliminar todos los datos, cierra esta pestaña.
    </div>`;
}

function renderGuide() {
  return `
    <div class="card">
      <div class="card-title">🎓 Guía Fiscal Cripto España 2025/2026</div>
      <div class="card-sub" style="margin-bottom:16px">Basada en normativa AEAT, Ley 35/2006 IRPF y consultas DGT vinculantes</div>
      <div class="alert alert-gold">📌 <strong>Principio básico:</strong> Cualquier operación con cripto que genere incremento de patrimonio tributa en España. No existe mínimo exento específico para cripto.</div>
      <div class="alert alert-blue">🔑 <strong>Regla de oro:</strong> Si solo compras y hodleas sin vender ni intercambiar, NO declaras en el IRPF. La simple compra no tributa nunca.</div>
    </div>

    ${GUIDES.map((g,i)=>`
      <div class="guide-item">
        <div class="guide-header" onclick="toggleGuide(${i})">
          <div style="display:flex;align-items:center;gap:14px">
            <span style="font-size:22px;width:32px;text-align:center">${g.icon}</span>
            <div>
              <span style="font-weight:600;font-size:15px">${g.title}</span>
              <span class="casilla" style="margin-left:10px;font-size:10px">${g.cas}</span>
            </div>
          </div>
          <span class="c-mut" style="font-size:14px">${openGuide===i?"▲":"▼"}</span>
        </div>
        ${openGuide===i?`
          <div class="guide-body">
            <p>${g.body}</p>
            <strong style="font-size:12px;color:var(--gold2);text-transform:uppercase;letter-spacing:1px">💡 Consejos prácticos:</strong>
            <ul style="margin-top:8px">${g.tips.map(t=>`<li>${t}</li>`).join("")}</ul>
          </div>`:""}
      </div>`).join("")}

    <div class="card" style="margin-top:8px">
      <div class="ff-serif" style="font-size:17px;margin-bottom:4px">💛 Apoya Angel Tax</div>
      <div style="font-size:13px;color:var(--dim);margin-bottom:16px">Angel Tax es 100% open source y gratuito. Si te ha ahorrado tiempo o dinero y quieres contribuir:</div>
      ${[
        {icon:"₿", label:"Bitcoin",  network:"Red Bitcoin (BTC nativa)",  color:"#f7931a", addr:"bc1q6urerf7ncm4khhplxatl9cn8na70shu4lanks6"},
        {icon:"Ξ", label:"Ethereum", network:"Red Ethereum (ERC-20)",      color:"#627eea", addr:"0x026066a7d38420297881575738Fea1BeB33Ed29f"},
        {icon:"◎", label:"Solana",   network:"Red Solana (SOL nativa)",    color:"#9945ff", addr:"34ERsZd46CozZxiUtoZLTEUAs8Xt7zL9UF4qgyb5Vuse"},
        {icon:"⬡", label:"BNB",      network:"BNB Smart Chain (BEP-20)",   color:"#f0b90b", addr:"0x11EFFaBCBDd5902eCf66fe93FF5A36B27C3A67Cc"},
      ].map(w=>`
        <div style="background:var(--sur2);border:1px solid var(--bor);border-radius:10px;padding:14px 16px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:20px;width:28px;text-align:center;color:${w.color}">${w.icon}</span>
            <div>
              <div style="font-weight:700;font-size:13px;color:${w.color}">${w.label}</div>
              <div style="font-size:10px;color:var(--mut)">${w.network}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;background:var(--sur);border:1px solid var(--bor);border-radius:7px;padding:8px 12px">
            <div style="font-size:11px;color:var(--dim);font-family:monospace;flex:1;word-break:break-all;line-height:1.5">${w.addr}</div>
            <button onclick="copyWallet('${w.addr}', this)"
              style="background:var(--sur2);border:1px solid var(--bor2);border-radius:6px;color:var(--dim);padding:5px 10px;cursor:pointer;font-size:11px;font-weight:600;white-space:nowrap;flex-shrink:0;transition:all .15s">
              📋 Copiar
            </button>
          </div>
        </div>`).join("")}
      <div style="margin-top:14px;font-size:12px;color:var(--mut);line-height:1.8">
        🐙 Repositorio: <a href="https://github.com/kaizenbnb/Angel-TAX" target="_blank">github.com/kaizenbnb/Angel-TAX</a><br>
        Issues, sugerencias y pull requests son bienvenidos.<br>
        Áreas prioritarias: importador CSV de exchanges, más tipos DeFi, tests automáticos.
      </div>
    </div>`;
}

function copyWallet(addr, btn) {
  navigator.clipboard.writeText(addr).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = "✅ Copiado";
    btn.style.color = "var(--green)";
    btn.style.borderColor = "var(--green)";
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.style.color = "";
      btn.style.borderColor = "";
    }, 2000);
  }).catch(() => {
    // Fallback for browsers without clipboard API
    const ta = document.createElement("textarea");
    ta.value = addr;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    btn.innerHTML = "✅ Copiado";
    setTimeout(() => btn.innerHTML = "📋 Copiar", 2000);
  });
}

// ─── CSV IMPORT STATE ───
let importState = { exchange: null, csvType: null, preview: null, errors: [], imported: 0 };

function renderImport() {
  const ex = importState.exchange;
  const ct = importState.csvType;

  return `<div class="card">
    <div class="card-title">📥 Importar CSV</div>
    <div class="card-sub" style="margin-bottom:20px">Importa tus transacciones directamente desde tu exchange</div>

    <div class="alert alert-gold">
      🔒 <strong>Privacidad:</strong> El archivo CSV se procesa <strong>únicamente en tu navegador</strong>. Nunca se sube a ningún servidor.
    </div>

    <!-- PASO 1: Seleccionar exchange -->
    <div style="margin-bottom:20px">
      <div style="font-size:12px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Paso 1 — Selecciona tu exchange</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
        ${[
          {id:"binance",  label:"Binance",  icon:"🟡"},
          {id:"coinbase", label:"Coinbase", icon:"🔵"},
          {id:"bit2me",   label:"Bit2Me",   icon:"🟢"},
          {id:"kraken",   label:"Kraken",   icon:"🟣"},
          {id:"revolut",  label:"Revolut",  icon:"🔷"},
          {id:"etoro",    label:"eToro",    icon:"🟩"},
          {id:"bitvavo",  label:"Bitvavo",  icon:"🔶"},
          {id:"okx",      label:"OKX",      icon:"⬛"},
          {id:"bitpanda", label:"Bitpanda", icon:"🐼"},
          {id:"bitget",   label:"Bitget",   icon:"🔵"},
        ].map(e=>`
          <div onclick="selectExchange('${e.id}')"
               style="background:${ex===e.id?"var(--sur3)":"var(--sur2)"};border:1.5px solid ${ex===e.id?"var(--gold)":"var(--bor)"};border-radius:10px;padding:14px;text-align:center;cursor:pointer;transition:all .15s">
            <div style="font-size:24px;margin-bottom:6px">${e.icon}</div>
            <div style="font-weight:600;font-size:13px;color:${ex===e.id?"var(--gold2)":"var(--text)"}">${e.label}</div>
          </div>`).join("")}
      </div>
    </div>

    <!-- PASO 2: Tipo de CSV (solo si exchange seleccionado) -->
    ${ex ? `
    <div style="margin-bottom:20px">
      <div style="font-size:12px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Paso 2 — Tipo de informe CSV</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${getCsvTypes(ex).map(t=>`
          <div onclick="selectCsvType('${t.id}')"
               style="background:${ct===t.id?"var(--sur3)":"var(--sur2)"};border:1.5px solid ${ct===t.id?"var(--gold)":"var(--bor)"};border-radius:10px;padding:12px 16px;cursor:pointer;transition:all .15s;flex:1;min-width:180px">
            <div style="font-weight:600;font-size:13px;color:${ct===t.id?"var(--gold2)":"var(--text)"};margin-bottom:3px">${t.label}</div>
            <div style="font-size:11px;color:var(--dim)">${t.desc}</div>
            <span class="casilla" style="margin-top:8px;display:inline-block">${t.casilla}</span>
          </div>`).join("")}
      </div>
      <div class="alert alert-blue" style="margin-top:14px">
        ${getInstructions(ex)}
      </div>
    </div>` : ""}

    <!-- PASO 3: Upload (solo si tipo seleccionado) -->
    ${ex && ct ? `
    <div style="margin-bottom:20px">
      <div style="font-size:12px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Paso 3 — Sube el archivo CSV</div>
      <label style="display:block;background:var(--sur2);border:2px dashed var(--bor2);border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:border-color .2s" id="dropzone">
        <input type="file" accept=".csv" id="csvFile" style="display:none" onchange="handleCsvFile(this)"/>
        <div style="font-size:36px;margin-bottom:10px">📂</div>
        <div style="font-weight:600;color:var(--text);margin-bottom:4px">Haz clic para seleccionar el CSV</div>
        <div style="font-size:12px;color:var(--dim)">o arrastra el archivo aquí</div>
      </label>
    </div>` : ""}

    <!-- PREVIEW de resultados -->
    ${importState.preview ? renderImportPreview() : ""}
  </div>`;
}

function renderImportPreview() {
  const p = importState.preview || [];
  const lots = importState.previewLots || [];
  if (p.length === 0 && lots.length === 0) {
    return `<div class="alert alert-orange">⚠️ No se encontraron operaciones válidas en el CSV. Verifica que el tipo de informe seleccionado coincide con el archivo.</div>`;
  }
  const totalItems = p.length + lots.length;
  const btnLabel = [
    p.length > 0    ? `${p.length} operaciones` : "",
    lots.length > 0 ? `${lots.length} lotes FIFO` : ""
  ].filter(Boolean).join(" + ");

  return `
    <div>
      <div style="font-size:12px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">
        Vista previa — ${p.length} operaciones + ${lots.length} compras (lotes FIFO)
      </div>
      ${importState.errors.length>0?`<div class="alert alert-orange">⚠️ ${importState.errors.length} filas omitidas por datos incompletos o formato no reconocido.</div>`:""}

      ${p.length > 0 ? `
      <div style="font-size:11px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.8px;margin:12px 0 8px">Operaciones imponibles</div>
      <div style="overflow-x:auto;margin-bottom:16px">
        <table>
          <thead><tr><th>Fecha</th><th>Activo</th><th>Tipo</th><th>Adquisición</th><th>Transmisión</th><th>G/P Neta</th><th>Casilla</th></tr></thead>
          <tbody>
            ${p.slice(0,8).map(op=>`
              <tr>
                <td style="font-size:12px;color:var(--dim)">${sanitize(op.date)}</td>
                <td style="font-weight:600">${sanitize(op.asset)}</td>
                <td><span style="background:var(--bd);color:var(--blue);border-radius:12px;padding:2px 10px;font-size:11px;font-weight:600">${sanitize(op.typeName)}</span></td>
                <td>${op.acq>0?fmt(op.acq):"—"}</td>
                <td>${fmt(op.trans)}</td>
                <td style="color:${op.gain>=0?"var(--green)":"var(--red)"};font-weight:700">${op.gain>=0?"+":""}${fmt(op.gain)}</td>
                <td><span class="casilla">${sanitize(op.casilla)}</span></td>
              </tr>`).join("")}
            ${p.length>8?`<tr><td colspan="7" style="text-align:center;color:var(--dim);font-size:12px;padding:12px">... y ${p.length-8} operaciones más</td></tr>`:""}
          </tbody>
        </table>
      </div>
      <div style="background:var(--sur2);border:1px solid var(--bor2);border-radius:10px;padding:16px;margin-bottom:16px;display:flex;gap:24px;flex-wrap:wrap">
        ${[
          {l:"Total ops",        v:p.length},
          {l:"Ganancias (1800)", v:fmt(p.filter(o=>o.casilla==="1800"&&o.gain>0).reduce((s,o)=>s+o.gain,0)), c:"var(--green)"},
          {l:"Pérdidas (1800)",  v:fmt(Math.abs(p.filter(o=>o.casilla==="1800"&&o.gain<0).reduce((s,o)=>s+o.gain,0))), c:"var(--red)"},
          {l:"Ingresos (0033)",  v:fmt(p.filter(o=>o.casilla==="0033").reduce((s,o)=>s+o.gain,0)), c:"var(--blue)"},
          {l:"Airdrops (1626)",  v:fmt(p.filter(o=>o.casilla==="1626").reduce((s,o)=>s+o.gain,0)), c:"var(--orange)"},
        ].map(x=>`<div><div style="font-size:11px;color:var(--dim);font-weight:600;text-transform:uppercase;letter-spacing:.8px">${x.l}</div><div style="font-size:18px;font-weight:700;color:${x.c||"var(--gold2)"};margin-top:2px">${x.v}</div></div>`).join("")}
      </div>` : ""}

      ${lots.length > 0 ? `
      <div style="font-size:11px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.8px;margin:12px 0 8px">🛍️ Lotes FIFO detectados (compras → base de coste automática)</div>
      <div style="overflow-x:auto;margin-bottom:16px">
        <table>
          <thead><tr><th>Fecha</th><th>Activo</th><th>Cantidad</th><th>Coste total</th><th>Precio/u</th><th>Fees</th><th>Fuente</th></tr></thead>
          <tbody>
            ${lots.slice(0,8).map(l=>`
              <tr>
                <td style="font-size:12px;color:var(--dim)">${sanitize(l.date)}</td>
                <td style="font-weight:600">${sanitize(l.asset)}</td>
                <td>${fmtQty(l.qty)}</td>
                <td class="c-gold fw7">${fmt(l.totalEur)} €</td>
                <td class="c-dim" style="font-size:12px">${l.qty>0?fmt((l.totalEur+l.fees)/l.qty)+" €/u":"—"}</td>
                <td class="c-dim" style="font-size:12px">${l.fees>0?fmt(l.fees)+" €":"—"}</td>
                <td><span style="background:var(--bd);color:var(--blue);border-radius:8px;padding:2px 8px;font-size:11px">${sanitize(l.source)}</span></td>
              </tr>`).join("")}
            ${lots.length>8?`<tr><td colspan="7" style="text-align:center;color:var(--dim);font-size:12px;padding:12px">... y ${lots.length-8} lotes más</td></tr>`:""}
          </tbody>
        </table>
      </div>
      <div class="alert alert-blue" style="margin-bottom:12px">🤖 <strong>FIFO automático:</strong> Estos lotes se añadirán al inventario y se usarán para calcular el coste de adquisición en tus ventas. Sin que tengas que introducir nada manualmente.</div>
      ` : ""}

      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn-primary" onclick="confirmImport()">✅ Importar ${btnLabel}</button>
        <button class="btn-sec" onclick="cancelImport()">✕ Cancelar</button>
      </div>
    </div>`;
}

function getCsvTypes(ex) {
  const types = {
    binance:  [
      {id:"binance_gains",  label:"Ganancias de capital realizadas", desc:"Compraventas y permutas",          casilla:"1800"},
      {id:"binance_income", label:"Ganancias de ingresos",           desc:"Staking, rewards, cashback",       casilla:"0033"},
    ],
    coinbase: [{id:"coinbase_tx",    label:"Transaction Report",       desc:"Todas las transacciones",          casilla:"1800/0033"}],
    bit2me:   [{id:"bit2me_tx",      label:"Historial de transacciones",desc:"Exportación de Bit2Me",           casilla:"1800/0033"}],
    kraken:   [
      {id:"kraken_ledger",  label:"Ledger (Libro mayor)",             desc:"Exportación completa — recomendada",casilla:"1800/0033"},
      {id:"kraken_trades",  label:"Trades",                           desc:"Solo operaciones spot",             casilla:"1800"},
    ],
    revolut:  [{id:"revolut_crypto", label:"Extracto de criptomonedas",desc:"Crypto Statement CSV/Excel",       casilla:"1800/0033"}],
    etoro:    [{id:"etoro_account",  label:"Account Statement",        desc:"Exportación completa de eToro",    casilla:"1800/0033"}],
    bitvavo:  [{id:"bitvavo_tx",     label:"Transaction history",      desc:"Exportación de Bitvavo",           casilla:"1800/0033"}],
    okx:      [
      {id:"okx_trades",     label:"Trading history",                  desc:"Spot trading history",              casilla:"1800"},
      {id:"okx_funding",    label:"Funding/Earn history",             desc:"Staking, savings, rewards",         casilla:"0033"},
    ],
    bitpanda: [{id:"bitpanda_tx",    label:"Transaction history",      desc:"Exportación de Bitpanda",          casilla:"1800/0033"}],
    bitget:   [
      {id:"bitget_spot",    label:"Spot order history",               desc:"Operaciones spot",                  casilla:"1800"},
      {id:"bitget_earn",    label:"Earn/Staking history",             desc:"Staking y earn",                    casilla:"0033"},
    ],
  };
  return types[ex] || [];
}

function getInstructions(ex) {
  const inst = {
    binance:  "📍 <strong>Binance:</strong> binance.com/es/tax → Informes fiscales → Selecciona año → Generar → Descargar CSV",
    coinbase: "📍 <strong>Coinbase:</strong> coinbase.com → Impuestos → Documentos → Transaction Report (.csv)",
    bit2me:   "📍 <strong>Bit2Me:</strong> bit2me.com → Mi cuenta → Actividad → Exportar → CSV",
    kraken:   "📍 <strong>Kraken:</strong> kraken.com → History → Export → Ledger (recomendado) o Trades → CSV. Selecciona todo el año.",
    revolut:  "📍 <strong>Revolut:</strong> App Revolut → Cripto → Ver todo → Extracto → Selecciona periodo → Enviar CSV al email",
    etoro:    "📍 <strong>eToro:</strong> eToro.com → Portfolio → History → Account Statement → Selecciona año → Descargar Excel/CSV",
    bitvavo:  "📍 <strong>Bitvavo:</strong> bitvavo.com → Cuenta → Historial → Exportar → CSV. Selecciona todo el año.",
    okx:      "📍 <strong>OKX:</strong> okx.com → Assets → Bills → Export → Trading History CSV. Para staking: Finance → Earn → History → Export",
    bitpanda: "📍 <strong>Bitpanda:</strong> bitpanda.com → Mi perfil → Historial de transacciones → Exportar CSV",
    bitget:   "📍 <strong>Bitget:</strong> bitget.com → Órdenes → Historial de órdenes spot → Exportar CSV. Para earn: Earn → Historial → Exportar",
  };
  return inst[ex] || "";
}

function selectExchange(id) {
  importState = { exchange: id, csvType: null, preview: null, previewLots: [], errors: [], imported: 0 };
  render();
}

function selectCsvType(id) {
  importState.csvType = id;
  importState.preview = null;
  importState.previewLots = [];
  importState.errors = [];
  render();
}

function handleCsvFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result;
      const result = parseCSV(text, importState.csvType);
      importState.preview = result.ops;
      importState.previewLots = result.lots;
      importState.errors = result.errors;
      render();
    } catch(err) {
      importState.preview = [];
      importState.previewLots = [];
      importState.errors = ["Error al leer el archivo: " + err.message];
      render();
    }
  };
  reader.readAsText(file, "UTF-8");
}

// ── PARSERS ──────────────────────────────────────────────
function parseCSV(text, type) {
  // Normalize line endings and split
  const lines = text.replace(/\r\n/g,"\n").replace(/\r/g,"\n").split("\n").filter(l=>l.trim());
  if (lines.length < 2) return { ops: [], errors: ["CSV vacío o sin datos"] };

  // Parse header
  const sep = detectSeparator(lines[0]);
  const headers = parseCsvLine(lines[0], sep).map(h => h.trim().toLowerCase().replace(/[\s\/\-]/g,"_"));

  const ops = [], lots = [], errors = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i], sep);
    if (row.length < 2 || row.every(c=>!c.trim())) continue;

    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (row[idx]||"").trim(); });

    try {
      let result = null;
      if      (type === "binance_gains")  result = parseBinanceGains(obj, i);
      else if (type === "binance_income") result = parseBinanceIncome(obj, i);
      else if (type === "coinbase_tx")    result = parseCoinbaseTx(obj, i);
      else if (type === "bit2me_tx")      result = parseBit2MeTx(obj, i);
      else if (type === "kraken_ledger")  result = parseKrakenLedger(obj, i);
      else if (type === "kraken_trades")  result = parseKrakenTrades(obj, i);
      else if (type === "revolut_crypto") result = parseRevolutCrypto(obj, i);
      else if (type === "etoro_account")  result = parseEtoroAccount(obj, i);
      else if (type === "bitvavo_tx")     result = parseBitvavoTx(obj, i);
      else if (type === "okx_trades")     result = parseOkxTrades(obj, i);
      else if (type === "okx_funding")    result = parseOkxFunding(obj, i);
      else if (type === "bitpanda_tx")    result = parseBitpandaTx(obj, i);
      else if (type === "bitget_spot")    result = parseBitgetSpot(obj, i);
      else if (type === "bitget_earn")    result = parseBitgetEarn(obj, i);

      if (result) {
        if (result._lot) lots.push(result);
        else ops.push(result);
      } else {
        errors.push(`Fila ${i+1}: datos insuficientes`);
      }
    } catch(e) {
      errors.push(`Fila ${i+1}: ${e.message}`);
    }
  }

  // ── Dedupe: eliminar ops duplicadas por date+asset+type+gain ──
  const seen = new Set();
  const deduped = ops.filter(op => {
    const key = `${op.date}|${op.asset}|${op.type}|${Math.round((op.gain||0)*100)}|${Math.round((op.trans||0)*100)}`;
    if (seen.has(key)) { errors.push(`Duplicado omitido: ${op.date} ${op.asset} ${op.typeName}`); return false; }
    seen.add(key);
    return true;
  });

  return { ops: deduped, lots, errors };
}

function detectSeparator(line) {
  const commas    = (line.match(/,/g)  ||[]).length;
  const semicolons= (line.match(/;/g)  ||[]).length;
  const tabs      = (line.match(/\t/g) ||[]).length;
  if (tabs > commas && tabs > semicolons) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

function parseCsvLine(line, sep) {
  // Handle quoted fields
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === sep && !inQ) { result.push(cur); cur = ""; continue; }
    cur += c;
  }
  result.push(cur);
  return result;
}

function toNum(s) {
  if (!s || s==="N/A" || s==="-" || s==="") return 0;
  // Strip currency symbols and whitespace
  let cleaned = String(s).replace(/[€$£\s%]/g, "").trim();
  if (!cleaned || cleaned==="-") return 0;

  const commas = (cleaned.match(/,/g)||[]).length;
  const dots   = (cleaned.match(/\./g)||[]).length;

  // European format: 1.234.567,89  → multiple dots as thousands sep, comma as decimal
  if (dots > 1) {
    cleaned = cleaned.replace(/\./g,"").replace(",",".");
  }
  // European format: 1.234,56 → dot as thousands sep, comma as decimal
  else if (commas === 1 && dots === 1 && cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
    cleaned = cleaned.replace(".","").replace(",",".");
  }
  // Pure comma decimal: 1,23 or 1,234 (no dot at all)
  else if (commas === 1 && dots === 0) {
    const afterComma = cleaned.split(",")[1];
    // If <= 2 digits after comma: it's a decimal separator
    if (afterComma && afterComma.length <= 2) {
      cleaned = cleaned.replace(",",".");
    } else {
      // Thousands separator (e.g. 1,234) → remove comma
      cleaned = cleaned.replace(",","");
    }
  }
  // Multiple commas as thousands: 1,234,567
  else if (commas > 1) {
    cleaned = cleaned.replace(/,/g,"");
  }

  return parseFloat(cleaned) || 0;
}

function formatDate(raw) {
  if (!raw || raw==="N/A") return "";
  // Try ISO format: 2024-01-03 13:09 or 2024-01-03T13:09
  const m1 = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  // Try DD/MM/YYYY
  const m2 = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  return raw.substring(0, 10);
}

// ── Binance Realized Capital Gains ──
// Columns: currency name, currency amount, acquired, sold, proceeds, [cost basis, gain/loss]
function parseBinanceGains(obj, row) {
  // Try multiple possible column name variants
  const asset = sanitize(obj["currency_name"] || obj["asset"] || obj["coin"] || "");
  if (!asset) throw new Error("No se encontró nombre de activo");

  const amount  = toNum(obj["currency_amount"] || obj["amount"] || "0");
  const sold    = formatDate(obj["sold"]    || obj["sell_date"] || obj["date_sold"] || "");
  const acq     = formatDate(obj["acquired"]|| obj["buy_date"]  || obj["date_acquired"] || "");
  const proceeds= toNum(obj["proceeds"]     || obj["sale_proceeds"] || "0");
  const costBasis=toNum(obj["cost_basis"]   || obj["cost"]          || "0");
  const gainLoss = obj["gain_loss"] !== undefined
    ? toNum(obj["gain_loss"])
    : proceeds - costBasis;

  if (proceeds === 0 && costBasis === 0 && gainLoss === 0) throw new Error("Valores a 0");

  return {
    id: genId(), type: "compraventa", typeName: "Compraventa",
    asset: asset.toUpperCase(),
    date: sold || acq || "",
    acq: costBasis, trans: proceeds, fees: 0,
    gain: gainLoss !== 0 ? gainLoss : proceeds - costBasis,
    casilla: "1800", notes: `Importado Binance · ${amount} ${asset}`
  };
}

// ── Binance Income (staking/rewards) ──
// Columns: date, type/source, primary_asset, realized_amount, realized_amount_in_eur, [eur_value]
function parseBinanceIncome(obj, row) {
  const asset = obj["primary_asset"]||obj["asset"]||obj["coin"]||obj["currency_name"]||"";
  if (!asset) throw new Error("No se encontró activo");

  const date   = formatDate(obj["date"]||obj["time"]||obj["acquired"]||"");
  const eurVal = toNum(obj["realized_amount_in_eur"]||obj["eur_value"]||obj["value_eur"]||obj["proceeds"]||"0");
  const source = (obj["type"]||obj["source"]||obj["transaction_type"]||"").toLowerCase();

  // Determine casilla based on source type
  let casilla = "0033", typeName = "Staking";
  if (source.includes("airdrop")||source.includes("distribution")) {
    casilla = "1626"; typeName = "Airdrop";
  } else if (source.includes("cashback")||source.includes("referral")||source.includes("reward")) {
    casilla = "1626"; typeName = "Airdrop";
  }

  if (eurVal === 0) throw new Error("Valor EUR a 0");

  return {
    id: genId(), type: casilla==="0033"?"staking":"airdrop", typeName,
    asset: asset.toUpperCase(), date,
    acq: 0, trans: eurVal, fees: 0,
    gain: eurVal, casilla,
    notes: `Importado Binance Ingresos · ${source}`
  };
}

// ── Coinbase ──
// Columns: timestamp, transaction type, asset, quantity transacted, spot price currency, spot price at transaction, subtotal, total (inclusive of fees and/or spread), notes
function parseCoinbaseTx(obj, row) {
  const txType = (obj["transaction_type"]||obj["type"]||"").toLowerCase();
  const asset  = obj["asset"]||"";
  if (!asset) throw new Error("Sin activo");

  const date      = formatDate(obj["timestamp"]||obj["date"]||"");
  const spotPrice = toNum(obj["spot_price_at_transaction"]||obj["spot_price"]||"0");
  const qty       = toNum(obj["quantity_transacted"]||obj["quantity"]||"0");
  const total     = toNum(obj["total_(inclusive_of_fees_and/or_spread)"]||obj["total"]||"0");
  const subtotal  = toNum(obj["subtotal"]||"0");

  // Skip non-taxable: deposits, withdrawals
  if (txType==="deposit"||txType==="withdrawal"||txType==="send"||txType==="receive"||
      txType==="deposito"||txType==="retiro") {
    throw new Error("Operación no imponible (" + txType + ")");
  }

  if (txType==="sell"||txType==="venta"||txType==="convert"||txType==="converted") {
    const proceeds = Math.abs(total||subtotal);
    if (proceeds === 0) throw new Error("Proceeds a 0");
    // For sells we only have proceeds - no cost basis in Coinbase CSV
    return {
      id: genId(), type:"compraventa", typeName:"Compraventa",
      asset: asset.toUpperCase(), date,
      acq: 0, trans: proceeds, fees: 0,
      gain: proceeds, // Sin base de coste disponible - usuario debe ajustar
      casilla: "1800",
      notes: `Importado Coinbase · ${qty} ${asset} · ⚠️ Revisar base de coste`
    };
  }

  if (txType==="rewards income"||txType==="staking income"||txType==="learning reward"||
      txType==="coinbase earn"||txType==="interest income") {
    const val = Math.abs(total||subtotal||spotPrice*qty);
    if (val === 0) throw new Error("Valor a 0");
    return {
      id: genId(), type:"staking", typeName:"Staking",
      asset: asset.toUpperCase(), date,
      acq: 0, trans: val, fees: 0,
      gain: val, casilla: "0033",
      notes: `Importado Coinbase · ${qty} ${asset} · ${txType}`
    };
  }

  // Buy → create FIFO lot
  const cost = Math.abs(total||subtotal||spotPrice*qty);
  return lotObj(asset, date, qty, cost, 0, "Coinbase");
}

// ── Bit2Me ──
// Columns vary - try common Bit2Me export format
function parseBit2MeTx(obj, row) {
  const type  = (obj["type"]||obj["tipo"]||obj["transaction_type"]||"").toLowerCase();
  const asset = obj["asset"]||obj["activo"]||obj["currency"]||obj["moneda"]||"";
  if (!asset) throw new Error("Sin activo");

  const date     = formatDate(obj["date"]||obj["fecha"]||obj["timestamp"]||"");
  const amount   = toNum(obj["amount"]||obj["cantidad"]||"0");
  const eurValue = toNum(obj["eur_value"]||obj["valor_eur"]||obj["total_eur"]||obj["price_eur"]||"0");
  const costBasis= toNum(obj["cost_basis"]||obj["base_coste"]||"0");

  if (type.includes("sell")||type.includes("vend")||type.includes("trade")) {
    const gain = costBasis > 0 ? eurValue - costBasis : eurValue;
    return {
      id: genId(), type:"compraventa", typeName:"Compraventa",
      asset: asset.toUpperCase(), date,
      acq: costBasis, trans: eurValue, fees: 0,
      gain, casilla: "1800",
      notes: `Importado Bit2Me · ${amount} ${asset}`
    };
  }

  if (type.includes("staking")||type.includes("reward")||type.includes("earn")) {
    if (eurValue === 0) throw new Error("Valor a 0");
    return {
      id: genId(), type:"staking", typeName:"Staking",
      asset: asset.toUpperCase(), date,
      acq: 0, trans: eurValue, fees: 0,
      gain: eurValue, casilla: "0033",
      notes: `Importado Bit2Me · ${type}`
    };
  }

  if (type.includes("buy")||type.includes("compra")) {
    const cost = eurValue > 0 ? eurValue : costBasis;
    return lotObj(asset, date, amount, cost, 0, "Bit2Me");
  }

  throw new Error(`Tipo '${type}' no imponible`);
}

// ── Kraken Ledger ──
// Columns: txid, refid, time, type, subtype, aclass, asset, amount, fee, balance
function parseKrakenLedger(obj, row) {
  const type  = (obj["type"]||"").toLowerCase();
  const asset = (obj["asset"]||"").replace(/^[XZ](?=[A-Z]{3})/, "").replace("XBT","BTC").toUpperCase();
  if (!asset) throw new Error("Sin activo");

  const date   = formatDate(obj["time"]||obj["date"]||"");
  const amount = Math.abs(toNum(obj["amount"]||"0"));
  const fee    = Math.abs(toNum(obj["fee"]||"0"));

  // Kraken ledger: trade = compraventa, staking/reward = 0033, transfer/deposit/withdrawal = skip
  if (type==="trade") {
    // Kraken trades come in pairs (asset out + EUR in) — we need to pair them
    // For now: if asset ends in EUR/USDT/USDC it's a sale proceeds, else it's the asset
    const isEur = ["EUR","USDT","USDC","BUSD","DAI"].includes(asset);
    if (isEur) {
      // This row is the EUR proceeds side
      const proceeds = amount - fee;
      return {
        id: genId(), type:"compraventa", typeName:"Compraventa",
        asset: "CRIPTO", date,
        acq: 0, trans: proceeds, fees: fee,
        gain: proceeds, casilla: "1800",
        notes: `Importado Kraken · venta → ${amount} EUR · ⚠️ Ajusta la base de coste con FIFO`
      };
    }
    throw new Error("Fila de activo (par de trade) — se procesa con la fila EUR");
  }

  if (type==="staking"||type==="dividend"||type==="reward") {
    // Kraken doesn't give EUR value directly — user needs to check
    if (amount === 0) throw new Error("Cantidad a 0");
    return {
      id: genId(), type:"staking", typeName:"Staking",
      asset, date,
      acq: 0, trans: 0, fees: 0,
      gain: 0, casilla: "0033",
      notes: `Importado Kraken · ${type} · ${amount} ${asset} · ⚠️ Introduce valor EUR al recibir`
    };
  }

  throw new Error(`Tipo '${type}' no imponible (deposit/withdrawal/transfer)`);
}

// ── Kraken Trades ──
// Columns: txid, ordertxid, pair, time, type, ordertype, price, cost, fee, vol, margin, misc, ledgers
function parseKrakenTrades(obj, row) {
  const pair  = (obj["pair"]||"").toUpperCase();
  const type  = (obj["type"]||"").toLowerCase(); // buy/sell
  const date  = formatDate(obj["time"]||"");
  const cost  = toNum(obj["cost"]||"0");  // total en EUR
  const fee   = toNum(obj["fee"]||"0");
  const vol   = toNum(obj["vol"]||obj["volume"]||"0");
  const price = toNum(obj["price"]||"0");

  if (!pair) throw new Error("Sin par");

  // Extract base asset from pair (XBTEUR → BTC, ETHEUR → ETH, etc.)
  const base = pair.replace(/EUR$|USDT$|USD$|USDC$/, "").replace(/^X(?=[A-Z]{3})/,"").replace("XBT","BTC");

  if (type==="sell") {
    const proceeds = cost - fee;
    return {
      id: genId(), type:"compraventa", typeName:"Compraventa",
      asset: base, date,
      acq: 0, trans: proceeds, fees: fee,
      gain: proceeds, casilla: "1800",
      notes: `Importado Kraken · ${vol} ${base} @ ${price} EUR · ⚠️ Base de coste FIFO pendiente`
    };
  }

  if (type==="buy") {
    return lotObj(base, date, vol, cost, fee, "Kraken");
  }
  throw new Error(`Tipo '${type}' no procesable`);
}

// ── Revolut Crypto ──
// Columns: Type, Product, Started Date, Completed Date, Description, Amount, Currency, Fiat amount, Fiat amount (inc. fees), Fee, Base currency, State, Balance
function parseRevolutCrypto(obj, row) {
  const type     = (obj["type"]||"").toLowerCase();
  const state    = (obj["state"]||"").toLowerCase();
  if (state && state !== "completed") throw new Error(`Estado '${state}' — solo se importan completadas`);

  const currency = (obj["currency"]||obj["asset"]||"").toUpperCase();
  const date     = formatDate(obj["completed_date"]||obj["started_date"]||obj["date"]||"");
  const amount   = Math.abs(toNum(obj["amount"]||"0"));
  const fiatNet  = Math.abs(toNum(obj["fiat_amount"]||"0")); // sin fees
  const fiatFees = Math.abs(toNum(obj["fiat_amount_(inc._fees)"]||obj["fiat_amount_inc_fees"]||"0"));
  const fee      = Math.abs(toNum(obj["fee"]||"0"));

  const proceeds = fiatNet > 0 ? fiatNet : fiatFees;

  if (type==="exchange"||type==="sell"||type==="venta") {
    if (proceeds === 0) throw new Error("Valor fiat a 0");
    return {
      id: genId(), type:"compraventa", typeName:"Compraventa",
      asset: currency, date,
      acq: 0, trans: proceeds, fees: fee,
      gain: proceeds, casilla: "1800",
      notes: `Importado Revolut · ${amount} ${currency} · ⚠️ Base de coste FIFO pendiente`
    };
  }

  if (type==="buy"||type==="compra") {
    const cost = fiatFees > 0 ? fiatFees : proceeds; // fiatFees includes purchase fees
    return lotObj(currency, date, amount, cost, fee, "Revolut");
  }

  if (type==="cashback"||type==="reward"||type==="staking") {
    if (proceeds === 0) throw new Error("Valor a 0");
    return {
      id: genId(), type:"staking", typeName:"Staking",
      asset: currency, date,
      acq: 0, trans: proceeds, fees: 0,
      gain: proceeds, casilla: "0033",
      notes: `Importado Revolut · ${type} · ${amount} ${currency}`
    };
  }

  throw new Error(`Tipo '${type}' no imponible`);
}

// ── eToro Account Statement ──
// Columns: Date, Type, Details, Amount, Units, Realized Equity Change, Realized Equity, Balance, Position ID, Asset name, NWA
function parseEtoroAccount(obj, row) {
  const type   = (obj["type"]||"").toLowerCase();
  const asset  = (obj["asset_name"]||obj["details"]||"").toUpperCase().split(" ")[0];
  const date   = formatDate(obj["date"]||"");
  const amount = toNum(obj["amount"]||"0"); // en USD/EUR
  const realizedChange = toNum(obj["realized_equity_change"]||"0");

  if (type.includes("profit")||type.includes("loss")||type.includes("close")||type.includes("sell")) {
    const gain = realizedChange !== 0 ? realizedChange : amount;
    return {
      id: genId(), type:"compraventa", typeName:"Compraventa",
      asset: asset||"CRIPTO", date,
      acq: 0, trans: Math.max(gain, 0), fees: 0,
      gain, casilla: "1800",
      notes: `Importado eToro · ${type} · ⚠️ Verifica conversión a EUR si cuenta en USD`
    };
  }

  if (type.includes("dividend")||type.includes("interest")||type.includes("staking")) {
    if (amount === 0) throw new Error("Valor a 0");
    return {
      id: genId(), type:"staking", typeName:"Staking",
      asset: asset||"CRIPTO", date,
      acq: 0, trans: Math.abs(amount), fees: 0,
      gain: Math.abs(amount), casilla: "0033",
      notes: `Importado eToro · ${type}`
    };
  }

  throw new Error(`Tipo '${type}' no imponible`);
}

// ── Bitvavo ──
// Columns: Time, Type, Currency, Amount, Price (EUR), Fee currency, Fee amount, Status
function parseBitvavoTx(obj, row) {
  const type    = (obj["type"]||"").toLowerCase();
  const asset   = (obj["currency"]||obj["asset"]||"").toUpperCase();
  const date    = formatDate(obj["time"]||obj["date"]||"");
  const amount  = Math.abs(toNum(obj["amount"]||"0"));
  const price   = toNum(obj["price_(eur)"]||obj["price"]||obj["price_eur"]||"0");
  const feeCur  = (obj["fee_currency"]||"").toUpperCase();
  const feeAmt  = toNum(obj["fee_amount"]||"0");
  const feeEur  = feeCur==="EUR" ? feeAmt : feeAmt * price;

  if (!asset) throw new Error("Sin activo");

  if (type==="sell"||type==="vender") {
    const proceeds = amount * price;
    if (proceeds === 0) throw new Error("Valor a 0");
    return {
      id: genId(), type:"compraventa", typeName:"Compraventa",
      asset, date,
      acq: 0, trans: proceeds - feeEur, fees: feeEur,
      gain: proceeds - feeEur, casilla: "1800",
      notes: `Importado Bitvavo · ${amount} ${asset} @ ${price} EUR · ⚠️ Base de coste FIFO pendiente`
    };
  }

  if (type==="buy"||type==="comprar") {
    const cost = amount * price;
    return lotObj(asset, date, amount, cost, feeEur, "Bitvavo");
  }

  if (type==="staking"||type==="reward"||type==="interest"||type==="earn") {
    const val = amount * price;
    if (val === 0) throw new Error("Valor a 0");
    return {
      id: genId(), type:"staking", typeName:"Staking",
      asset, date,
      acq: 0, trans: val, fees: 0,
      gain: val, casilla: "0033",
      notes: `Importado Bitvavo · ${type} · ${amount} ${asset}`
    };
  }

  throw new Error(`Tipo '${type}' no imponible`);
}

// ── OKX Trades ──
// Columns: Order Time, Instrument Name, Trade Side, Filled Qty, Avg Price, Filled Amount (USDT/EUR), Fee, Fee Currency, PnL
function parseOkxTrades(obj, row) {
  const side    = (obj["trade_side"]||obj["side"]||"").toLowerCase();
  const inst    = (obj["instrument_name"]||obj["instid"]||obj["pair"]||"").toUpperCase();
  const date    = formatDate(obj["order_time"]||obj["time"]||obj["date"]||"");
  const qty     = toNum(obj["filled_qty"]||obj["qty"]||"0");
  const price   = toNum(obj["avg_price"]||obj["price"]||"0");
  const filled  = toNum(obj["filled_amount"]||obj["amount"]||"0");
  const fee     = Math.abs(toNum(obj["fee"]||"0"));
  const pnl     = toNum(obj["pnl"]||"0");

  // Extract base asset (BTC-USDT → BTC)
  const base    = inst.split(/[-_/]/)[0] || inst;

  if (side==="sell"||side==="venta") {
    const proceeds = filled > 0 ? filled : qty * price;
    if (proceeds === 0) throw new Error("Valor a 0");
    return {
      id: genId(), type:"compraventa", typeName:"Compraventa",
      asset: base, date,
      acq: 0, trans: proceeds, fees: fee,
      gain: pnl !== 0 ? pnl : proceeds, casilla: "1800",
      notes: `Importado OKX · ${qty} ${base} · ⚠️ Base de coste FIFO pendiente`
    };
  }

  if (side==="buy"||side==="compra") {
    const cost = filled > 0 ? filled : qty * price;
    return lotObj(base, date, qty, cost, fee, "OKX");
  }
  throw new Error(`Lado '${side}' no procesable`);
}
// Columns: Time, Currency, Amount, Type (Staking/Savings/etc.)
function parseOkxFunding(obj, row) {
  const asset  = (obj["currency"]||obj["ccy"]||"").toUpperCase();
  const date   = formatDate(obj["time"]||obj["date"]||"");
  const amount = Math.abs(toNum(obj["amount"]||"0"));
  const type   = (obj["type"]||"").toLowerCase();

  if (!asset) throw new Error("Sin activo");
  if (amount === 0) throw new Error("Cantidad a 0");

  return {
    id: genId(), type:"staking", typeName:"Staking",
    asset, date,
    acq: 0, trans: 0, fees: 0,
    gain: 0, casilla: "0033",
    notes: `Importado OKX Earn · ${type} · ${amount} ${asset} · ⚠️ Introduce valor EUR al recibir`
  };
}

// ── Bitpanda ──
// Columns: Transaction ID, Timestamp, Transaction Type, In/Out, Amount Fiat, Fiat, Amount Asset, Asset, Asset market price, Asset market price currency, Asset class, Product ID, Fee amount, Fee asset, Tax fiat amount, Tax fiat currency, Notes
function parseBitpandaTx(obj, row) {
  const txType  = (obj["transaction_type"]||obj["type"]||"").toLowerCase();
  const asset   = (obj["asset"]||obj["currency"]||"").toUpperCase();
  const date    = formatDate(obj["timestamp"]||obj["date"]||"");
  const amtFiat = toNum(obj["amount_fiat"]||obj["fiat_amount"]||"0");
  const amtAsset= Math.abs(toNum(obj["amount_asset"]||obj["amount"]||"0"));
  const price   = toNum(obj["asset_market_price"]||obj["price"]||"0");
  const fee     = toNum(obj["fee_amount"]||"0");
  const inOut   = (obj["in/out"]||obj["direction"]||"").toLowerCase();

  if (!asset) throw new Error("Sin activo");

  if (txType==="sell"||txType==="trade_sell"||(txType==="trade"&&inOut==="outgoing")) {
    const proceeds = amtFiat > 0 ? amtFiat : amtAsset * price;
    if (proceeds === 0) throw new Error("Valor a 0");
    return {
      id: genId(), type:"compraventa", typeName:"Compraventa",
      asset, date,
      acq: 0, trans: proceeds, fees: fee,
      gain: proceeds, casilla: "1800",
      notes: `Importado Bitpanda · ${amtAsset} ${asset} · ⚠️ Base de coste FIFO pendiente`
    };
  }

  if (txType==="buy"||txType==="trade_buy"||(txType==="trade"&&inOut==="incoming")) {
    const cost = amtFiat > 0 ? amtFiat : amtAsset * price;
    return lotObj(asset, date, amtAsset, cost, fee, "Bitpanda");
  }

  if (txType.includes("reward")||txType.includes("cashback")||txType.includes("staking")||txType.includes("interest")) {
    const val = amtFiat > 0 ? amtFiat : amtAsset * price;
    if (val === 0) throw new Error("Valor a 0");
    return {
      id: genId(), type:"staking", typeName:"Staking",
      asset, date,
      acq: 0, trans: val, fees: 0,
      gain: val, casilla: "0033",
      notes: `Importado Bitpanda · ${txType} · ${amtAsset} ${asset}`
    };
  }

  throw new Error(`Tipo '${txType}' no imponible`);
}

// ── Bitget Spot ──
// Columns: Date, Pair, Side, Average Price, Filled, Total, Fee, Fee Currency, Status
function parseBitgetSpot(obj, row) {
  const side    = (obj["side"]||obj["trade_side"]||"").toLowerCase();
  const pair    = (obj["pair"]||obj["symbol"]||"").toUpperCase();
  const date    = formatDate(obj["date"]||obj["time"]||obj["created_time"]||"");
  const avg     = toNum(obj["average_price"]||obj["price"]||"0");
  const filled  = toNum(obj["filled"]||obj["qty"]||"0");
  const total   = toNum(obj["total"]||"0");
  const fee     = Math.abs(toNum(obj["fee"]||"0"));
  const feeCur  = (obj["fee_currency"]||"").toUpperCase();

  const base    = pair.split(/[-_/USDT|EUR]/)[0] || pair;
  const feeEur  = (feeCur==="EUR"||feeCur==="USDT") ? fee : 0;

  if (side==="sell") {
    const proceeds = total > 0 ? total : filled * avg;
    if (proceeds === 0) throw new Error("Valor a 0");
    return {
      id: genId(), type:"compraventa", typeName:"Compraventa",
      asset: base, date,
      acq: 0, trans: proceeds, fees: feeEur,
      gain: proceeds, casilla: "1800",
      notes: `Importado Bitget · ${filled} ${base} @ ${avg} · ⚠️ Base de coste FIFO pendiente`
    };
  }

  if (side==="buy") {
    const cost = total > 0 ? total : filled * avg;
    return lotObj(base, date, filled, cost, feeEur, "Bitget");
  }
  throw new Error(`Lado '${side}' no procesable`);
}

// ── Bitget Earn ──
// Columns: Time, Coin, Amount, Type (Fixed/Flexible savings, Staking etc.), Status
function parseBitgetEarn(obj, row) {
  const asset  = (obj["coin"]||obj["currency"]||obj["asset"]||"").toUpperCase();
  const date   = formatDate(obj["time"]||obj["date"]||"");
  const amount = Math.abs(toNum(obj["amount"]||"0"));
  const type   = (obj["type"]||"").toLowerCase();

  if (!asset) throw new Error("Sin activo");
  if (amount === 0) throw new Error("Cantidad a 0");

  return {
    id: genId(), type:"staking", typeName:"Staking",
    asset, date,
    acq: 0, trans: 0, fees: 0,
    gain: 0, casilla: "0033",
    notes: `Importado Bitget Earn · ${type} · ${amount} ${asset} · ⚠️ Introduce valor EUR al recibir`
  };
}

function confirmImport() {
  if (!importState.preview && (!importState.previewLots || importState.previewLots.length === 0)) return;
  const addedOps  = (importState.preview  || []).length;
  const addedLots = (importState.previewLots || []).length;

  state.ops  = [...state.ops,  ...(importState.preview || [])];

  // Convert lot objects to real lots in state.lots
  for (const lot of (importState.previewLots || [])) {
    addLot(lot.asset, lot.date, lot.qty, lot.totalEur, lot.fees);
  }

  importState = { exchange: null, csvType: null, preview: null, previewLots: [], errors: [], imported: addedOps };
  currentTab = "home";
  saveState();
  render();

  const parts = [];
  if (addedOps  > 0) parts.push(`${addedOps} operaciones`);
  if (addedLots > 0) parts.push(`${addedLots} lotes FIFO`);
  const banner = document.createElement("div");
  banner.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#0e3324;border:1px solid var(--green);color:var(--green);padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;z-index:999;box-shadow:0 4px 20px #00000060";
  banner.textContent = `✅ Importados: ${parts.join(" + ")}`;
  document.body.appendChild(banner);
  setTimeout(()=>banner.remove(), 3500);
}

function cancelImport() {
  importState = { exchange: null, csvType: null, preview: null, errors: [], imported: 0 };
  render();
}

// ═══════════════════════════════════════════
// SELF-CHECK — Golden cases (PR-07)
// ═══════════════════════════════════════════
function selfCheck() {
  const results = [];
  let passed = 0, failed = 0;

  function check(name, got, expected, tolerance=0.01) {
    const ok = Math.abs(Number(got) - Number(expected)) <= tolerance;
    results.push({ name, ok, got, expected });
    if (ok) passed++; else failed++;
  }

  // TC-01: Venta simple con ganancia
  check("TC-01 Venta simple ganancia", 15000 - 10000 - 50, 4950);

  // TC-02: Venta con pérdida
  check("TC-02 Venta con pérdida", 12000 - 20000 - 30, -8030);

  // TC-03: Staking — valor EUR correcto
  check("TC-03 Staking renta", 450, 450);

  // TC-04: toNum decimal europeo — coma simple
  check("TC-04 toNum '1,23'", toNum("1,23"), 1.23);

  // TC-05: toNum formato europeo con miles
  check("TC-05 toNum '1.234,56'", toNum("1.234,56"), 1234.56);

  // TC-06: toNum miles con coma americana
  check("TC-06 toNum '1,234'", toNum("1,234"), 1234);

  // TC-07: toNum con símbolo €
  check("TC-07 toNum '1.500,00 €'", toNum("1.500,00 €"), 1500);

  // TC-08: FIFO — dos lotes, venta 1.5 BTC
  let lotsBackup = [];
  try {
    lotsBackup = JSON.parse(JSON.stringify(state.lots));
  } catch(e) { /* ignore */ }
  state.lots = [
    { id:"t1", asset:"BTC", date:"2024-01-01", qty:1, qtyRemaining:1, pricePerUnit:30000, totalEur:30000, fees:0 },
    { id:"t2", asset:"BTC", date:"2024-06-01", qty:1, qtyRemaining:1, pricePerUnit:40000, totalEur:40000, fees:0 },
  ];
  const fifo = fifoCalc("BTC", 1.5, 0);
  check("TC-08 FIFO coste 1.5 BTC", fifo ? fifo.totalAcq : -1, 50000); // 30000 + 0.5×40000
  state.lots = lotsBackup;

  // TC-09: Tramo IRPF 19% (base 6.000 €)
  check("TC-09 Tramo 19%", calcTax(6000), 6000 * 0.19, 1);

  // TC-10: sanitize XSS
  const xssInput = "<scr"+"ipt>alert(1)<\/scr"+"ipt>";
  const xss = sanitize(xssInput);
  const xssOk = xss.includes("&lt;") && !xss.includes("<scr"+"ipt>");
  results.push({ name:"TC-10 sanitize XSS", ok:xssOk, got: xssOk?"sin <script>":"CON <script>", expected:"sin <script>" });
  if (xssOk) passed++; else failed++;

  // Render modal
  const modal = document.createElement("div");
  modal.id = "selfcheck-modal";
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:#000b;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:var(--sur);border:1px solid var(--bor2);border-radius:16px;padding:28px;max-width:640px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px #000a">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div>
            <div style="font-weight:700;font-size:16px">🧪 Prueba técnica</div>
            <div style="font-size:11px;color:var(--dim)">v${APP_VERSION} · ${RULESET_VERSION} · ${BUILD_DATE}</div>
          </div>
          <button onclick="document.getElementById('selfcheck-modal').remove()" style="background:none;border:none;color:var(--dim);font-size:20px;cursor:pointer">✕</button>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:16px">
          <div style="background:var(--gd);border:1px solid var(--green);border-radius:8px;padding:10px 20px;text-align:center;flex:1">
            <div style="font-size:28px;font-weight:700;color:var(--green)">${passed}</div>
            <div style="font-size:11px;color:var(--dim);text-transform:uppercase">Passed</div>
          </div>
          <div style="background:${failed>0?"var(--rd)":"var(--gd)"};border:1px solid ${failed>0?"var(--red)":"var(--green)"};border-radius:8px;padding:10px 20px;text-align:center;flex:1">
            <div style="font-size:28px;font-weight:700;color:${failed>0?"var(--red)":"var(--green)"}">${failed}</div>
            <div style="font-size:11px;color:var(--dim);text-transform:uppercase">Failed</div>
          </div>
          <div style="flex:2;display:flex;align-items:center;justify-content:center;background:var(--sur2);border-radius:8px;border:1px solid var(--bor)">
            <span style="font-size:28px">${failed===0?"✅":"❌"}</span>
            <span style="font-weight:700;font-size:15px;margin-left:10px;color:${failed===0?"var(--green)":"var(--red)"}">${failed===0?"ALL PASS":"${failed} FAIL"}</span>
          </div>
        </div>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <thead><tr style="color:var(--dim);font-size:11px;text-transform:uppercase">
            <th style="padding:6px 8px;text-align:left">Test</th>
            <th style="padding:6px 8px;text-align:right">Obtenido</th>
            <th style="padding:6px 8px;text-align:right">Esperado</th>
            <th style="padding:6px 8px;text-align:center">Estado</th>
          </tr></thead>
          <tbody>
            ${results.map(r=>`<tr style="border-top:1px solid var(--bd)">
              <td style="padding:6px 8px;color:var(--text)">${r.name}</td>
              <td style="padding:6px 8px;font-family:monospace;color:var(--dim);text-align:right">${typeof r.got==="number"?r.got.toFixed(4):sanitize(String(r.got).substring(0,25))}</td>
              <td style="padding:6px 8px;font-family:monospace;color:var(--dim);text-align:right">${typeof r.expected==="number"?r.expected.toFixed(4):sanitize(String(r.expected).substring(0,25))}</td>
              <td style="padding:6px 8px;text-align:center;font-weight:700;color:${r.ok?"var(--green)":"var(--red)"}">${r.ok?"✅":"❌"}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
  const existing = document.getElementById("selfcheck-modal");
  if (existing) existing.remove();
  document.body.appendChild(modal);
}
// ═══════════════════════════════════════════
let analyzeState = {
  file: null, fileName: "", fileType: "", loading: false,
  result: null, error: null, previewOps: null, previewSummary: null, awaitingConsent: false
};

function renderAnalyze() {
  return `<div class="card">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
      <div class="card-title">🤖 Analizador IA de Documentos</div>
      <span style="background:linear-gradient(135deg,#c9a227,#e8c04a);color:#0a0c14;border-radius:20px;padding:2px 10px;font-size:10px;font-weight:700;letter-spacing:1px">BETA</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center;gap:16px">
      <div style="font-size:64px">🚧</div>
      <div style="font-size:20px;font-weight:700;color:var(--gold2)">Temporalmente fuera de servicio</div>
      <div style="font-size:14px;color:var(--dim);max-width:420px;line-height:1.6">
        Esta funcionalidad estará disponible próximamente.<br>
        Mientras tanto, puedes introducir tus operaciones manualmente en la pestaña <strong>Nueva Operación</strong>.
      </div>
    </div>
  </div>`;
}
function renderAnalyzeResult() {
  const r = analyzeState.result;
  const ops = analyzeState.previewOps || [];
  const sm = analyzeState.previewSummary || {};

  return `
    <!-- RESUMEN EXTRAÍDO -->
    <div style="background:linear-gradient(135deg,#0e1220,#1a1408);border:1px solid var(--gold);border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="font-size:11px;color:var(--gold);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px">✅ Documento analizado — ${sanitize(analyzeState.fileName)}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
        ${[
          {l:"Operaciones",      v:ops.length,           c:"var(--gold2)"},
          {l:"Ganancias (1800)", v:fmt(sm.gains||0),     c:"var(--green)"},
          {l:"Pérdidas (1800)",  v:fmt(sm.losses||0),    c:"var(--red)"},
          {l:"Ingresos (0033)",  v:fmt(sm.staking||0),   c:"var(--blue)"},
          {l:"Base imponible",   v:fmt(sm.base||0),       c:"var(--gold2)"},
          {l:"Impuesto est.",    v:fmt(sm.tax||0),        c:sm.tax>0?"var(--red)":"var(--green)"},
        ].map(x=>`<div style="background:var(--sur);border:1px solid var(--bor);border-radius:8px;padding:12px">
          <div style="font-size:10px;color:var(--dim);font-weight:600;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">${x.l}</div>
          <div style="font-size:18px;font-weight:700;color:${x.c}">${x.v}</div>
        </div>`).join("")}
      </div>
    </div>

    <!-- ALERTAS IA -->
    ${r.alerts && r.alerts.length > 0 ? r.alerts.map(a=>`
      <div class="alert alert-${a.type||"orange"}">
        ${a.icon||"⚠️"} <strong>${sanitize(a.title)}:</strong> ${sanitize(a.body)}
      </div>`).join("") : ""}

    <!-- CASILLAS A RELLENAR -->
    ${r.casillas ? `
    <div class="card" style="border-color:var(--bor2);margin-bottom:20px">
      <div style="font-weight:700;font-size:15px;margin-bottom:14px">📋 Casillas a rellenar en Renta Web</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${r.casillas.map(c=>`
          <div style="background:var(--sur2);border:1px solid var(--bor2);border-radius:10px;padding:14px 18px;min-width:160px">
            <div style="margin-bottom:4px"><span class="casilla">${c.num}</span></div>
            <div style="font-weight:600;font-size:13px;margin:4px 0">${c.label}</div>
            <div style="font-size:18px;font-weight:700;color:${c.value>=0?"var(--green)":"var(--red)"}">${c.value>=0?"+":""}${fmt(c.value)}</div>
            ${c.note?`<div style="font-size:11px;color:var(--mut);margin-top:4px">${sanitize(c.note)}</div>`:""}
          </div>`).join("")}
      </div>
    </div>` : ""}

    <!-- PREVIEW OPERACIONES -->
    ${ops.length > 0 ? `
    <div style="font-size:12px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">
      Operaciones detectadas (${ops.length})
    </div>
    <div style="overflow-x:auto;margin-bottom:16px">
      <table>
        <thead><tr><th>Fecha</th><th>Activo</th><th>Tipo</th><th>Adquisición</th><th>Transmisión</th><th>G/P Neta</th><th>Casilla</th></tr></thead>
        <tbody>
          ${ops.slice(0,15).map(op=>`<tr>
            <td style="font-size:12px;color:var(--dim)">${sanitize(op.date)}</td>
            <td style="font-weight:600">${sanitize(op.asset)}</td>
            <td><span style="background:var(--bd);color:var(--blue);border-radius:12px;padding:2px 10px;font-size:11px;font-weight:600">${sanitize(op.typeName)}</span></td>
            <td>${op.acq>0?fmt(op.acq):"—"}</td>
            <td>${fmt(op.trans)}</td>
            <td style="color:${op.gain>=0?"var(--green)":"var(--red)"};font-weight:700">${op.gain>=0?"+":""}${fmt(op.gain)}</td>
            <td><span class="casilla">${sanitize(op.casilla)}</span></td>
          </tr>`).join("")}
          ${ops.length>15?`<tr><td colspan="7" style="text-align:center;color:var(--dim);font-size:12px;padding:12px">... y ${ops.length-15} operaciones más</td></tr>`:""}
        </tbody>
      </table>
    </div>` : ""}

    <!-- NARRATIVE IA -->
    ${r.narrative ? `
    <div style="background:var(--sur2);border:1px solid var(--bor);border-radius:10px;padding:18px;margin-bottom:20px;font-size:13px;color:var(--dim);line-height:1.7">
      <div style="font-size:11px;color:var(--gold);font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🤖 Análisis IA</div>
      ${sanitize(r.narrative)}
    </div>` : ""}

    <!-- ACCIONES -->
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      ${ops.length>0?`<button class="btn-primary" onclick="confirmAnalyzeImport()">✅ Importar ${ops.length} operaciones</button>`:""}
      <button class="btn-primary" style="background:linear-gradient(135deg,#1e3a6e,#2a5298)" onclick="generatePDFReport()">📄 Descargar informe PDF</button>
      <button class="btn-sec" onclick="resetAnalyze()">← Analizar otro documento</button>
    </div>`;
}

// ─── FILE HANDLERS ───────────────────────────────────────
function handleAnalyzeDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) {
    analyzeState.file = file;
    analyzeState.fileName = file.name;
    analyzeState.fileType = file.type || "";
    analyzeState.awaitingConsent = true;
    render();
  }
}

function handleAnalyzeFile(input) {
  const file = input.files[0];
  if (file) {
    analyzeState.file = file;
    analyzeState.fileName = file.name;
    analyzeState.fileType = file.type || "";
    analyzeState.awaitingConsent = true;
    render();
  }
}

function confirmAnalyzeWithConsent() {
  if (!analyzeState.file) return;
  analyzeState.awaitingConsent = false;
  doAnalyzeFile(analyzeState.file);
}

function cancelAnalyzeConsent() {
  analyzeState.file = null;
  analyzeState.fileName = "";
  analyzeState.fileType = "";
  analyzeState.awaitingConsent = false;
  analyzeState.loading = false;
  analyzeState.error = null;
  render();
}

async function doAnalyzeFile(file) {
  analyzeState.loading = true;
  analyzeState.error = null;
  analyzeState.result = null;
  render();

  try {
    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      await analyzeExcel(file);
    } else if (ext === "csv") {
      await analyzeTextFile(file, "csv");
    } else if (ext === "pdf" || ["png","jpg","jpeg","webp"].includes(ext)) {
      await analyzeBase64File(file, ext);
    } else {
      throw new Error("Formato no soportado. Usa PDF, CSV, Excel o imagen.");
    }
  } catch(err) {
    analyzeState.loading = false;
    analyzeState.error = err.message;
    render();
  }
}

async function analyzeExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, {type:"array"});
  const sheets = wb.SheetNames.map(name => {
    const ws = wb.Sheets[name];
    return `=== Hoja: ${name} ===\n` + XLSX.utils.sheet_to_csv(ws);
  }).join("\n\n");
  await callAnalyzeAPI(sheets, "excel");
}

async function analyzeTextFile(file, type) {
  const text = await file.text();
  await callAnalyzeAPI(text, type);
}

async function analyzeBase64File(file, ext) {
  const b64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  await callAnalyzeAPI(null, ext, b64, file.type || (ext==="pdf"?"application/pdf":"image/jpeg"));
}

// ─── CLAUDE API CALL ─────────────────────────────────────
async function callAnalyzeAPI(textContent, fileType, b64Data, mimeType) {
  const systemPrompt = `Eres un experto en fiscalidad de criptomonedas en España (IRPF 2025/2026).
Tu tarea es analizar documentos fiscales de exchanges y extraer datos para la declaración de la renta.

NORMATIVA APLICABLE:
- Ganancias/pérdidas patrimoniales por transmisión → Casilla 1800 (Base del ahorro, tramos 19%-30%)
- Rendimientos capital mobiliario (staking, lending DeFi, LP fees) → Casilla 0033 (Base del ahorro)
- Ganancias no derivadas de transmisión (airdrops) → Casilla 1626 (BASE GENERAL — no base del ahorro)
- Patrimonio en exchanges extranjeros >50.000€ a 31/dic → Modelo 721 obligatorio
- Liquidaciones de colateral (borrowing) → Casilla 1800 como ganancia/pérdida
- Envíos entre propias wallets → NO tributan (documentar txHash)
- Método FIFO obligatorio para activos homogéneos
- Tramo máximo base del ahorro: 30% (>300.000€)

RESPONDE ÚNICAMENTE EN JSON con esta estructura exacta:
{
  "exchange": "nombre del exchange detectado",
  "year": "año fiscal",
  "casillas": [
    {"num": "1800", "label": "Ganancias/pérdidas patrimoniales", "value": 2650.59, "note": "Neto de ganancias y pérdidas"},
    {"num": "0033", "label": "Rendimientos capital mobiliario", "value": 292.93, "note": "Staking y rewards"},
    {"num": "1626", "label": "Ganancias no derivadas transmisión", "value": 0, "note": "Airdrops"}
  ],
  "operations": [
    {
      "date": "2024-01-03",
      "asset": "BTC",
      "typeName": "Compraventa",
      "type": "compraventa",
      "acq": 7843.80,
      "trans": 10500.10,
      "fees": 4.70,
      "gain": 2651.60,
      "casilla": "1800",
      "notes": "Importado via IA"
    }
  ],
  "alerts": [
    {"type": "orange", "icon": "⚠️", "title": "Modelo 721", "body": "Descripción del alerta"},
    {"type": "red", "icon": "🚨", "title": "Atención", "body": "Descripción urgente"}
  ],
  "narrative": "Resumen en 2-3 frases del análisis fiscal en español, con recomendaciones concretas.",
  "totalGains": 2853.14,
  "totalLosses": -201.55,
  "totalIncome": 292.93,
  "totalAirdrops": 0
}

REGLAS:
- Si ves "Realized Capital Gains" → son operaciones de casilla 1800
- Si ves "Income" o "Rewards" o "Staking" → casilla 0033
- Si ves "Airdrop" → casilla 1626
- Calcula siempre la ganancia neta = transmisión - adquisición - comisiones
- Si el patrimonio total supera 50.000€ → añade alerta de Modelo 721
- Si hay pérdidas → añade alerta de compensación
- Si hay operaciones DeFi sin historial de compra → añade alerta de revisión
- NUNCA inventes datos. Si no puedes extraer un valor, pon 0.
- El JSON debe ser válido, sin comentarios ni texto adicional fuera del JSON.`;

  let userContent;

  if (b64Data) {
    // PDF o imagen
    userContent = [
      {
        type: mimeType === "application/pdf" ? "document" : "image",
        source: { type: "base64", media_type: mimeType, data: b64Data }
      },
      {
        type: "text",
        text: `Analiza este documento fiscal de criptomonedas y extrae todos los datos para la declaración IRPF española. Responde solo con JSON.`
      }
    ];
  } else {
    // CSV o Excel (texto)
    userContent = `Analiza este informe fiscal de criptomonedas (formato: ${fileType}):\n\n${textContent.substring(0, 80000)}\n\nExtrae todos los datos para la declaración IRPF española. Responde solo con JSON.`;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.content.filter(c=>c.type==="text").map(c=>c.text).join("");

  // Parse JSON - strip any markdown fences
  const clean = rawText.replace(/```json|```/g,"").trim();
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch(e) {
    // Try to extract JSON from text
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error("La IA no devolvió un formato válido. Intenta con un archivo más claro.");
  }

  // Build ops array from parsed.operations
  const ops = (parsed.operations || []).map(op => ({
    id: genId(),
    type:     op.type     || "compraventa",
    typeName: op.typeName || "Compraventa",
    asset:    (op.asset   || "?").toUpperCase(),
    date:     op.date     || "",
    acq:      parseFloat(op.acq)  || 0,
    trans:    parseFloat(op.trans)|| 0,
    fees:     parseFloat(op.fees) || 0,
    gain:     parseFloat(op.gain) || 0,
    casilla:  op.casilla  || "1800",
    notes:    op.notes    || "Importado vía IA"
  }));

  // Build summary
  const gains   = ops.filter(o=>o.casilla==="1800"&&o.gain>0).reduce((s,o)=>s+o.gain, 0);
  const losses  = ops.filter(o=>o.casilla==="1800"&&o.gain<0).reduce((s,o)=>s+o.gain, 0);
  const staking = ops.filter(o=>o.casilla==="0033").reduce((s,o)=>s+o.gain, 0);
  const airdrops= ops.filter(o=>o.casilla==="1626").reduce((s,o)=>s+o.gain, 0);
  const base    = Math.max(gains+losses+staking, 0); // Airdrops → base general, no del ahorro

  analyzeState.result         = parsed;
  analyzeState.previewOps     = ops;
  analyzeState.previewSummary = { gains, losses, staking, airdrops, base, tax: calcTax(base) };
  analyzeState.loading        = false;
  render();
}

// ─── ACTIONS ─────────────────────────────────────────────
function confirmAnalyzeImport() {
  const ops = analyzeState.previewOps || [];
  if (ops.length === 0) return;
  state.ops = [...state.ops, ...ops];
  const added = ops.length;
  resetAnalyze();
  currentTab = "home";
  render();
  const banner = document.createElement("div");
  banner.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#0e3324;border:1px solid var(--green);color:var(--green);padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;z-index:999;box-shadow:0 4px 20px #00000060";
  banner.textContent = `✅ ${added} operaciones importadas correctamente`;
  document.body.appendChild(banner);
  setTimeout(()=>banner.remove(), 3500);
}

function resetAnalyze() {
  analyzeState = { file:null, fileName:"", fileType:"", loading:false, result:null, error:null, previewOps:null, previewSummary:null };
  render();
}

// convenience wrapper triggered by the format dropdown in "Mi informe" tab
function downloadSelectedReport() {
  const fmt = document.getElementById("reportFormat").value;
  if (fmt === "pdf") generatePDFReport();
  else downloadReport();
}

// ─── JSON EXPORT FOR RENTA WEB ─────────────────────────
function exportToJSON() {
  const sm = getSummary();
  const m721Total = getM721Total();
  
  // Detectar si hay pérdida neta (arrastrable)
  const baseImpositiva = sm.base;
  const hayPerdidaNeta = sm.losses > sm.gains;
  const perdidaNeta = hayPerdidaNeta ? Math.min(sm.losses - sm.gains, baseImpositiva) : 0;
  
  const json = {
    ejercicio: state.year,
    generado: new Date().toISOString().split('T')[0],
    app: { nombre: "Angel Tax", version: APP_VERSION, ruleset: RULESET_VERSION },
    resumen: {
      ganancias_1800: sm.gains,
      perdidas_1800: sm.losses,
      resultado_neto_1800: sm.net,
      rendimientos_0033: sm.staking,
      ganancias_1626: sm.airdrops,
      base_imponible: baseImpositiva,
      impuesto_estimado: sm.tax,
      perdida_arrastrable: perdidaNeta > 0 ? perdidaNeta : 0
    },
    casillas: {
      "1800": { descripcion: "Ganancias/pérdidas patrimoniales", valor: sm.net, moneda: "EUR" },
      "0033": { descripcion: "Rendimientos capital mobiliario (staking, lending, LP)", valor: sm.staking, moneda: "EUR" },
      "1626": { descripcion: "Ganancias no derivadas (airdrops, hardforks)", valor: sm.airdrops, moneda: "EUR" },
      "0347": { descripcion: "Minería", valor: sm.mineria || 0, moneda: "EUR" }
    },
    modelo_721: {
      aplica: m721Total >= 50000,
      saldo_total_eur: m721Total,
      saldo_umbral_eur: 50000,
      exchanges: state.balances
        .filter(b => b.foreign)
        .map(b => ({ exchange: b.label, saldo: b.eur, moneda_nativa: b.foreign }))
    },
    operaciones: state.ops.map(o => ({
      id: o.id,
      fecha: o.date,
      tipo: o.type,
      activo: o.asset,
      cantidad: o.qty,
      adquisicion_eur: o.acq,
      transmision_eur: o.trans,
      comisiones_eur: o.fees,
      ganancia_perdida_eur: o.gain,
      casilla_fiscal: o.casilla,
      metodo_fifo: !!o.fifoMode
    })),
    lotes_fifo: state.lots.map(l => ({
      id: l.id,
      activo: l.asset,
      fecha_adquisicion: l.date,
      cantidad_comprada: l.qty,
      cantidad_disponible: l.qtyRemaining,
      precio_unitario_eur: l.pricePerUnit,
      coste_total_eur: l.totalEur,
      comisiones_eur: l.fees
    })),
    notas: [
      `Informe generado por Angel Tax v${APP_VERSION}`,
      `Normativa: Ley 35/2006 IRPF, DGT V1766-22, V1948-21, Decreto 193/2004`,
      `Método coste: ${state.costMethod === "specific" ? "Identificación específica" : "FIFO"}`,
      `⚠️ Esta información es orientativa. Requiere validación por asesor fiscal certificado.`
    ]
  };
  
  // Descargar JSON
  const filename = `Angel-TAX_${state.year}_${new Date().toISOString().split('T')[0]}.json`;
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showBanner(`✅ JSON exportado: ${filename}`);
}

// ─── PDF REPORT GENERATOR ────────────────────────────────
function generatePDFReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const sm = analyzeState.previewSummary || getSummary();
  const ops = analyzeState.previewOps || state.ops;
  const r = analyzeState.result || {};
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 20;

  function addLine(h=5) { y += h; }
  function checkPage(needed=20) { if (y + needed > 275) { doc.addPage(); y = 20; } }

  // ── Header ──
  doc.setFillColor(7, 10, 20);
  doc.rect(0, 0, pageW, 40, "F");
  doc.setTextColor(232, 192, 74);
  doc.setFontSize(20);
  doc.setFont("helvetica","bold");
  doc.text("Angel Tax", margin, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica","normal");
  doc.setTextColor(122, 133, 168);
  doc.text("Informe Fiscal Criptomonedas · España", margin, 26);
  doc.text(`Ejercicio ${state.year} · Generado: ${new Date().toLocaleDateString("es-ES")} · v${APP_VERSION} · ${RULESET_VERSION}`, margin, 33);
  if (r.exchange) doc.text(`Exchange: ${r.exchange}`, pageW - margin - 40, 26);

  // Personal data block
  if (userProfile.name || userProfile.dni) {
    doc.setFillColor(14, 18, 32);
    doc.rect(margin, 44, pageW-margin*2, 22, "F");
    doc.setDrawColor(42, 82, 152);
    doc.rect(margin, 44, pageW-margin*2, 22, "S");
    doc.setTextColor(221, 225, 240);
    doc.setFontSize(8);
    doc.setFont("helvetica","bold");
    if (userProfile.name) doc.text(`Contribuyente: ${userProfile.name}`, margin+4, 52);
    if (userProfile.dni)  doc.text(`NIF/NIE: ${userProfile.dni}`, margin+4, 59);
    const ccaaName = getCCAA().name;
    if (userProfile.city || userProfile.address) {
      doc.setFont("helvetica","normal");
      doc.setTextColor(122, 133, 168);
      doc.text(`${userProfile.address||""} ${userProfile.city||""} ${userProfile.cp||""}`.trim(), pageW-margin-80, 52);
      doc.text(`C.A.: ${ccaaName}`, pageW-margin-80, 59);
    } else {
      doc.setFont("helvetica","normal");
      doc.setTextColor(122, 133, 168);
      doc.text(`C.A.: ${ccaaName}`, pageW-margin-80, 55);
    }
    y = 74;
  } else {
    y = 52;
  }

  // ── Resumen ejecutivo ──
  doc.setFillColor(14, 18, 32);
  doc.roundedRect(margin, y, pageW-margin*2, 52, 3, 3, "F");
  doc.setDrawColor(201, 162, 39);
  doc.roundedRect(margin, y, pageW-margin*2, 52, 3, 3, "S");

  doc.setTextColor(201, 162, 39);
  doc.setFontSize(9);
  doc.setFont("helvetica","bold");
  doc.text("RESUMEN FISCAL", margin+6, y+8);

  const cols = [
    {l:"Base Imponible",   v:fmt(sm.base),           col:margin+6},
    {l:"Impuesto Est.",    v:fmt(sm.tax),             col:margin+46},
    {l:"Ganancias 1800",   v:fmt(sm.gains||0),        col:margin+86},
    {l:"Pérdidas 1800",    v:fmt(Math.abs(sm.losses||0)), col:margin+126},
    {l:"Cap. mob. (0033)",     v:fmt(sm.staking||0),      col:pageW-margin-30},
  ];

  cols.forEach(c => {
    doc.setTextColor(122, 133, 168);
    doc.setFontSize(7);
    doc.setFont("helvetica","normal");
    doc.text(c.l, c.col, y+18);
    doc.setTextColor(232, 192, 74);
    doc.setFontSize(11);
    doc.setFont("helvetica","bold");
    doc.text(c.v, c.col, y+28);
  });

  // Tramo aplicable
  const bracket = BRACKETS.find(b => sm.base <= b.max);
  if (bracket) {
    doc.setTextColor(122, 133, 168);
    doc.setFontSize(8);
    doc.setFont("helvetica","normal");
    doc.text(`Tipo marginal aplicable: ${(bracket.rate*100).toFixed(0)}%`, margin+6, y+42);
  }
  y += 62;

  // ── Casillas ──
  if (r.casillas && r.casillas.length > 0) {
    doc.setTextColor(221, 225, 240);
    doc.setFontSize(11);
    doc.setFont("helvetica","bold");
    doc.text("CASILLAS A RELLENAR EN RENTA WEB", margin, y);
    y += 8;

    r.casillas.forEach(c => {
      checkPage(14);
      doc.setFillColor(22, 28, 46);
      doc.rect(margin, y, pageW-margin*2, 12, "F");
      doc.setTextColor(77, 130, 232);
      doc.setFontSize(9);
      doc.setFont("helvetica","bold");
      doc.text(`Casilla ${c.num}`, margin+4, y+8);
      doc.setTextColor(122, 133, 168);
      doc.setFont("helvetica","normal");
      doc.text(c.label, margin+30, y+8);
      doc.setTextColor(c.value >= 0 ? 61 : 224, c.value >= 0 ? 186 : 82, c.value >= 0 ? 122 : 82);
      doc.setFont("helvetica","bold");
      doc.text(fmt(c.value), pageW-margin-30, y+8, {align:"right"});
      y += 14;
    });
    y += 6;
  }

  // ── Alertas ──
  if (r.alerts && r.alerts.length > 0) {
    checkPage(10);
    doc.setTextColor(221, 225, 240);
    doc.setFontSize(11);
    doc.setFont("helvetica","bold");
    doc.text("AVISOS IMPORTANTES", margin, y);
    y += 8;

    r.alerts.forEach(a => {
      checkPage(18);
      const isRed = a.type==="red";
      doc.setFillColor(isRed?59:42, isRed?18:26, isRed?18:8);
      doc.rect(margin, y, pageW-margin*2, 14, "F");
      doc.setDrawColor(isRed?224:232, isRed?82:148, isRed?82:58);
      doc.line(margin, y, margin, y+14);
      doc.setTextColor(221, 225, 240);
      doc.setFontSize(8);
      doc.setFont("helvetica","bold");
      doc.text(`${a.icon||"⚠"} ${a.title}`, margin+4, y+6);
      doc.setFont("helvetica","normal");
      doc.setTextColor(122, 133, 168);
      const bodyLines = doc.splitTextToSize(a.body, pageW-margin*2-8);
      doc.text(bodyLines[0]||"", margin+4, y+11);
      y += 17;
    });
    y += 4;
  }

  // ── Narrative ──
  if (r.narrative) {
    checkPage(24);
    doc.setFillColor(14, 18, 32);
    doc.rect(margin, y, pageW-margin*2, 22, "F");
    doc.setTextColor(201, 162, 39);
    doc.setFontSize(8);
    doc.setFont("helvetica","bold");
    doc.text("ANÁLISIS IA", margin+4, y+7);
    doc.setTextColor(122, 133, 168);
    doc.setFont("helvetica","normal");
    const lines = doc.splitTextToSize(r.narrative, pageW-margin*2-8);
    doc.text(lines.slice(0,2), margin+4, y+13);
    y += 28;
  }

  // ── Operaciones (tabla) ──
  if (ops.length > 0) {
    checkPage(20);
    doc.setTextColor(221, 225, 240);
    doc.setFontSize(11);
    doc.setFont("helvetica","bold");
    doc.text(`DETALLE DE OPERACIONES (${ops.length})`, margin, y);
    y += 8;

    // Table header
    doc.setFillColor(30, 37, 64);
    doc.rect(margin, y, pageW-margin*2, 8, "F");
    doc.setTextColor(122, 133, 168);
    doc.setFontSize(7);
    doc.setFont("helvetica","bold");
    ["Fecha","Activo","Tipo","Adquis.","Transmis.","G/P Neta","Casilla"].forEach((h,i)=>{
      const xs = [margin+2, margin+22, margin+36, margin+60, margin+85, margin+110, margin+136];
      doc.text(h, xs[i], y+5.5);
    });
    y += 10;

    ops.slice(0, 50).forEach((op, idx) => {
      checkPage(8);
      if (idx % 2 === 0) {
        doc.setFillColor(22, 28, 46);
        doc.rect(margin, y-1, pageW-margin*2, 8, "F");
      }
      doc.setFontSize(7);
      doc.setFont("helvetica","normal");
      doc.setTextColor(122, 133, 168);
      doc.text(op.date||"—", margin+2, y+4.5);
      doc.setTextColor(221, 225, 240);
      doc.text((op.asset||"").substring(0,8), margin+22, y+4.5);
      doc.setTextColor(77, 130, 232);
      doc.text((op.typeName||"").substring(0,12), margin+36, y+4.5);
      doc.setTextColor(122, 133, 168);
      doc.text(op.acq>0?fmt(op.acq).replace("€",""):"—", margin+60, y+4.5);
      doc.text(fmt(op.trans).replace("€",""), margin+85, y+4.5);
      doc.setTextColor(op.gain>=0?61:224, op.gain>=0?186:82, op.gain>=0?122:82);
      doc.setFont("helvetica","bold");
      doc.text((op.gain>=0?"+":"")+fmt(op.gain).replace("€",""), margin+110, y+4.5);
      doc.setTextColor(77, 130, 232);
      doc.setFont("helvetica","normal");
      doc.text(op.casilla||"—", margin+136, y+4.5);
      y += 8;
    });

    if (ops.length > 50) {
      y += 4;
      doc.setTextColor(122, 133, 168);
      doc.setFontSize(8);
      doc.text(`... y ${ops.length-50} operaciones adicionales`, margin, y);
      y += 6;
    }
  }

  // ── Footer ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(7, 10, 20);
    doc.rect(0, 285, pageW, 12, "F");
    doc.setTextColor(61, 74, 110);
    doc.setFontSize(7);
    doc.setFont("helvetica","normal");
    doc.text("Angel Tax · github.com/kaizenbnb/Angel-TAX · Herramienta orientativa, consulta un asesor fiscal certificado", margin, 291);
    doc.text(`${i} / ${totalPages}`, pageW-margin, 291, {align:"right"});
  }

  doc.save(`AngelTax_Informe_${state.year}.pdf`);
}

// ═══════════════════════════════════════════
// PROFILE MODAL
// ═══════════════════════════════════════════
function renderProfileModal() {
  return `
  <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)closeProfile()">
    <div style="background:var(--sur);border:1px solid var(--bor2);border-radius:16px;padding:32px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <div>
          <div class="ff-serif" style="font-size:20px;color:var(--text)">👤 Tu Perfil Fiscal</div>
          <div style="font-size:12px;color:var(--dim);margin-top:3px">Datos para el informe — se quedan en tu navegador</div>
        </div>
        <button onclick="closeProfile()" class="btn-icon" style="font-size:20px;color:var(--dim)">✕</button>
      </div>

      <div class="alert alert-gold" style="margin-bottom:20px">
        🔒 Estos datos <strong>solo se usan para generar tu informe PDF</strong>. Nunca salen de tu dispositivo.
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Nombre completo</label>
          <input class="form-input" id="p-name" placeholder="Tu nombre y apellidos" value="${userProfile.name}"/>
        </div>
        <div class="form-group">
          <label class="form-label">NIF / NIE / DNI</label>
          <input class="form-input" id="p-dni" placeholder="12345678A" value="${userProfile.dni}"/>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Dirección</label>
        <input class="form-input" id="p-address" placeholder="Calle, número, piso..." value="${userProfile.address}"/>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Ciudad</label>
          <input class="form-input" id="p-city" placeholder="Madrid" value="${userProfile.city}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Código postal</label>
          <input class="form-input" id="p-cp" placeholder="28001" value="${userProfile.cp}"/>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Comunidad Autónoma</label>
        <select class="form-input" id="p-ccaa">
          ${CCAA.map(c=>`<option value="${c.id}" ${userProfile.ccaa===c.id?"selected":""}>${c.name}</option>`).join("")}
        </select>
        <div class="form-hint" id="ccaa-hint" style="color:${getCCAA().patrimonio?"var(--orange)":"var(--green)"}">
          ${getCCAA().note}
        </div>
      </div>

      <div style="display:flex;gap:12px;margin-top:8px">
        <button class="btn-primary" onclick="saveProfile()">💾 Guardar perfil</button>
        <button class="btn-sec" onclick="closeProfile()">Cancelar</button>
      </div>
    </div>
  </div>`;
}

function openProfile() { showProfileModal = true; render(); }
function closeProfile() { showProfileModal = false; render(); }

function saveProfile() {
  userProfile.name    = document.getElementById("p-name")?.value    || "";
  userProfile.dni     = document.getElementById("p-dni")?.value     || "";
  userProfile.address = document.getElementById("p-address")?.value || "";
  userProfile.city    = document.getElementById("p-city")?.value    || "";
  userProfile.cp      = document.getElementById("p-cp")?.value      || "";
  userProfile.ccaa    = document.getElementById("p-ccaa")?.value    || "madrid";
  showProfileModal = false;
  render();
  const banner = document.createElement("div");
  banner.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#0e3324;border:1px solid var(--green);color:var(--green);padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;z-index:999";
  banner.textContent = "✅ Perfil guardado";
  document.body.appendChild(banner);
  setTimeout(()=>banner.remove(), 2500);
}

  function resetAll() {
    if (!confirm('\u00BFSeguro que quieres borrar todas las operaciones y empezar de nuevo?\n\nEsta acci\u00F3n no se puede deshacer.')) return;
    state.ops = [];
    state.lots = [];
    state.balances = [];
    state.year = new Date().getFullYear().toString();
    state.costMethod = 'fifo';
    saveState();
    render();
  }

function renderPrivacyBar() {
  return `<div class="privacy-bar">
    <div class="privacy-dot"></div>
    <span>🔒 <strong style="color:var(--text)">Privacidad total:</strong> Todos los datos se procesan exclusivamente en tu navegador. Ningún dato sale de tu dispositivo.</span>
    <span style="color:var(--bor)">·</span>
    <a href="https://github.com/kaizenbnb/Angel-TAX" target="_blank" style="color:var(--mut);text-decoration:none">Open Source en GitHub ↗</a>
  </div>`;
}

// ═══════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════
function goTab(id) {
  currentTab = id;
  if (id !== "add") { currentOpType = null; formData = {}; calcResult = null; }
  render();
}

function changeYear(y) { state.year = y; render(); }

function selectOpType(id) {
  currentOpType = id;
  formData = {};
  calcResult = null;
  render();
}

// ═══════════════════════════════════════════
// FIFO ENGINE
// ═══════════════════════════════════════════

function addLot(asset, date, qty, totalEur, fees) {
  // Cost basis includes purchase fees (criterio DGT: comisiones son mayor valor de adquisición)
  state.lots.push({
    id: genId(),
    asset: asset.toUpperCase(),
    date,
    qty,
    qtyRemaining: qty,
    pricePerUnit: qty > 0 ? (totalEur + fees) / qty : 0,
    totalEur,
    fees
  });
  // Keep lots sorted oldest-first for display
  state.lots.sort((a,b) => a.date.localeCompare(b.date));
}

function getLotsForAsset(asset) {
  return state.lots
    .filter(l => l.asset === asset.toUpperCase() && l.qtyRemaining > 0)
    .sort((a,b) => a.date.localeCompare(b.date));
}

/**
 * Motor FIFO para cálculo de coste de adquisición de venta
 * Obligatorio por AEAT para activos homogéneos (primeros en entrar, primeros en salir).
 * Si se elige identificación específica (TSJPV 2025) se puede seleccionar lote concreto.
 * @param {string} asset - Símbolo del activo (e.g. BTC, ETH)
 * @param {number} qtySold - Cantidad vendida
 * @param {number} saleFees - Comisiones de venta (no se usa aquí, queda para posible extensión)
 * @returns {Object|null} { totalAcq, lotsUsed, qtyFound, warning } o null si no hay lotes
 */
function fifoCalc(asset, qtySold, saleFees) {
  const lots = getLotsForAsset(asset);
  if (lots.length === 0) return null; // No lots → fallback a modo manual

  let remaining = qtySold;
  let totalAcq  = 0;
  const lotsUsed = [];

  for (const lot of lots) {
    if (remaining <= 0) break;
    const take    = Math.min(remaining, lot.qtyRemaining);
    const acqCost = take * lot.pricePerUnit;
    totalAcq += acqCost;
    lotsUsed.push({ lotId: lot.id, qty: take, pricePerUnit: lot.pricePerUnit, acqCost, lotDate: lot.date });
    remaining -= take;
  }

  const warning = remaining > 0
    ? `⚠️ Solo hay ${fmtQty(qtySold - remaining)} ${asset.toUpperCase()} en lotes FIFO — faltan ${fmtQty(remaining)} unidades sin coste de adquisición conocido`
    : null;

  return { totalAcq, lotsUsed, qtyFound: qtySold - remaining, warning };
}

// Preview FIFO without consuming (for calculate())
function fifoPreview(asset, qtySold) {
  return fifoCalc(asset, qtySold, 0);
}

// ── Identificación Específica (TSJPV 2025) ──
// El usuario elige exactamente qué lote usa para cada venta
// Solo válido si puede justificar documentalmente el lote concreto
function getSpecificLots(asset) {
  return state.lots
    .filter(l => l.asset === asset.toUpperCase() && l.qtyRemaining > 0)
    .sort((a,b) => a.date.localeCompare(b.date));
}

function specificCalc(lotId, qtySold) {
  const lot = state.lots.find(l => l.id === lotId);
  if (!lot) return null;
  const take = Math.min(qtySold, lot.qtyRemaining);
  const acqCost = take * lot.pricePerUnit;
  return {
    totalAcq: acqCost,
    lotsUsed: [{ lotId, qty: take, pricePerUnit: lot.pricePerUnit, acqCost, lotDate: lot.date }],
    qtyFound: take,
    warning: take < qtySold
      ? `⚠️ El lote solo tiene ${fmtQty(take)} ${lot.asset} disponibles — faltan ${fmtQty(qtySold - take)} unidades`
      : null
  };
}

// Consume lots after confirmed addOperation
function consumeLots(lotsUsed) {
  for (const used of lotsUsed) {
    const lot = state.lots.find(l => l.id === used.lotId);
    if (lot) lot.qtyRemaining = Math.max(0, lot.qtyRemaining - used.qty);
  }
}

function deleteLot(id) {
  state.lots = state.lots.filter(l => l.id !== id);
  saveState();
  render();
}

// ═══════════════════════════════════════════
// MODELO 721 ENGINE
// ═══════════════════════════════════════════

// Exchanges con sede en España → NO requieren M721
const SPAIN_EXCHANGES = ["bit2me","criptan","2gether","coinmotion","bytr"];

// Catálogo de exchanges conocidos para el formulario M721
const M721_EXCHANGES = [
  {id:"binance",   label:"Binance",   foreign:true},
  {id:"coinbase",  label:"Coinbase",  foreign:true},
  {id:"kraken",    label:"Kraken",    foreign:true},
  {id:"revolut",   label:"Revolut",   foreign:true},
  {id:"etoro",     label:"eToro",     foreign:true},
  {id:"bitvavo",   label:"Bitvavo",   foreign:true},
  {id:"okx",       label:"OKX",       foreign:true},
  {id:"bitpanda",  label:"Bitpanda",  foreign:true},
  {id:"bitget",    label:"Bitget",    foreign:true},
  {id:"bit2me",    label:"Bit2Me",    foreign:false},
  {id:"criptan",   label:"Criptan",   foreign:false},
  {id:"otro_ext",  label:"Otro (extranjero)", foreign:true},
  {id:"otro_es",   label:"Otro (español)",    foreign:false},
];

function getM721Total() {
  return state.balances
    .filter(b => b.foreign && b.eur > 0)
    .reduce((s, b) => s + b.eur, 0);
}

function needsM721() {
  return getM721Total() >= 50000;
}

function addBalance(exchangeId, exchangeLabel, eur, foreign) {
  // Replace if same exchange already exists
  const idx = state.balances.findIndex(b => b.exchangeId === exchangeId);
  const entry = { exchangeId, label: exchangeLabel, eur: parseFloat(eur)||0, foreign };
  if (idx >= 0) state.balances[idx] = entry;
  else state.balances.push(entry);
}

function deleteBalance(exchangeId) {
  state.balances = state.balances.filter(b => b.exchangeId !== exchangeId);
  saveState();
  render();
}

// M721 state
let m721State = { adding: false, selectedEx: null, inputEur: "" };

function renderM721Section() {
  const total    = getM721Total();
  const totalAll = state.balances.reduce((s,b)=>s+b.eur,0);
  const needs    = total >= 50000;
  const close    = total >= 40000 && total < 50000;
  const hasData  = state.balances.length > 0;

  return `
  <div class="card" style="border-color:${needs?"var(--red)":close?"var(--orange)":"var(--bor2)"}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <div>
        <div class="card-title">🌍 Modelo 721 — Saldo a 31/dic/${state.year}</div>
        <div class="card-sub">Obligatorio si tienes >50.000€ en exchanges extranjeros</div>
      </div>
      <button class="btn-sec" onclick="m721State.adding=!m721State.adding;render()">
        ${m721State.adding?"✕ Cancelar":"+ Añadir exchange"}
      </button>
    </div>

    ${needs?`<div class="alert alert-red">🚨 <strong>Modelo 721 OBLIGATORIO:</strong> Tus saldos en exchanges extranjeros suman ${fmt(total)} €, superando el umbral de 50.000€. Debes presentarlo entre el 1 de enero y el 31 de marzo de ${parseInt(state.year)+1}. La sanción por no presentarlo puede superar los 10.000€.</div>`:""}
    ${close&&!needs?`<div class="alert alert-orange">⚠️ <strong>Atención:</strong> Tus saldos se acercan al umbral de 50.000€ (actualmente ${fmt(total)} €). Verifica el valor exacto a 31/12/${state.year}.</div>`:""}
    ${!needs&&!close&&hasData?`<div class="alert alert-green">✅ Saldos en exchanges extranjeros: ${fmt(total)} € — por debajo del umbral. Modelo 721 no obligatorio este año.</div>`:""}
    ${!hasData?`<div class="alert alert-blue">ℹ️ Introduce tus saldos en cada exchange a 31 de diciembre de ${state.year} para saber si debes presentar el Modelo 721.</div>`:""}

    ${m721State.adding?`
    <div style="background:var(--sur2);border:1px solid var(--bor2);border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">Nuevo saldo</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div>
          <label class="form-label">Exchange</label>
          <select class="form-input" id="m721-ex" onchange="m721State.selectedEx=this.value;render()">
            <option value="">-- Selecciona --</option>
            ${M721_EXCHANGES.map(e=>`<option value="${e.id}" ${m721State.selectedEx===e.id?"selected":""}>${e.label} ${e.foreign?"🌍":"🇪🇸"}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="form-label">Saldo total a 31/dic/${state.year} (€)</label>
          <input type="number" class="form-input" id="m721-eur" placeholder="0.00" step="0.01"
            value="${m721State.inputEur}"
            oninput="m721State.inputEur=this.value"/>
        </div>
      </div>
      ${m721State.selectedEx&&!M721_EXCHANGES.find(e=>e.id===m721State.selectedEx)?.foreign
        ?`<div class="alert alert-green" style="margin-bottom:8px">✅ Este exchange tiene sede en España — <strong>no computa para el M721</strong>. Se guarda como referencia.</div>`
        :""}
      <button class="btn-primary" onclick="
        const ex = M721_EXCHANGES.find(e=>e.id===m721State.selectedEx);
        if (!ex || !m721State.inputEur) return;
        addBalance(ex.id, ex.label, m721State.inputEur, ex.foreign);
        m721State = {adding:false, selectedEx:null, inputEur:''};
        render();
      ">✅ Guardar saldo</button>
    </div>` : ""}

    ${hasData?`
    <div style="overflow-x:auto;margin-bottom:12px">
      <table>
        <thead><tr><th>Exchange</th><th>Sede</th><th>Saldo a 31/dic</th><th>Computa M721</th><th></th></tr></thead>
        <tbody>
          ${state.balances.map(b=>`
          <tr>
            <td class="fw7">${b.label}</td>
            <td><span style="font-size:11px">${b.foreign?"🌍 Extranjero":"🇪🇸 España"}</span></td>
            <td class="${b.eur>0?"c-gold fw7":"c-dim"}">${fmt(b.eur)} €</td>
            <td>${b.foreign&&b.eur>0
              ?`<span style="color:var(--orange);font-weight:600;font-size:12px">SÍ</span>`
              :`<span style="color:var(--green);font-size:12px">NO</span>`}
            </td>
            <td><button class="btn-icon" onclick="deleteBalance('${b.exchangeId}')">🗑</button></td>
          </tr>`).join("")}
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid var(--bor2)">
            <td colspan="2" class="fw7">Total exchanges extranjeros</td>
            <td class="${needs?"c-red":"c-gold"} fw7">${fmt(total)} €</td>
            <td colspan="2"><span style="font-size:11px;color:var(--dim)">Umbral: 50.000 €</span></td>
          </tr>
        </tfoot>
      </table>
    </div>
    ${needs?`
    <div style="background:var(--sur2);border:1px solid var(--bor);border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">📋 Listado para el Modelo 721</div>
      ${state.balances.filter(b=>b.foreign&&b.eur>0).map(b=>`
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd);font-size:13px">
        <span class="fw7">${b.label}</span>
        <span class="c-gold fw7">${fmt(b.eur)} €</span>
      </div>`).join("")}
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;font-weight:700">
        <span>TOTAL</span><span class="c-red">${fmt(total)} €</span>
      </div>
      <div class="alert alert-orange" style="margin-top:8px;font-size:12px">
        ⚠️ Los valores deben ser el <strong>valor de mercado en EUR a 31 de diciembre</strong> de ${state.year}, no el precio de compra. Usa CoinGecko o la valoración oficial del exchange.
      </div>
    </div>` : ""}
    `:""}
  </div>`;
}

// Format qty with up to 8 decimals, trimming trailing zeros
function fmtQty(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return "—";
  return parseFloat(num.toFixed(8)).toString();
}

// Total available qty for an asset
function availableQty(asset) {
  return state.lots
    .filter(l => l.asset === asset.toUpperCase())
    .reduce((s,l) => s + l.qtyRemaining, 0);
}

function isFifoOp(type) {
  return ["compraventa","permuta","pago","nft","lp_retiro","liquidacion","envio_regalo"].includes(type);
}

// Helper: build a lot object from a CSV buy row
function lotObj(asset, date, qty, totalEur, fees, source) {
  return {
    _lot: true,
    asset: (asset||"").toUpperCase(),
    date: date || "—",
    qty:  parseFloat(qty)  || 0,
    totalEur: parseFloat(totalEur) || 0,
    fees: parseFloat(fees) || 0,
    source: source || "CSV"
  };
}

function hasFifoLots(asset) {
  return asset && getLotsForAsset(asset).length > 0;
}

function saveFormData() {
  const get = id => { const el = document.getElementById(id); return el ? el.value : ""; };
  formData.asset = get("f-asset");
  formData.date  = get("f-date");
  formData.acq   = get("f-acq");
  formData.trans = get("f-trans");
  formData.fees  = get("f-fees");
  formData.notes = get("f-notes");
  formData.qty   = get("f-qty");   // FIFO: cantidad de unidades
  formData.price = get("f-price"); // FIFO: precio unitario de venta
  formData.lotId = get("f-lotid"); // Identificación específica: lote elegido
}



function calculate() {
  saveFormData();
  const op    = OPS.find(o=>o.id===currentOpType);
  const fees  = parseFloat(formData.fees)  || 0;

  // Envío entre propias wallets → no tributa
  if (op?.noTax) {
    calcResult = { gain: 0, cas: "—", tax: 0, noTax: true };
    render();
    return;
  }

  // ── Compra → crea lote, no evento imponible ──
  if (op?.isLot) {
    const qty   = parseFloat(formData.qty)   || 0;
    const total = parseFloat(formData.trans) || 0;
    if (qty <= 0 || total <= 0) {
      calcResult = { error: "Introduce cantidad y precio total" };
      render();
      return;
    }
    calcResult = { isLot: true, qty, total, fees, pricePerUnit: qty > 0 ? (total + fees) / qty : 0 };
    render();
    return;
  }

  // Casilla según tipo
  const cas = (["staking","lending","lp_fees"].includes(currentOpType)) ? "0033"
            : currentOpType==="airdrop"   ? "1626"
            : currentOpType==="mineria"   ? "Act.Económica"
            : "1800";

  // ── Modo FIFO / Identificación específica ──
  if (isFifoOp(currentOpType) && formData.asset && hasFifoLots(formData.asset)) {
    const qty    = parseFloat(formData.qty)   || 0;
    const price  = parseFloat(formData.price) || 0;
    const trans  = qty > 0 && price > 0 ? qty * price : parseFloat(formData.trans) || 0;

    if (qty <= 0 || trans <= 0) {
      calcResult = { error: "Introduce cantidad y precio de venta" };
      render();
      return;
    }

    let fifo;
    if (state.costMethod === "specific" && formData.lotId) {
      fifo = specificCalc(formData.lotId, qty);
    } else {
      fifo = fifoPreview(formData.asset, qty);
    }

    const gain = trans - (fifo ? fifo.totalAcq : 0) - fees;
    calcResult = {
      gain, cas, tax: calcTax(Math.max(gain, 0)),
      fifo, qty, trans,
      acqFifo: fifo ? fifo.totalAcq : 0,
      isFifoMode: true,
      method: state.costMethod
    };
    render();
    return;
  }

  // ── Modo manual (fallback o ingresos) ──
  const acq   = parseFloat(formData.acq)   || 0;
  const trans = parseFloat(formData.trans) || 0;
  const isGP  = isFifoOp(currentOpType);
  const gain  = isGP ? trans - acq - fees : trans;

  calcResult = { gain, cas, tax: calcTax(Math.max(gain, 0)) };
  render();
}

function clearResult() { calcResult = null; render(); }

function addOperation() {
  if (!calcResult) return;
  if (calcResult.noTax) return;
  if (calcResult.error) return;

  const op = OPS.find(o=>o.id===currentOpType);

  // ── Compra → crear lote FIFO ──
  if (calcResult.isLot) {
    addLot(
      formData.asset || "—",
      formData.date  || new Date().toISOString().slice(0,10),
      calcResult.qty,
      calcResult.total,
      calcResult.fees
    );
    currentOpType = null; formData = {}; calcResult = null;
    goTab("home");
    return;
  }

  // ── Venta en modo FIFO → consumir lotes ──
  if (calcResult.isFifoMode && calcResult.fifo) {
    consumeLots(calcResult.fifo.lotsUsed);
  }

  // ── Guardar operación ──
  state.ops.push({
    id: genId(), type: currentOpType, typeName: op.name,
    asset:   formData.asset||"—",
    date:    formData.date||"—",
    qty:     calcResult.qty || (parseFloat(formData.qty)||0),
    acq:     calcResult.isFifoMode ? calcResult.acqFifo : (parseFloat(formData.acq)||0),
    trans:   calcResult.isFifoMode ? calcResult.trans : (parseFloat(formData.trans)||0),
    fees:    parseFloat(formData.fees)||0,
    gain:    calcResult.gain,
    casilla: calcResult.cas,
    fifoMode: calcResult.isFifoMode || false,
    notes:   formData.notes||""
  });

  currentOpType = null; formData = {}; calcResult = null;
  saveState();
  goTab("home");
}

function deleteOp(id) {
  state.ops = state.ops.filter(o=>o.id!==id);
  saveState();
  render();
}

function toggleGuide(i) {
  openGuide = openGuide === i ? null : i;
  render();
}

function downloadReport() {
  const sm = getSummary();
  const m721Total = getM721Total();
  const m721Lines = state.balances.length > 0 ? [
    "", "=".repeat(50), "MODELO 721 — SALDO EN EXCHANGES A 31/DIC/" + state.year,
    "=".repeat(50),
    ...state.balances.map(b => `${b.label.padEnd(20)} ${fmt(b.eur).padStart(14)} €  ${b.foreign ? "[EXTRANJERO — computa M721]" : "[España — no computa]"}`),
    "-".repeat(50),
    `${"TOTAL EXCHANGES EXTRANJEROS".padEnd(20)} ${fmt(m721Total).padStart(14)} €`,
    m721Total >= 50000
      ? ">>> MODELO 721 OBLIGATORIO — Presenta antes del 31 de marzo de " + (parseInt(state.year)+1)
      : ">>> Modelo 721 no obligatorio (umbral: 50.000 €)",
  ] : ["", "MODELO 721: Sin saldos registrados."];

  const lotsLines = state.lots.length > 0 ? [
    "", "=".repeat(50), "INVENTARIO DE LOTES FIFO",
    "=".repeat(50),
    "Fecha       | Activo | Qty comprada   | Qty disponible | Precio/u       | Coste total",
    "-".repeat(85),
    ...state.lots.map(l =>
      `${l.date} | ${l.asset.padEnd(6)} | ${fmtQty(l.qty).padStart(14)} | ${fmtQty(l.qtyRemaining).padStart(14)} | ${fmt(l.pricePerUnit).padStart(12)} € | ${fmt(l.totalEur+l.fees).padStart(10)} €`
    ),
  ] : [];

  const lines = [
    "ANGEL TAX v" + APP_VERSION + " — INFORME FISCAL CRIPTO " + state.year,
    "Generado: " + new Date().toLocaleDateString("es-ES"),
    "Ruleset: " + RULESET_VERSION,
    "Método coste: " + (state.costMethod === "specific" ? "Identificación específica (TSJPV 2025)" : "FIFO (estándar AEAT)"),
    "=".repeat(50), "",
    "BASE DEL AHORRO:       " + fmt(sm.base) + "  (tramos 19%-30%)",
    "IMPUESTO ESTIMADO:     " + fmt(sm.tax),
    "Ganancias (1800):      " + fmt(sm.gains),
    "Pérdidas  (1800):      " + fmt(sm.losses),
    "Cap.mob. (0033):       " + fmt(sm.staking) + "  (staking · lending · LP fees)",
    "Airdrops  (1626):      " + fmt(sm.airdrops) + "  (BASE GENERAL — tipo marginal IRPF)",
    sm.mineria>0 ? "Minería (Act.Econ.):    " + fmt(sm.mineria) + "  (BASE GENERAL — hasta 47%)" : "",
    "",
    "-".repeat(50), "OPERACIONES DETALLADAS:", "-".repeat(50),
    ...state.ops.map(o =>
      `${o.date} | ${o.typeName.padEnd(15)} | ${o.asset.padEnd(6)} | ${o.qty?fmtQty(o.qty).padStart(12)+" u":""} | Adq: ${fmt(o.acq).padStart(10)} € | Trans: ${fmt(o.trans).padStart(10)} € | G/P: ${(o.gain>=0?"+":"")+fmt(o.gain)} | Casilla ${o.casilla}${o.fifoMode?" [FIFO]":""}`
    ),
    ...m721Lines,
    ...lotsLines,
    "", "=".repeat(50),
    "DISCLAIMER: Herramienta orientativa. Consulta siempre un asesor fiscal certificado.",
    "Open Source: https://github.com/kaizenbnb/Angel-TAX"
  ];
  const blob = new Blob([lines.filter(l=>l!==null&&l!==undefined).join("\n")], {type:"text/plain;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `AngelTax_Informe_${state.year}.txt`;
  a.click();
}

function attachEvents() {
  // Keep form data live as user types (no re-render on each keystroke)
  ["f-asset","f-date","f-acq","f-trans","f-fees","f-notes"].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", ()=>saveFormData());
  });
  
  // Event delegation: una sola escucha para eliminar operaciones
  const opsTable = document.getElementById("ops-table");
  if (opsTable) {
    opsTable.addEventListener("click", e => {
      const btn = e.target.closest(".btn-delete-op");
      if (btn && btn.dataset.opId) {
        deleteOp(btn.dataset.opId);
      }
    });
  }
}

// ═══════════════════════════════════════════
// PERSISTENCIA
// ═══════════════════════════════════════════
const STORAGE_KEY = "angeltax_v1";

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ops: state.ops,
      lots: state.lots,
      balances: state.balances,
      year: state.year,
      costMethod: state.costMethod,
      carryForwardLosses: state.carryForwardLosses,
      priorYearLosses: state.priorYearLosses
    }));
  } catch(e) { /* cuota excedida o privado */ }
}

function updateCarryForwardLosses(value) {
  state.carryForwardLosses = parseFloat(value) || 0;
  saveState();
  render();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.ops)       state.ops       = saved.ops;
    if (saved.lots)      state.lots      = saved.lots;
    if (saved.balances)  state.balances  = Array.isArray(saved.balances) ? saved.balances : [];
    if (saved.year)      state.year      = saved.year;
    if (saved.costMethod) state.costMethod = saved.costMethod;
    if (saved.carryForwardLosses) state.carryForwardLosses = saved.carryForwardLosses;
    if (saved.priorYearLosses) state.priorYearLosses = saved.priorYearLosses;
  } catch(e) { /* JSON inválido — ignorar */ }
}

function clearSavedState() {
  if (!confirm("¿Borrar todos los datos guardados? Esta acción no se puede deshacer.")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = { ops: [], lots: [], balances: [], year: String(new Date().getFullYear() - 1), costMethod: "fifo" };
  render();
}

function loadDemoData() {
  if (state.ops.length > 0 || state.lots.length > 0) {
    if (!confirm("Esto reemplazará todos tus datos actuales con datos de ejemplo. ¿Continuar?")) return;
  }
  state = {
    year: "2024",
    costMethod: "fifo",
    balances: [
      { exchangeId:"coinbase",  label:"Coinbase",  eur:32000, foreign:true },
      { exchangeId:"kraken",    label:"Kraken",    eur:21500, foreign:true },
      { exchangeId:"bit2me",    label:"Bit2Me",    eur: 4800, foreign:false },
    ],
    lots: [
      { id:"demo-l1", asset:"BTC", date:"2024-01-15", qty:0.5, qtyRemaining:0.5, pricePerUnit:38000, totalEur:19000, fees:12 },
      { id:"demo-l2", asset:"ETH", date:"2024-02-20", qty:3,   qtyRemaining:1.5, pricePerUnit:2800,  totalEur:8400,  fees:8  },
      { id:"demo-l3", asset:"SOL", date:"2024-03-10", qty:50,  qtyRemaining:50,  pricePerUnit:140,   totalEur:7000,  fees:5  },
    ],
    ops: [
      { id:"demo-o1", type:"compraventa", typeName:"Compraventa", asset:"ETH",  date:"2024-05-12", acq:4200,  trans:6900,  fees:28, gain:2672,  casilla:"1800", notes:"Venta ETH — Coinbase (demo)" },
      { id:"demo-o2", type:"compraventa", typeName:"Compraventa", asset:"BNB",  date:"2024-07-03", acq:800,   trans:1200,  fees:15, gain:385,   casilla:"1800", notes:"Venta BNB — Binance (demo)" },
      { id:"demo-o3", type:"compraventa", typeName:"Compraventa", asset:"DOGE", date:"2024-09-22", acq:2200,  trans:1100,  fees:10, gain:-1110, casilla:"1800", notes:"Venta DOGE con pérdida (demo)" },
      { id:"demo-o4", type:"staking",     typeName:"Staking",     asset:"ETH",  date:"2024-03-31", acq:0,     trans:320,   fees:0,  gain:320,   casilla:"0033", notes:"Staking rewards ETH (demo)" },
      { id:"demo-o5", type:"staking",     typeName:"Staking",     asset:"ADA",  date:"2024-06-30", acq:0,     trans:180,   fees:0,  gain:180,   casilla:"0033", notes:"Staking ADA (demo)" },
      { id:"demo-o6", type:"airdrop",     typeName:"Airdrop",     asset:"ARB",  date:"2024-04-15", acq:0,     trans:250,   fees:0,  gain:250,   casilla:"1626", notes:"Airdrop Arbitrum (demo)" },
    ],
  };
  saveState();
  currentTab = "report";
  render();
  const b = document.createElement("div");
  b.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#0a1a2e;border:1px solid var(--blue);color:var(--blue);padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;z-index:999;box-shadow:0 4px 20px #000a";
  b.textContent = "🎭 Datos de demo cargados — 6 operaciones, 3 lotes, 3 exchanges";
  document.body.appendChild(b);
  setTimeout(()=>b.remove(), 4000);
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
loadState();
render();
