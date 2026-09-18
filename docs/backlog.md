# Backlog

Fonti:
- Report di stato di Andrea Macri', 2026-09-17.
- Documento "Spunti di miglioramento", allegato allo stesso messaggio, redatto da
  un utente reale con competenze da CSE (coordinatore per la sicurezza in fase di
  esecuzione). 9 punti, numerati come nell'originale.

Stato: da discutere e prioritizzare. Nessuna attivita' avviata.

---

## P0 — Bloccanti, da verificare subito

### B1. Il salvataggio del sopralluogo non va a buon fine (utente, punto 7)

> "Durante la prova non sono riuscito a completare il salvataggio del sopralluogo
> ne' a visualizzare o scaricare il report PDF generato"

Il difetto piu' grave segnalato: un utente reale non e' riuscito a usare la
funzione centrale dell'applicazione. **Va riprodotto prima di qualunque altra
attivita'.** Tutto il resto del backlog e' irrilevante se non si riesce a salvare.

Due ipotesi dal codice, entrambe da verificare contro il database reale, nessuna
delle due confermata:

1. **Colonna mancante.** `saveSopralluogo()` (`app.js:792`) invia `updated_at` nel
   payload, ma la colonna non compare nello schema riportato da Andrea. Se non
   esiste, PostgREST rifiuta l'intera insert. L'errore verrebbe mostrato come toast
   e loggato in console, quindi la console del browser durante un salvataggio
   fallito e' il primo posto da guardare.
2. **Dimensione del payload.** Un sopralluogo con molte foto pesa 1,0-1,6 MB di
   base64 in una sola riga. Se l'utente ha caricato foto vicino al limite di 20, il
   fallimento potrebbe essere un limite di dimensione richiesta, non un difetto di
   schema. Si distingue dalla prima ipotesi provando a salvare un sopralluogo senza
   foto.

Il PDF non parte perche' `getExpTarget()` (`app.js:932`) cerca il sopralluogo in
`allSopralluoghi`: se il salvataggio non e' andato a buon fine, non c'e' nulla da
esportare. Probabilmente **un solo difetto, non due**. Da confermare.

### B2. Verificare il login Google (report Andrea)

Andrea riporta "Login Google riparato (Site URL corretto su Supabase)", ma
`doGoogleLogin()` (`app.js:333`) ha ancora `redirectTo` cablato su
`https://macand73-wq.github.io/cantiere-safe/`, mentre l'hosting dichiarato e'
`visionary-chaja-09e4ff.netlify.app`.

O la correzione e' parziale, o il codice deployato e' piu' avanti di quello nel
repository. Da chiarire: se le due cose divergono, e' un problema di processo piu'
grave del bug in se'.

---

## P1 — Difetti noti nel codice

Gia' documentati in `AGENTS.md`, ripetuti qui per completezza del backlog.

- **Annulla nel form cantiere non funziona.** `index.html:273` chiama
  `showView('view-cantieri')` invece di `showView('cantieri')`.
- **Modifica cantiere non funziona.** `modificaCantiere()` (`app.js:1333`) confronta
  `c.id === id` dove `id` arriva da `dataset.id` come stringa e `c.id` e' numerico.
- **Form cantiere senza stile.** La classe `.input-field` non esiste in `style.css`.
  Il resto dell'app usa `.form-input`.
- **`.btn-secondary` non definita**, e i pulsanti cantieri usano `btn-primary` senza
  la classe `btn` che porta il layout.
- **`caricaCantieri()` non filtra per `user_id`.** Andrea conferma RLS attivo su
  tutte le tabelle, quindi non e' una falla di isolamento, ma la query resta
  scorretta e va allineata alle altre.
- **`clearAllData()` non cancella i cantieri**, pur dichiarando "elimina tutti i dati".
- **`loadHome()` fa `select('*')`** e scarica ogni foto per disegnare le schede
  riassuntive: ~13 MB su 10 sopralluoghi pieni, su un'app da usare in cantiere da
  telefono. Serve una select mirata sulle sole colonne scalari.

---

## P2 — Richieste dell'utente, alto valore

Ordinate per rapporto valore/costo, non per numero d'origine.

### U1. Collegare i sopralluoghi ai cantieri (utente 1 e 2, Andrea 1)

L'anagrafica cantieri esiste gia' e **la colonna `sopralluoghi.cantiere_id` risulta
gia' presente nello schema**, ma non compare da nessuna parte in `app.js`. Il lavoro
lato database e' quindi in gran parte fatto.

Serve: una tendina di selezione cantiere nel form sopralluogo, la valorizzazione di
`cantiere_id` nel payload, e una vista cronologia per cantiere.

Costo basso, valore alto: risolve la critica di fondo dell'utente, cioe' che oggi
ogni controllo e' un evento isolato e le informazioni del cantiere vanno riscritte
ogni volta.

### U2. Numerazione progressiva dei sopralluoghi (utente 2, Andrea 2)

Un progressivo per cantiere, per codificare il verbale. Costo basso, richiesto
esplicitamente, ha valore documentale per un verbale che finisce in fascicolo.

Attenzione alla concorrenza: il progressivo va calcolato lato database, non
contando le righe nel browser, altrimenti due sopralluoghi creati a distanza ravvicinata
prendono lo stesso numero.

### U3. Imprese presenti durante il sopralluogo (utente 4, Andrea 4)

Elenco delle imprese con numero lavoratori, preposto e attivita' svolte. Nuova
sezione nel form, array in jsonb sulla riga, piu' una sezione negli export.

Costo medio, valore alto: l'utente motiva la richiesta con la ricostruibilita' di
chi fosse operativo in una certa data, che e' esattamente cio' che serve quando un
verbale viene usato dopo un infortunio.

### U4. Livelli di conformita' (utente 5, Andrea 3)

Da SI / NO / N.A. a **Conforme / Osservazione / Non Conforme / Grave Pericolo**.

Sembra banale e non lo e'. Tocca:
- i tre template di checklist e il renderer (`renderChecklist`, `app.js:512`);
- il conteggio riassuntivo in `loadHome()`, `openDetail()` e in tutti e quattro gli
  exporter, che oggi contano `'SI'`, `'NO'`, `'NA'` in modo cablato;
- i colori e i box di riepilogo del PDF, costruiti su tre valori;
- **i dati esistenti**: ogni riga gia' salvata ha `valore: 'SI'|'NO'|'NA'` dentro il
  jsonb. Serve una migrazione, o una mappatura di compatibilita' in lettura.

Costo medio-alto. Valore alto: la distinzione fra una semplice osservazione e un
grave pericolo e' il cuore del mestiere, e l'utente la segnala come limite reale.

### U5. Prescrizioni con firma in loco (utente 9)

Formalizzare una prescrizione durante il sopralluogo con presa visione firmata dal
destinatario su smartphone o tablet.

Costo alto, valore alto. La firma grafometrica su canvas e' fattibile in HTML senza
dipendenze, ma il valore giuridico di una firma raccolta cosi' **non e' una
decisione tecnica** e va posta al proprietario prima di implementarla. Una firma
che sembra probante senza esserlo e' peggio che nessuna firma.

---

## P3 — Richieste dell'utente, costo o rischio maggiore

### U6. Sezione coordinamento tra imprese (utente 3)

Interferenze, riunioni di coordinamento, PSC, POS, aggiornamenti documentali,
richieste di procedure integrative, prescrizioni.

L'utente lo definisce "una delle attivita' principali" per un CSE e nota che oggi
non e' valutata affatto. E' la richiesta piu' ampia del documento: di fatto un
nuovo modulo, non un campo in piu'.

Da chiarire col proprietario: **l'app e' per RSPP o anche per CSE?** Sono due ruoli
con obblighi diversi. Oggi l'interfaccia dice "RSPP" ovunque. Se il pubblico
comprende i CSE, questo punto e' strutturale e va pianificato, non aggiunto in
coda; se non li comprende, si puo' declinare consapevolmente.

### U7. Checklist piu' approfondite e personalizzabili (utente 6)

Controlli specifici per ponteggi, trabattelli, PLE, gru, sollevatori telescopici,
scavi, sollevamenti. Piu' la possibilita' di personalizzare le domande per cantiere.

Le due meta' hanno costi molto diversi:
- **Ampliare i template**: costo basso, e' contenuto, non codice. Serve pero' la
  competenza di dominio dell'utente per redigerli. Ottima candidata come prima
  attivita' da fargli validare.
- **Checklist personalizzabili per cantiere**: costo alto, richiede template
  persistiti su database e un editor. Oggi esistono solo le voci libere per
  categoria (`personalizzabile: true`), che coprono parzialmente l'esigenza.

Suggerisco di separarle: la prima meta' si puo' fare subito, la seconda e' un
progetto a se'.

### U8. Registrazione strutturata, privacy e consenso (utente 8, Andrea 6)

L'utente nota che l'accesso Google e' rapidissimo ma non e' chiaro se completi una
vera registrazione, e che non ha visto informative privacy ne' consenso al
trattamento.

**Questo non e' un miglioramento, e' un adempimento.** L'app tratta dati personali
di lavoratori e dati di sicurezza di cantieri di terzi, in Italia, quindi in ambito
GDPR pieno. Servono informativa, base giuridica, titolare del trattamento,
conservazione e cancellazione.

Non e' una decisione che spetta a me: va portata al proprietario come requisito
legale, non come voce di backlog. Se l'app viene usata da professionisti su dati di
clienti reali, e' bloccante per la distribuzione, non per la prossima release.

---

## P4 — Sicurezza e infrastruttura (report Andrea)

Vulnerabilita' che Andrea stesso dichiara ancora aperte:

- **Timeout di sessione** (anche suo punto 5). Supabase permette di configurare la
  durata della sessione e il refresh; in parte e' configurazione, non codice.
- **Enumerazione utenti.** Messaggi di errore che rivelano se un'email e' registrata.
  Da mitigare rendendo generiche le risposte di login e reset.
- **Rate limiting.** Supabase offre limiti configurabili su auth. Da verificare cosa
  e' gia' attivo prima di scrivere codice.

Altro, gia' in `AGENTS.md`:

- **CSP con `'unsafe-inline'`**, inevitabile finche' ogni handler e' un `onclick`
  inline. Rimuoverlo e' un refactor ampio, da valutare solo se si tocca comunque
  l'HTML.
- **Foto su storage a oggetti** invece che base64 in riga. Prerequisito sensato per
  qualunque migrazione futura, vedi `docs/migrazione-backend.md`.

### Offline-first con IndexedDB (Andrea 8)

Il service worker cachea gli asset, quindi l'app **si apre** offline, ma ogni
lettura e scrittura passa da Supabase: in cantiere senza campo non si salva nulla.
Per un'app che si dichiara "Offline-First" e' una lacuna sostanziale, e un cantiere
e' esattamente il posto dove manca la linea.

Costo alto: serve una coda di scritture locali e una strategia di sincronizzazione,
con gestione dei conflitti. Da non sottovalutare e da non improvvisare.

---

## Note per la discussione col proprietario

1. **Prima B1.** Un utente reale non e' riuscito a salvare. Finche' non e'
   riprodotto e risolto, il resto e' accademico.
2. **U8 e' un adempimento legale**, non una funzionalita'. Va deciso a quel livello.
3. **RSPP o anche CSE?** La risposta cambia la priorita' di U6 e la dimensione del
   progetto. Va chiarito prima di pianificare.
4. **U5 (firma) richiede una decisione sul valore giuridico** prima di scrivere codice.
5. Le richieste dell'utente sono di qualita' alta e concrete: chi le ha scritte
   conosce il mestiere. Vale la pena coinvolgerlo di nuovo per validare le checklist
   ampliate di U7, che e' contenuto specialistico che non possiamo redigere noi.
