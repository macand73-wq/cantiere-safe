# Storia delle credenziali nel repository

**Verificato il 2026-09-18 contro il deploy in produzione.** Correggere questo
documento se la situazione cambia, e non fidarsi di quanto riportato a voce: la
versione precedente di questa pagina affermava che la chiave fosse stata ruotata, ed
era falso.

## Situazione di fatto

I commit da `f429f67` a HEAD (25 su 30) contengono URL e anon key del progetto
Supabase, in `app.js` fino a `420267f` e in `old/app.js` da li' in poi.

La chiave presente nella history **non e' stata ruotata**. E' identica byte per byte a
quella che serve la produzione oggi:

- project ref `couqrvfutxhvzjpwgilz`, lo stesso nella history e nel deploy;
- JWT `role: anon`, emesso il 2026-03-20, valido fino al 2036-03-19;
- confronto eseguito fra `3876b5b:old/app.js` e
  `https://visionary-chaja-09e4ff.netlify.app/app.js`.

## Perche' non e' un incidente

L'anon key di Supabase e' **pubblica per progetto**: viene inclusa nel JavaScript
servito a ogni visitatore, e' visibile a chiunque apra il sito con gli strumenti di
sviluppo. Non e' un segreto e non e' mai stata pensata per esserlo.

Di conseguenza la history di git non e' la fonte dell'esposizione: lo e' il sito
stesso, per necessita' di funzionamento. Rimuovere la chiave dai commit non
cambierebbe nulla finche' la stessa identica stringa viene servita a ogni caricamento
di pagina.

## Perche' la history non e' stata riscritta

`old/` e' stato rimosso dal tree con una semplice cancellazione, senza toccare la
history. Le ragioni, in ordine:

1. **Non ci sarebbe alcun guadagno di sicurezza.** La chiave e' pubblica per
   progettazione e comunque servita in produzione.
2. Riscrivere 25 commit su 30 romperebbe ogni clone esistente.
3. `origin` (`macand73-wq/cantiere-safe`) non e' nostro: un force-push va concordato
   col proprietario.
4. La copia storica dell'implementazione precedente ha valore per il proprietario, e
   una riscrittura la distruggerebbe proprio mentre cerca di "ripulire".

Non riscrivere questa history senza una ragione migliore del decoro, e mai senza
l'accordo del proprietario.

## Cosa conta davvero

La sicurezza dell'anon key non dipende dalla sua segretezza ma **interamente dalle
policy RLS** su Postgres. Il proprietario riferisce (2026-09-17) che RLS e' attivo su
tutte le tabelle. Quella affermazione non e' stata verificata direttamente, e in
questo repository non esistono migrazioni da ispezionare.

Dato che un'altra affermazione sulla sicurezza di questo progetto, la rotazione della
chiave, non ha retto alla verifica, **le policy RLS vanno controllate nella dashboard
Supabase e non date per buone.** E' l'unica cosa che separa i dati di un utente da
quelli di un altro.

## Recupero della vecchia implementazione

La history e' intatta, quindi `old/app.js` resta interamente recuperabile:

```
git show 88e7cd4:old/app.js > old-app.js   # inspect
git checkout 88e7cd4 -- old/               # restore
git log --follow -- old/app.js             # lineage completo, fino a v1.1 in 7411a9c
```
