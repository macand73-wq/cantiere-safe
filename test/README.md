# Test

Nessun framework e nessuna dipendenza: solo il runner incluso in Node
(`node:test`), disponibile da Node 18. Coerente con un progetto che non ha
`package.json` ne' passo di build.

## Esecuzione

```
node --test "test/*.test.js" "test/*.test.mjs"
```

- `unit.test.js` — funzioni pure di `app.js`. Non serve nulla di avviato.
- `integration.test.mjs` — API, autenticazione e policy RLS contro lo stack
  Supabase locale. Se lo stack non risponde, questi test vengono **saltati**, non
  falliti: chi lavora solo sulle funzioni pure non deve avviare Docker.

Per eseguirli tutti serve lo stack attivo:

```
supabase start
node --test "test/*.test.js" "test/*.test.mjs"
```

I test di integrazione leggono URL e chiave da `config.local.js` (non
versionato) oppure dalle variabili `SUPABASE_URL` e `SUPABASE_ANON_KEY`. Se non
trovano nulla, vengono saltati. Nessuna chiave e' scritta nei file versionati.

Vedi `docs/sviluppo-locale.md` per l'ambiente.

## Come sono fatti

`helper.js` carica `app.js` dentro un contesto `vm` con `window` e `document`
finti, perche' `app.js` non e' un modulo: e' uno script che assume un browser.
Gli stub sono volutamente minimi. Quello che dipende davvero dal DOM, cioe' il
rendering della checklist, la compressione delle foto e la generazione del PDF,
**non e' coperto**: servirebbe un browser headless, una dipendenza sproporzionata
per questo progetto.

I test di integrazione creano utenti con un suffisso casuale e ripuliscono i
propri dati alla fine, quindi si possono rieseguire senza sporcare il database.

## Cosa coprono

Funzioni pure: `escHtml`, `stripEmoji`, `getChecklistByLuogo`, `getRiskoClass`,
`formatDate`, compresi i casi limite che in questo codice ricorrono spesso, cioe'
`null` e valori inattesi.

Integrazione:
- creazione del profilo tramite trigger su `auth.users`;
- **isolamento fra utenti**, che e' la proprieta' di sicurezza centrale: una
  `select` senza filtri deve restituire solo le proprie righe, e non si deve
  poter leggere, scrivere o cancellare per conto di altri;
- il payload esatto di `saveSopralluogo()`, come regressione per il difetto B1;
- `cantiere_id` e il vincolo di chiave esterna, base della richiesta U1.
