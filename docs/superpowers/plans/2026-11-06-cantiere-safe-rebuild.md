# CantiereSafe Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild CantiereSafe as a self-hosted PocketBase backend plus a Vue 3 + TypeScript PWA, with i18n and object-storage photos.

**Architecture:** PocketBase (single Go binary, SQLite) provides auth, collections, per-user access rules, and file storage. A Vue 3 + Vite SPA (TypeScript, Pinia, vue-i18n, PrimeVue unstyled) talks to it through a thin typed `src/api/` layer. Framework-free logic lives in `src/lib/`.

**Tech Stack:** PocketBase, Vue 3, Vite, TypeScript, Pinia, vue-i18n, PrimeVue (unstyled), vite-plugin-pwa, jsPDF, Vitest, @vue/test-utils.

**Spec:** `docs/superpowers/specs/2026-11-06-cantiere-safe-rebuild-design.md`

**Scope note:** This plan covers the MVP rebuild (backend, auth, cantieri, sopralluogo with checklist and photos, export). Offline-first is a separate later plan per the spec.

## Global Constraints

- Code identifiers, comments, and commit messages: English.
- TypeScript `strict: true`.
- UI strings only via vue-i18n; `en` is the source locale, `it` a full translation.
- `src/api/` is the only place the PocketBase SDK is imported.
- `src/lib/` is framework-free and unit-tested.
- PrimeVue in unstyled mode; theme via the app's own CSS custom properties.
- No LICENSE file until the owner decides.
- No data migration: the current Supabase project has no real users.

## Review Focus

- More than 20 photos on one inspection. Clean rejection, no partial save.
- Slow or dropped network during save. Visible progress and a clear failure, never a silent dead button.
- Non-image or oversized file. Rejected before upload (MIME + magic bytes).
- Two inspections created near-simultaneously for different users. No cross-user leakage.
- Italian locale selected. Exported PDF renders Italian, accented characters intact.

---

### Task 1: PocketBase runtime and committed migrations

**Files:**
- Create: `.gitignore`
- Create: `backend/README.md`
- Create: `backend/pb_migrations/` (auto-generated, committed)
- Ignore: `backend/pocketbase`, `backend/pb_data/`

**Interfaces:**
- Produces: a running PocketBase at `http://127.0.0.1:8090` with a superuser, and a `backend/pb_migrations/` dir that reproduces the schema on an empty `pb_data/`.

- [ ] **Step 1:** Create `.gitignore` with `backend/pocketbase`, `backend/pb_data/`, `node_modules/`, `dist/`, `.env*`.
- [ ] **Step 2:** Download the latest PocketBase release for your platform into `backend/pocketbase`; record the pinned version in `backend/README.md`.
- [ ] **Step 3:** Run `./backend/pocketbase superuser create admin@example.org <password>`.
- [ ] **Step 4:** Start it: `./backend/pocketbase serve --dir backend/pb_data --migrationsDir backend/pb_migrations`.
- [ ] **Step 5:** Verify: `curl -s http://127.0.0.1:8090/api/health` returns `{"code":200,"message":"API is healthy."}`.
- [ ] **Step 6:** Commit `.gitignore`, `backend/README.md`, `backend/pb_migrations/.gitkeep`.

### Task 2: Collections, fields, and per-user rules

**Files:**
- Create/modify via admin UI, captured in `backend/pb_migrations/`

**Interfaces:**
- Produces: collections `users` (auth, extra text fields `nome`, `studio`), `cantieri`, `sopralluoghi`, all with per-user rules. `sopralluoghi` has a `foto` file field (maxSelect 20, maxSize 10MB, image mimes) and a `checklist` json field.

- [ ] **Step 1:** In the admin UI, add `nome` and `studio` text fields to `users`.
- [ ] **Step 2:** Create `cantieri` with fields: `user` (relation to users, required), `nome`, `indirizzo`, `comune`, `committente`, `impresa_affidataria`, `cse`, `dl`, `responsabile_lavori`, `importo`, `data_inizio`, `data_fine`, `notifica_preliminare`. Set all API rules to `user = @request.auth.id`.
- [ ] **Step 3:** Create `sopralluoghi` with: `user` (relation to users, required), `cantiere` (relation to cantieri), `azienda`, `indirizzo`, `rspp`, `luogo`, `data`, `rischio_generale`, `note_libere`, `checklist` (json), `foto` (file, maxSelect 20, maxSize 10485760, mimeTypes `image/jpeg,image/png,image/webp,image/heic,image/heif`). Set all API rules to `user = @request.auth.id`.
- [ ] **Step 4:** Verify isolation: create one cantiere as user A; authenticate as user B; `GET /api/collections/cantieri/records` returns zero items.
- [ ] **Step 5:** Confirm the generated files appear under `backend/pb_migrations/` and commit them.

> Note: PocketBase settings (OAuth providers, SMTP) are instance config, not migrations. Every manual setting goes in `backend/README.md`.

### Task 3: Auth (email/password + Google)

**Files:**
- Create: `backend/README.md` (setup steps)

**Interfaces:**
- Produces: working email/password auth, signup with `nome`/`studio`, and Google OAuth, documented for reproduction.

- [ ] **Step 1:** Document and enable the Google OAuth provider (client id/secret, redirect URL) in `backend/README.md`; register the Google app.
- [ ] **Step 2:** Verify signup: `POST /api/collections/users/records` with email/password/nome/studio returns 200 and the record carries the fields.
- [ ] **Step 3:** Verify login: `POST /api/collections/users/auth-with-password` returns a token.
- [ ] **Step 4:** Verify a second user cannot read the first user's record.
- [ ] **Step 5:** Commit `backend/README.md`.

### Task 4: Vue scaffold with TS, i18n, router, PWA, PrimeVue

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.ts`, `src/App.vue`, `src/router/index.ts`
- Create: `src/locales/en.json`, `src/locales/it.json`, `src/i18n.ts`
- Test: `src/__tests__/app.spec.ts`

**Interfaces:**
- Produces: `src/i18n.ts` exporting the vue-i18n instance with `en`/`it`; `src/router/index.ts` exporting the router; an `App.vue` shell that renders a locale switcher.

- [ ] **Step 1:** Write the failing test `src/__tests__/app.spec.ts`: mount `App.vue`, assert it renders the `en` title, switch locale to `it`, assert the Italian title.
- [ ] **Step 2:** Run `npm test` (Vitest). Expected: FAIL, module not found.
- [ ] **Step 3:** Add dependencies and config: `vue`, `vue-router`, `pinia`, `vue-i18n`, `primevue`, `vite`, `vite-plugin-pwa`, `typescript`, `vitest`, `@vue/test-utils`, `happy-dom`.
- [ ] **Step 4:** Create `src/i18n.ts`, `src/locales/{en,it}.json`, `src/router/index.ts`, `src/main.ts`, `src/App.vue` per the interfaces.
- [ ] **Step 5:** Run `npm test`. Expected: PASS.
- [ ] **Step 6:** Run `npm run dev`; confirm the app loads and the locale switch works.
- [ ] **Step 7:** Commit.

### Task 5: Thin typed API layer

**Files:**
- Create: `src/types.ts`, `src/api/client.ts`, `src/api/auth.ts`, `src/api/cantieri.ts`, `src/api/sopralluoghi.ts`
- Test: `src/api/__tests__/cantieri.spec.ts`

**Interfaces:**
- Produces: `pb` (PocketBase instance), types `Cantiere`, `Sopralluogo`, `ChecklistItem`, `Profile`; functions `listCantieri()`, `getCantiere(id)`, `createCantiere(input)`, `updateCantiere(id, input)`, `deleteCantiere(id)`; analogous sopralluoghi functions; auth functions `login`, `register`, `logout`, `loginWithGoogle`, `resetPassword`, `onAuthChange`.

- [ ] **Step 1:** Write failing test `src/api/__tests__/cantieri.spec.ts`: mock `pb.collection('cantieri').getFullList`, assert `listCantieri()` returns mapped records.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `src/types.ts`, `src/api/client.ts`, `src/api/cantieri.ts`, `src/api/sopralluoghi.ts`, `src/api/auth.ts`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 6: Auth store and views

**Files:**
- Create: `src/stores/auth.ts`, `src/views/LoginView.vue`, `src/views/RegisterView.vue`, `src/views/ResetView.vue`
- Modify: `src/router/index.ts`
- Test: `src/stores/__tests__/auth.spec.ts`

**Interfaces:**
- Produces: `useAuthStore()` with `user`, `login`, `register`, `logout`, `init`; a router guard redirecting unauthenticated users to `/login`.

- [ ] **Step 1:** Write failing test: `useAuthStore().login(email, pass)` calls `api/auth.login` and sets `user`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the store and views.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Manually verify login to home, logout to login.
- [ ] **Step 6:** Commit.

### Task 7: Cantieri list and form

**Files:**
- Create: `src/stores/cantieri.ts`, `src/views/CantiereListView.vue`, `src/views/CantiereFormView.vue`, `src/components/cantiere/CantiereList.vue`, `src/components/cantiere/CantiereForm.vue`
- Test: `src/components/cantiere/__tests__/cantiereForm.spec.ts`

**Interfaces:**
- Produces: `useCantieriStore()` with `items`, `load`, `create`, `update`, `remove`; form emits a validated payload matching `Cantiere`.

- [ ] **Step 1:** Failing test: submitting the form with a name calls `create` once with the trimmed payload; empty name is rejected.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement store, list, form.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Manual: create, edit, delete a cantiere against local PocketBase.
- [ ] **Step 6:** Commit.

### Task 8: Sopralluogo form, checklist, and photos

**Files:**
- Create: `src/lib/checklist.ts`, `src/lib/photos.ts`
- Create: `src/components/checklist/ChecklistSection.vue`, `src/components/checklist/ChecklistItem.vue`
- Create: `src/components/photos/PhotoField.vue`
- Create: `src/views/SopralluogoFormView.vue`, `src/views/SopralluogoListView.vue`
- Test: `src/lib/__tests__/photos.spec.ts`, `src/lib/__tests__/checklist.spec.ts`

**Interfaces:**
- Produces: `CHECKLIST_TEMPLATES` (three templates, locale-keyed text), `cloneChecklist(template)`, `validateImageFile(file)`, `compressImage(file)`, `validateMagicBytes(file)`; `<PhotoField>` that encapsulates upload, compression, thumbnails, and lightbox for both general and per-item photos.

- [ ] **Step 1:** Failing tests: `validateImageFile` rejects a `text/plain` file; `validateMagicBytes` accepts a JPEG header and rejects a fake; `cloneChecklist` returns fresh items with `valore:'NA'`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `lib/photos.ts` and `lib/checklist.ts`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Write failing component tests: adding a 21st photo is rejected and the first 20 are kept; a rejected save shows an error toast and re-enables the save button.
- [ ] **Step 6:** Run. Expected: FAIL.
- [ ] **Step 7:** Implement `PhotoField`, `ChecklistItem`, `ChecklistSection`, and the sopralluogo views until the tests pass, wiring the 20-photo cap to a clean toast.
- [ ] **Step 8:** Run. Expected: PASS.
- [ ] **Step 9:** Manual: create a sopralluogo with general and per-item photos against local PocketBase; reload and confirm photos persist from storage, not base64.
- [ ] **Step 10:** Commit.

### Task 9: Export (PDF/doc/txt) with localized report

**Files:**
- Create: `src/lib/export.ts`
- Create: `src/components/export/ExportMenu.vue`
- Test: `src/lib/__tests__/export.spec.ts`

**Interfaces:**
- Produces: `buildReportSections(sopralluogo, t)` returning a locale-aware structure; `exportPdf(sopralluogo, t)`, `exportDoc(sopralluogo, t)`, `exportTxt(sopralluogo, t)`.

- [ ] **Step 1:** Failing test: `buildReportSections` with the `it` translator uses Italian labels; with `en`, English.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Add the `jspdf` dependency, then implement `export.ts` (jsPDF for PDF, HTML for doc, plain text for txt; strip emoji for jsPDF).
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Manual: export a sopralluogo as PDF in both locales; check accents.
- [ ] **Step 6:** Commit.

### Task 10: Production deployment on Hetzner

**Files:**
- Create: `deploy/Caddyfile`, `deploy/cantiere-safe.service`, `deploy/README.md`

**Interfaces:**
- Produces: PocketBase and the built SPA served over HTTPS from a Hetzner VPS, with a systemd unit and a documented backup job.

- [ ] **Step 1:** Build the SPA (`npm run build`) and copy `dist/` plus the PocketBase binary and `pb_data/` to the VPS.
- [ ] **Step 2:** Write a `Caddyfile` reverse-proxying `/api` and `/_` to PocketBase on `127.0.0.1:8090` and serving `dist/` as static files.
- [ ] **Step 3:** Write a systemd unit running `pocketbase serve --http 127.0.0.1:8090`.
- [ ] **Step 4:** Verify: `curl -sI https://<domain>/` returns 200 and `curl -s https://<domain>/api/health` returns healthy.
- [ ] **Step 5:** Document a restic backup of `pb_data/` in `deploy/README.md` and verify a restore into a scratch directory.
- [ ] **Step 6:** Commit.

> Blocked on the spec's open question: who administers the server. Do not deploy to a shared Hetzner account without the owner's decision.

---

## Follow-on plans (not in this one)

- Offline-first: IndexedDB write queue and sync, per spec phase 2.
