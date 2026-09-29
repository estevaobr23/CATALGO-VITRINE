-- =============================================================================
-- SQL CATÁLOGO SAAS — 005 API PÚBLICA
-- -----------------------------------------------------------------------------
-- O visitante (anon) não tem SELECT em tabela nenhuma. Ele lê o catálogo
-- inteiro numa chamada só:
--
--   supabase.rpc('get_public_catalog', { p_product_key: 'cestavitrine', p_slug: 'cestas-da-ana' })
--
-- Por que função em vez de policies públicas por tabela:
--   * whitelist explícita de campos: owner_id, status, datas internas e
--     qualquer coluna futura NUNCA vazam por "select *" (no projeto
--     automotivo a leitura pública devolvia todas as colunas de businesses,
--     inclusive owner_id e plano)
--   * uma ida ao banco em vez de 6 queries paralelas
--   * regras de visibilidade num lugar só: catálogo publicado, item visível,
--     categoria visível, recurso de plano (vídeo e depoimentos somem após
--     downgrade sem apagar dado)
--
-- Retorna NULL quando o slug não existe ou o catálogo não está no ar.
-- Caminhos de arquivo vêm como storage paths do bucket público
-- 'catalog-media'; o frontend monta a URL pública.
-- =============================================================================

create or replace function public.get_public_catalog(p_product_key text, p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_catalog public.catalogs;
  v_plan    public.plans;
  v_video   boolean;
  v_reviews boolean;
begin
  select c.* into v_catalog
    from public.catalogs c
    join public.products p on p.id = c.product_id
   where p.key = p_product_key
     and c.slug = lower(p_slug)
     and c.status = 'published';
  if not found then
    return null;
  end if;

  v_plan    := app_private.catalog_active_plan(v_catalog.id);
  v_video   := coalesce('video' = any (v_plan.features), false);
  v_reviews := coalesce('testimonials' = any (v_plan.features), false);

  return jsonb_build_object(
    'catalog', jsonb_build_object(
      'id',          v_catalog.id,
      'name',        v_catalog.name,
      'slug',        v_catalog.slug,
      'description', v_catalog.description,
      'whatsapp',    v_catalog.whatsapp,
      'currency',    v_catalog.currency,
      'logo_path',   v_catalog.logo_path,
      'cover_path',  v_catalog.cover_path,
      'contact',     v_catalog.contact,
      'theme',       v_catalog.theme,
      'layout',      v_catalog.layout,
      'attributes',  v_catalog.attributes,
      -- o frontend decide marca d'água, blocos premium etc. por aqui
      'plan_features', to_jsonb(coalesce(v_plan.features, '{}'::text[]))
    ),

    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', ca.id, 'name', ca.name, 'slug', ca.slug, 'description', ca.description
             ) order by ca.sort_order, ca.name)
        from public.categories ca
       where ca.catalog_id = v_catalog.id and ca.is_visible
    ), '[]'::jsonb),

    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',                     i.id,
               'category_id',            i.category_id,
               'kind',                   i.kind,
               'name',                   i.name,
               'slug',                   i.slug,
               'summary',                i.summary,
               'description',            i.description,
               'features',               to_jsonb(i.features),
               'price_mode',             i.price_mode,
               'price_cents',            i.price_cents,
               'compare_at_price_cents', i.compare_at_price_cents,
               'is_available',           i.is_available,
               'is_featured',            i.is_featured,
               'cta_label',              i.cta_label,
               'cta_message',            i.cta_message,
               'attributes',             i.attributes,
               'options', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', g.id, 'name', g.name, 'selection', g.selection,
                          'pricing', g.pricing, 'min_select', g.min_select, 'max_select', g.max_select,
                          'values', coalesce((
                            select jsonb_agg(jsonb_build_object(
                                     'id', v.id, 'name', v.name, 'price_cents', v.price_cents,
                                     'compare_at_price_cents', v.compare_at_price_cents,
                                     'is_available', v.is_available
                                   ) order by v.sort_order, v.name)
                              from public.item_option_values v
                             where v.catalog_id = v_catalog.id and v.group_id = g.id
                          ), '[]'::jsonb)
                        ) order by g.sort_order, g.name)
                   from public.item_option_groups g
                  where g.catalog_id = v_catalog.id and g.item_id = i.id
               ), '[]'::jsonb),
               'media', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', m.id, 'kind', m.kind, 'storage_path', m.storage_path,
                          'secondary_storage_path', m.secondary_storage_path,
                          'external_url', m.external_url, 'caption', m.caption,
                          'alt_text', m.alt_text, 'attributes', m.attributes
                        ) order by m.sort_order, m.created_at)
                   from public.media m
                  where m.catalog_id = v_catalog.id and m.item_id = i.id and m.is_visible
                    and (m.kind <> 'video_embed' or v_video)
               ), '[]'::jsonb)
             ) order by i.sort_order, i.name)
        from public.items i
        left join public.categories ca on ca.catalog_id = i.catalog_id and ca.id = i.category_id
       where i.catalog_id = v_catalog.id
         and i.is_visible
         and (i.category_id is null or ca.is_visible)
    ), '[]'::jsonb),

    -- mídia do catálogo (galeria, portfólio, antes/depois soltos)
    'gallery', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'kind', m.kind, 'storage_path', m.storage_path,
               'secondary_storage_path', m.secondary_storage_path,
               'external_url', m.external_url, 'caption', m.caption,
               'alt_text', m.alt_text, 'is_featured', m.is_featured, 'attributes', m.attributes
             ) order by m.sort_order, m.created_at)
        from public.media m
       where m.catalog_id = v_catalog.id and m.item_id is null and m.is_visible
         and (m.kind <> 'video_embed' or v_video)
    ), '[]'::jsonb),

    'testimonials', case when v_reviews then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'item_id', t.item_id, 'author_name', t.author_name,
               'author_photo_path', t.author_photo_path, 'rating', t.rating,
               'body', t.body, 'source', t.source, 'given_on', t.given_on
             ) order by t.sort_order, t.created_at desc)
        from public.testimonials t
       where t.catalog_id = v_catalog.id and t.is_visible
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- track_catalog_event — analytics sem identificar o visitante.
-- Só grava se o catálogo está no ar e o plano tem 'analytics' (plano sem
-- analytics não acumula eventos). Item de outro catálogo é descartado.
-- Não há rate limit no banco: proteja a rota/edge que chama esta função.
-- -----------------------------------------------------------------------------
create or replace function public.track_catalog_event(
  p_catalog_id uuid,
  p_event_type text,
  p_item_id    uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_type is null or p_event_type !~ '^[a-z_]{1,40}$' then
    return;
  end if;
  if not exists (select 1 from public.catalogs where id = p_catalog_id and status = 'published') then
    return;
  end if;
  if not app_private.catalog_has_feature(p_catalog_id, 'analytics') then
    return;
  end if;

  insert into public.catalog_events (catalog_id, item_id, event_type)
  values (
    p_catalog_id,
    (select i.id from public.items i where i.catalog_id = p_catalog_id and i.id = p_item_id),
    p_event_type
  );
end;
$$;

revoke execute on function
  public.get_public_catalog(text, text),
  public.track_catalog_event(uuid, text, uuid)
from public;

grant execute on function
  public.get_public_catalog(text, text),
  public.track_catalog_event(uuid, text, uuid)
to anon, authenticated;
