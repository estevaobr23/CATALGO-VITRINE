-- =============================================================================
-- SQL CATÁLOGO SAAS — 003 NÚCLEO DO CATÁLOGO
-- -----------------------------------------------------------------------------
--   catalogs ─┬─< categories
--             ├─< items ─┬─< item_option_groups ─< item_option_values
--             │          └─< media (item_id preenchido)
--             ├─< media (item_id nulo = galeria/portfólio do catálogo)
--             ├─< testimonials (item_id opcional)
--             └─< catalog_events
--
-- REGRA DE ISOLAMENTO: toda tabela filha carrega catalog_id e referencia o
-- pai por FK COMPOSTA (catalog_id, id). O banco fica incapaz de ligar um item
-- a uma categoria de outro catálogo, uma mídia a um item de outro tenant etc.
-- (o projeto automotivo permitia isso em package_services).
-- Todo índice filho começa por catalog_id: serve à RLS, às FKs e à leitura
-- pública ao mesmo tempo.
--
-- Nenhuma coluna aqui fala de veículo, cesta, bolo ou flor. O que é da
-- vertical vai em `attributes` (jsonb validado pelo frontend da vertical).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- catalogs — a vitrine. Um dono pode ter N (limitado por plan.limits.max_catalogs).
-- Configurações 1:1 ficam aqui como colunas/jsonb (sem tabela catalog_settings:
-- mesmo ciclo de vida, mesma RLS; outra tabela só adicionaria join e órfãos).
-- -----------------------------------------------------------------------------
create table public.catalogs (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete restrict,
  -- CASCADE: excluir a conta apaga os catálogos dela (direito de exclusão).
  -- Compras e direitos NÃO são apagados (ver 002).
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 120),
  slug         text not null
                 check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  description  text check (char_length(description) <= 2000),
  -- WhatsApp em E.164 só com dígitos (ex.: 5511999998888). É o destino do CTA.
  whatsapp     text check (whatsapp ~ '^[1-9][0-9]{9,14}$'),
  currency     char(3) not null default 'BRL',
  logo_path    text,
  cover_path   text,
  contact      jsonb not null default '{}' check (jsonb_typeof(contact) = 'object'),
  theme        jsonb not null default '{}' check (jsonb_typeof(theme) = 'object'),
  layout       jsonb not null default '{}'
                 check (jsonb_typeof(layout) = 'object' and pg_column_size(layout) <= 262144),
  attributes   jsonb not null default '{}'
                 check (jsonb_typeof(attributes) = 'object' and pg_column_size(attributes) <= 65536),
  -- draft: em edição, invisível | published: no ar | suspended: sistema tirou
  -- do ar por perda de acesso (estorno) | archived: dono arquivou
  status       text not null default 'draft'
                 check (status in ('draft', 'published', 'suspended', 'archived')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (product_id, slug),
  -- arquivo do storage só pode ser da pasta deste catálogo
  check (logo_path is null or logo_path like id::text || '/%'),
  check (cover_path is null or cover_path like id::text || '/%')
);

comment on column public.catalogs.contact is
  'Contatos opcionais: instagram, email, phone, address, city, map_url, business_hours.';
comment on column public.catalogs.theme is
  'Identidade visual: template, cores, fontes, raio de botão. Interpretado pelo frontend.';
comment on column public.catalogs.layout is
  'Documento de blocos/seções da vitrine, versionado pelo frontend (schemaVersion).';
comment on column public.catalogs.attributes is
  'Extensão livre da vertical. O core nunca lê chaves daqui.';

create index catalogs_owner_idx on public.catalogs (owner_id, product_id);

create trigger catalogs_set_updated_at
  before update on public.catalogs
  for each row execute function app_private.set_updated_at();

-- Slugs reservados pela vertical (rotas do frontend: app, login, api...).
create or replace function app_private.check_reserved_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.products p
     where p.id = new.product_id and new.slug = any (p.reserved_slugs)
  ) then
    raise exception 'reserved_slug: %', new.slug using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger catalogs_check_reserved_slug
  before insert or update of slug on public.catalogs
  for each row execute function app_private.check_reserved_slug();

-- -----------------------------------------------------------------------------
-- Slug único por catálogo, gerado a partir do nome quando vier vazio.
-- Usado por categories e items. tg_argv[0] = prefixo de fallback.
-- -----------------------------------------------------------------------------
create or replace function app_private.ensure_unique_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_base      text;
  v_candidate text;
  v_n         integer := 1;
  v_taken     boolean;
begin
  if tg_op = 'UPDATE'
     and new.slug is not distinct from old.slug
     and new.catalog_id = old.catalog_id then
    return new;
  end if;

  v_base := app_private.slugify(coalesce(nullif(btrim(new.slug), ''), new.name));
  if v_base = '' then
    v_base := tg_argv[0];
  end if;

  v_candidate := v_base;
  loop
    execute format(
      'select exists (select 1 from %I.%I where catalog_id = $1 and slug = $2 and id <> $3)',
      tg_table_schema, tg_table_name)
      into v_taken
      using new.catalog_id, v_candidate, new.id;
    exit when not v_taken;
    v_n := v_n + 1;
    v_candidate := v_base || '-' || v_n;
  end loop;

  new.slug := v_candidate;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- categories — agrupamento de itens dentro de um catálogo.
-- -----------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  catalog_id  uuid not null references public.catalogs (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  slug        text not null default ''
                check (slug = '' or (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 72)),
  description text check (char_length(description) <= 500),
  sort_order  integer not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (catalog_id, slug),
  unique (catalog_id, id)
);

create index categories_catalog_sort_idx on public.categories (catalog_id, sort_order);

create trigger categories_ensure_slug
  before insert or update of slug, name, catalog_id on public.categories
  for each row execute function app_private.ensure_unique_slug('categoria');

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- items — o que aparece na vitrine: produto, serviço, combo...
-- * kind: rótulo livre da vertical ('product', 'service', 'bundle'...)
-- * features: lista ordenada de texto — "o que está incluído", "composição",
--   "sabores". Substitui a tabela service_features (normalização sem ganho).
-- * price_mode:
--     fixed       preço fechado (price_cents obrigatório)
--     from        "a partir de" (price_cents opcional; o frontend pode derivar
--                 o menor valor das opções com pricing='replace')
--     on_request  sob consulta
-- * is_visible  = aparece na vitrine | is_available = aparece mas "esgotado"
-- * cta_label / cta_message: sobrescrevem o CTA padrão da vertical
-- -----------------------------------------------------------------------------
create table public.items (
  id                     uuid primary key default gen_random_uuid(),
  catalog_id             uuid not null references public.catalogs (id) on delete cascade,
  category_id            uuid,
  kind                   text not null default 'product' check (kind ~ '^[a-z_]{1,32}$'),
  name                   text not null check (char_length(btrim(name)) between 1 and 140),
  slug                   text not null default ''
                           check (slug = '' or (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 72)),
  summary                text check (char_length(summary) <= 300),
  description            text check (char_length(description) <= 5000),
  features               text[] not null default '{}' check (cardinality(features) <= 40),
  price_mode             text not null default 'fixed'
                           check (price_mode in ('fixed', 'from', 'on_request')),
  price_cents            bigint check (price_cents >= 0),
  compare_at_price_cents bigint check (compare_at_price_cents >= 0),
  is_visible             boolean not null default true,
  is_available           boolean not null default true,
  is_featured            boolean not null default false,
  sort_order             integer not null default 0,
  cta_label              text check (char_length(cta_label) <= 60),
  cta_message            text check (char_length(cta_message) <= 1000),
  attributes             jsonb not null default '{}'
                           check (jsonb_typeof(attributes) = 'object' and pg_column_size(attributes) <= 65536),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (catalog_id, slug),
  unique (catalog_id, id),
  -- categoria sempre do mesmo catálogo; apagar a categoria só "descategoriza"
  foreign key (catalog_id, category_id)
    references public.categories (catalog_id, id) on delete set null (category_id),
  check (price_mode <> 'fixed' or price_cents is not null),
  check (compare_at_price_cents is null
         or (price_cents is not null and compare_at_price_cents > price_cents))
);

create index items_catalog_visible_sort_idx on public.items (catalog_id, is_visible, sort_order);
create index items_catalog_category_idx on public.items (catalog_id, category_id)
  where category_id is not null;

create trigger items_ensure_slug
  before insert or update of slug, name, catalog_id on public.items
  for each row execute function app_private.ensure_unique_slug('item');

create trigger items_set_updated_at
  before update on public.items
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Opções do item. Um só modelo cobre as verticais:
--   pricing='replace' -> o valor escolhido SUBSTITUI o preço
--                        (tamanho do veículo, bolo 1kg/2kg, buquê 12/24 rosas)
--   pricing='add'     -> o valor escolhido SOMA ao preço
--                        (adicionais da cesta, vela no bolo, cartão)
--   obrigatório = min_select >= 1
-- -----------------------------------------------------------------------------
create table public.item_option_groups (
  id          uuid primary key default gen_random_uuid(),
  catalog_id  uuid not null,
  item_id     uuid not null,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  selection   text not null default 'single' check (selection in ('single', 'multiple')),
  pricing     text not null default 'add' check (pricing in ('add', 'replace')),
  min_select  integer not null default 0 check (min_select >= 0),
  max_select  integer check (max_select >= 1),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (catalog_id, id),
  foreign key (catalog_id, item_id) references public.items (catalog_id, id) on delete cascade,
  check (max_select is null or max_select >= min_select),
  check (selection = 'multiple' or (min_select <= 1 and coalesce(max_select, 1) = 1)),
  check (pricing = 'add' or selection = 'single')
);

create index item_option_groups_item_idx
  on public.item_option_groups (catalog_id, item_id, sort_order);

create trigger item_option_groups_set_updated_at
  before update on public.item_option_groups
  for each row execute function app_private.set_updated_at();

create table public.item_option_values (
  id                     uuid primary key default gen_random_uuid(),
  catalog_id             uuid not null,
  group_id               uuid not null,
  name                   text not null check (char_length(btrim(name)) between 1 and 80),
  price_cents            bigint not null default 0 check (price_cents >= 0),
  compare_at_price_cents bigint check (compare_at_price_cents >= 0),
  is_available           boolean not null default true,
  sort_order             integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  foreign key (catalog_id, group_id)
    references public.item_option_groups (catalog_id, id) on delete cascade,
  check (compare_at_price_cents is null or compare_at_price_cents > price_cents)
);

create index item_option_values_group_idx
  on public.item_option_values (catalog_id, group_id, sort_order);

create trigger item_option_values_set_updated_at
  before update on public.item_option_values
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- media — imagens e vídeos. item_id nulo = mídia do catálogo (galeria,
-- portfólio, "sobre"). Uma tabela só = um lugar só para achar arquivos órfãos.
--   image         storage_path
--   before_after  storage_path (antes) + secondary_storage_path (depois)
--   video_embed   external_url https (YouTube, Instagram...)
-- storage_path é o CAMINHO no bucket, não a URL: trocar de domínio/CDN não
-- exige migração, e o CHECK garante que o arquivo é da pasta do catálogo.
-- -----------------------------------------------------------------------------
create table public.media (
  id                     uuid primary key default gen_random_uuid(),
  catalog_id             uuid not null references public.catalogs (id) on delete cascade,
  item_id                uuid,
  kind                   text not null check (kind in ('image', 'before_after', 'video_embed')),
  storage_path           text,
  secondary_storage_path text,
  external_url           text check (external_url ~ '^https://' and char_length(external_url) <= 2000),
  caption                text check (char_length(caption) <= 300),
  alt_text               text check (char_length(alt_text) <= 200),
  attributes             jsonb not null default '{}'
                           check (jsonb_typeof(attributes) = 'object' and pg_column_size(attributes) <= 16384),
  is_featured            boolean not null default false,
  is_visible             boolean not null default true,
  sort_order             integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  foreign key (catalog_id, item_id) references public.items (catalog_id, id) on delete cascade,
  check (
    (kind = 'image'        and storage_path is not null and secondary_storage_path is null and external_url is null) or
    (kind = 'before_after' and storage_path is not null and secondary_storage_path is not null and external_url is null) or
    (kind = 'video_embed'  and external_url is not null and storage_path is null and secondary_storage_path is null)
  ),
  check (storage_path is null or storage_path like catalog_id::text || '/%'),
  check (secondary_storage_path is null or secondary_storage_path like catalog_id::text || '/%')
);

create index media_catalog_item_sort_idx on public.media (catalog_id, item_id, sort_order);

create trigger media_set_updated_at
  before update on public.media
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- testimonials — prova social cadastrada pelo dono (recurso de plano).
-- -----------------------------------------------------------------------------
create table public.testimonials (
  id                uuid primary key default gen_random_uuid(),
  catalog_id        uuid not null references public.catalogs (id) on delete cascade,
  item_id           uuid,
  author_name       text not null check (char_length(btrim(author_name)) between 1 and 80),
  author_photo_path text,
  rating            smallint check (rating between 1 and 5),
  body              text check (char_length(body) <= 2000),
  source            text not null default 'manual' check (source ~ '^[a-z_]{1,32}$'),
  given_on          date,
  is_visible        boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (catalog_id, item_id)
    references public.items (catalog_id, id) on delete set null (item_id),
  check (author_photo_path is null or author_photo_path like catalog_id::text || '/%')
);

create index testimonials_catalog_sort_idx on public.testimonials (catalog_id, sort_order);
create index testimonials_catalog_item_idx on public.testimonials (catalog_id, item_id)
  where item_id is not null;

create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- catalog_events — analytics mínimo, sem nenhum dado do visitante.
-- Gravado só via public.track_catalog_event (005). Tipos base:
-- page_view, item_view, cta_click. A vertical pode criar outros.
-- -----------------------------------------------------------------------------
create table public.catalog_events (
  id          bigint generated always as identity primary key,
  catalog_id  uuid not null references public.catalogs (id) on delete cascade,
  item_id     uuid,
  event_type  text not null check (event_type ~ '^[a-z_]{1,40}$'),
  occurred_at timestamptz not null default now(),
  foreign key (catalog_id, item_id)
    references public.items (catalog_id, id) on delete set null (item_id)
);

create index catalog_events_catalog_time_idx on public.catalog_events (catalog_id, occurred_at desc);
create index catalog_events_catalog_item_idx on public.catalog_events (catalog_id, item_id)
  where item_id is not null;

-- =============================================================================
-- Plano aplicado ao catálogo
-- =============================================================================

create or replace function app_private.catalog_active_plan(p_catalog_id uuid)
returns public.plans
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  select pl.* into v_plan
    from public.catalogs c
    join public.entitlements e
      on e.user_id = c.owner_id and e.product_id = c.product_id and e.status = 'active'
    join public.plans pl on pl.id = e.plan_id
   where c.id = p_catalog_id
   order by pl.rank desc
   limit 1;
  return v_plan;
end;
$$;

create or replace function app_private.catalog_has_feature(p_catalog_id uuid, p_feature text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan public.plans := app_private.catalog_active_plan(p_catalog_id);
begin
  return v_plan.id is not null and p_feature = any (v_plan.features);
end;
$$;

-- Limite de itens VISÍVEIS por catálogo, aplicado no banco — vale para UI,
-- API REST direta e reativação de item oculto (os dois furos do automotivo).
-- SECURITY INVOKER de propósito: current_user continua sendo o papel do
-- chamador, então backend confiável (service_role/postgres) não é barrado.
create or replace function app_private.enforce_visible_item_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_plan  public.plans;
  v_max   bigint;
  v_count bigint;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if not new.is_visible then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.is_visible and old.catalog_id = new.catalog_id then
    return new;
  end if;

  -- serializa inserções concorrentes no mesmo catálogo
  perform pg_advisory_xact_lock(hashtextextended(new.catalog_id::text, 0));

  v_plan := app_private.catalog_active_plan(new.catalog_id);
  if v_plan.id is null then
    raise exception 'no_active_plan' using errcode = '42501';
  end if;

  v_max := (v_plan.limits ->> 'max_visible_items')::bigint;
  if v_max is null then
    return new;
  end if;

  select count(*) into v_count
    from public.items
   where catalog_id = new.catalog_id and is_visible and id <> new.id;

  if v_count >= v_max then
    raise exception 'plan_limit:max_visible_items:%', v_max
      using errcode = 'P0001',
            hint = 'Oculte um item ou faça upgrade de plano.';
  end if;
  return new;
end;
$$;

create trigger items_enforce_visible_limit
  before insert or update of is_visible, catalog_id on public.items
  for each row execute function app_private.enforce_visible_item_limit();

-- Tira do ar / devolve ao ar os catálogos conforme o dono tem ou não acesso.
-- Chamada pelo motor de acesso (002) após compra, estorno ou vínculo de conta.
create or replace function app_private.sync_catalog_access(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.catalogs c
     set status = 'suspended'
   where c.owner_id = p_user_id
     and c.status = 'published'
     and (app_private.active_plan(p_user_id, c.product_id)).id is null;

  update public.catalogs c
     set status = 'published'
   where c.owner_id = p_user_id
     and c.status = 'suspended'
     and (app_private.active_plan(p_user_id, c.product_id)).id is not null;
end;
$$;
