// Test delle funzioni pure di app.js. Non serve backend ne' browser.
//   node --test test/
const { test, describe } = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./helper.js');

const app = loadApp();

describe('escHtml', () => {
  test('neutralizza i metacaratteri HTML', () => {
    assert.strictEqual(app.escHtml('<script>'), '&lt;script&gt;');
    assert.strictEqual(app.escHtml('a & b'), 'a &amp; b');
    assert.strictEqual(app.escHtml('say "hi"'), 'say &quot;hi&quot;');
  });

  test('neutralizza il payload che era sfruttabile nella lista cantieri', () => {
    const out = app.escHtml('<img src=x onerror=alert(1)>');
    // La proprieta' che conta e' che non resti nessun delimitatore di tag:
    // senza < e > il resto e' testo inerte, handler compresi.
    assert.ok(!out.includes('<'), 'nessun < deve sopravvivere');
    assert.ok(!out.includes('>'), 'nessun > deve sopravvivere');
    assert.strictEqual(out, '&lt;img src=x onerror=alert(1)&gt;');
  });

  test('null e undefined diventano stringa vuota, non "null"', () => {
    assert.strictEqual(app.escHtml(null), '');
    assert.strictEqual(app.escHtml(undefined), '');
  });

  test('e\' idempotente sui caratteri gia\' innocui', () => {
    assert.strictEqual(app.escHtml('Cantiere Via Roma 1'), 'Cantiere Via Roma 1');
  });
});

describe('getChecklistByLuogo', () => {
  test('restituisce un template per ogni tipo di luogo', () => {
    for (const luogo of ['cantiere', 'azienda', 'edificio']) {
      const t = app.getChecklistByLuogo(luogo);
      assert.ok(Array.isArray(t) && t.length > 0, `template vuoto per ${luogo}`);
    }
  });

  test('i tre template sono distinti', () => {
    const ids = ['cantiere', 'azienda', 'edificio']
      .map(l => app.getChecklistByLuogo(l)[0].id);
    assert.strictEqual(new Set(ids).size, 3, 'template duplicati');
  });

  test('un luogo sconosciuto ricade su cantiere', () => {
    assert.deepStrictEqual(
      app.getChecklistByLuogo('qualcosa-che-non-esiste'),
      app.getChecklistByLuogo('cantiere')
    );
  });

  test('ogni voce ha id, testo e categoria', () => {
    for (const luogo of ['cantiere', 'azienda', 'edificio']) {
      for (const item of app.getChecklistByLuogo(luogo)) {
        assert.ok(item.id, `voce senza id in ${luogo}`);
        assert.ok(item.categoria, `voce senza categoria in ${luogo}: ${item.id}`);
        // Le voci personalizzabili hanno testo vuoto per progetto.
        if (!item.personalizzabile) {
          assert.ok(item.testo, `voce senza testo in ${luogo}: ${item.id}`);
        }
      }
    }
  });

  test('gli id sono unici dentro ogni template', () => {
    for (const luogo of ['cantiere', 'azienda', 'edificio']) {
      const ids = app.getChecklistByLuogo(luogo).map(i => i.id);
      assert.strictEqual(new Set(ids).size, ids.length, `id duplicati in ${luogo}`);
    }
  });
});

describe('stripEmoji', () => {
  // Serve perche' il font helvetica di jsPDF non rende le emoji.
  test('rimuove le emoji lasciando il testo', () => {
    assert.strictEqual(app.stripEmoji('Cantiere 🏗 Roma').replace(/\s+/g, ' ').trim(), 'Cantiere Roma');
  });

  test('non tocca le lettere accentate italiane', () => {
    assert.strictEqual(app.stripEmoji('Città e attività'), 'Città e attività');
  });

  test('gestisce null', () => {
    assert.strictEqual(app.stripEmoji(null), '');
  });
});

describe('getRiskoClass', () => {
  test('mappa i tre livelli di rischio', () => {
    assert.strictEqual(app.getRiskoClass('basso'), 'green');
    assert.strictEqual(app.getRiskoClass('medio'), 'amber');
    assert.strictEqual(app.getRiskoClass('alto'), 'red');
  });

  test('un valore sconosciuto non rompe il rendering', () => {
    assert.strictEqual(app.getRiskoClass('inatteso'), 'amber');
    assert.strictEqual(app.getRiskoClass(undefined), 'amber');
  });
});

describe('formatDate', () => {
  test('formatta in gg/mm/aaaa', () => {
    assert.strictEqual(app.formatDate('2026-09-18'), '18/09/2026');
  });

  test('una data assente non produce "Invalid Date"', () => {
    assert.strictEqual(app.formatDate(null), '-');
    assert.strictEqual(app.formatDate(''), '-');
  });
});
