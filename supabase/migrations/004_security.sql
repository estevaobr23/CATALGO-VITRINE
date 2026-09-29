-- =============================================================================
-- SQL CATÁLOGO SAAS — 004 SEGURANÇA: GRANTS, RLS E RPCs DO DONO
-- -----------------------------------------------------------------------------
-- Três atores:
--   anon           visitante público. NÃO lê tabela nenhuma diretamente:
--                  toda leitura pública passa por public.get_public_catalog
--                  (005), que devolve só campos públicos de catálogos no ar.
--   authenticated  dono. Administra só o que pertence a ele (RLS), e só as
--                  colunas que lhe cabem (GRANT por coluna).
--   service_role   backend confiável (Edge Functions, crons). Ignora RLS.
--                  A chave NUNCA vai para o browser.
--
-- Duas travas em série: GRANT decide QUAIS operações/colunas o papel pode
-- tocar; RLS decide QUAIS LINHAS. O projeto automotivo só tinha a segunda,
-- por isso o dono conseguia alterar a própria coluna `plano`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RLS ligada em todas as tabelas
-- -----------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.products           enable row level security;
alter table public.plans              enable row level security;
alter table public.offers             enable row level security;
alter table public.purchases          enable row level security;
alter table public.entitlements       enable row level security;
alter table public.webhook_events     enable row level security;
alter table public.catalogs           enable row level security;
alter table public.categories         enable row level security;
alter table public.items              enable row level security;
alter table public.item_option_groups enable row level security;
alter table public.item_option_values enable row level security;
alter table public.media              enable row level security;
alter table public.testimonials       enable row level security;
alter table public.catalog_events     enable row level security;

-- -----------------------------------------------------------------------------
-- 2. GRANTS — o Supabase concede ALL a anon/authenticated por padrão em
-- public; aqui zeramos e concedemos só o necessário.
-- -----------------------------------------------------------------------------
revoke all on
  public.profiles, public.products, public.plans, public.offers,
  public.purchases, public.entitlements, public.webhook_events,
  public.catalogs, public.categories, public.items,
  public.item_option_groups, public.item_option_values,
  public.media, public.testimonials, public.catalog_events
from anon, authenticated;

-- vitrine de planos (tela de preços, cadeados na UI)
grant select on public.products, public.plans to anon, authenticated;

-- perfil: lê o próprio, altera só o nome
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- direito de acesso: lê o próprio (a UI mostra o plano); nunca escreve
grant select on public.entitlements to authenticated;

-- catálogo: cria via create_catalog(), publica via set_catalog_published().
-- Colunas owner_id, product_id, status e published_at ficam fora do UPDATE.
grant select, delete on public.catalogs to authenticated;
grant update (name, slug, description, whatsapp, currency, logo_path, cover_path,
              contact, theme, layout, attributes)
  on public.catalogs to authenticated;

-- conteúdo do catálogo: CRUD completo, filtrado por RLS
grant select, insert, update, delete on
  public.categories, public.items, public.item_option_groups,
  public.item_option_values, public.media, public.testimonials
to authenticated;

-- analytics: dono só lê; gravação via track_catalog_event()
grant select on public.catalog_events to authenticated;

-- purchases, offers, webhook_events: nenhum grant => só service_role.

-- schema interno: uso necessário para as policies chamarem os helpers
grant usage on schema app_private to anon, authenticated;
revoke execute on all functions in schema app_private from public, anon, authenticated;
grant execute on function
  app_private.catalog_has_feature(uuid, text),
  app_private.catalog_active_plan(uuid),
  app_private.slugify(text)
to authenticated;

-- -----------------------------------------------------------------------------
-- 3. POLICIES
-- Padrão de posse: catalog_id in (select id from catalogs where owner_id = uid)
-- — a subquery é avaliada uma vez (hashed subplan) e (select auth.uid()) é
-- cacheado por statement, recomendação oficial do Supabase para RLS rápida.
-- -----------------------------------------------------------------------------

-- products / plans: catálogo comercial é público
create policy "products: leitura pública de ativos" on public.products
  for select to anon, authenticated using (is_active);

create policy "plans: leitura pública" on public.plans
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

-- profiles
create policy "profiles: dono lê" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: dono altera" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- entitlements
create policy "entitlements: titular lê" on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()));

-- catalogs
create policy "catalogs: dono lê" on public.catalogs
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "catalogs: dono altera" on public.catalogs
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "catalogs: dono exclui" on public.catalogs
  for delete to authenticated using (owner_id = (select auth.uid()));

-- conteúdo sem regra de plano: posse basta
create policy "categories: dono administra" on public.categories
  for all to authenticated
  using (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())))
  with check (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())));

create policy "items: dono administra" on public.items
  for all to authenticated
  using (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())))
  with check (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())));

create policy "item_option_groups: dono administra" on public.item_option_groups
  for all to authenticated
  using (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())))
  with check (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())));

create policy "item_option_values: dono administra" on public.item_option_values
  for all to authenticated
  using (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())))
  with check (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())));

-- media: vídeo é recurso de plano ('video')
create policy "media: dono lê" on public.media
  for select to authenticated
  using (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())));
create policy "media: dono exclui" on public.media
  for delete to authenticated
  using (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())));
create policy "media: dono cria" on public.media
  for insert to authenticated
  with check (
    catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid()))
    and (kind <> 'video_embed' or app_private.catalog_has_feature(catalog_id, 'video'))
  );
create policy "media: dono altera" on public.media
  for update to authenticated
  using (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())))
  with check (
    catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid()))
    and (kind <> 'video_embed' or app_private.catalog_has_feature(catalog_id, 'video'))
  );

-- testimonials: recurso de plano ('testimonials'). Leitura e exclusão
-- continuam liberadas após downgrade (o dono não perde acesso ao que criou).
create policy "testimonials: dono lê" on public.testimonials
  for select to authenticated
  using (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())));
create policy "testimonials: dono exclui" on public.testimonials
  for delete to authenticated
  using (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())));
create policy "testimonials: dono cria" on public.testimonials
  for insert to authenticated
  with check (
    catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid()))
    and app_private.catalog_has_feature(catalog_id, 'testimonials')
  );
create policy "testimonials: dono altera" on public.testimonials
  for update to authenticated
  using (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())))
  with check (
    catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid()))
    and app_private.catalog_has_feature(catalog_id, 'testimonials')
  );

-- catalog_events: dono lê o próprio analytics
create policy "catalog_events: dono lê" on public.catalog_events
  for select to authenticated
  using (catalog_id in (select c.id from public.catalogs c where c.owner_id = (select auth.uid())));

-- purchases, offers, webhook_events: RLS ligada e NENHUMA policy = deny-all.

-- -----------------------------------------------------------------------------
-- 4. RPCs do dono
-- -----------------------------------------------------------------------------

-- Cria catálogo conferindo direito ativo e limite max_catalogs.
-- Slug: usa p_slug (ou o nome), normaliza, pula reservados e desempata com -2, -3...
create or replace function public.create_catalog(
  p_product_key text,
  p_name        text,
  p_slug        text default null
)
returns public.catalogs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_product public.products;
  v_plan    public.plans;
  v_max     bigint;
  v_count   bigint;
  v_base    text;
  v_slug    text;
  v_n       integer := 1;
  v_row     public.catalogs;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) = 0 then
    raise exception 'name_required' using errcode = '22023';
  end if;

  select * into v_product from public.products where key = p_product_key and is_active;
  if not found then
    raise exception 'unknown_product: %', p_product_key using errcode = 'P0002';
  end if;

  perform app_private.claim_entitlements_for(v_uid);
  v_plan := app_private.active_plan(v_uid, v_product.id);
  if v_plan.id is null then
    raise exception 'no_active_plan' using errcode = '42501',
      hint = 'Nenhuma compra aprovada vinculada a este e-mail confirmado.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || v_product.id::text, 0));

  v_max := (v_plan.limits ->> 'max_catalogs')::bigint;
  if v_max is not null then
    select count(*) into v_count
      from public.catalogs
     where owner_id = v_uid and product_id = v_product.id and status <> 'archived';
    if v_count >= v_max then
      raise exception 'plan_limit:max_catalogs:%', v_max using errcode = 'P0001';
    end if;
  end if;

  v_base := left(app_private.slugify(coalesce(nullif(btrim(p_slug), ''), p_name)), 44);
  v_base := trim(both '-' from v_base);
  if char_length(v_base) < 3 then
    v_base := v_base || case when v_base = '' then 'loja' else '-loja' end;
  end if;

  v_slug := v_base;
  while exists (select 1 from public.catalogs where product_id = v_product.id and slug = v_slug)
        or v_slug = any (v_product.reserved_slugs) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;

  insert into public.catalogs (product_id, owner_id, name, slug)
  values (v_product.id, v_uid, btrim(p_name), v_slug)
  returning * into v_row;

  return v_row;
end;
$$;

-- Publica / despublica. Publicar exige direito ativo.
create or replace function public.set_catalog_published(p_catalog_id uuid, p_published boolean)
returns public.catalogs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.catalogs;
begin
  select * into v_row
    from public.catalogs
   where id = p_catalog_id and owner_id = auth.uid()
   for update;
  if not found then
    raise exception 'catalog_not_found' using errcode = '42501';
  end if;
  if v_row.status = 'archived' then
    raise exception 'catalog_archived' using errcode = '22023';
  end if;

  if p_published then
    if (app_private.active_plan(v_row.owner_id, v_row.product_id)).id is null then
      raise exception 'no_active_plan' using errcode = '42501';
    end if;
    update public.catalogs
       set status = 'published', published_at = coalesce(published_at, now())
     where id = p_catalog_id
     returning * into v_row;
  else
    update public.catalogs set status = 'draft' where id = p_catalog_id returning * into v_row;
  end if;
  return v_row;
end;
$$;

-- Arquiva (sai do ar e deixa de contar no limite de catálogos) ou restaura.
create or replace function public.set_catalog_archived(p_catalog_id uuid, p_archived boolean)
returns public.catalogs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row  public.catalogs;
  v_plan public.plans;
  v_max  bigint;
begin
  if not p_archived then
    -- restaurar volta a contar no limite de catálogos do plano
    select * into v_row from public.catalogs where id = p_catalog_id and owner_id = auth.uid();
    if not found then
      raise exception 'catalog_not_found' using errcode = '42501';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(v_row.owner_id::text || ':' || v_row.product_id::text, 0));
    v_plan := app_private.active_plan(v_row.owner_id, v_row.product_id);
    if v_plan.id is null then
      raise exception 'no_active_plan' using errcode = '42501';
    end if;
    v_max := (v_plan.limits ->> 'max_catalogs')::bigint;
    if v_max is not null and (
      select count(*) from public.catalogs
       where owner_id = v_row.owner_id and product_id = v_row.product_id and status <> 'archived'
    ) >= v_max then
      raise exception 'plan_limit:max_catalogs:%', v_max using errcode = 'P0001';
    end if;
  end if;

  update public.catalogs
     set status = case when p_archived then 'archived' else 'draft' end
   where id = p_catalog_id and owner_id = auth.uid()
     and (p_archived or status = 'archived')
  returning * into v_row;
  if not found then
    raise exception 'catalog_not_found' using errcode = '42501';
  end if;
  return v_row;
end;
$$;

-- Exposição das funções public: padrão = ninguém; libera explicitamente.
revoke execute on function
  public.create_catalog(text, text, text),
  public.set_catalog_published(uuid, boolean),
  public.set_catalog_archived(uuid, boolean),
  public.claim_my_entitlements(),
  public.apply_purchase_event(text, text, text, text, text, bigint, text, timestamptz)
from public, anon, authenticated;

grant execute on function
  public.create_catalog(text, text, text),
  public.set_catalog_published(uuid, boolean),
  public.set_catalog_archived(uuid, boolean),
  public.claim_my_entitlements()
to authenticated;

grant execute on function
  public.apply_purchase_event(text, text, text, text, text, bigint, text, timestamptz)
to service_role;
