# Ambiente di sviluppo locale

Il progetto Supabase originale non esiste piu': `couqrvfutxhvzjpwgilz.supabase.co`
non risolve nemmeno in DNS (verificato 2026-09-18). Netlify serve ancora il sito, ma
ogni chiamata al backend fallisce. Questo ambiente lo sostituisce in locale.

Tutto gira in Docker e non tocca il sistema: l'unico file installato fuori dai
container e' il binario `supabase` in `~/bin/`.

## Avvio

```
supabase start          # prima volta: scarica ~3 GB di immagini
./dev-server.sh
```

`dev-server.sh` avvia il server statico in HTTP e HTTPS e un proxy TLS davanti a
Supabase, e stampa gli indirizzi da usare. Poi aprire `http://127.0.0.1:8080`.

### Prova da telefono

Il telefono raggiunge l'ambiente sull'indirizzo di rete della macchina. Due
possibilita':

| | Indirizzo | Limiti |
|---|---|---|
| HTTP | `http://<ip>:8080` | Niente fotocamera, niente service worker |
| HTTPS | `https://<ip>:8443` | Completo, richiede la CA installata |

Fotocamera e service worker sono ammessi solo in **contesto sicuro**. `localhost`
e' esentato per convenzione, un indirizzo IP di rete no: da telefono servono
quindi certificati veri, non basta l'HTTP.

`dev-server.sh` genera una CA locale e un certificato per l'IP della macchina
(in `~/.cache/cantiere-safe-tls/`, riusati alle esecuzioni successive). Per
fidarsene, una volta sola sul telefono:

1. aprire `http://<ip>:8080/dev-ca.crt`;
2. installarlo come **certificato CA** (Android: Impostazioni, Sicurezza,
   Cifratura e credenziali, Installa un certificato, Certificato CA);
3. aprire `https://<ip>:8443`.

Lo script stampa l'impronta SHA-256 della CA: confrontarla al momento
dell'installazione.

**Questa CA e' per lo sviluppo.** Chi la possiede puo' emettere certificati che
quel telefono considera validi. Vive solo sulla macchina di sviluppo e va
rimossa dal telefono quando non serve piu'. Non va copiata altrove ne'
versionata: `dev-ca.crt` e' in `.gitignore`.

Finche' i server sono attivi, chiunque sia sulla stessa rete li raggiunge. Lo
stack locale non ha limiti di frequenza e usa le chiavi demo pubbliche di
Supabase: va bene su una rete domestica fidata, non su una condivisa.

Per fermare tutto:

```
supabase stop           # conserva i dati
supabase stop --no-backup   # elimina anche il volume
```

## Servizi

| Servizio | URL |
|---|---|
| App (HTTP) | http://127.0.0.1:8080, e `http://<ip>:8080` dalla rete |
| App (HTTPS) | `https://<ip>:8443` |
| API via TLS | `https://<ip>:54443` |
| API (Kong) | http://127.0.0.1:54321 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio (UI web) | http://127.0.0.1:54323 |
| Mailpit (email di test) | http://127.0.0.1:54324 |

Le email di conferma e reset non escono: finiscono in Mailpit, dove si leggono dal
browser. Comodo per provare la registrazione senza una casella vera.

## Configurazione

`config.local.js` (non versionato, vedi `.gitignore`) definisce
`window.CANTIERE_CONFIG`, e `app.js` lo usa se presente. Host e porta del
backend sono dedotti dalla pagina, quindi lo stesso file vale per desktop,
telefono in HTTP e telefono in HTTPS senza modifiche: in HTTPS punta a 54443,
perche' una pagina sicura non puo' chiamare un'API in chiaro.

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
