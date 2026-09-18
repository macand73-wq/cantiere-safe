# CantiereSafe

PWA per sopralluoghi di sicurezza sul lavoro, pensata per RSPP e tecnici della
sicurezza. Permette di compilare in cantiere un verbale di ispezione completo di
checklist, note vocali e documentazione fotografica, e di esportarlo in PDF, Word o
testo. Riferimento normativo: D.Lgs. 81/2008.

L'applicazione è in italiano.

## Cosa fa

- **Sopralluoghi.** Anagrafica del luogo ispezionato (azienda, cantiere, indirizzo,
  data, RSPP), note libere, valutazione finale del rischio.
- **Checklist dinamiche.** Tre modelli predefiniti, selezionati in base al tipo di
  luogo (cantiere, azienda, edificio), organizzati per categoria: DPI, lavori in
  quota, macchine, impianto elettrico, emergenza, ordine, documenti. Ogni voce si
  segna come conforme (SI), non conforme (NO) o non applicabile (N.A.), accetta un
  commento e delle foto, e può essere nascosta se non pertinente. Ogni categoria ha
  una voce libera per aggiungere controlli non previsti.
- **Foto.** Acquisizione dalla galleria o dalla fotocamera, compressione automatica
  lato client, anteprima a tutto schermo. Foto generali del sopralluogo e foto
  agganciate alla singola voce di checklist.
- **Dettatura vocale.** Note dettate a voce tramite Web Speech API, dove il browser
  la supporta.
- **Anagrafica cantieri.** Elenco dei cantieri con committente, impresa affidataria,
  CSE, direttore lavori, responsabile lavori, importo, date e riferimento alla
  notifica preliminare.
- **Export.** Verbale in PDF impaginato, documento Word editabile, testo semplice, e
  backup testuale di tutti i sopralluoghi.
- **Offline-first.** Service worker con cache degli asset: l'app si apre e si usa
  anche senza rete. Le chiamate al backend restano ovviamente online.

## Come funziona

Applicazione a pagina singola in JavaScript vanilla, senza framework e senza bundler.
`index.html` contiene tutte le viste come `div` statici; `app.js` le mostra e le
nasconde alternando la classe `.active`. Non c'è routing via URL.

Il backend è [Supabase](https://supabase.com): autenticazione (email e password,
Google OAuth, reset password) e database Postgres. I dati vengono letti e scritti
direttamente dal browser tramite `supabase-js`; l'isolamento tra utenti è affidato
alle policy RLS lato database.

Tre tabelle: `profiles` (dati dell'utente), `sopralluoghi` (il verbale, con checklist
e foto salvate come JSON nella riga) e `cantieri` (l'anagrafica).

Il PDF è generato nel browser con jsPDF. Sia jsPDF che supabase-js sono caricati da
CDN con hash SRI.

## Struttura

```
index.html      tutte le viste
app.js          logica applicativa, divisa in sezioni da commenti banner
style.css       tema scuro, custom properties su :root
sw.js           service worker (cache-first, rete per le chiamate Supabase)
manifest.json   manifest PWA
build.js        build Netlify: inietta le chiavi Supabase in app.js
netlify.toml    configurazione di deploy
```

## Sviluppo

Non servono dipendenze né passi di build per lavorare in locale: basta servire la
cartella con un qualsiasi web server statico.

```
python3 -m http.server 8000
```

Per far funzionare login e salvataggio serve un progetto Supabase e la sostituzione
dei due segnaposto in cima a `app.js` con URL e anon key del progetto.

> **Attenzione:** non eseguire `node build.js` in locale. Lo script riscrive `app.js`
> sul posto sostituendo i segnaposto con le variabili d'ambiente, ed è pensato solo
> per l'ambiente di build di Netlify.

Il deploy è su Netlify: `node build.js` inietta `SUPABASE_URL` e `SUPABASE_ANON_KEY`
dalle variabili d'ambiente, poi pubblica la root del repository.

Le note tecniche per chi lavora al codice, incluso l'elenco dei problemi noti, sono in
[AGENTS.md](AGENTS.md).

## Development Approach

This project is developed using AI-assisted tools. Code is generated with the help of AI based on human-provided specifications, design decisions, and iterative feedback.

All contributions are reviewed, tested, and curated by the maintainer before being included in the codebase. AI is used as a productivity and exploration tool, while human oversight remains central to all decisions.

The goal is to combine the flexibility of AI-assisted development with standard open-source practices such as transparency, review, and accountability.
