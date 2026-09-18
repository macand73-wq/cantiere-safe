# Ambiente di sviluppo locale

Il progetto Supabase originale non esiste piu': `couqrvfutxhvzjpwgilz.supabase.co`
non risolve nemmeno in DNS (verificato 2026-09-18). Netlify serve ancora il sito, ma
ogni chiamata al backend fallisce. Questo ambiente lo sostituisce in locale.

Tutto gira in Docker e non tocca il sistema: l'unico file installato fuori dai
container e' il binario `supabase` in `~/bin/`.

## Avvio

```
supabase start          # prima volta: scarica ~3 GB di immagini
python3 -m http.server 8080 --bind 127.0.0.1
```

Poi aprire `http://127.0.0.1:8080`.

Per fermare tutto:

```
supabase stop           # conserva i dati
supabase stop --no-backup   # elimina anche il volume
```

## Servizi

| Servizio | URL |
|---|---|
| App | http://127.0.0.1:8080 |
| API (Kong) | http://127.0.0.1:54321 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio (UI web) | http://127.0.0.1:54323 |
| Mailpit (email di test) | http://127.0.0.1:54324 |

Le email di conferma e reset non escono: finiscono in Mailpit, dove si leggono dal
browser. Comodo per provare la registrazione senza una casella vera.

## Configurazione

`config.local.js` (non versionato, vedi `.gitignore`) definisce
`window.CANTIERE_CONFIG`, e `app.js` lo usa se presente:

```js
const SUPABASE_URL = window.CANTIERE_CONFIG?.SUPABASE_URL || 'INSERISCI_QUI_IL_PROJECT_URL';
```

In produzione il file non esiste, quindi restano i segnaposto che `build.js`
sostituisce in fase di deploy. Il comportamento su Netlify e' invariato.

Le chiavi in `config.local.js` sono le **chiavi demo pubbliche** identiche su ogni
installazione locale di Supabase. Non sono credenziali e non vanno trattate come tali.

## Schema

`supabase/migrations/20260918000000_schema_iniziale.sql` e' ora la definizione
autoritativa dello schema. **Non e' un dump**: il progetto originale non e' piu'
ispezionabile, quindi e' ricostruito dalle query in `app.js` e dallo schema riferito
dal proprietario il 2026-09-17.

Include le policy RLS, che in produzione non e' stato possibile verificare.

Per ricreare il database da zero: `supabase db reset`.

## Verifiche eseguite (2026-09-18)

Non dedotte dal codice, eseguite contro lo stack locale:

- **RLS attivo** su `profiles`, `cantieri`, `sopralluoghi`, 10 policy totali.
- **Isolamento fra utenti confermato.** Con due utenti registrati, una `select`
  senza filtri su `cantieri`, cioe' la stessa forma di `caricaCantieri()`, restituisce
  a ciascuno solo le proprie righe. Il filtro `user_id` mancante lato client resta un
  difetto di correttezza, ma non espone dati.
- **Scrittura per conto di altri rifiutata**: un insert con `user_id` altrui viene
  respinto con `42501 new row violates row-level security policy`.
- **Trigger di creazione profilo funzionante**: `nome` e `studio` passati a `signUp()`
  arrivano in `public.profiles`. Conferma l'ipotesi su come il profilo veniva creato
  in produzione, dato che `app.js` non lo crea mai.
- **Salvataggio sopralluogo riuscito** con il payload esatto di `saveSopralluogo()`.

### B1: meccanismo riprodotto

Il difetto piu' grave del backlog (un utente reale non riusciva a salvare) ha una
causa riproducibile. Eliminando `updated_at` dalla tabella, cioe' simulando lo schema
riferito dal proprietario, dove quella colonna non compare, lo stesso identico payload
viene rifiutato:

```
{"code":"PGRST204","message":"Could not find the 'updated_at' column of 'sopralluoghi' in the schema cache"}
```

Con la colonna presente, l'insert riesce. Il fallimento del PDF ne discende: se il
salvataggio non va a buon fine, `allSopralluoghi` resta vuoto e `getExpTarget()` non
trova nulla da esportare. **Un solo difetto, non due.**

Questo non dimostra che fosse la causa in produzione, perche' quel database non e'
piu' ispezionabile, ma il meccanismo combacia con quanto segnalato e con lo schema
riferito. Da tenere presente: in locale la colonna c'e', quindi il difetto **non si
riproduce** a meno di rimuoverla apposta.
