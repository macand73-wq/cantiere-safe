// Test di integrazione contro lo stack Supabase locale.
//
//   supabase start && node --test "test/*.test.js"
//
// Se lo stack non risponde i test vengono saltati, non falliti: chi lavora
// solo sulle funzioni pure non deve essere costretto ad avviare Docker.
//
// Ogni test crea i propri dati con un suffisso casuale e li rimuove alla
// fine, cosi' la suite e' ripetibile e non sporca il database di sviluppo.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';

// La chiave non e' scritta qui dentro: viene da config.local.js, che non e'
// versionato, o dall'ambiente. E' comunque la chiave demo pubblica identica su
// ogni installazione locale di Supabase, non una credenziale, ma tenerla fuori
// dai file versionati evita di addestrare chiunque legga a ignorare un JWT in
// un diff.
import { readFileSync } from 'node:fs';

function dalConfigLocale() {
  try {
    const src = readFileSync(new URL('../config.local.js', import.meta.url), 'utf8');
    const url = src.match(/SUPABASE_URL:\s*'([^']+)'/)?.[1];
    const key = src.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)?.[1];
    return { url, key };
  } catch {
    return {};
  }
}

const locale = dalConfigLocale();
const API = process.env.SUPABASE_URL || locale.url || 'http://127.0.0.1:54321';
const ANON = process.env.SUPABASE_ANON_KEY || locale.key || '';

const suffix = Math.random().toString(36).slice(2, 8);
const utenti = {
  a: { email: `test-a-${suffix}@example.org`, password: 'password123', nome: 'Utente A', studio: 'Studio A' },
  b: { email: `test-b-${suffix}@example.org`, password: 'password123', nome: 'Utente B', studio: 'Studio B' },
};

// La probe deve avvenire prima che node:test valuti le opzioni dei test,
// quindi non puo' stare in before(): li' sarebbe troppo tardi.
const stackAttivo = await (async () => {
  if (!ANON) return false;   // senza config.local.js non si puo' interrogare l'API
  try {
    const res = await fetch(`${API}/auth/v1/health`);
    return res.ok;
  } catch {
    return false;
  }
})();

async function api(path, { token, method = 'GET', body, prefer } = {}) {
  const headers = { apikey: ANON, Authorization: `Bearer ${token || ANON}` };
  if (body) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${API}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const testo = await res.text();
  return { status: res.status, body: testo ? JSON.parse(testo) : null };
}

async function registra(u) {
  await api('/auth/v1/signup', {
    method: 'POST',
    body: { email: u.email, password: u.password, data: { nome: u.nome, studio: u.studio } },
  });
  const { body } = await api('/auth/v1/token?grant_type=password', {
    method: 'POST', body: { email: u.email, password: u.password },
  });
  u.token = body.access_token;
  u.id = JSON.parse(Buffer.from(u.token.split('.')[1], 'base64url')).sub;
}

before(async () => {
  if (!stackAttivo) return;
  await registra(utenti.a);
  await registra(utenti.b);
});

after(async () => {
  if (!stackAttivo) return;
  for (const u of [utenti.a, utenti.b]) {
    if (!u.token) continue;
    await api(`/rest/v1/sopralluoghi?user_id=eq.${u.id}`, { token: u.token, method: 'DELETE' });
    await api(`/rest/v1/cantieri?user_id=eq.${u.id}`, { token: u.token, method: 'DELETE' });
  }
});

const seStack = () => (stackAttivo ? false : 'stack locale non raggiungibile, salto');

describe('autenticazione', () => {
  test('la registrazione crea il profilo via trigger', { skip: seStack() }, async () => {
    // app.js non crea mai una riga in profiles: lo fa un trigger su auth.users.
    const { body } = await api(`/rest/v1/profiles?id=eq.${utenti.a.id}&select=nome,studio`, { token: utenti.a.token });
    assert.strictEqual(body.length, 1, 'profilo non creato');
    assert.strictEqual(body[0].nome, utenti.a.nome);
    assert.strictEqual(body[0].studio, utenti.a.studio);
  });

  test('una password errata non autentica', { skip: seStack() }, async () => {
    const { status } = await api('/auth/v1/token?grant_type=password', {
      method: 'POST', body: { email: utenti.a.email, password: 'sbagliata' },
    });
    assert.strictEqual(status, 400);
  });

  test('senza token non si legge nulla', { skip: seStack() }, async () => {
    const { body } = await api('/rest/v1/sopralluoghi?select=*');
    assert.deepStrictEqual(body, [], 'un anonimo non deve vedere righe');
  });
});

describe('isolamento fra utenti (RLS)', () => {
  test('una select senza filtri restituisce solo le proprie righe', { skip: seStack() }, async () => {
    // Questa e' la forma esatta di caricaCantieri() prima del fix: senza
    // .eq('user_id'). Deve restare sicura anche cosi', perche' il filtro
    // lato client non e' una barriera di sicurezza.
    await api('/rest/v1/cantieri', {
      token: utenti.a.token, method: 'POST', body: { user_id: utenti.a.id, nome: 'Cantiere di A' },
    });
    await api('/rest/v1/cantieri', {
      token: utenti.b.token, method: 'POST', body: { user_id: utenti.b.id, nome: 'Cantiere di B' },
    });

    const { body } = await api('/rest/v1/cantieri?select=nome', { token: utenti.a.token });
    assert.ok(body.every(c => c.nome === 'Cantiere di A'), `A vede righe altrui: ${JSON.stringify(body)}`);
  });

  test('non si puo\' creare una riga intestata a un altro utente', { skip: seStack() }, async () => {
    const { status, body } = await api('/rest/v1/cantieri', {
      token: utenti.a.token, method: 'POST', body: { user_id: utenti.b.id, nome: 'Intestato a B' },
    });
    assert.strictEqual(status, 403, 'la policy with check deve rifiutare');
    assert.strictEqual(body.code, '42501');
  });

  test('non si puo\' leggere un sopralluogo altrui nemmeno per id', { skip: seStack() }, async () => {
    const { body: creato } = await api('/rest/v1/sopralluoghi', {
      token: utenti.b.token, method: 'POST', prefer: 'return=representation',
      body: { user_id: utenti.b.id, azienda: 'Riservata di B', data: '2026-09-18' },
    });
    const id = creato[0].id;
    const { body } = await api(`/rest/v1/sopralluoghi?id=eq.${id}&select=azienda`, { token: utenti.a.token });
    assert.deepStrictEqual(body, [], 'A non deve poter leggere per id una riga di B');
  });

  test('non si puo\' cancellare una riga altrui', { skip: seStack() }, async () => {
    const { body: creato } = await api('/rest/v1/cantieri', {
      token: utenti.b.token, method: 'POST', prefer: 'return=representation',
      body: { user_id: utenti.b.id, nome: 'Da non cancellare' },
    });
    const id = creato[0].id;
    await api(`/rest/v1/cantieri?id=eq.${id}`, { token: utenti.a.token, method: 'DELETE' });
    const { body } = await api(`/rest/v1/cantieri?id=eq.${id}&select=nome`, { token: utenti.b.token });
    assert.strictEqual(body.length, 1, 'la riga di B e\' stata cancellata da A');
  });
});

describe('salvataggio sopralluogo', () => {
  // Il payload e' quello costruito da saveSopralluogo() in app.js.
  const payload = (userId) => ({
    user_id: userId,
    azienda: 'Costruzioni Test Srl',
    cantiere: 'Palazzina Via Roma',
    indirizzo: 'Via Roma 1',
    rspp: 'Mario Rossi',
    luogo: 'cantiere',
    data: '2026-09-18',
    rischio_generale: 'medio',
    note_libere: 'Note di prova.',
    checklist: [{ id: 'ca01', testo: 'Elmetto', categoria: 'DPI', valore: 'SI', commento: '', foto: [], nascosta: false }],
    foto: [],
    updated_at: new Date().toISOString(),
  });

  test('il payload di saveSopralluogo viene accettato', { skip: seStack() }, async () => {
    // Regressione per B1: un utente reale non riusciva a salvare. La causa
    // riprodotta e' la colonna updated_at mancante nello schema, che fa
    // rifiutare l'intera insert con PGRST204.
    const { status, body } = await api('/rest/v1/sopralluoghi', {
      token: utenti.a.token, method: 'POST', prefer: 'return=representation',
      body: payload(utenti.a.id),
    });
    assert.strictEqual(status, 201, `insert rifiutata: ${JSON.stringify(body)}`);
    assert.strictEqual(body[0].azienda, 'Costruzioni Test Srl');
  });

  test('la checklist sopravvive al round trip come jsonb', { skip: seStack() }, async () => {
    const { body } = await api('/rest/v1/sopralluoghi', {
      token: utenti.a.token, method: 'POST', prefer: 'return=representation',
      body: payload(utenti.a.id),
    });
    const voce = body[0].checklist[0];
    assert.strictEqual(voce.valore, 'SI');
    assert.strictEqual(voce.id, 'ca01');
    assert.ok(Array.isArray(voce.foto), 'foto deve restare un array');
  });

  test('il testo ostile viene salvato grezzo, l\'escaping e\' al rendering', { skip: seStack() }, async () => {
    const ostile = '<img src=x onerror=alert(1)>';
    const { body } = await api('/rest/v1/cantieri', {
      token: utenti.a.token, method: 'POST', prefer: 'return=representation',
      body: { user_id: utenti.a.id, nome: ostile },
    });
    assert.strictEqual(body[0].nome, ostile, 'il database non deve alterare il dato');
  });
});

describe('collegamento cantieri/sopralluoghi', () => {
  test('cantiere_id esiste ed e\' una chiave esterna valida', { skip: seStack() }, async () => {
    // La colonna c'e' nello schema ma app.js non la valorizza ancora: e' la
    // base della richiesta U1 nel backlog.
    const { body: cantiere } = await api('/rest/v1/cantieri', {
      token: utenti.a.token, method: 'POST', prefer: 'return=representation',
      body: { user_id: utenti.a.id, nome: 'Cantiere collegato' },
    });
    const { status, body } = await api('/rest/v1/sopralluoghi', {
      token: utenti.a.token, method: 'POST', prefer: 'return=representation',
      body: { user_id: utenti.a.id, azienda: 'Con cantiere', data: '2026-09-18', cantiere_id: cantiere[0].id },
    });
    assert.strictEqual(status, 201, `insert con cantiere_id rifiutata: ${JSON.stringify(body)}`);
    assert.strictEqual(body[0].cantiere_id, cantiere[0].id);
  });

  test('un cantiere_id inesistente viene rifiutato', { skip: seStack() }, async () => {
    const { status } = await api('/rest/v1/sopralluoghi', {
      token: utenti.a.token, method: 'POST',
      body: { user_id: utenti.a.id, azienda: 'Orfano', data: '2026-09-18', cantiere_id: 999999 },
    });
    assert.strictEqual(status, 409, 'la chiave esterna deve impedirlo');
  });
});
