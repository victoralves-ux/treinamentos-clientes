-- =============================================================
-- Treinamentos Clientes — esquema completo (Supabase / PostgreSQL)
-- Rode este arquivo no SQL Editor do Supabase.
--
-- Projeto proprio, separado do gerador de sites e do gerador de
-- criativos: as tres aplicacoes nao compartilham banco de proposito.
-- Se um dia precisarem conversar, o caminho e integracao explicita,
-- nao tabelas cruzadas.
-- =============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Perfis (consultores e administradores)
-- ------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'consultant');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null default '',
  email       text not null default '',
  role        user_role not null default 'consultant',
  created_at  timestamptz not null default now()
);

-- Cria o perfil automaticamente quando um usuario se cadastra.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper usado pelas policies (security definer evita recursao de RLS).
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ------------------------------------------------------------
-- Clientes
-- ------------------------------------------------------------
create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references profiles(id) on delete cascade,
  name          text not null,
  segmento      text not null default '',
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Treinamentos
--
-- "business" guarda o que o consultor preencheu (Business do schema
-- TypeScript), incluindo o briefing extraido do material bruto e o
-- plano da IA (chave "__plan", gravada entre as duas etapas do
-- pipeline). "spec" e o TreinamentoSpec final, validado.
-- ------------------------------------------------------------
create table if not exists treinamentos (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references clients(id) on delete cascade,
  consultant_id uuid not null references profiles(id) on delete cascade,
  slug          text not null unique,
  status        text not null default 'rascunho',
  client_name   text not null default '',
  business      jsonb not null default '{}'::jsonb,
  spec          jsonb,
  issues        jsonb not null default '[]'::jsonb,
  error         text,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists treinamentos_consultant_idx on treinamentos (consultant_id);
create index if not exists treinamentos_created_idx on treinamentos (created_at desc);
create index if not exists treinamentos_search_idx on treinamentos using gin (
  to_tsvector('portuguese', coalesce(client_name, '') || ' ' || coalesce(slug, ''))
);

-- ------------------------------------------------------------
-- updated_at automatico
-- ------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists treinamentos_touch on treinamentos;
create trigger treinamentos_touch before update on treinamentos
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------
-- RLS: consultor enxerga o que e dele; admin enxerga tudo.
-- ------------------------------------------------------------
alter table profiles     enable row level security;
alter table clients      enable row level security;
alter table treinamentos enable row level security;

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (id = auth.uid() or is_admin());

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update
  using (id = auth.uid() or is_admin());

drop policy if exists clients_all on clients;
create policy clients_all on clients for all
  using (consultant_id = auth.uid() or is_admin())
  with check (consultant_id = auth.uid() or is_admin());

drop policy if exists treinamentos_all on treinamentos;
create policy treinamentos_all on treinamentos for all
  using (consultant_id = auth.uid() or is_admin())
  with check (consultant_id = auth.uid() or is_admin());

-- ------------------------------------------------------------
-- Para promover alguem a administrador:
--   update profiles set role = 'admin' where email = 'voce@empresa.com';
-- ------------------------------------------------------------
