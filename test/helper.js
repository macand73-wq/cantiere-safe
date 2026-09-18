// Carica le funzioni pure di app.js senza un browser.
//
// app.js non e' un modulo: e' uno script che assume window, document e
// window.supabase. Qui lo si valuta in un contesto con quegli oggetti
// finti, poi si leggono le funzioni che interessano dal contesto stesso.
//
// ponytail: stub minimo, non un finto DOM completo. Se un giorno servisse
// testare il rendering, serve un vero headless browser, non piu' stub.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadApp() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  const noop = () => {};
  const fakeEl = {
    value: '', textContent: '', innerHTML: '', style: {}, dataset: {},
    classList: { add: noop, remove: noop, contains: () => false },
    addEventListener: noop, appendChild: noop, remove: noop,
    querySelectorAll: () => [], querySelector: () => null,
  };

  const ctx = {
    console,
    setTimeout, clearTimeout,
    Date, Math, JSON, String, Number, Boolean, Array, Object, RegExp, Error,
    URL, CSS: { escape: (s) => String(s) },
    document: {
      getElementById: () => ({ ...fakeEl }),
      querySelectorAll: () => [],
      querySelector: () => null,
      createElement: () => ({ ...fakeEl }),
      addEventListener: noop,
    },
    navigator: { onLine: true },
    localStorage: { clear: noop, getItem: () => null, setItem: noop },
  };
  ctx.window = ctx;
  // createClient viene chiamato al caricamento: restituisce uno stub inerte.
  ctx.window.supabase = {
    createClient: () => ({
      auth: { onAuthStateChange: noop, getSession: async () => ({ data: { session: null } }) },
      from: () => ({ select: () => ({}) }),
    }),
  };

  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'app.js' });
  return ctx;
}

module.exports = { loadApp };
