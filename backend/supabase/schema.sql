-- Tush @tag server schema for Postgres / Supabase.
-- The server applies this automatically on boot (every statement is idempotent);
-- you can also paste it into the Supabase SQL editor once.

create table if not exists public.tags (
  username   text primary key check (username = lower(username)),
  address    text not null,
  is_primary smallint not null default 0 check (is_primary in (0, 1)),
  memo_type  text,
  memo       text,
  created_at timestamptz not null default now()
);

create index if not exists tags_address_idx on public.tags (address);
create unique index if not exists tags_one_primary_idx on public.tags (address) where is_primary = 1;

-- Supabase exposes the public schema through its REST API using the anon key.
-- RLS on with no policies = nobody can read or write this table through that API.
-- The tag server connects as the database owner, which bypasses RLS.
alter table public.tags enable row level security;
do $$
begin
  -- Supabase API roles; skipped on plain Postgres where they don't exist.
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.tags from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.tags from authenticated;
  end if;
end
$$;
