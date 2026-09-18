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

describe('saveSopralluogo', () => {
  const { loadAppConDom } = require('./helper.js');

  function preparaForm(amb, { azienda = 'Costruzioni Prova', data = '2026-09-18' } = {}) {
    amb.ctx.initNuovoForm();
    amb.els['f-azienda'].value = azienda;
    amb.els['f-data'].value = data;
  }

  test('senza sessione avvisa invece di fallire in silenzio', async () => {
    // I gestori onclick sono nell'HTML, quindi attivi anche prima che
    // initApp() abbia impostato currentUser: e' la finestra in cui il
    // salvataggio moriva con un TypeError visibile solo in console.
    const amb = loadAppConDom();
    preparaForm(amb);
    await amb.ctx.saveSopralluogo();
    assert.strictEqual(amb.richieste.length, 0, 'non deve chiamare il backend');
    assert.match(amb.toasts.join(' '), /[Ss]essione/, `nessun avviso: ${JSON.stringify(amb.toasts)}`);
  });

  test('con sessione valida invia i dati e conferma', async () => {
    const amb = loadAppConDom();
    amb.valuta("currentUser={id:'11111111-1111-1111-1111-111111111111'}");
    preparaForm(amb);
    await amb.ctx.saveSopralluogo();
    assert.strictEqual(amb.richieste.length, 1, 'deve inviare una insert');
    assert.strictEqual(amb.richieste[0].tabella, 'sopralluoghi');
    assert.strictEqual(amb.richieste[0].payload.azienda, 'Costruzioni Prova');
    assert.match(amb.toasts.join(' '), /salvat/i, 'manca la conferma');
  });

  test('senza azienda avvisa e non salva', async () => {
    const amb = loadAppConDom();
    amb.valuta("currentUser={id:'11111111-1111-1111-1111-111111111111'}");
    preparaForm(amb, { azienda: '   ' });
    await amb.ctx.saveSopralluogo();
    assert.strictEqual(amb.richieste.length, 0);
    assert.match(amb.toasts.join(' '), /azienda/i);
  });

  test('un errore del backend viene mostrato, non ingoiato', async () => {
    const amb = loadAppConDom();
    amb.valuta("currentUser={id:'11111111-1111-1111-1111-111111111111'}");
    amb.valuta("sbClient.from=()=>({insert:async()=>({error:{message:'colonna mancante'}})})");
    preparaForm(amb);
    await amb.ctx.saveSopralluogo();
    assert.match(amb.toasts.join(' '), /colonna mancante/, `l'errore non arriva all'utente: ${JSON.stringify(amb.toasts)}`);
  });

  test('una fetch che lancia non fallisce in silenzio', async () => {
    // Senza il try/catch questo caso non produceva ne' error ne' messaggio.
    const amb = loadAppConDom();
    amb.valuta("currentUser={id:'11111111-1111-1111-1111-111111111111'}");
    amb.valuta("sbClient.from=()=>({insert:async()=>{throw new Error('rete giu')}})");
    preparaForm(amb);
    await amb.ctx.saveSopralluogo();
    assert.match(amb.toasts.join(' '), /fallito|rete/i, `nessun avviso: ${JSON.stringify(amb.toasts)}`);
  });
});
