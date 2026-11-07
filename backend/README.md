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
