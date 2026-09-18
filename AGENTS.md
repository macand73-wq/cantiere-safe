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
  `foto` (jsonb), `cantiere_id`, `created_at`, `updated_at`.
  `id` is an integer, not a uuid: `loadHome()` interpolates it unquoted into
  `onclick="openDetail(${s.id})"`, which only parses for a number.
  **`cantiere_id` exists in the database but is referenced nowhere in `app.js`** —
  the cantieri/sopralluoghi link is half-built. Whether `updated_at` actually exists
  is unconfirmed and is a suspect in the save failure, see `docs/backlog.md` B1.
- **`cantieri`** — `id`, `user_id`, `nome`, `indirizzo`, `comune`, `committente`,
  `impresa_affidataria`, `cse`, `dl`, `responsabile_lavori`, `importo`,
  `data_inizio`, `data_fine`, `notifica_preliminare`, `created_at`.

Queries on `sopralluoghi` filter `.eq('user_id', currentUser.id)` in the client.
`caricaCantieri()` does **not** filter by user. The project owner reports (2026-09-17)
that **RLS is active on all tables**, so this is a correctness and bandwidth problem
rather than a data leak, but the client-side filter was never the security boundary
in either case. Worth confirming in the dashboard, as there are no migrations here.

The cantieri anagrafica is still effectively standalone in the UI: a sopralluogo
stores free-text `azienda` and `cantiere`, and nothing writes `cantiere_id`. Wiring
that up is the highest-value next feature, see `docs/backlog.md` U1.

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

## Conventions

- Vanilla JS, no framework, no build step beyond the key injection. Keep it that way
  unless the maintainer decides otherwise.
- No dependencies added without discussion. The two CDN scripts need SRI hashes.
- Italian identifiers and UI strings. Comments in Italian to match the file.
- Section banner comments (`// ═══ NAME ═══`) mark the structure of `app.js`; put new
  code in the matching section rather than at the end of the file.
- Conventional-commit prefixes (`feat:`, `fix:`) appear in recent history; follow that.
- `escHtml()` on every interpolated user value. No exceptions.

## Further reading

Kept out of this file on purpose, so it stays short enough to read at the start of
every session. Consult when the task calls for it:

- **`docs/backlog.md`** — prioritised work list, merging the owner's status report
  and a real user's nine-point review. **Includes the authoritative list of known
  bugs in the current tree.** Read before picking up any feature or bugfix work.
  Top item is a reported save failure that has not been reproduced.
- **`docs/migrazione-backend.md`** — assessment of moving off Supabase and Netlify.
  Exploratory, nothing decided. Short version: Netlify is hours, Supabase is weeks,
  and the blocker is that authorization lives entirely in Postgres RLS because the
  project has no server code.
- **`docs/credenziali-history.md`** — why a rotated Supabase key still appears in
  history and why it was deliberately not rewritten. Read before anyone proposes
  "cleaning up" the git history.

## Licensing

No license yet. The maintainer has not settled this with the project owner, so do not
add a `LICENSE` file, copyright headers, or a License section to the README until
told to.
