import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const js = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf-8');

const mockDocument = {
  getElementById: () => ({ innerHTML: '', addEventListener: () => {} }),
  createElement: () => ({ style: {} }),
  body: { appendChild: () => {} }
};

const mockLocalStorage = { getItem: () => null, setItem: () => {} };

const context = {
  console,
  document: mockDocument,
  window: {},
  localStorage: mockLocalStorage,
  Intl: Intl,
  URL: { createObjectURL: () => {} },
  state: {ops:[],lots:[],balances:[],year:'2024',costMethod:'fifo'},
  BRACKETS:null, toNum: null, fmt:null, fmtQty:null, fifoCalc:null, calcTax:null, getSummary:null
};
vm.createContext(context);
vm.runInContext(js, context);
console.log('calcTax(6000)=', context.calcTax(6000));
console.log('calcTax(50000)=', context.calcTax(50000));
context.state.ops.push({casilla:'1800', gain:100});
console.log('summary1', context.getSummary());
context.state.ops.push({casilla:'1800', gain:-50});
console.log('summary2', context.getSummary());
context.state.lots=[{id:'t1',asset:'BTC',date:'2024-01-01',qty:1,qtyRemaining:1,pricePerUnit:30000,totalEur:30000,fees:0}];
console.log('fifo', context.fifoCalc('BTC',0.5,0));
console.log('summary1', context.getSummary());
context.state.ops.push({casilla:'1800', gain:-50});
console.log('summary2', context.getSummary());
context.state.lots=[{id:'t1',asset:'BTC',date:'2024-01-01',qty:1,qtyRemaining:1,pricePerUnit:30000,totalEur:30000,fees:0}];
console.log('fifo', context.fifoCalc('BTC',0.5,0));
