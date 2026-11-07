# CantiereSafe

Offline-capable PWA for workplace-safety inspections (sopralluoghi) under
D.Lgs. 81/2008, aimed at Italian RSPP officers and safety technicians. It
records the site, the checklist answers, comments and photos, and exports the
report as PDF, Word or plain text.

The user interface is bilingual (English source locale, full Italian
translation); the inspection content is Italian by nature.

## Stack

- **Backend:** PocketBase 0.40.6 (single Go binary, SQLite, auth, per-user
  collection rules, file storage). Schema lives in committed migrations under
  `backend/pb_migrations/`.
- **Frontend:** Vue 3 + Vite + TypeScript, Pinia, vue-i18n, PrimeVue 4
  (unstyled), vite-plugin-pwa.
- **Tests:** Vitest + @vue/test-utils + happy-dom.
- **Export:** jsPDF for PDF, HTML for Word, plain text for TXT.

The PocketBase SDK is imported only in `src/api/`. Framework-free logic
(checklists, photo validation/compression, report building, draft storage)
lives in `src/lib/` and is unit-tested.

## Quick start

Requirements: Node 20+ and the PocketBase binary.

```sh
# one-time: PocketBase binary (not tracked in git)
curl -sL -o /tmp/pb.zip \
  https://github.com/pocketbase/pocketbase/releases/download/v0.40.6/pocketbase_0.40.6_linux_amd64.zip
unzip -o /tmp/pb.zip -d backend
./backend/pocketbase superuser create admin@example.org cantieresafe-dev-2026 --dir backend/pb_data

# daily
./dev.sh start          # backend on 0.0.0.0:8090, frontend on 0.0.0.0:5173
./dev.sh status         # pids, ports and the LAN URLs for phone testing
./dev.sh stop
./dev.sh restart backend
```

Logs and pid files live in `.run/` (ignored). See `backend/README.md` for the
pinned version, schema notes, auth setup and the known save-path limitation.

Phone testing: open the LAN app URL printed by `./dev.sh status` on the same
network. A camera capture can make the mobile browser reload the page; the form
recovers its text, answers and pending photos from a local draft.

## Tests

```sh
npm test
npx tsc --noEmit
npm run build
```

## Status

The rebuild from the former Supabase/vanilla-JS app is merged. Production
deployment is not done yet: it waits on the owner's decision about the Hetzner
server. Google OAuth is wired but unverified because no Google credentials are
configured. Offline-first sync is a later phase.

Design and implementation record:
`docs/superpowers/specs/` and `docs/superpowers/plans/`.

## Development Approach

This project is developed using AI-assisted tools. Code is generated with the help of AI based on human-provided specifications, design decisions, and iterative feedback.

All contributions are reviewed, tested, and curated by the maintainer before being included in the codebase. AI is used as a productivity and exploration tool, while human oversight remains central to all decisions.

The goal is to combine the flexibility of AI-assisted development with standard open-source practices such as transparency, review, and accountability.
