-- ─────────────────────────────────────────────
--  CantiereSafe — schema iniziale
--
--  Ricostruito dalle query in app.js e dallo schema riferito dal
--  proprietario il 2026-09-17. Il progetto Supabase originale non e' piu'
--  raggiungibile, quindi questo file NON e' un dump: e' la migliore
--  ricostruzione possibile, ed e' ora la definizione autoritativa.
--
--  Differenze note rispetto a quanto girava in produzione sono annotate
--  voce per voce.
-- ─────────────────────────────────────────────

-- ═══════════════════════════════════════
--  profiles
-- ═══════════════════════════════════════
-- Una riga per utente, creata dal trigger in fondo al file.
-- app.js la legge in initApp() con .eq('id', user.id).single().

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text,
  studio text,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════
--  cantieri
-- ═══════════════════════════════════════
-- Anagrafica. Colonne prese dal payload di salvaCantiere() (app.js:1351).

create table public.cantieri (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  indirizzo text,
  comune text,
  committente text,
  impresa_affidataria text,
  cse text,
  dl text,
  responsabile_lavori text,
  importo text,               -- testo, non numeric: app.js invia il campo grezzo
  data_inizio date,
  data_fine date,
  notifica_preliminare text,
  created_at timestamptz not null default now()
);

create index cantieri_user_id_idx on public.cantieri (user_id);

-- ═══════════════════════════════════════
--  sopralluoghi
-- ═══════════════════════════════════════
-- id bigint e non uuid: loadHome() interpola l'id senza virgolette in
-- onclick="openDetail(${s.id})", che e' sintatticamente valido solo per un
-- numero. Vedi AGENTS.md.

create table public.sopralluoghi (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id) on delete cascade,
  cantiere_id bigint references public.cantieri(id) on delete set null,
  azienda text,
  cantiere text,
  indirizzo text,
  rspp text,
  luogo text not null default 'cantiere',
  data date,
  rischio_generale text not null default 'medio',
  note_libere text,
  checklist jsonb not null default '[]'::jsonb,
  foto jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sopralluoghi_user_id_idx on public.sopralluoghi (user_id);
create index sopralluoghi_cantiere_id_idx on public.sopralluoghi (cantiere_id);

-- NOTA: updated_at e' presente qui perche' saveSopralluogo() (app.js:804) lo
-- invia nel payload. Non compariva nello schema riferito dal proprietario, ed
-- e' una delle due ipotesi sul fallimento del salvataggio segnalato da un
-- utente reale (docs/backlog.md, B1). Se in produzione la colonna mancava,
-- ogni insert veniva rifiutata da PostgREST. Qui c'e', quindi quel fallimento
-- non si riprodurra' in locale: e' voluto, ma va ricordato quando si prova a
-- riprodurre il difetto.

-- ═══════════════════════════════════════
--  Row Level Security
-- ═══════════════════════════════════════
-- L'anon key e' pubblica: viene servita nel JavaScript a ogni visitatore.
-- Le policy qui sotto sono percio' l'UNICA cosa che separa i dati di un
-- utente da quelli di un altro. Non disabilitare RLS su queste tabelle.
--
-- Il proprietario riferiva RLS attivo in produzione, ma il progetto non e'
-- piu' ispezionabile e non e' stato possibile verificarlo.

alter table public.profiles    enable row level security;
alter table public.cantieri    enable row level security;
alter table public.sopralluoghi enable row level security;

-- profiles: ognuno vede e modifica solo la propria riga.
create policy "profiles: select own"
  on public.profiles for select
  using ( (select auth.uid()) = id );

create policy "profiles: update own"
  on public.profiles for update
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- cantieri: isolamento completo per utente.
-- Serve anche a coprire caricaCantieri() (app.js:1292), che NON filtra per
-- user_id lato client. Con questa policy la query resta scorretta ma non
-- espone nulla.
create policy "cantieri: select own"
  on public.cantieri for select
  using ( (select auth.uid()) = user_id );

create policy "cantieri: insert own"
  on public.cantieri for insert
  with check ( (select auth.uid()) = user_id );

create policy "cantieri: update own"
  on public.cantieri for update
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "cantieri: delete own"
  on public.cantieri for delete
  using ( (select auth.uid()) = user_id );

-- sopralluoghi: stesso schema.
-- Le clausole with check impediscono di creare o spostare una riga
-- assegnandola a un altro utente.
create policy "sopralluoghi: select own"
  on public.sopralluoghi for select
  using ( (select auth.uid()) = user_id );

create policy "sopralluoghi: insert own"
  on public.sopralluoghi for insert
  with check ( (select auth.uid()) = user_id );

create policy "sopralluoghi: update own"
  on public.sopralluoghi for update
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "sopralluoghi: delete own"
  on public.sopralluoghi for delete
  using ( (select auth.uid()) = user_id );

-- ═══════════════════════════════════════
--  Creazione automatica del profilo
-- ═══════════════════════════════════════
-- app.js non crea mai una riga in profiles: doRegister() passa nome e studio
-- in options.data di signUp(), quindi finiscono in auth.users.raw_user_meta_data
-- e qualcosa lato database deve travasarli. In produzione doveva esistere un
-- trigger equivalente a questo.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nome, studio)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'nome',
    new.raw_user_meta_data ->> 'studio'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
