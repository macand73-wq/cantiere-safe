# Valutazione: uscita da Supabase e Netlify

Documento di valutazione tecnica, non una proposta di migrazione approvata.
Stato: esplorativo. Nessuna modifica al codice.

Redatto sul tree al commit `1e17252`.

---

## Sintesi per chi decide

La migrazione e' fattibile. Le due dipendenze vanno pero' separate, perche' hanno
costi di uscita completamente diversi:

| | Costo di uscita | Rischio | Nota |
|---|---|---|---|
| **Netlify** | Basso, ore | Trascurabile | Nessun codice specifico. Reversibile. |
| **Supabase** | Alto, settimane | Significativo | Non e' un database: e' anche tutta l'autenticazione e tutta l'autorizzazione. |

**Il punto centrale del documento:** il progetto oggi non ha codice server. Non
esiste un backend da riscrivere, perche' non ne esiste uno. Il browser parla
direttamente al database e l'unica cosa che impedisce a un utente di leggere i
dati di un altro sono le policy RLS dentro Postgres. Uscire da Supabase non
significa sostituire una libreria: significa **scrivere per la prima volta un
backend che oggi non c'e'**.

Questo e' l'unico vero stopper. Tutto il resto e' lavoro meccanico.

---

## Cosa e' effettivamente agganciato a Supabase

Misurato, non stimato: **18 righe** su ~1400 in `app.js` toccano il client Supabase.

**Autenticazione, 7 chiamate** (`app.js:311,323,333,341,359,1269,1275`):
`signInWithPassword`, `signUp`, `signInWithOAuth`, `signOut`,
`resetPasswordForEmail`, `getSession`, `onAuthStateChange`.

**Dati, 11 chiamate** su 3 tabelle (`profiles`, `sopralluoghi`, `cantieri`):
solo `select` / `insert` / `update` / `delete`, con `.eq()`, `.order()`,
`.single()`. Nessuna join, nessuna RPC, nessun filtro oltre l'uguaglianza.

**Funzionalita' Supabase non usate: Storage, Realtime, Edge Functions.** Zero
occorrenze. Il progetto usa una frazione minima della piattaforma.

Questa e' una buona notizia e va detta al proprietario: non c'e' nessuna
funzionalita' esotica da reimplementare. Le query sono CRUD banale, riscrivibile
verso qualunque destinazione.

---

## Netlify: uscita a costo quasi nullo

Nessun riferimento a Netlify nel codice applicativo. L'accoppiamento e' interamente
in due file:

- `netlify.toml`, due righe.
- `build.js`, 16 righe che sostituiscono due segnaposto in `app.js` con le
  variabili d'ambiente.

L'applicazione e' un sito statico. Qualunque hosting statico la serve: server
proprio con Caddy o nginx, Cloudflare Pages, GitHub Pages.

`build.js` puo' sparire del tutto servendo un `config.js` fuori dal versionamento,
il che elimina anche il suo difetto attuale: riscrive `app.js` sul posto, quindi
eseguirlo in locale distrugge i segnaposto nel working tree.

**Effetto collaterale positivo:** oggi `doGoogleLogin()` (`app.js:333`) ha
`redirectTo` cablato su un URL GitHub Pages che non corrisponde al deploy Netlify,
quindi il login Google e' presumibilmente gia' rotto in produzione. Una migrazione
dell'hosting obbliga a sistemarlo.

**Stopper: nessuno.** Il lavoro e' di ore ed e' reversibile.

---

## Supabase: i tre costi reali

### 1. L'autorizzazione e' tutta nel database (lo stopper principale)

Non esiste codice server in questo progetto. Ogni decisione di sicurezza e'
delegata alle policy RLS di Postgres.

Si vede bene dal difetto gia' noto: `caricaCantieri()` (`app.js:1292`) non filtra
per `user_id`, a differenza delle query su `sopralluoghi`. Oggi l'isolamento tra
utenti sui cantieri dipende **esclusivamente** da una policy RLS lato server. Se
quella policy non c'e', ogni utente vede i cantieri di tutti.

Conseguenza per la migrazione: spostarsi su un backend senza un equivalente di RLS
significa dover scrivere i controlli di autorizzazione a mano su ogni endpoint. E'
la parte piu' costosa e piu' facile da sbagliare, e un errore qui espone dati di
cantiere di clienti terzi.

### 2. L'autenticazione non sono 7 funzioni

Le 7 chiamate nascondono servizi non banali: hashing delle password, conferma via
email, token di reset, refresh delle sessioni, flusso OAuth Google.

Reimplementarli internamente e' sconsigliato. Le alternative reali sono un servizio
di auth (self-hosted: Authentik, Keycloak) oppure una piattaforma che lo includa
gia'. Questa voce da sola giustifica gran parte della stima temporale.

### 3. Le foto pesano sulle righe

Le foto sono salvate come data URL base64 dentro la colonna `jsonb`, non su uno
storage a oggetti.

Misurato: le immagini sono ridimensionate a max 600px e ricompresse JPEG a qualita'
0.55 (`compressImage`, `app.js:252`), quindi pesano meno del previsto. Stima
realistica **1,0-1,6 MB per sopralluogo** con 20 foto al limite massimo.

Il problema non e' la dimensione della riga ma `loadHome()` (`app.js:425`), che fa
`select('*')`: per disegnare le schede riassuntive della home scarica **ogni foto di
ogni sopralluogo**. Con 10 sopralluoghi pieni sono circa **13 MB trasferiti a ogni
apertura della home**, su un'app pensata per essere usata in cantiere da telefono.

Va sistemato comunque, a prescindere dalla migrazione. Se pero' si migra, e' il
momento giusto: spostare le foto su storage a oggetti e tenere in riga solo gli URL.

---

## Opzioni, con i costi

Le stime sono ordini di grandezza per un solo sviluppatore, non preventivi.

### A. Uscire solo da Netlify, restare su Supabase

Sposta l'hosting statico, lascia il backend dov'e'.

- **Costo:** ore.
- **Rischio:** minimo, reversibile.
- **Risolve:** dipendenza dall'hosting, bug del redirect OAuth, `build.js` distruttivo.
- **Non risolve:** niente lato dati.

Sensata come primo passo indipendentemente dalla decisione finale, perche' non
pregiudica nulla.

### B. Self-hosting su infrastruttura propria

Postgres, piu' un livello API, piu' un servizio di autenticazione, dietro Caddy.

Variante che riduce il lavoro: **PostgREST** espone Postgres con un'API molto simile
a quella di Supabase (che lo usa internamente) e **supporta RLS**, quindi le policy
esistenti e la forma delle query restano quasi invariate. Resta da risolvere
l'autenticazione, con Authentik o equivalente.

- **Costo:** settimane, piu' manutenzione continuativa.
- **Rischio:** medio-alto. Backup, aggiornamenti, TLS, disponibilita' diventano
  responsabilita' interna.
- **Da valutare col proprietario:** chi amministra il server nel tempo. E' un costo
  ricorrente, non una tantum.

### C. Altra piattaforma gestita

**PocketBase** (singolo binario Go, auto-ospitabile, include auth e regole di
accesso per collezione) e' il candidato piu' vicino come rapporto funzionalita'/sforzo.
Appwrite e' piu' completo e piu' pesante. Firebase e' un passo indietro sulla privacy
e cambia il modello dati.

- **Costo:** una-due settimane.
- **Rischio:** medio. Si sostituisce un fornitore con un altro, ma con PocketBase
  auto-ospitato si guadagna controllo del dato.

### D. Restare, e sistemare quello che c'e'

Va messa sul tavolo per onesta'. I difetti noti (assenza di filtro su
`caricaCantieri`, `select('*')` sulla home, foto in riga) sono difetti **del codice
applicativo**, non di Supabase. Si risolvono restando dove si e', a costo molto
inferiore.

- **Costo:** giorni.
- **Rischio:** basso.

---

## Cosa verificare prima di decidere

1. **Le policy RLS attuali.** Non esistono migrazioni nel repository: lo schema in
   `AGENTS.md` e' ricostruito dalle query. Prima di qualunque stima seria serve
   sapere cosa c'e' davvero configurato nel progetto Supabase. Se le policy sono
   assenti o deboli, c'e' un problema di sicurezza **oggi**, indipendente dalla
   migrazione, e va affrontato per primo.
2. **Il motivo della migrazione.** Costi, controllo del dato, vincoli normativi e
   timore di lock-in portano a risposte diverse. I dati trattati sono di sicurezza
   sul lavoro e riguardano cantieri di clienti: se il driver e' la conformita', pesa
   piu' l'opzione B.
3. **Chi amministra l'infrastruttura dopo.** Determinante fra B e C.
4. **Numero di utenti reali e volume dati.** Cambia se la migrazione va fatta ora o
   se conviene prima sistemare i difetti applicativi.

---

## Raccomandazione tecnica

Nessuna urgenza a uscire da Supabase, e nessun ostacolo insormontabile.

Ordine che suggerisco:

1. **Verificare subito le policy RLS.** Non e' lavoro di migrazione, e' una verifica
   di sicurezza dovuta in ogni caso.
2. **Sistemare i difetti applicativi noti** (filtro `user_id`, `select` mirato sulla
   home, foto su storage). Riducono il rischio e semplificano qualunque migrazione
   futura, perche' un'applicazione che non dipende da `select('*')` e' molto piu'
   facile da spostare.
3. **Uscire da Netlify quando comodo.** Costo basso, nessuna controindicazione.
4. **Decidere su Supabase dopo**, con i dati del punto 1 in mano.

Migrare prima di aver fatto 1 e 2 significa portarsi dietro gli stessi difetti in un
ambiente nuovo, pagando il costo della migrazione senza incassarne il beneficio.
