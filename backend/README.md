# Backend (PocketBase)

The CantiereSafe backend is a single PocketBase binary plus the committed
migrations in `pb_migrations/`. There is no separate application server: the
schema, the REST API and the admin dashboard all come from PocketBase.

## Pinned version

**PocketBase v0.40.6** (linux_amd64), downloaded from:

```
https://github.com/pocketbase/pocketbase/releases/download/v0.40.6/pocketbase_0.40.6_linux_amd64.zip
```

The binary itself is **not** tracked in git (see `.gitignore`). To set up a
checkout, unzip that archive into `backend/`:

```sh
curl -sL -o /tmp/pb.zip \
  https://github.com/pocketbase/pocketbase/releases/download/v0.40.6/pocketbase_0.40.6_linux_amd64.zip
unzip -o /tmp/pb.zip -d backend
./backend/pocketbase --version   # -> pocketbase version 0.40.6
```

Upgrading means changing both the version here and the URL above; check the
PocketBase release notes for migration breaking changes first.

## Local runtime

`pb_data/` holds the SQLite database, the uploaded files and the superuser
record. It is ignored by git, so a fresh clone starts with an empty database
that `pb_migrations/` recreates.

Start the server (this is the exact command used for development and
verification):

```sh
./backend/pocketbase serve --http=127.0.0.1:8090 --dir backend/pb_data --migrationsDir backend/pb_migrations
```

Health check:

```sh
curl -s http://127.0.0.1:8090/api/health
```

Dashboard: <http://127.0.0.1:8090/_/>

## Dev superuser

The local superuser is created once per `pb_data/` with:

```sh
./backend/pocketbase superuser create admin@example.org cantieresafe-dev-2026 --dir backend/pb_data
```

| Field | Value |
|---|---|
| Email | `admin@example.org` |
| Password | `cantieresafe-dev-2026` |

These are **development-only** credentials. They live only in the ignored
`pb_data/`, they are never committed, and they must never be reused for a
deployed instance. A real deployment creates its own superuser and keeps the
password out of the repository entirely.

## Migrations

`pb_migrations/` is tracked. Schema changes made in the dashboard are written
there by PocketBase and must be committed, so that a clean `pb_data/` plus
`--migrationsDir backend/pb_migrations` reproduces the schema exactly.

Initial setup may also create `pb_data/types.d.ts` for editor type hints; it
stays untracked along with the rest of `pb_data/`.

## Authentication

Auth lives in the `users` auth collection. Email/password is enabled with
`email` as the identity field. OAuth2 is a per-instance setting: a fresh
checkout has the provider list empty, so Google sign-in only works after the
Google client id/secret are entered in the dashboard (see below).

### Collection rules

Read back from the running instance as superuser
(`GET /api/collections/users`):

| Rule | Value | Effect |
|---|---|---|
| `createRule` | `""` | Public signup. On an auth collection the empty create rule permits unauthenticated registration. |
| `listRule` | `id = @request.auth.id` | A user lists only their own record. |
| `viewRule` | `id = @request.auth.id` | A user reads only their own record. |
| `updateRule` | `id = @request.auth.id` | A user updates only their own record. |
| `deleteRule` | `id = @request.auth.id` | A user deletes only their own record. |
| `authRule` | `""` | No client-side auth-record management (email or password changes for other accounts); superusers only. |
| `manageRule` | `null` | Legacy alias of `authRule`, also unset. |

These are the PocketBase defaults for an auth collection, which is why there is
no users-rules migration. The two custom fields `nome` and `studio` are added
by `pb_migrations/1794038947_updated_users.js`.

### Signup

```sh
curl -s -X POST http://127.0.0.1:8090/api/collections/users/records \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.org","password":"password123","passwordConfirm":"password123","nome":"Alice Rossi","studio":"Studio Rossi"}'
```

Returns `200` with the created record, including the two custom fields:

```json
{"id":"xvsft339sox7dnt","email":"alice@example.org","nome":"Alice Rossi","studio":"Studio Rossi","verified":false,...}
```

`nome` and `studio` are sent as ordinary record fields, so they land in the
record on creation and are returned by signup and by every later read of the
user's own record.

### Login

```sh
curl -s -X POST http://127.0.0.1:8090/api/collections/users/auth-with-password \
  -H 'Content-Type: application/json' \
  -d '{"identity":"alice@example.org","password":"password123"}'
```

Returns `200` with a `token` (JWT, 224 chars in this instance) and a `record`
object that carries `nome` and `studio`. A wrong password returns
`400 {"message":"Failed to authenticate."}`.

Send the token on every later request as a raw header value, without a
`Bearer` prefix:

```sh
curl -s http://127.0.0.1:8090/api/collections/users/records/<id> \
  -H 'Authorization: <token>'
```

There is no logout endpoint. The client drops the token. There are no server-side
sessions, so an issued token stays valid until it expires even if the client
discards it.

### Per-user isolation

The self-only rules apply to the `users` collection itself, so a signed-in user
cannot enumerate or modify other accounts:

```sh
# B lists the collection: only B's own record comes back
curl -s http://127.0.0.1:8090/api/collections/users/records \
  -H "Authorization: <token B>"
# -> {"items":[{... "id":"r3q459ilbzi6vhg","email":"bob@example.org" ...}],"totalItems":1}

# B reads A's record by id
curl -s -w '\nHTTP %{http_code}\n' \
  http://127.0.0.1:8090/api/collections/users/records/<id A> \
  -H "Authorization: <token B>"
# -> HTTP 404

# B updates A's profile
curl -s -w '\nHTTP %{http_code}\n' -X PATCH \
  http://127.0.0.1:8090/api/collections/users/records/<id A> \
  -H "Authorization: <token B>" -H 'Content-Type: application/json' \
  -d '{"nome":"Hacked"}'
# -> HTTP 404, and A's record still has its original nome
```

The same `user = @request.auth.id` pattern isolates `cantieri` and
`sopralluoghi`, including their file downloads (see the `sopralluoghi`
migration). The client should still filter by the signed-in user id for
clarity, but the rules are the security boundary.

### Google OAuth2 (blocked on owner credentials)

**Status: not configured and not verified.** Registering the Google app needs
the project owner's Google account. No client id or secret is committed, and a
fresh instance cannot use Google sign-in until the steps below are done.

1. In the [Google Cloud console](https://console.cloud.google.com/), select or
   create a project.
2. Configure the OAuth consent screen: user type External, app name, support
   email, developer contact. Add the scopes
   `https://www.googleapis.com/auth/userinfo.email` and
   `https://www.googleapis.com/auth/userinfo.profile`, plus the `openid` scope.
   While the app is in Testing, add the Google accounts that may sign in as
   test users.
3. Create credentials: *APIs & Services > Credentials > Create credentials >
   OAuth client ID > Web application*.
4. Add the authorized redirect URI. This is PocketBase's OAuth2 redirect
   endpoint, not the code-exchange API:
   - local: `http://127.0.0.1:8090/api/oauth2-redirect`
   - deployed: `https://<app-domain>/api/oauth2-redirect`

   The pinned 0.40.6 binary uses this endpoint (its bundled JS SDK calls
   `buildURL('/api/oauth2-redirect')`), and the PocketBase authentication docs
   specify the same URL.
5. Copy the client id and client secret.
6. In the PocketBase dashboard: *Collections > users > settings cogwheel >
   Options > OAuth2 > Google*. Paste the client id and secret and enable the
   provider. This is instance configuration stored in `pb_data/data.db`, not a
   migration, so it must be repeated for every environment and must never be
   committed.
7. Check that the provider is live:

   ```sh
   curl -s http://127.0.0.1:8090/api/collections/users/auth-methods
   ```

   `oauth2.enabled` becomes `true` and `oauth2.providers` lists `google` with
   its `authURL`. Until then the endpoint answers
   `403 {"message":"The collection is not configured to allow OAuth2 authentication."}`.

The client then signs in with the all-in-one flow (popup plus a one-off realtime
subscription), which calls `POST /api/collections/users/auth-with-oauth2`
internally:

```js
await pb.collection('users').authWithOAuth2({ provider: 'google' })
```

For a manual code exchange, the client posts
`{"provider":"google","code":...,"codeVerifier":...,"redirectURL":...}` to
`/api/collections/users/auth-with-oauth2`, where `redirectURL` is exactly the
same `/api/oauth2-redirect` URI registered in step 4.

Google does not return `nome` or `studio`. After the first Google login the
client should read the provider profile from `record.meta` and let the user fill
in the two fields (or send a PATCH for its own record, which the `updateRule`
allows).

### Password reset and email verification (SMTP required)

Both flows send email, and **no SMTP server is configured in this checkout**, so
no mail is delivered locally. PocketBase falls back to the unix `sendmail`
command when SMTP is disabled; that also does nothing useful in a dev container.

Request a reset:

```sh
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  http://127.0.0.1:8090/api/collections/users/request-password-reset \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.org"}'
# -> 204
```

The endpoint returns `204` for an unknown address too (confirmed), so it cannot
be used to enumerate accounts. The reset link points at
`{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}`; the client finishes with
`POST /api/collections/users/confirm-password-reset` and
`{"token":...,"password":...,"passwordConfirm":...}`.

Email verification works the same way (`request-verification`, then
`confirm-verification`). New users have `verified: false`, and in 0.40.6 that
flag does not gate password login: the test users below signed in while still
unverified.

To enable reset and verification mail, configure *Settings > Mail settings*:
either SMTP (host, port, username, password, sender name and address) or a
working local `sendmail`. Like the OAuth2 provider, this is instance config in
`pb_data/data.db` and is not reproducible from `pb_migrations/`.
