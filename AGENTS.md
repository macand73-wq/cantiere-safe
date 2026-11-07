# CantiereSafe: agent working notes

Single source of truth for agents. `CLAUDE.md` points here. Conversations with
the maintainer are in English.

## What this is

PWA for Italian workplace-safety inspections (D.Lgs. 81/2008): site record,
three checklists, per-item comments and photos, PDF/DOC/TXT export. Rebuilt
from the former vanilla-JS/Supabase app. Backend is self-hosted PocketBase; the
frontend is Vue 3 + TypeScript. UI is bilingual (`en` source, full `it`).

Deployment is not done yet (waits on the owner's Hetzner decision). Google OAuth
is wired but unverified (no credentials). Offline-first sync is a later phase.

## Layout

| Path | Role |
|---|---|
| `backend/pb_migrations/` | Schema as committed PocketBase JS migrations. Authoritative over the README. |
| `backend/README.md` | Pinned PocketBase version, dev superuser, auth/SMTP/OAuth setup, known limitation. |
| `src/api/` | The only place the PocketBase SDK is imported. Auth, cantieri, sopralluoghi, `photoUrl`. |
| `src/lib/` | Framework-free, unit-tested: `checklist.ts`, `photos.ts`, `export.ts`, `draft.ts`, `photoDrafts.ts`, `recent.ts`. |
| `src/stores/` | Pinia: auth, cantieri, sopralluoghi. |
| `src/views/`, `src/components/` | Routes and UI. |
| `src/locales/{en,it}.json` | All UI strings. Every new key goes in both. |
| `dev.sh` | start/stop/restart/status for backend + frontend; LAN URLs for phone testing. |
| `docs/superpowers/` | Approved 2026-11-06 design spec and implementation plan. |

## Commands

```sh
./dev.sh start|stop|restart|status [backend|frontend|all]
npm test
npx tsc --noEmit
npm run build
```

Backend runs on `0.0.0.0:8090` (LAN, for phone testing), Vite on
`0.0.0.0:5173` with `VITE_PB_URL` set from the current LAN address. Logs and
pid files: `.run/`.

## Conventions

- Code identifiers, comments, tests and commit messages: English.
- UI strings only via vue-i18n, in both locales; Italian must be real Italian.
- PocketBase SDK only in `src/api/`; `src/lib/` stays framework-free.
- TypeScript `strict`; no new dependencies without discussion.
- Photos are PocketBase file fields (`protected: true`), never base64 in the
  record. Access goes through `photoUrl()` (file token). One shared 20-photo
  budget per inspection, general and per-item combined.
- Per-user isolation rests on collection rules (`user = @request.auth.id`,
  files protected). Never weaken them. The list API functions deliberately do
  not filter client-side; the server rule is the boundary, do not "fix" that.
- User text is Vue-escaped; the DOC export uses `escHtml`. Keep both.
- Form state persists to a draft (`localStorage` + IndexedDB for pending
  photos), keyed per record. Clear it on successful save, keep it on failure.
- GPG-signed commits. No license chosen yet; do not add `LICENSE` or copyright
  headers.

## Known limitations

- Two-step photo save: a hard failure between the upload and the checklist
  finalize can leave photos unassociated with their checklist item. Documented
  in `backend/README.md`; a draft/finalized marker is the future fix.
- A saved draft can point at a partial record deleted elsewhere; the only exit
  is discarding the draft.
- HEIC/HEIF decode depends on the browser; undecodable files are rejected with
  an error.
- Export embeds photos in the PDF; `ExportMenu` fetches a file token per photo.

## Further reading

- `docs/superpowers/specs/2026-11-06-cantiere-safe-rebuild-design.md`: why the
  stack was chosen, goals/non-goals.
- `docs/superpowers/plans/2026-11-06-cantiere-safe-rebuild.md`: the executed
  plan, Task 10 (deployment) still open.
- `docs/backlog.md`: remaining product requests.
