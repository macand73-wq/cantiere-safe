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
  // app.js registra i gestori globali di errore su window.
  ctx.addEventListener = noop;
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

// I `let` di app.js vivono nello scope dello script e non sono accessibili
// dall'esterno del contesto vm: per leggerli o scriverli serve eseguire codice
// dentro il contesto stesso.
function valuta(ctx, codice) {
  return vm.runInContext(codice, ctx);
}

// Carica app.js con un DOM costruito dagli id veri di index.html, un client
// Supabase finto che registra le chiamate, e la cattura dei toast: cosi' si
// puo' verificare cosa vede davvero l'utente.
function loadAppConDom() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  const noop = () => {};
  const mk = (id) => ({
    id, value: '', textContent: '', innerHTML: '', style: {}, dataset: {},
    disabled: false,
    classList: { add: noop, remove: noop, contains: () => false },
    addEventListener: noop, appendChild: noop, remove: noop,
    querySelectorAll: () => [], querySelector: () => null,
  });
  const els = {};
  ids.forEach(i => (els[i] = mk(i)));

  const toasts = [];
  els['toast-container'] = { appendChild(el) { toasts.push(el.textContent); } };
  const richieste = [];

  const ctx = {
    console, setTimeout, clearTimeout,
    Date, Math, JSON, String, Number, Boolean, Array, Object, RegExp, Error,
    URL, CSS: { escape: (s) => String(s) },
    document: {
      getElementById: (i) => els[i] || null,
      querySelectorAll: () => [],
      querySelector: () => null,
      createElement: () => mk('new'),
      addEventListener: noop,
    },
    navigator: { onLine: true },
    localStorage: { clear: noop, getItem: () => null, setItem: noop },
    addEventListener: noop,
  };
  ctx.window = ctx;
  ctx.window.supabase = {
    createClient: () => ({
      auth: { onAuthStateChange: noop, getSession: async () => ({ data: { session: null } }) },
      from(tabella) {
        return {
          insert: async (p) => { richieste.push({ tipo: 'insert', tabella, payload: p }); return { error: null }; },
          update(p) { richieste.push({ tipo: 'update', tabella, payload: p }); return { eq: async () => ({ error: null }) }; },
          delete() { return { eq: async () => ({ error: null }) }; },
          select() {
            return {
              eq() { return { order: async () => ({ data: [], error: null }), single: async () => ({ data: {}, error: null }) }; },
              order: async () => ({ data: [], error: null }),
            };
          },
        };
      },
    }),
  };

  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'), ctx, { filename: 'app.js' });
  return { ctx, els, toasts, richieste, valuta: (c) => valuta(ctx, c) };
}

module.exports = { loadApp, loadAppConDom, valuta };
