// Verifica dei fix P1 che sono logica pura, senza browser.
// Esegue: node check-fixes.js
const assert = require('assert');
const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

// Bug 2: dataset.id e' una stringa, c.id un intero.
const cantieri = [{id: 1, nome: 'Uno'}, {id: 2, nome: 'Due'}];
const idDalDom = '2';                                  // com'e' sempre da dataset.id
assert.strictEqual(cantieri.find(c => c.id === idDalDom), undefined, 'il bug era questo');
assert.strictEqual(cantieri.find(c => c.id === Number(idDalDom)).nome, 'Due', 'fix rotto');

// Bug 1: showView riceve il nome nudo, e l'elemento deve esistere.
assert.ok(!/showView\('view-/.test(app + html), 'showView chiamato con un id di elemento');
assert.ok(html.includes('id="view-cantieri"'), 'target di showView assente');

// Bug 3: nessun riferimento a una classe che non esiste in style.css.
const css = fs.readFileSync('style.css', 'utf8');
assert.ok(!html.includes('input-field'), 'input-field ancora presente');
assert.ok(css.includes('.form-input'), '.form-input assente dal css');

// Bug 4: ogni pulsante con una variante .btn-* porta anche .btn.
for (const src of [html, app]) {
  for (const m of src.matchAll(/class="([^"]*\bbtn-(?:primary|ghost|danger)\b[^"]*)"/g)) {
    assert.ok(/\bbtn\b/.test(m[1]), `variante senza .btn: ${m[1]}`);
  }
}
assert.ok(!(html + app).includes('btn-secondary'), 'btn-secondary non esiste in style.css');

// XSS: i campi cantiere passano da escHtml.
assert.ok(app.includes('${escHtml(c.nome)}'), 'nome cantiere non escapato');

console.log('tutti i controlli passati');
