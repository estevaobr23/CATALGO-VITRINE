-- =============================================================================
-- Profissional ganha VÍDEO e DEPOIMENTOS.
--
-- São seções da vitrine cujo acesso o CORE trava no banco, não só na tela:
--   * media.kind='video_embed' exige a feature 'video' (policy de media)
--   * testimonials exige a feature 'testimonials' (policy de testimonials)
--   * get_public_catalog só devolve as duas quando o plano tem o recurso
--
-- O Iniciante continua sem elas: é o argumento do upgrade dentro do app
-- (/app/plano). Como o plano efetivo é o entitlement de MAIOR rank, comprar a
-- oferta do Profissional com o mesmo e-mail sobe a conta sozinho.
-- =============================================================================

update public.plans pl
   set features = '{analytics,no_watermark,video,testimonials}'::text[]
  from public.products p
 where p.id = pl.product_id
   and p.key = 'cestavitrine'
   and pl.key = 'profissional';
