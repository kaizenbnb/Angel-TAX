/**
 * ██████████████████████████████████████████████████████
 * █                                                    █
 * █   ANGEL TAX — Fiscalidad Cripto en España         █
 * █   Open Source · Privacy First · 100% Local        █
 * █                                                    █
 * █   https://github.com/angel-tax/angel-tax          █
 * █                                                    █
 * ██████████████████████████████████████████████████████
 *
 * Basado en normativa AEAT vigente 2024/2025:
 * - Ley 35/2006 IRPF (arts. 33, 35, 37.1.h, 46, 49)
 * - Consultas DGT V1766-22, V1948-21, V0648-24
 * - Modelo 721 (D.A.13ª Ley 11/2021)
 * - Directiva DAC8
 * 
 * DISCLAIMER: Esta herramienta es orientativa. Consulta
 * siempre con un asesor fiscal certificado.
 */

import { useState, useReducer, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');
`;

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  :root {
    --bg: #070a14;
    --surface: #0e1220;
    --surface2: #161c2e;
    --surface3: #1e2540;
    --border: #252d4a;
    --border2: #2e3a5e;
    --gold: #c9a227;
    --gold2: #e8c04a;
    --gold-glow: #c9a22730;
    --gold-dim: #7a6115;
    --text: #dde1f0;
    --text-dim: #7a85a8;
    --text-muted: #3d4a6e;
    --green: #3dba7a;
    --green-dim: #0e3324;
    --red: #e05252;
    --red-dim: #3b1212;
    --blue: #4d82e8;
    --blue-dim: #0f1f45;
    --orange: #e8943a;
    --purple: #9b7de8;
    --font-display: 'Playfair Display', Georgia, serif;
    --font-body: 'DM Sans', system-ui, sans-serif;
    --radius: 12px;
    --shadow: 0 4px 32px #00000060;
  }

  body {
    font-family: var(--font-body);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    line-height: 1.6;
    overflow-x: hidden;
  }

  /* Noise texture overlay */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 9999;
    opacity: 0.4;
  }

  .app { max-width: 1100px; margin: 0 auto; padding: 0 20px 80px; }

  /* ── HEADER ── */
  .header {
    padding: 32px 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    margin-bottom: 32px;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .logo-icon {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, var(--gold2), var(--gold));
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    box-shadow: 0 0 20px var(--gold-glow);
  }
  .logo-text h1 {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--gold2);
    letter-spacing: 0.5px;
    line-height: 1.2;
  }
  .logo-text span {
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 500;
  }
  .header-badge {
    background: var(--green-dim);
    border: 1px solid var(--green);
    color: var(--green);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* ── NAV TABS ── */
  .nav {
    display: flex;
    gap: 4px;
    margin-bottom: 32px;
    background: var(--surface);
    padding: 6px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    overflow-x: auto;
  }
  .nav-tab {
    flex: 1;
    min-width: fit-content;
    padding: 9px 16px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .nav-tab:hover { color: var(--text); background: var(--surface2); }
  .nav-tab.active {
    background: var(--surface3);
    color: var(--gold2);
    border: 1px solid var(--border2);
    box-shadow: 0 0 12px var(--gold-glow);
  }

  /* ── CARDS ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px;
    margin-bottom: 20px;
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }
  .card-title {
    font-family: var(--font-display);
    font-size: 18px;
    color: var(--text);
  }
  .card-subtitle { font-size: 13px; color: var(--text-dim); margin-top: 2px; }

  /* ── STAT BOXES ── */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 14px;
    margin-bottom: 28px;
  }
  .stat-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    transition: border-color 0.2s;
  }
  .stat-box:hover { border-color: var(--border2); }
  .stat-label { font-size: 11px; color: var(--text-dim); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .stat-value { font-size: 22px; font-weight: 600; font-family: var(--font-display); }
  .stat-value.green { color: var(--green); }
  .stat-value.red { color: var(--red); }
  .stat-value.gold { color: var(--gold2); }
  .stat-value.blue { color: var(--blue); }
  .stat-sub { font-size: 11px; color: var(--text-muted); margin-top: 3px; }

  /* ── FORM ELEMENTS ── */
  .form-group { margin-bottom: 18px; }
  .form-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 8px;
  }
  .form-input, .form-select {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    padding: 11px 14px;
    font-family: var(--font-body);
    font-size: 14px;
    transition: border-color 0.2s, box-shadow 0.2s;
    outline: none;
  }
  .form-input:focus, .form-select:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 2px var(--gold-glow);
  }
  .form-select option { background: var(--surface2); }
  .form-hint { font-size: 11px; color: var(--text-muted); margin-top: 5px; line-height: 1.4; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }

  /* ── BUTTONS ── */
  .btn {
    padding: 11px 22px;
    border-radius: 8px;
    border: none;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--gold), var(--gold2));
    color: #0a0c14;
    box-shadow: 0 4px 16px var(--gold-glow);
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px var(--gold-glow); }
  .btn-secondary {
    background: var(--surface2);
    color: var(--text);
    border: 1px solid var(--border2);
  }
  .btn-secondary:hover { background: var(--surface3); border-color: var(--gold-dim); }
  .btn-danger {
    background: var(--red-dim);
    color: var(--red);
    border: 1px solid var(--red);
  }
  .btn-danger:hover { background: #4a1a1a; }
  .btn-sm { padding: 7px 14px; font-size: 12px; }
  .btn-icon { padding: 8px; border-radius: 8px; background: var(--surface2); border: 1px solid var(--border); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .btn-icon:hover { color: var(--text); border-color: var(--border2); }

  /* ── OPERATION TYPE SELECTOR ── */
  .op-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
    margin-bottom: 28px;
  }
  .op-card {
    background: var(--surface2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }
  .op-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: transparent;
    transition: background 0.2s;
  }
  .op-card:hover { border-color: var(--border2); transform: translateY(-2px); box-shadow: var(--shadow); }
  .op-card.selected { border-color: var(--gold); background: var(--surface3); }
  .op-card.selected::before { background: linear-gradient(90deg, var(--gold), var(--gold2)); }
  .op-icon { font-size: 26px; margin-bottom: 10px; }
  .op-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
  .op-desc { font-size: 12px; color: var(--text-dim); line-height: 1.4; }
  .op-badge {
    position: absolute;
    top: 10px; right: 10px;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
  }
  .op-badge.ahorro { background: var(--blue-dim); color: var(--blue); }
  .op-badge.general { background: #2a1a3e; color: var(--purple); }
  .op-badge.informativo { background: var(--surface3); color: var(--text-dim); }

  /* ── OPERATIONS TABLE ── */
  .ops-table { width: 100%; border-collapse: collapse; }
  .ops-table th {
    text-align: left;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    padding: 8px 14px;
    border-bottom: 1px solid var(--border);
  }
  .ops-table td {
    padding: 13px 14px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }
  .ops-table tr:last-child td { border-bottom: none; }
  .ops-table tr:hover td { background: var(--surface2); }
  .gain { color: var(--green); font-weight: 600; }
  .loss { color: var(--red); font-weight: 600; }
  .neutral { color: var(--text-dim); }

  /* ── CASILLA BADGE ── */
  .casilla {
    display: inline-block;
    background: var(--blue-dim);
    color: var(--blue);
    border: 1px solid var(--blue);
    border-radius: 6px;
    padding: 1px 8px;
    font-size: 11px;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.5px;
  }
  .casilla.gold { background: var(--gold-glow); color: var(--gold2); border-color: var(--gold-dim); }
  .casilla.purple { background: #1e1535; color: var(--purple); border-color: #4a3578; }
  .casilla.red { background: var(--red-dim); color: var(--red); border-color: var(--red); }

  /* ── ALERT BOXES ── */
  .alert {
    padding: 14px 18px;
    border-radius: var(--radius);
    border-left: 3px solid;
    margin-bottom: 16px;
    font-size: 13px;
    line-height: 1.5;
  }
  .alert-info { background: var(--blue-dim); border-color: var(--blue); color: #a8c4ff; }
  .alert-warning { background: #2a1a08; border-color: var(--orange); color: #f0c080; }
  .alert-success { background: var(--green-dim); border-color: var(--green); color: #80e8b0; }
  .alert-danger { background: var(--red-dim); border-color: var(--red); color: #ffaaaa; }
  .alert-gold { background: #1a1408; border-color: var(--gold); color: var(--gold2); }
  .alert strong { font-weight: 700; }

  /* ── TAX BRACKET TABLE ── */
  .bracket-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  .bracket-table th {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  .bracket-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid var(--border); }
  .bracket-table tr.active-bracket td { background: var(--gold-glow); color: var(--gold2); }
  .bracket-table tr:last-child td { border-bottom: none; }

  /* ── PROGRESS / WIZARD ── */
  .wizard-steps {
    display: flex;
    gap: 0;
    margin-bottom: 28px;
    position: relative;
  }
  .wizard-steps::before {
    content: '';
    position: absolute;
    top: 18px;
    left: 20px;
    right: 20px;
    height: 1px;
    background: var(--border);
    z-index: 0;
  }
  .step-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    position: relative;
    z-index: 1;
  }
  .step-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    background: var(--surface2);
    border: 2px solid var(--border);
    color: var(--text-muted);
    transition: all 0.2s;
  }
  .step-item.active .step-circle { background: var(--gold); border-color: var(--gold2); color: var(--bg); }
  .step-item.done .step-circle { background: var(--green-dim); border-color: var(--green); color: var(--green); }
  .step-label { font-size: 10px; color: var(--text-muted); text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
  .step-item.active .step-label { color: var(--gold2); }
  .step-item.done .step-label { color: var(--green); }

  /* ── RESULT BOX ── */
  .result-box {
    background: var(--surface2);
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    padding: 20px;
    margin: 20px 0;
  }
  .result-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
  }
  .result-row:last-child { border-bottom: none; padding-bottom: 0; }
  .result-row.total {
    border-top: 2px solid var(--border2);
    padding-top: 14px;
    margin-top: 6px;
    font-weight: 700;
    font-size: 16px;
  }
  .result-key { color: var(--text-dim); }
  .result-val { font-weight: 600; }

  /* ── GUIDE CARDS ── */
  .guide-item {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 12px;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .guide-item:hover { border-color: var(--border2); }
  .guide-header {
    padding: 16px 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .guide-header-left { display: flex; align-items: center; gap: 14px; }
  .guide-header-icon { font-size: 20px; width: 36px; text-align: center; }
  .guide-header-text h3 { font-size: 15px; font-weight: 600; margin-bottom: 2px; }
  .guide-header-text p { font-size: 12px; color: var(--text-dim); }
  .guide-body { padding: 0 20px 20px; border-top: 1px solid var(--border); }
  .guide-body p { font-size: 13px; color: var(--text-dim); line-height: 1.6; margin-bottom: 12px; margin-top: 12px; }
  .guide-body ul { padding-left: 18px; font-size: 13px; color: var(--text-dim); line-height: 1.7; }

  /* ── MODELO 721 ── */
  .modelo-box {
    background: linear-gradient(135deg, #0e1220, #1a1408);
    border: 1px solid var(--gold-dim);
    border-radius: var(--radius);
    padding: 24px;
    text-align: center;
  }
  .modelo-amount { font-family: var(--font-display); font-size: 42px; font-weight: 700; margin: 12px 0; }
  
  /* ── EMPTY STATE ── */
  .empty-state {
    text-align: center;
    padding: 60px 20px;
  }
  .empty-icon { font-size: 56px; margin-bottom: 16px; opacity: 0.4; }
  .empty-title { font-family: var(--font-display); font-size: 20px; color: var(--text-dim); margin-bottom: 8px; }
  .empty-sub { font-size: 13px; color: var(--text-muted); max-width: 320px; margin: 0 auto 24px; line-height: 1.5; }

  /* ── PRIVACY NOTICE ── */
  .privacy-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 10px 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    font-size: 12px;
    color: var(--text-dim);
    z-index: 100;
  }
  .privacy-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); }

  /* ── MISC ── */
  .tag {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
  }
  .tag-sell { background: var(--blue-dim); color: var(--blue); }
  .tag-swap { background: #1f1535; color: var(--purple); }
  .tag-staking { background: var(--green-dim); color: var(--green); }
  .tag-airdrop { background: #2a1a08; color: var(--orange); }
  .tag-mining { background: #1a1a2e; color: #7a9eff; }
  .tag-nft { background: #2a0e2e; color: #e040fb; }
  .tag-regalo { background: #2a1a1a; color: var(--red); }

  .separator { height: 1px; background: var(--border); margin: 24px 0; }

  .tooltip-text {
    font-size: 12px;
    color: var(--gold2);
    cursor: help;
    border-bottom: 1px dashed var(--gold-dim);
  }

  .report-section {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 16px;
  }
  .report-section h3 {
    font-family: var(--font-display);
    font-size: 16px;
    color: var(--gold2);
    margin-bottom: 14px;
  }

  @media (max-width: 600px) {
    .form-grid, .form-grid-3 { grid-template-columns: 1fr; }
    .stats-row { grid-template-columns: 1fr 1fr; }
    .op-grid { grid-template-columns: 1fr 1fr; }
    .nav-tab span { display: none; }
  }
`;

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & TAX DATA
// ═══════════════════════════════════════════════════════════════

const BRACKETS_AHORRO_2024 = [
  { max: 6000, rate: 0.19, label: "Hasta 6.000 €" },
  { max: 50000, rate: 0.21, label: "6.000 € – 50.000 €" },
  { max: 200000, rate: 0.23, label: "50.000 € – 200.000 €" },
  { max: 300000, rate: 0.27, label: "200.000 € – 300.000 €" },
  { max: Infinity, rate: 0.30, label: "Más de 300.000 €" },
];

const OPERATION_TYPES = [
  {
    id: "compraventa",
    icon: "💱",
    name: "Compraventa",
    desc: "Venta de cripto por €, dólares u otras monedas fiat",
    casilla: "1800",
    base: "ahorro",
    badgeType: "ahorro",
    badgeLabel: "Base Ahorro",
  },
  {
    id: "permuta",
    icon: "🔄",
    name: "Permuta (Swap)",
    desc: "Intercambio de una cripto por otra distinta",
    casilla: "1800",
    base: "ahorro",
    badgeType: "ahorro",
    badgeLabel: "Base Ahorro",
  },
  {
    id: "pago",
    icon: "🛒",
    name: "Pago con cripto",
    desc: "Usaste cripto para comprar bienes o servicios",
    casilla: "1800",
    base: "ahorro",
    badgeType: "ahorro",
    badgeLabel: "Base Ahorro",
  },
  {
    id: "staking",
    icon: "📈",
    name: "Staking / Lending",
    desc: "Recompensas por bloquear o prestar criptos",
    casilla: "0033",
    base: "ahorro",
    badgeType: "ahorro",
    badgeLabel: "Base Ahorro",
  },
  {
    id: "airdrop",
    icon: "🎁",
    name: "Airdrop / Hardfork",
    desc: "Criptos recibidas sin contraprestación",
    casilla: "1626",
    base: "ahorro",
    badgeType: "ahorro",
    badgeLabel: "Base Ahorro",
  },
  {
    id: "mineria",
    icon: "⛏️",
    name: "Minería",
    desc: "Ingresos por minar criptomonedas",
    casilla: "Activ. Económica",
    base: "general",
    badgeType: "general",
    badgeLabel: "Base General",
  },
  {
    id: "nft",
    icon: "🖼️",
    name: "NFT",
    desc: "Compraventa o creación/royalties de NFTs",
    casilla: "1800",
    base: "ahorro",
    badgeType: "ahorro",
    badgeLabel: "Base Ahorro",
  },
  {
    id: "defi",
    icon: "🏦",
    name: "DeFi / Liquidity",
    desc: "Pools de liquidez, yield farming, préstamos",
    casilla: "0033 / 1800",
    base: "ahorro",
    badgeType: "ahorro",
    badgeLabel: "Base Ahorro",
  },
];

const GUIDE_ITEMS = [
  {
    icon: "📋",
    casilla: "Casilla 1800–1814",
    title: "Ganancias y pérdidas patrimoniales",
    subtitle: "Ventas, permutas, pagos con cripto, NFTs",
    content: `Esta es la casilla principal para el 90% de los inversores en cripto. Aquí declaras toda operación en la que "transmites" (vendes, intercambias o usas) una criptomoneda.

La ganancia o pérdida se calcula así:
• Valor de transmisión (precio de venta / valor de mercado al momento de la operación)
• MENOS Valor de adquisición (precio de compra + comisiones)
• = Ganancia o Pérdida Patrimonial

IMPORTANTE: La permuta cripto-cripto también tributa aquí. Si cambias BTC por ETH, Hacienda considera que "vendes" el BTC al precio de mercado en ese momento.

Método de valoración: Se aplica el método FIFO (First In, First Out). Las primeras unidades que compraste son las primeras que se consideran vendidas.

La casilla 1804 es donde introduces cada operación individual con: nombre del activo, fecha de adquisición, fecha de transmisión, valor de adquisición y valor de transmisión.`,
    tips: [
      "Guarda TODOS los históricos de tus operaciones (screenshots, CSVs de exchanges)",
      "Incluye las comisiones en el valor de adquisición para reducir la base imponible",
      "Las pérdidas también deben declararse — pueden compensar ganancias futuras hasta 4 años",
      "Holding (solo comprar y no vender) NO tributa en el IRPF",
    ],
  },
  {
    icon: "💰",
    casilla: "Casilla 0033",
    title: "Staking, Lending y Liquidity Pools",
    subtitle: "Rendimientos del capital mobiliario",
    content: `Las recompensas de staking tributan como Rendimientos del Capital Mobiliario, según la consulta vinculante DGT V1766-22. La DGT equipara el staking a un depósito retribuido.

¿Cuándo tributa? En el momento de recibir las recompensas, al valor de mercado en ese momento. Posteriormente, cuando vendas esas recompensas, generarás una ganancia/pérdida por la diferencia entre el precio de recepción y el de venta (eso va a casilla 1800).

Ejemplo: Recibes 0,22 ETH valorados en 156€ como recompensa de staking → 156€ van a casilla 0033 como rendimiento de capital. Si luego vendes esos 0,22 ETH por 99€, tienes una pérdida de 57€ que va a casilla 1800.

Tributa en la base del ahorro (19%-30%), igual que los intereses bancarios.`,
    tips: [
      "Documenta el valor de mercado exacto en el momento de recibir cada recompensa",
      "Los exchanges suelen proporcionar informes de staking — descárgalos todos",
      "Staking directo (validador propio) puede tener tratamiento diferente — consulta asesor",
      "Los intereses de plataformas como Nexo o Celsius también van aquí",
    ],
  },
  {
    icon: "🎁",
    casilla: "Casilla 1626",
    title: "Airdrops y Hardforks",
    subtitle: "Ganancias patrimoniales NO derivadas de transmisión",
    content: `Los airdrops y tokens de hardforks son ganancias patrimoniales que NO derivan de transmisión, según consultas DGT V1948-21 y V0648-24.

¿Por qué importa la diferencia? Porque estas ganancias NO se pueden compensar con pérdidas de la casilla 1800. Tienen una base imponible separada.

La ganancia se calcula al valor de mercado en el momento de recibir los tokens. Si el airdrop tiene precio 0 (token sin mercado), el valor sería 0.

Hardforks: Cuando recibes Bitcoin Cash por ser holder de Bitcoin, ese BCH recibido tributa como ganancia no derivada de transmisión al valor de mercado en el momento de recepción.`,
    tips: [
      "Los airdrops sin valor de mercado real pueden declararse a 0€",
      "Guarda registro de la fecha y cantidad de cada airdrop recibido",
      "Algunos airdrops requieren hacer una acción (completar tareas) — podrían ser rendimientos del trabajo",
      "Los referral rewards pueden tener un tratamiento diferente — consulta especialista",
    ],
  },
  {
    icon: "⛏️",
    casilla: "Modelo 130 + Renta",
    title: "Minería de Criptomonedas",
    subtitle: "Actividad económica — Base General",
    content: `La minería profesional o habitual de criptomonedas se considera actividad económica y tributa en la BASE GENERAL del IRPF, con tipos entre 19% y 47%.

Obligaciones trimestrales: Modelo 130 de pago fraccionado — cada trimestre adelantas el 20% de tus beneficios a Hacienda.

Gastos deducibles: Hardware de minería, electricidad, internet, software, amortizaciones del equipo.

¿Cuándo se tributa? En el momento de recibir las monedas minadas (al valor de mercado en ese momento). La posterior venta genera una ganancia/pérdida patrimonial (casilla 1800).

IVA: La minería está exenta de IVA, por lo que NO puedes deducir el IVA soportado en las compras (hay excepciones en estimación directa).`,
    tips: [
      "Si minas de forma ocasional y no habitual, puede no considerarse actividad económica",
      "El límite es difuso — consulta con un asesor para tu caso concreto",
      "Debes darte de alta en Hacienda con el epígrafe correspondiente",
      "Guarda todas las facturas de electricidad y hardware",
    ],
  },
  {
    icon: "🌍",
    casilla: "Modelo 721",
    title: "Modelo 721 — Cripto en el Extranjero",
    subtitle: "Obligatorio si tienes >50.000€ en exchanges extranjeros",
    content: `El Modelo 721 es una declaración informativa (no pagas impuestos con él) sobre criptomonedas custodiadas en exchanges o plataformas extranjeras.

¿Cuándo es obligatorio? Si el 31 de diciembre del año fiscal tienes más de 50.000€ en criptomonedas en plataformas fuera de España.

Plazo: Del 1 de enero al 31 de marzo del año siguiente al ejercicio declarado.

¿Qué incluir? El saldo total de cada criptomoneda, la entidad custodia, el país, y el valor en euros a 31 de diciembre.

Sanciones por no presentar: Hasta 5.000€ por cada dato omitido, con un mínimo de 10.000€. Muy importante cumplir con esta obligación.

Exchanges españoles o europeos regulados (como Bit2Me) pueden tener tratamiento diferente — verifica su sede fiscal.`,
    tips: [
      "Binance tiene sede en Islas Caimán/Malta — seguramente debes presentar el 721",
      "Si tienes criptos en tu propia wallet (cold wallet), NO debes presentar el 721",
      "Coinbase EU tiene sede en Irlanda — obligatorio si superas 50.000€",
      "El 721 no sustituye la declaración de IRPF — son complementarios",
    ],
  },
  {
    icon: "⚖️",
    casilla: "Compensación",
    title: "Compensación de Pérdidas",
    subtitle: "Estrategia legal para reducir tu factura fiscal",
    content: `La compensación de pérdidas es una de las herramientas más importantes para optimizar tu fiscalidad cripto legalmente.

Compensación en el mismo ejercicio: Las pérdidas patrimoniales (casilla 1800) se compensan directamente con las ganancias del mismo año.

Compensación en ejercicios futuros: Si el resultado total es negativo, puedes compensar esas pérdidas contra ganancias de los 4 años siguientes.

Límite de compensación cruzada (base ahorro): Las pérdidas patrimoniales pueden compensar hasta el 25% de los rendimientos de capital (staking, etc.) si el saldo de pérdidas excede las ganancias de transmisión.

Regla antielusión 2 meses: Si vendes con pérdida y recompras el mismo activo en los 2 meses siguientes, NO puedes aplicar la compensación.`,
    tips: [
      "La pérdida sigue 'viva' aunque no la declares — pero declarándola la activas para futuros años",
      "Puedes vender en pérdida en diciembre para compensar ganancias del año y recomprar en febrero",
      "Los NFTs y criptos son activos homogéneos — revisa la regla de los 2 meses con tu asesor",
      "Lleva un registro histórico de pérdidas pendientes de compensar",
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function calcTax(gain) {
  if (gain <= 0) return 0;
  let tax = 0;
  let remaining = gain;
  let prev = 0;
  for (const bracket of BRACKETS_AHORRO_2024) {
    const max = bracket.max === Infinity ? remaining : Math.min(bracket.max - prev, remaining);
    if (max <= 0) break;
    tax += max * bracket.rate;
    remaining -= max;
    prev = bracket.max;
    if (remaining <= 0) break;
  }
  return tax;
}

function formatEUR(val) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(val);
}

function formatNum(val) {
  if (!val && val !== 0) return "—";
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(val);
}

function getActiveBracket(gain) {
  if (gain <= 0) return -1;
  let prev = 0;
  for (let i = 0; i < BRACKETS_AHORRO_2024.length; i++) {
    if (gain <= BRACKETS_AHORRO_2024[i].max) return i;
    prev = BRACKETS_AHORRO_2024[i].max;
  }
  return BRACKETS_AHORRO_2024.length - 1;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// ═══════════════════════════════════════════════════════════════
// INITIAL STATE & REDUCER
// ═══════════════════════════════════════════════════════════════

const initialState = {
  operations: [],
  year: "2024",
};

function reducer(state, action) {
  switch (action.type) {
    case "ADD_OPERATION":
      return { ...state, operations: [...state.operations, { id: generateId(), ...action.payload }] };
    case "DELETE_OPERATION":
      return { ...state, operations: state.operations.filter((o) => o.id !== action.id) };
    case "SET_YEAR":
      return { ...state, year: action.year };
    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ── OPERATION FORM ──
function OperationForm({ onAdd }) {
  const [step, setStep] = useState(0); // 0=type, 1=details
  const [opType, setOpType] = useState(null);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);

  const op = OPERATION_TYPES.find((o) => o.id === opType);

  function handleTypeSelect(id) {
    setOpType(id);
    setForm({});
    setResult(null);
    setStep(1);
  }

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setResult(null);
  }

  function calculate() {
    const acq = parseFloat(form.acquisitionValue) || 0;
    const trans = parseFloat(form.transmissionValue) || 0;
    const fees = parseFloat(form.fees) || 0;
    let gain = 0;
    let details = {};

    if (opType === "compraventa" || opType === "permuta" || opType === "pago" || opType === "nft") {
      const costBasis = acq + fees;
      gain = trans - costBasis;
      details = {
        costBasis,
        transmissionValue: trans,
        gain,
        casilla: "1800",
        taxType: "Ganancia/Pérdida Patrimonial",
      };
    } else if (opType === "staking" || opType === "defi") {
      gain = trans; // reward value at receipt
      details = {
        rewardValue: trans,
        gain,
        casilla: "0033",
        taxType: "Rendimiento Capital Mobiliario",
      };
    } else if (opType === "airdrop") {
      gain = trans;
      details = {
        rewardValue: trans,
        gain,
        casilla: "1626",
        taxType: "Ganancia Patrimonial no derivada de transmisión",
      };
    } else if (opType === "mineria") {
      gain = trans;
      details = {
        rewardValue: trans,
        gain,
        casilla: "Actividad Económica",
        taxType: "Rendimiento Actividad Económica",
      };
    }

    const estimatedTax = calcTax(Math.max(gain, 0));
    setResult({ ...details, estimatedTax });
  }

  function handleAdd() {
    if (!result) return;
    const opTypeObj = OPERATION_TYPES.find((o) => o.id === opType);
    onAdd({
      type: opType,
      typeName: opTypeObj.name,
      asset: form.asset || "—",
      date: form.date || "—",
      acquisitionValue: parseFloat(form.acquisitionValue) || 0,
      transmissionValue: parseFloat(form.transmissionValue) || 0,
      fees: parseFloat(form.fees) || 0,
      gain: result.gain,
      casilla: result.casilla,
      notes: form.notes || "",
    });
    setStep(0);
    setOpType(null);
    setForm({});
    setResult(null);
  }

  if (step === 0) {
    return (
      <div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">¿Qué operación quieres añadir?</div>
              <div className="card-subtitle">Selecciona el tipo de transacción que realizaste</div>
            </div>
          </div>
          <div className="op-grid">
            {OPERATION_TYPES.map((op) => (
              <div key={op.id} className="op-card" onClick={() => handleTypeSelect(op.id)}>
                <div className={`op-badge ${op.badgeType}`}>{op.badgeLabel}</div>
                <div className="op-icon">{op.icon}</div>
                <div className="op-name">{op.name}</div>
                <div className="op-desc">{op.desc}</div>
                <div style={{ marginTop: 10 }}>
                  <span className={`casilla ${op.badgeType === "ahorro" ? "" : op.badgeType === "general" ? "purple" : ""}`}>
                    {op.casilla}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Details form
  const needsAcquisition = ["compraventa", "permuta", "pago", "nft"].includes(opType);
  const isIncome = ["staking", "airdrop", "mineria", "defi"].includes(opType);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">
            {op?.icon} {op?.name}
          </div>
          <div className="card-subtitle">
            Casilla: <span className="casilla">{op?.casilla}</span> · {op?.badgeLabel}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setStep(0)}>
          ← Cambiar tipo
        </button>
      </div>

      {opType === "permuta" && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          <strong>⚠️ Permuta cripto-cripto:</strong> Aunque no conviertas a euros, Hacienda considera que vendes la cripto entregada a su valor de mercado en el momento del intercambio. Debes declararlo.
        </div>
      )}
      {opType === "staking" && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          <strong>ℹ️ DGT V1766-22:</strong> Las recompensas de staking tributan como Rendimiento del Capital Mobiliario al valor de mercado en el momento de recepción. Si posteriormente vendes esas recompensas, esa plusvalía va a casilla 1800.
        </div>
      )}
      {opType === "airdrop" && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <strong>⚠️ Consulta V0648-24:</strong> Los airdrops sin contraprestación son ganancias patrimoniales NO derivadas de transmisión. Si el token no tiene precio de mercado en el momento de recepción, el valor puede ser 0€.
        </div>
      )}
      {opType === "mineria" && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <strong>⚠️ Actividad Económica:</strong> La minería tributa en base general (hasta 47%). Además debes presentar Modelo 130 trimestralmente adelantando el 20% de beneficios.
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Criptomoneda / Activo</label>
          <input
            className="form-input"
            placeholder="Ej: BTC, ETH, SOL..."
            value={form.asset || ""}
            onChange={(e) => setField("asset", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Fecha de operación</label>
          <input
            type="date"
            className="form-input"
            value={form.date || ""}
            onChange={(e) => setField("date", e.target.value)}
          />
        </div>
      </div>

      {needsAcquisition && (
        <div className="form-grid-3">
          <div className="form-group">
            <label className="form-label">Valor de adquisición (€)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0.00"
              value={form.acquisitionValue || ""}
              onChange={(e) => setField("acquisitionValue", e.target.value)}
            />
            <div className="form-hint">Precio al que compraste (en €)</div>
          </div>
          <div className="form-group">
            <label className="form-label">Valor de transmisión (€)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0.00"
              value={form.transmissionValue || ""}
              onChange={(e) => setField("transmissionValue", e.target.value)}
            />
            <div className="form-hint">
              {opType === "permuta"
                ? "Valor de mercado del cripto entregado en € al momento del swap"
                : "Precio al que vendiste (en €)"}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Comisiones (€)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0.00"
              value={form.fees || ""}
              onChange={(e) => setField("fees", e.target.value)}
            />
            <div className="form-hint">Gas fees, fees de exchange, etc.</div>
          </div>
        </div>
      )}

      {isIncome && (
        <div className="form-group">
          <label className="form-label">Valor de mercado al recibir (€)</label>
          <input
            type="number"
            className="form-input"
            placeholder="0.00"
            value={form.transmissionValue || ""}
            onChange={(e) => setField("transmissionValue", e.target.value)}
          />
          <div className="form-hint">
            Valor en € de las recompensas recibidas en el momento exacto de recepción (mira CoinMarketCap histórico)
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Notas (opcional)</label>
        <input
          className="form-input"
          placeholder="Exchange, contexto, número de operación..."
          value={form.notes || ""}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </div>

      {!result && (
        <button className="btn btn-primary" onClick={calculate}>
          🧮 Calcular
        </button>
      )}

      {result && (
        <div>
          <div className="result-box">
            <div className="result-row">
              <span className="result-key">Tipo fiscal</span>
              <span className="result-val">{result.taxType}</span>
            </div>
            <div className="result-row">
              <span className="result-key">Casilla IRPF</span>
              <span className="result-val">
                <span className="casilla">{result.casilla}</span>
              </span>
            </div>
            {needsAcquisition && (
              <>
                <div className="result-row">
                  <span className="result-key">Coste de adquisición total</span>
                  <span className="result-val">{formatEUR(result.costBasis)}</span>
                </div>
                <div className="result-row">
                  <span className="result-key">Valor de transmisión</span>
                  <span className="result-val">{formatEUR(result.transmissionValue)}</span>
                </div>
              </>
            )}
            {isIncome && (
              <div className="result-row">
                <span className="result-key">Valor recibido</span>
                <span className="result-val">{formatEUR(result.rewardValue)}</span>
              </div>
            )}
            <div className="result-row">
              <span className="result-key">Base imponible</span>
              <span className={`result-val ${result.gain >= 0 ? "gain" : "loss"}`}>
                {result.gain >= 0 ? "+" : ""}
                {formatEUR(result.gain)}
              </span>
            </div>
            <div className="result-row total">
              <span className="result-key">Impuesto estimado</span>
              <span className="result-val" style={{ color: "var(--gold2)" }}>
                {formatEUR(result.estimatedTax)}
              </span>
            </div>
          </div>

          {result.gain < 0 && (
            <div className="alert alert-success">
              ✅ <strong>Pérdida patrimonial:</strong> {formatEUR(Math.abs(result.gain))} que puedes compensar con ganancias de este año o los próximos 4 ejercicios.
            </div>
          )}

          {result.gain > 0 && (
            <div className="alert alert-gold">
              💡 <strong>Consejo:</strong> Si tienes otras operaciones con pérdidas en el mismo ejercicio, puedes compensarlas para reducir esta base imponible.
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleAdd}>
              ✅ Añadir a mi declaración
            </button>
            <button className="btn btn-secondary" onClick={() => setResult(null)}>
              ✏️ Editar datos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD ──
function Dashboard({ operations, year, onDeleteOp }) {
  const summary = useMemo(() => {
    const gains1800 = operations.filter((o) => o.casilla === "1800").reduce((s, o) => s + (o.gain > 0 ? o.gain : 0), 0);
    const losses1800 = operations.filter((o) => o.casilla === "1800").reduce((s, o) => s + (o.gain < 0 ? o.gain : 0), 0);
    const net1800 = gains1800 + losses1800;
    const income0033 = operations.filter((o) => o.casilla === "0033").reduce((s, o) => s + o.gain, 0);
    const income1626 = operations.filter((o) => o.casilla === "1626").reduce((s, o) => s + o.gain, 0);
    const totalBase = Math.max(net1800 + income0033 + income1626, 0);
    const totalTax = calcTax(totalBase);
    const activeBracket = getActiveBracket(totalBase);
    const marginalRate = activeBracket >= 0 ? BRACKETS_AHORRO_2024[activeBracket].rate : 0;
    const patrimonio721 = operations
      .filter((o) => ["compraventa", "permuta", "staking", "defi"].includes(o.type))
      .reduce((s, o) => s + Math.abs(o.transmissionValue || 0), 0);

    return { gains1800, losses1800, net1800, income0033, income1626, totalBase, totalTax, activeBracket, marginalRate, patrimonio721 };
  }, [operations]);

  if (operations.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🛡️</div>
        <div className="empty-title">Tu declaración está vacía</div>
        <div className="empty-sub">
          Añade tus operaciones con criptomonedas para calcular tu fiscalidad y saber exactamente qué casillas rellenar en la renta.
        </div>
        <div className="alert alert-gold" style={{ maxWidth: 420, margin: "0 auto", textAlign: "left" }}>
          <strong>🔒 Privacidad garantizada:</strong> Todos tus datos se procesan únicamente en tu navegador. Ningún dato sale de tu dispositivo.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-label">Base imponible total</div>
          <div className={`stat-value ${summary.totalBase > 0 ? "gold" : "green"}`}>{formatEUR(summary.totalBase)}</div>
          <div className="stat-sub">Base del ahorro</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Impuesto estimado</div>
          <div className={`stat-value ${summary.totalTax > 0 ? "red" : "green"}`}>{formatEUR(summary.totalTax)}</div>
          <div className="stat-sub">
            Tipo marginal: {summary.activeBracket >= 0 ? `${(summary.marginalRate * 100).toFixed(0)}%` : "—"}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Ganancias (1800)</div>
          <div className="stat-value green">{formatEUR(summary.gains1800)}</div>
          <div className="stat-sub">Transmisiones con beneficio</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Pérdidas (1800)</div>
          <div className="stat-value red">{formatEUR(Math.abs(summary.losses1800))}</div>
          <div className="stat-sub">Compensables hasta 4 años</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Staking / DeFi</div>
          <div className="stat-value blue">{formatEUR(summary.income0033)}</div>
          <div className="stat-sub">Casilla 0033</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Operaciones</div>
          <div className="stat-value gold">{operations.length}</div>
          <div className="stat-sub">Total introducidas</div>
        </div>
      </div>

      {/* Modelo 721 warning */}
      {summary.patrimonio721 > 40000 && (
        <div className={`alert ${summary.patrimonio721 > 50000 ? "alert-danger" : "alert-warning"}`}>
          {summary.patrimonio721 > 50000 ? "🚨" : "⚠️"} <strong>Modelo 721:</strong>{" "}
          {summary.patrimonio721 > 50000
            ? `Tus operaciones superan los 50.000€. Si mantienes ese patrimonio en exchanges extranjeros a 31/12/${year}, debes presentar el Modelo 721 antes del 31 de marzo.`
            : `Tus operaciones se acercan al umbral de 50.000€ para el Modelo 721. Vigila el saldo a 31 de diciembre.`}
        </div>
      )}

      {/* Bracket table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Tramos de tributación — Base del Ahorro {year}</div>
            <div className="card-subtitle">Cómo se calcula tu IRPF por criptomonedas</div>
          </div>
        </div>
        <table className="bracket-table">
          <thead>
            <tr>
              <th>Tramo</th>
              <th>Tipo</th>
              <th>Base aplicable</th>
              <th>Cuota tramo</th>
            </tr>
          </thead>
          <tbody>
            {BRACKETS_AHORRO_2024.map((b, i) => {
              const prev = i === 0 ? 0 : BRACKETS_AHORRO_2024[i - 1].max;
              const applicable = Math.max(0, Math.min(summary.totalBase - prev, b.max === Infinity ? summary.totalBase - prev : b.max - prev));
              const quota = applicable * b.rate;
              return (
                <tr key={i} className={i === summary.activeBracket && summary.totalBase > 0 ? "active-bracket" : ""}>
                  <td>{b.label}</td>
                  <td style={{ fontWeight: 700 }}>{(b.rate * 100).toFixed(0)}%</td>
                  <td>{applicable > 0 ? formatEUR(applicable) : "—"}</td>
                  <td>{applicable > 0 ? formatEUR(quota) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Operations list */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Operaciones introducidas</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{operations.length} operaciones · Ejercicio {year}</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="ops-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Activo</th>
                <th>Adquisición</th>
                <th>Transmisión</th>
                <th>G/P Neta</th>
                <th>Casilla</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op) => (
                <tr key={op.id}>
                  <td style={{ color: "var(--text-dim)", fontSize: 12 }}>{op.date}</td>
                  <td>
                    <span className={`tag tag-${op.type}`}>{op.typeName}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{op.asset}</td>
                  <td>{["compraventa", "permuta", "pago", "nft"].includes(op.type) ? formatEUR(op.acquisitionValue) : "—"}</td>
                  <td>{formatEUR(op.transmissionValue)}</td>
                  <td className={op.gain >= 0 ? "gain" : "loss"}>
                    {op.gain >= 0 ? "+" : ""}
                    {formatEUR(op.gain)}
                  </td>
                  <td>
                    <span className="casilla">{op.casilla}</span>
                  </td>
                  <td>
                    <button className="btn btn-icon btn-sm" onClick={() => onDeleteOp(op.id)}>
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── GUIDE ──
function Guide() {
  const [open, setOpen] = useState(null);
  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">🎓 Guía Fiscal Cripto España 2024/2025</div>
            <div className="card-subtitle">Basada en normativa AEAT, consultas DGT y legislación vigente</div>
          </div>
        </div>
        <div className="alert alert-gold">
          <strong>📌 Principio básico:</strong> En España, cualquier operación con criptomonedas que genere un incremento de patrimonio está sujeta a tributación. NO existe un mínimo exento específico para cripto — si generas ganancia, tributa.
        </div>
        <div className="alert alert-info">
          <strong>🔑 Regla de oro:</strong> Si solo compras y hodleas sin vender ni intercambiar, NO declaras en el IRPF (pero quizás sí el Modelo 721 si superas 50.000€ en exchanges extranjeros).
        </div>
      </div>

      {GUIDE_ITEMS.map((item, i) => (
        <div key={i} className="guide-item">
          <div className="guide-header" onClick={() => setOpen(open === i ? null : i)}>
            <div className="guide-header-left">
              <div className="guide-header-icon">{item.icon}</div>
              <div className="guide-header-text">
                <h3>
                  {item.title}{" "}
                  <span className="casilla" style={{ marginLeft: 8, fontSize: 10 }}>
                    {item.casilla}
                  </span>
                </h3>
                <p>{item.subtitle}</p>
              </div>
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 18 }}>{open === i ? "▲" : "▼"}</div>
          </div>
          {open === i && (
            <div className="guide-body">
              <p>{item.content}</p>
              <div className="separator" />
              <strong style={{ fontSize: 12, color: "var(--gold2)", textTransform: "uppercase", letterSpacing: 1 }}>
                💡 Consejos prácticos:
              </strong>
              <ul style={{ marginTop: 8 }}>
                {item.tips.map((tip, j) => (
                  <li key={j}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>
          📅 Modelos y plazos clave
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {[
            { modelo: "Modelo 100", color: "var(--blue)", desc: "IRPF anual — operaciones cripto", plazo: "Abril–Junio del año siguiente", casillas: "0033, 1800, 1626" },
            { modelo: "Modelo 721", color: "var(--orange)", desc: "Cripto en exchanges extranjeros >50.000€", plazo: "Enero–Marzo del año siguiente", casillas: "Informativo" },
            { modelo: "Modelo 172", color: "var(--green)", desc: "Saldos en monedas virtuales (exchanges)", plazo: "Presentado por el exchange", casillas: "Informativo" },
            { modelo: "Modelo 173", color: "var(--purple)", desc: "Operaciones con monedas virtuales", plazo: "Presentado por el exchange", casillas: "Informativo" },
            { modelo: "Modelo 130", color: "var(--red)", desc: "Pago fraccionado mineros / traders pro", plazo: "Trimestral (abr, jul, oct, ene)", casillas: "Actividad económica" },
          ].map((m, i) => (
            <div key={i} style={{ background: "var(--surface2)", borderRadius: 10, padding: 16, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: m.color, marginBottom: 6 }}>{m.modelo}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>{m.desc}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>⏰ {m.plazo}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>📌 {m.casillas}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── REPORT ──
function Report({ operations, year }) {
  const summary = useMemo(() => {
    const items1800 = operations.filter((o) => o.casilla === "1800");
    const items0033 = operations.filter((o) => o.casilla === "0033");
    const items1626 = operations.filter((o) => o.casilla === "1626");
    const gains = items1800.filter((o) => o.gain > 0).reduce((s, o) => s + o.gain, 0);
    const losses = items1800.filter((o) => o.gain < 0).reduce((s, o) => s + o.gain, 0);
    const net1800 = gains + losses;
    const total0033 = items0033.reduce((s, o) => s + o.gain, 0);
    const total1626 = items1626.reduce((s, o) => s + o.gain, 0);
    const totalBase = Math.max(net1800 + total0033 + total1626, 0);
    const totalTax = calcTax(totalBase);
    const needsM721 = operations.some((o) => o.transmissionValue > 0) && operations.reduce((s, o) => s + (o.transmissionValue || 0), 0) > 50000;

    return { items1800, items0033, items1626, gains, losses, net1800, total0033, total1626, totalBase, totalTax, needsM721 };
  }, [operations]);

  function downloadReport() {
    const lines = [
      `ANGEL TAX — INFORME FISCAL CRIPTO ${year}`,
      `Generado: ${new Date().toLocaleDateString("es-ES")}`,
      `${"═".repeat(50)}`,
      ``,
      `RESUMEN`,
      `Ganancias patrimoniales (1800): ${formatEUR(summary.gains)}`,
      `Pérdidas patrimoniales (1800): ${formatEUR(summary.losses)}`,
      `Neto casilla 1800: ${formatEUR(summary.net1800)}`,
      `Staking/Lending (0033): ${formatEUR(summary.total0033)}`,
      `Airdrops (1626): ${formatEUR(summary.total1626)}`,
      `BASE IMPONIBLE TOTAL: ${formatEUR(summary.totalBase)}`,
      `IMPUESTO ESTIMADO: ${formatEUR(summary.totalTax)}`,
      ``,
      `MODELO 721 REQUERIDO: ${summary.needsM721 ? "SÍ" : "No (verificar saldo a 31/12)"}`,
      ``,
      `${"─".repeat(50)}`,
      `OPERACIONES DETALLADAS`,
      `${"─".repeat(50)}`,
      ...operations.map(
        (o) =>
          `${o.date} | ${o.typeName} | ${o.asset} | ${o.gain >= 0 ? "+" : ""}${formatEUR(o.gain)} | Casilla: ${o.casilla}`
      ),
      ``,
      `DISCLAIMER: Este informe es orientativo. Consulta un asesor fiscal certificado.`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AngelTax_Informe_${year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (operations.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📄</div>
        <div className="empty-title">Sin operaciones para generar informe</div>
        <div className="empty-sub">Añade operaciones en la pestaña "Nueva Operación" para generar tu informe fiscal.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">📄 Informe Fiscal — Ejercicio {year}</div>
            <div className="card-subtitle">Resumen para rellenar tu declaración de la renta</div>
          </div>
          <button className="btn btn-primary" onClick={downloadReport}>
            ⬇️ Descargar .txt
          </button>
        </div>
      </div>

      {/* Casilla 1800 */}
      <div className="report-section">
        <h3>
          Casilla <span className="casilla">1800–1814</span> — Ganancias y pérdidas patrimoniales por transmisión
        </h3>
        <div className="result-box">
          <div className="result-row">
            <span className="result-key">Ganancias totales</span>
            <span className="result-val gain">{formatEUR(summary.gains)}</span>
          </div>
          <div className="result-row">
            <span className="result-key">Pérdidas totales</span>
            <span className="result-val loss">{formatEUR(summary.losses)}</span>
          </div>
          <div className="result-row total">
            <span className="result-key">Resultado neto casilla 1800</span>
            <span className={`result-val ${summary.net1800 >= 0 ? "gain" : "loss"}`}>
              {summary.net1800 >= 0 ? "+" : ""}
              {formatEUR(summary.net1800)}
            </span>
          </div>
        </div>
        <div className="alert alert-info">
          <strong>Cómo rellenar:</strong> En la renta web, ve a Ganancias y pérdidas patrimoniales → Monedas virtuales → Casilla 1804. Introduce cada operación individualmente con: nombre activo, tipo de contraprestación, fecha adquisición/transmisión, valores de adquisición y transmisión.
        </div>
      </div>

      {/* Casilla 0033 */}
      {summary.total0033 > 0 && (
        <div className="report-section">
          <h3>
            Casilla <span className="casilla">0033</span> — Rendimientos del capital mobiliario (Staking/Lending)
          </h3>
          <div className="result-box">
            <div className="result-row total">
              <span className="result-key">Total rendimientos (staking, lending, LP)</span>
              <span className="result-val blue">{formatEUR(summary.total0033)}</span>
            </div>
          </div>
          <div className="alert alert-info">
            <strong>Cómo rellenar:</strong> En la renta web, ve a Rendimientos del capital mobiliario → Rendimientos por cesión de capitales → Casilla 0033.
          </div>
        </div>
      )}

      {/* Casilla 1626 */}
      {summary.total1626 > 0 && (
        <div className="report-section">
          <h3>
            Casilla <span className="casilla">1626</span> — Airdrops y Hardforks
          </h3>
          <div className="result-box">
            <div className="result-row total">
              <span className="result-key">Total airdrops/hardforks</span>
              <span className="result-val" style={{ color: "var(--orange)" }}>
                {formatEUR(summary.total1626)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TOTAL */}
      <div className="modelo-box">
        <div style={{ fontSize: 12, color: "var(--gold)", textTransform: "uppercase", letterSpacing: 2 }}>
          Base Imponible Total Estimada
        </div>
        <div className={`modelo-amount ${summary.totalBase > 0 ? "gold" : "green"}`} style={{ color: summary.totalBase > 0 ? "var(--gold2)" : "var(--green)" }}>
          {formatEUR(summary.totalBase)}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: summary.totalTax > 0 ? "var(--red)" : "var(--green)", marginBottom: 16 }}>
          Cuota IRPF estimada: {formatEUR(summary.totalTax)}
        </div>
        <div className="alert alert-warning" style={{ textAlign: "left", maxWidth: 500, margin: "0 auto" }}>
          ⚠️ <strong>Importante:</strong> Este cálculo es una estimación. El IRPF total incluye también tus rentas del trabajo, inmobiliarias, etc. Usa este resultado como referencia para tu planificación fiscal. Consulta siempre con un asesor.
        </div>
      </div>

      {/* Modelo 721 */}
      <div className={`card`} style={{ marginTop: 20, borderColor: summary.needsM721 ? "var(--red)" : "var(--border)" }}>
        <div className="card-title" style={{ marginBottom: 12 }}>
          🌍 Modelo 721 — Criptomonedas en el Extranjero
        </div>
        {summary.needsM721 ? (
          <div className="alert alert-danger">
            🚨 <strong>PROBABLEMENTE OBLIGATORIO:</strong> Tus operaciones sugieren un patrimonio cripto que podría superar los 50.000€. Si a 31 de diciembre de {year} tu saldo en exchanges extranjeros supera ese umbral, debes presentar el Modelo 721 antes del 31 de marzo de {parseInt(year) + 1}.
          </div>
        ) : (
          <div className="alert alert-success">
            ✅ <strong>Probablemente no obligatorio</strong> este ejercicio, pero verifica tu saldo total a 31 de diciembre. Si supera 50.000€ en exchanges extranjeros, deberás presentarlo.
          </div>
        )}
      </div>

      <div className="alert alert-gold" style={{ marginTop: 16 }}>
        <strong>🛡️ Privacidad:</strong> Este informe se genera completamente en tu dispositivo. Ningún dato ha sido enviado a ningún servidor. Puedes borrar el historial del navegador para eliminar todos los datos.
      </div>
    </div>
  );
}

// ── MODELO 721 CHECKER ──
function Modelo721() {
  const [saldos, setSaldos] = useState([{ exchange: "Binance", pais: "Cayman Islands / Malta", saldo: "" }]);
  const [checked, setChecked] = useState(false);

  function addExchange() {
    setSaldos((s) => [...s, { exchange: "", pais: "", saldo: "" }]);
    setChecked(false);
  }

  function setRow(i, k, v) {
    setSaldos((s) => {
      const ns = [...s];
      ns[i] = { ...ns[i], [k]: v };
      return ns;
    });
    setChecked(false);
  }

  function removeRow(i) {
    setSaldos((s) => s.filter((_, j) => j !== i));
    setChecked(false);
  }

  const total = saldos.reduce((s, r) => s + (parseFloat(r.saldo) || 0), 0);
  const obligatorio = total > 50000;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">🌍 Verificador Modelo 721</div>
            <div className="card-subtitle">¿Debo presentar el Modelo 721 este ejercicio?</div>
          </div>
        </div>
        <div className="alert alert-info">
          <strong>¿Qué es?</strong> El Modelo 721 es la declaración informativa de criptomonedas custodiadas en el extranjero (exchanges y plataformas con sede fuera de España). Es obligatorio si el valor supera los 50.000€ a fecha 31 de diciembre. No implica pagar impuestos, pero no presentarlo puede acarrear multas de hasta 5.000€ por dato omitido.
        </div>
        <div className="alert alert-warning">
          <strong>Exchanges extranjeros habituales:</strong> Binance (Caimán/Malta), Coinbase (Irlanda), Kraken (EEUU), KuCoin (Seychelles), Bybit (Dubai). Bit2Me y BBVA Trader son españoles — no requieren 721.
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Exchange / Plataforma</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>País sede</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Saldo (€) 31/12</div>
            <div></div>
          </div>
          {saldos.map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: 10, marginBottom: 8 }}>
              <input
                className="form-input"
                placeholder="Binance, Kraken..."
                value={row.exchange}
                onChange={(e) => setRow(i, "exchange", e.target.value)}
              />
              <input
                className="form-input"
                placeholder="Cayman Islands..."
                value={row.pais}
                onChange={(e) => setRow(i, "pais", e.target.value)}
              />
              <input
                type="number"
                className="form-input"
                placeholder="0.00"
                value={row.saldo}
                onChange={(e) => setRow(i, "saldo", e.target.value)}
              />
              <button className="btn btn-icon" onClick={() => removeRow(i)}>🗑</button>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={addExchange}>+ Añadir exchange</button>
        </div>

        <button className="btn btn-primary" onClick={() => setChecked(true)}>
          🔍 Verificar obligación
        </button>

        {checked && (
          <div style={{ marginTop: 24 }}>
            <div className={`alert ${obligatorio ? "alert-danger" : "alert-success"}`}>
              {obligatorio ? "🚨" : "✅"} <strong>{obligatorio ? "OBLIGATORIO presentar Modelo 721" : "No obligatorio este ejercicio"}</strong>
              <div style={{ marginTop: 8 }}>
                Patrimonio total declarado en extranjero:{" "}
                <strong style={{ fontSize: 18 }}>{formatEUR(total)}</strong>
                {obligatorio
                  ? " — Supera el umbral de 50.000€. Plazo: 1 enero – 31 marzo del año siguiente."
                  : " — No supera los 50.000€. Asegúrate de revisar el saldo exacto a 31 de diciembre."}
              </div>
            </div>
            {obligatorio && (
              <div className="alert alert-warning">
                <strong>Próximos pasos:</strong>
                <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                  <li>Descarga el histórico anual de cada exchange (suelen tener opción "Tax Report" o "Annual Report")</li>
                  <li>Accede a la Sede Electrónica de la AEAT con tu certificado digital o Cl@ve PIN</li>
                  <li>Busca "Modelo 721" y rellena los datos de cada exchange por separado</li>
                  <li>Indica: nombre del exchange, país, código SWIFT/BIC si lo tienen, y saldo a 31/12</li>
                  <li>Presenta antes del 31 de marzo</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

const TABS = [
  { id: "dashboard", icon: "🏠", label: "Inicio" },
  { id: "add", icon: "➕", label: "Nueva Operación" },
  { id: "report", icon: "📄", label: "Mi Informe" },
  { id: "m721", icon: "🌍", label: "Modelo 721" },
  { id: "guide", icon: "📚", label: "Guía Fiscal" },
];

export default function AngelTax() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [tab, setTab] = useState("dashboard");

  const handleAddOp = useCallback((op) => {
    dispatch({ type: "ADD_OPERATION", payload: op });
    setTab("dashboard");
  }, []);

  const handleDeleteOp = useCallback((id) => {
    dispatch({ type: "DELETE_OPERATION", id });
  }, []);

  return (
    <>
      <style>{FONTS + CSS}</style>
      <div className="app">
        {/* HEADER */}
        <div className="header">
          <div className="logo">
            <div className="logo-icon">🛡️</div>
            <div className="logo-text">
              <h1>Angel Tax</h1>
              <span>Fiscalidad Cripto · España</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
              <span style={{ marginRight: 4 }}>Ejercicio:</span>
              <select
                className="form-select"
                style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}
                value={state.year}
                onChange={(e) => dispatch({ type: "SET_YEAR", year: e.target.value })}
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>
            <div className="header-badge">🔒 100% Local</div>
          </div>
        </div>

        {/* NAV */}
        <div className="nav">
          {TABS.map((t) => (
            <button key={t.id} className={`nav-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.id === "dashboard" && state.operations.length > 0 && (
                <span style={{ background: "var(--gold)", color: "#0a0c14", borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 700 }}>
                  {state.operations.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {tab === "dashboard" && (
          <Dashboard operations={state.operations} year={state.year} onDeleteOp={handleDeleteOp} />
        )}
        {tab === "add" && <OperationForm onAdd={handleAddOp} />}
        {tab === "report" && <Report operations={state.operations} year={state.year} />}
        {tab === "m721" && <Modelo721 />}
        {tab === "guide" && <Guide />}
      </div>

      {/* PRIVACY BAR */}
      <div className="privacy-bar">
        <div className="privacy-dot" />
        <span>
          🔒 <strong>Privacidad total:</strong> Todos los datos se procesan exclusivamente en tu navegador. Ninguna información sale de tu dispositivo.
        </span>
        <span style={{ color: "var(--text-muted)" }}>·</span>
        <span style={{ color: "var(--text-muted)" }}>
          Open Source · <a href="https://github.com/angel-tax/angel-tax" style={{ color: "var(--gold-dim)" }}>GitHub</a>
        </span>
      </div>
    </>
  );
}
