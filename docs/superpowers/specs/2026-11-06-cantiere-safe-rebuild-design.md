# Design: CantiereSafe rebuild on PocketBase + Vue 3

Date: 2026-11-06
Status: approved
No code changes yet

## Intent and why

CantiereSafe is a static PWA (vanilla JS, no backend) talking directly to Supabase: auth + Postgres + RLS. Photos are base64 inside the `jsonb` column. The maintainer is leaving Supabase for a self-hosted EU stack (Hetzner, already used elsewhere), driven by three things:

1. **GDPR / data residency.** The app processes workers' personal data and third-party site-safety data in Italy (backlog U8). Site photos can contain faces and injury scenes. An EU-native provider is the defensible choice, not a luxury.
2. **Lock-in and control.** Leaving Supabase means writing a backend for the first time (`docs/migrazione-backend.md`).
3. **Cost and effort.** At current scale price is noise; residency and ops effort decide.

## Goals

- Replace Supabase with **PocketBase** self-hosted on a Hetzner VPS, behind Caddy.
- Rebuild the frontend in **Vue 3 + Vite + TypeScript + Pinia + vue-i18n + PrimeVue (unstyled)**.
- Auth: email/password + Google OAuth.
- Per-user authorization via collection rules (`user = @request.auth.id`), replicating today's RLS.
- Photos out of the DB: PocketBase `file` field, row keeps only the reference, tokenized URLs.
- i18n: English as source locale, Italian as a full end-user locale; PDF report follows the selected locale.

## Non-goals

- No Postgres + PostgREST + Authentik for now.
- No separate object store (MinIO/S3) until PocketBase local disk is insufficient; the S3 adapter (Hetzner Object Storage) arrives only if volume grows.
- No checklist customization editor (backlog U7 second half) in this pass; templates stay as data, shaped to move to a collection later.

## Anti-goals (what would make this a failure)

- **Losing per-user isolation.** Today RLS, now collection rules. A mistake here leaks client site data.
- **Architecting for dreamed scale.** SQLite handles thousands of read-mostly users fine; migration is a known bounded task if that day comes.
- **Spreading PocketBase-specific code.** Server-side hooks don't port. Core logic stays in `lib/`, framework-free.
- **Hand-rolling auth.** Email confirmation, reset, OAuth stay inside PocketBase.

## Constraints

- Code identifiers, comments, commits: **English**.
- UI: i18n with Italian available to end users.
- TypeScript.
- No license yet (maintainer hasn't settled with the owner).
- Full GDPR: privacy notice, legal basis, controller, retention/deletion are obligations, not features (backlog U8).

## Decisions

| Topic | Decision |
|---|---|
| Provider | Hetzner (VPS, already in use) |
| Backend | PocketBase (single Go binary, SQLite, auth + rules + file storage) |
| Frontend | Vue 3 + Vite + Pinia + vue-i18n + PrimeVue (unstyled) + TypeScript |
| PWA | vite-plugin-pwa replaces hand-written `sw.js` + `manifest.json` |
| Photos | PocketBase `file` field; local disk now, S3 adapter later |
| i18n | `en.json` source, `it.json` full translation |
| Users | None today. Greenfield, no data migration, no password reset |

## Project structure

```
cantiere-safe/
├── backend/                  # PocketBase binary + pb_data + committed migrations
├── index.html
├── package.json
├── vite.config.ts            # + vite-plugin-pwa
├── src/
│   ├── main.ts               # bootstrap: router, pinia, i18n, pb client
│   ├── App.vue
│   ├── router/index.ts       # vue-router (replaces showView() + inline onclick)
│   ├── locales/{en.json, it.json}
│   ├── api/                  # thin data layer, the only place PocketBase appears
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── cantieri.ts
│   │   └── sopralluoghi.ts
│   ├── stores/               # Pinia (replaces module globals)
│   ├── lib/                  # framework-free, unit-testable, portable
│   │   ├── checklist.ts
│   │   ├── photos.ts
│   │   └── export.ts         # PDF/doc/txt via jsPDF, plain module
│   ├── components/
│   │   ├── ui/               # FormField, Button, Toast, Modal, Lightbox
│   │   ├── cantiere/
│   │   ├── sopralluogo/
│   │   ├── checklist/        # ChecklistSection, ChecklistItem
│   │   └── photos/           # PhotoField, PhotoGrid (dedup win)
│   └── views/                # route-level pages
```

## Component reuse (the concrete wins)

- **`<PhotoField>`** collapses the duplicated general-photo and checklist-photo handlers.
- **`<ChecklistItem>`** replaces the monolithic `renderChecklist`.
- **`<FormField>`** shared across cantiere and sopralluogo forms.
- **`lib/export.ts`** stays a plain module so PDF generation remains testable and portable.

## Photos

Today: base64 in `jsonb`, max 600px JPEG 0.55 (~1 to 1.6 MB per full inspection), and the real defect is `loadHome()` doing `select('*')` (~13 MB per home open). After: files on disk, row keeps only the reference, served via tokenized URLs governed by the same collection rules. No manual presigning.

## Offline-first (phase 2)

In scope, after the PocketBase foundation works. IndexedDB write queue + sync strategy, with conflict handling. Not improvised, not now.

## Exit path (PocketBase to Postgres)

Bounded because: data is 3 collections, JSON columns, no joins (export/import is mechanical); per-user rules become one RLS policy per table; auth is the only annoying part (bcrypt hashes import, OAuth identities don't, so a password reset). The rule that keeps it cheap: **thin `api/` layer, no PocketBase-specific code outside it.**

## Sequencing

1. PocketBase foundation (schema, auth, rules, file fields), verifiable through the admin UI.
2. Vue rewrite in vertical slices (home, cantieri, sopralluogo form, export), written directly against PocketBase, skipping the vanilla-to-PocketBase intermediate step.
3. Offline-first.

Before any migration: verify current RLS policies on the live Supabase project (a security check independent of users). Fix the known app defects (`select('*')`, the already-resolved `user_id` filter) as part of the rewrite.

## What's left to the builder

The implementation plan (next: writing-plans).

## Open with the owner

- Who administers the Hetzner server over time (recurring, not one-time).
- RSPP or also CSE (changes scope, backlog U6).
- Signature legal value (backlog U5, not a technical decision).
- Google OAuth `redirectTo` bug is fixed as part of the hosting move.
