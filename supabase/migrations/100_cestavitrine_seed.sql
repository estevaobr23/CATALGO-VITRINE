-- =============================================================================
-- SEED DA VERTICAL CESTAVITRINE — o ÚNICO SQL que muda entre SaaS de catálogo.
-- Rodar DEPOIS de 001-006 (core SQL Catálogo SaaS, sem alterações).
-- =============================================================================

-- 1. Produto. reserved_slugs: rotas de 1º nível do site (a vitrine mora em
--    /vitrine/{slug}, mas reservar evita confusão se um dia virar /{slug}).
insert into public.products (key, name, reserved_slugs)
values (
  'cestavitrine',
  'CestaVitrine',
  array['app', 'login', 'cadastro', 'recuperar-senha', 'nova-senha', 'api', 'auth', 'admin',
        'vitrine', 'planos', 'termos', 'privacidade', 'suporte', 'ajuda', 'blog', 'static', '_next']
)
on conflict (key) do update set name = excluded.name, reserved_slugs = excluded.reserved_slugs;

-- 2. Planos (escada por LIMITE DE USO). Espelham src/vertical/offer.ts.
--    iniciante:    1 vitrine, até 15 cestas visíveis (limite aplicado no banco)
--    profissional: 1 vitrine, cestas ilimitadas, sem marca d'água, contador de visitas,
--                  vídeo e depoimentos na vitrine
with p as (select id from public.products where key = 'cestavitrine')
insert into public.plans (product_id, key, name, rank, limits, features)
select p.id, v.key, v.name, v.rank, v.limits::jsonb, v.features::text[]
  from p, (values
    ('iniciante',    'Iniciante',    1, '{"max_catalogs": 1, "max_visible_items": 15}', '{}'),
    ('profissional', 'Profissional', 2, '{"max_catalogs": 1}', '{analytics,no_watermark,video,testimonials}')
  ) as v(key, name, rank, limits, features)
on conflict (product_id, key) do update
   set name = excluded.name, rank = excluded.rank,
       limits = excluded.limits, features = excluded.features;

-- 3. Ofertas da Cakto — PENDENTE DE CREDENCIAL.
--    external_offer_id = data.offer.id do webhook = o código do link
--    https://pay.cakto.com.br/{ID}. Rode depois de criar as ofertas na Cakto
--    (skill criar-produto-cakto). Oferta errada/ausente = compra "unknown_offer"
--    registrada como failed e NENHUM acesso liberado.
--
-- with p as (select id from public.products where key = 'cestavitrine')
-- insert into public.offers (product_id, plan_id, provider, external_offer_id, name, price_cents)
-- select p.id, pl.id, 'cakto', v.offer_id, v.name, v.price_cents
--   from p
--   join (values
--     ('<ID_OFERTA_INICIANTE>',    'iniciante',    'Iniciante',    2290),
--     ('<ID_OFERTA_PROFISSIONAL>', 'profissional', 'Profissional', 3790)
--   ) as v(offer_id, plan_key, name, price_cents) on true
--   join public.plans pl on pl.product_id = p.id and pl.key = v.plan_key
-- on conflict (provider, external_offer_id) do update
--    set plan_id = excluded.plan_id, name = excluded.name, price_cents = excluded.price_cents;
