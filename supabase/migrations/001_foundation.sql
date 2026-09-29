-- =============================================================================
-- SQL CATÁLOGO SAAS — 001 FUNDAÇÃO
-- -----------------------------------------------------------------------------
-- Requisitos: Supabase (schemas auth e storage, roles anon/authenticated/
-- service_role) sobre Postgres >= 15 (usa ON DELETE SET NULL (coluna)).
--
-- Este arquivo cria:
--   * schema app_private (funções internas, NÃO exposto pelo PostgREST)
--   * helpers genéricos (updated_at, slugify)
--   * profiles (1:1 com auth.users)
--   * products / plans / offers (o que se vende e o que cada plano libera)
--
-- Convenções usadas em todos os arquivos:
--   * dinheiro em centavos (bigint), nunca numeric/float
--   * texto com CHECK em vez de ENUM: a vertical pode ampliar valores com um
--     ALTER ... CHECK transacional, sem a rigidez de ALTER TYPE
--   * todo e-mail é guardado em minúsculas e sem espaços (CHECK garante)
--   * nenhum dado de exemplo aqui: seeds ficam em vertical-seed.template.sql
-- =============================================================================

create schema if not exists app_private;
comment on schema app_private is
  'Funções internas do SQL Catálogo SaaS. Não deve constar em "Exposed schemas" da API.';

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Slug sem dependência de extensão (unaccent): translate cobre o português.
create or replace function app_private.slugify(p_input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from left(
    regexp_replace(
      lower(translate(coalesce(p_input, ''),
        'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
        'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),
      '[^a-z0-9]+', '-', 'g'),
    60));
$$;

-- -----------------------------------------------------------------------------
-- profiles — identidade de aplicação, 1:1 com auth.users.
-- Criado por trigger em auth.users (002), nunca pelo client: o signUp com
-- confirmação de e-mail não devolve sessão, então um upsert feito pelo client
-- falharia silenciosamente na RLS (bug latente do projeto automotivo).
-- O e-mail NÃO é copiado: a fonte da verdade é auth.users.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 120),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- products — cada SaaS vertical que roda sobre este banco
-- (ex.: 'cestavitrine', 'vitrine-detail'). Um mesmo Supabase pode hospedar
-- várias verticais; o slug público é único POR produto, porque cada vertical
-- tem seu domínio.
-- -----------------------------------------------------------------------------
create table public.products (
  id             uuid primary key default gen_random_uuid(),
  key            text not null unique
                   check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(key) <= 40),
  name           text not null check (char_length(btrim(name)) between 1 and 80),
  -- slugs que colidem com rotas do frontend da vertical (app, login, api...)
  reserved_slugs text[] not null default '{}',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- plans — o que cada nível libera. Limites e recursos são DADOS, não código:
--   limits   jsonb  { "max_catalogs": 1, "max_visible_items": 5 }
--                   chave ausente = ilimitado
--   features text[] { 'testimonials', 'video', 'analytics', 'no_watermark', ... }
--   rank     int    maior = mais completo; resolve upgrade (vale o maior ativo)
-- -----------------------------------------------------------------------------
create table public.plans (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  key        text not null check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(key) <= 40),
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  rank       integer not null default 0,
  limits     jsonb not null default '{}' check (jsonb_typeof(limits) = 'object'),
  features   text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, key),
  unique (product_id, id)   -- alvo de FKs compostas: plano sempre do mesmo produto
);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- offers — mapeamento "oferta do gateway -> plano". O webhook resolve o plano
-- pelo ID DA OFERTA, nunca pelo valor pago (o projeto automotivo deduz o plano
-- por "valor >= 50", o que quebra em qualquer cupom ou mudança de preço).
-- -----------------------------------------------------------------------------
create table public.offers (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null,
  plan_id           uuid not null,
  provider          text not null check (provider ~ '^[a-z0-9_]{1,32}$'),
  external_offer_id text not null check (char_length(external_offer_id) between 1 and 200),
  name              text check (char_length(name) <= 120),
  price_cents       bigint check (price_cents >= 0),
  currency          char(3) not null default 'BRL',
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (provider, external_offer_id),
  foreign key (product_id, plan_id) references public.plans (product_id, id) on delete restrict
);

create index offers_product_plan_idx on public.offers (product_id, plan_id);

create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function app_private.set_updated_at();
