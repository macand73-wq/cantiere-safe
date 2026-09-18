# CantiereSafe — agent working notes

Single source of truth for agents working on this repo. CLAUDE.md points here.

## What this is

Offline-first PWA for Italian RSPP (workplace safety officers) to run and record
site safety inspections (sopralluoghi) under D.Lgs. 81/2008. Vanilla JS, no build
step, no framework, no package.json. Supabase is the backend (auth + Postgres).
Deployed on Netlify.

**The project is written in Italian.** UI strings, identifiers, comments and commit
messages are Italian. Keep it that way: do not translate identifiers or UI copy to
English. Conversations with the maintainer are in English.

## Files

| File | Role |
|---|---|
| `index.html` | All views as static divs, toggled by class `.active`. Handlers are inline `onclick=`. |
| `app.js` | ~1400 lines, the whole app. Sectioned by banner comments (`// ═══ SECTION ═══`). |
| `style.css` | All styling. CSS custom properties on `:root`, dark theme. |
| `sw.js` | Service worker, cache-first except `supabase.co` which is network-only. |
| `manifest.json` | PWA manifest, inline SVG data-URI icons. |
| `build.js` | Netlify build step, injects Supabase keys into `app.js`. See warning below. |
| `netlify.toml` | `command = "node build.js"`, `publish = "."`. |

There is no test suite, no linter, no dependency manifest. jsPDF and supabase-js
load from CDN in `index.html` with SRI hashes.

## Architecture

**Routing.** `showView(name)` removes `.active` from every `.view`, then adds it to
`#view-<name>`. Callers pass the *bare* name (`showView('home')`), not the element id.
The nav is wired in `initApp()` via `data-view` attributes on `.nav-btn`.

**State.** Module-level mutable globals, no store: `currentUser`, `currentProfile`,
`currentSopralluogo` (the record being edited), `allSopralluoghi`, `cantieri`,
`cantiereCorrente`, plus photo id counters. Nothing persists client-side; every read
goes to Supabase.

**Auth.** `sbClient.auth` with email/password, Google OAuth, and reset-by-email.
`onAuthStateChange` drives `initApp(user)` on SIGNED_IN and hides the app on
SIGNED_OUT. `initApp` is also called directly from `DOMContentLoaded` when a session
already exists.

**Checklists.** Three hardcoded templates (`CHECKLIST_CANTIERE`, `_AZIENDA`,
`_EDIFICIO`), picked by `getChecklistByLuogo()`. Items carry
`{id, testo, categoria, personalizzabile?}`; at form-init they are cloned and
extended with `{valore:'SI'|'NO'|'NA', commento, foto[], nascosta}`. Items with
`personalizzabile:true` have empty `testo` the user fills in. `nascosta` hides an item
without deleting it. Changing "tipo luogo" **replaces the whole checklist and discards
any answers already entered**; that is deliberate today, not a bug, but it is
destructive and worth a confirm if it is ever touched.

**Photos.** Stored as base64 data URLs inside the row's JSON, not in Supabase Storage.
Upload path is `validateImageFile` (MIME + size) → `validateMagicBytes` (header
sniff) → `compressImage` (canvas re-encode) → push to array. Limits: 20 photos,
10 MB per file, `ALLOWED_MIME` whitelist. This is the main scaling ceiling, see below.

**XSS posture.** Lists are built with template strings and `innerHTML`. User-supplied
text must go through `escHtml()`. Photo thumbnails are rendered with `data-*`
attributes and opened through a single delegated `click` listener rather than inline
handlers, specifically so data URLs never land in an `onclick` string. Keep that
pattern; do not reintroduce `onclick="openLightbox('<url>')"`.

**Export.** PDF via jsPDF (hand-positioned mm coordinates, A4), plus `.doc` (HTML
masquerading as Word), `.txt`, and a whole-account `.txt` backup. `stripEmoji()`
exists because jsPDF's helvetica cannot render emoji.

## Supabase schema (inferred from queries, not from a migration file)

There are no migrations in this repo. The schema below is reconstructed from the
code; verify against the live project before relying on it.

- **`profiles`** — `id` (= `auth.users.id`), `nome`, `studio`. Read in `initApp`.
  Registration passes `nome`/`studio` as `options.data` to `signUp`, so a DB trigger
  on `auth.users` is presumably what creates the profile row. Nothing in this repo
  creates it.
- **`sopralluoghi`** — `id`, `user_id`, `azienda`, `cantiere`, `indirizzo`, `rspp`,
  `luogo`, `data`, `rischio_generale`, `note_libere`, `checklist` (jsonb),
  `foto` (jsonb), `created_at`, `updated_at`.
- **`cantieri`** — `id`, `user_id`, `nome`, `indirizzo`, `comune`, `committente`,
  `impresa_affidataria`, `cse`, `dl`, `responsabile_lavori`, `importo`,
  `data_inizio`, `data_fine`, `notifica_preliminare`, `created_at`.

Queries on `sopralluoghi` filter `.eq('user_id', currentUser.id)` in the client.
`caricaCantieri()` does **not** filter by user, so cantieri isolation depends entirely
on a row-level-security policy existing server-side. Confirm RLS is on for both
tables; the client-side filter is not a security boundary.

`sopralluoghi` and `cantieri` are not linked by a foreign key. The cantieri anagrafica
is currently a standalone list; a sopralluogo still stores a free-text `azienda` and
`cantiere`. Joining the two is the obvious next feature.

## Deploy

Netlify runs `node build.js`, which string-replaces the two placeholders in `app.js`
with `SUPABASE_URL` / `SUPABASE_ANON_KEY` from the environment, then publishes the
repo root. The anon key is public by design (it ships to the browser); its safety
depends on RLS, not on secrecy.

**`build.js` overwrites `app.js` in place.** Running it locally will destroy the
placeholders in your working copy and stage a diff that leaks the key. Do not run
`node build.js` on a developer machine.

Google OAuth `redirectTo` in `doGoogleLogin()` is hardcoded to a GitHub Pages URL
(`macand73-wq.github.io/cantiere-safe/`), which does not match the Netlify
deployment. Google sign-in is therefore expected to be broken in production.

## Known problems (verified in the current tree, 2026-09-18)

Ordered roughly by severity. None of these are fixed yet.

1. **`caricaCantieri()` has no `user_id` filter.** If RLS is not enforcing isolation,
   every user sees every cantiere.
2. **`showView('view-cantieri')`** at `index.html:273` (the cantiere form's Annulla
   button) passes an element id where a bare name is expected, producing
   `#view-view-cantieri`. The button silently does nothing. Same class of bug as the
   one fixed in `e1e856d`.
3. **`.input-field` has no CSS.** The entire cantiere form in `index.html` uses
   `class="input-field"`, which appears zero times in `style.css`. Those inputs render
   unstyled. The rest of the app uses `.form-input`.
4. **`modificaCantiere(id)` compares types.** `id` arrives from `dataset.id`, always a
   string; `c.id` from Postgres is a number (or uuid). `c.id === id` fails for numeric
   ids, so Modifica silently does nothing. Use `==` or coerce.
5. **`btn-primary` / `btn-secondary` used without `btn`.** The cantieri views use
   `class="btn-primary"` alone; `style.css` puts layout on `.btn` and only color on
   `.btn-primary`. Elsewhere the app correctly writes `class="btn btn-primary"`.
   `.btn-secondary` is not defined in `style.css` at all.
6. **Photos as base64 in jsonb.** A 20-photo inspection is several MB in a single row,
   fetched in full by `loadHome()`'s `select('*')` on every home view. This will not
   scale; Supabase Storage plus a URL reference is the fix.
7. **`loadHome()` selects everything.** `select('*')` pulls every photo blob just to
   render summary cards. The list only needs the scalar columns.
8. **CSP allows `'unsafe-inline'` for scripts,** which it must, because every handler
   is an inline `onclick`. The CSP is therefore much weaker than it looks.
9. **`clearAllData()` deletes only `sopralluoghi`,** not `cantieri`, despite the UI
   saying "Elimina tutti i dati".

## Credential history

Commits `f429f67` through HEAD (25 of 30) carry a Supabase project URL and anon key,
in `app.js` up to `420267f` and in `old/app.js` after that. **That key was rotated
months ago and is inert**, so this is a historical artifact, not an exposure.

`old/` was deleted from the tree rather than scrubbed from history: rewriting 25 of 30
commits to remove a dead string would break every existing clone for no security gain,
and `origin` (`macand73-wq/cantiere-safe`) is not ours to force-push. Do not "clean up"
this history without a reason better than tidiness, and never without the repo owner's
agreement.

The anon key is public by design in any case, it ships to every browser. Its safety
rests entirely on row-level security, which is why the RLS audit above matters and the
key's secrecy does not.

Because history was left intact, the old implementation is still fully retrievable:

```
git show 88e7cd4:old/app.js > old-app.js   # inspect
git checkout 88e7cd4 -- old/               # restore
git log --follow -- old/app.js             # full lineage, back to v1.1 at 7411a9c
```

`--follow` traces it through the rename, so every version from `7411a9c` (v1.1)
onwards is reachable. Deleting it forward-only rather than rewriting history was the
point: the owner keeps the historical copy.

## Conventions

- Vanilla JS, no framework, no build step beyond the key injection. Keep it that way
  unless the maintainer decides otherwise.
- No dependencies added without discussion. The two CDN scripts need SRI hashes.
- Italian identifiers and UI strings. Comments in Italian to match the file.
- Section banner comments (`// ═══ NAME ═══`) mark the structure of `app.js`; put new
  code in the matching section rather than at the end of the file.
- Conventional-commit prefixes (`feat:`, `fix:`) appear in recent history; follow that.
- `escHtml()` on every interpolated user value. No exceptions.

## Backend migration

The maintainer is exploring a move off Supabase and Netlify. Assessment in
`docs/migrazione-backend.md`: feasible, Netlify is hours of work, Supabase is weeks.
Nothing is decided and no migration work has started. The blocker is that the project
has no server code at all, so authorization lives entirely in Postgres RLS policies;
leaving Supabase means writing a backend that does not exist today.

## Licensing

No license yet. The maintainer has not settled this with the project owner, so do not
add a `LICENSE` file, copyright headers, or a License section to the README until
told to.
