-- =============================================================================
-- SQL CATÁLOGO SAAS — 006 STORAGE
-- -----------------------------------------------------------------------------
-- Bucket público 'catalog-media'. Convenção de caminho OBRIGATÓRIA:
--
--   {catalog_id}/{pasta}/{uuid}.{ext}      pasta: logo | cover | items | gallery | testimonials | layout
--
-- * Pasta raiz = catalog_id (não owner_id): um dono com 2 catálogos tem 2
--   pastas, e o CHECK das tabelas (003) prende cada path ao seu catálogo.
-- * Nome do arquivo = UUID gerado no client (nunca Date.now(), que colide
--   em uploads simultâneos, nem o nome original, que vaza informação).
-- * Download: público pela URL (/storage/v1/object/public/...). NÃO existe
--   policy de SELECT para anon — o projeto automotivo tinha uma, o que
--   permitia LISTAR os arquivos de todos os tenants pela API.
-- * SVG fica fora dos MIME permitidos: SVG enviado por usuário é vetor de XSS.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-media', 'catalog-media', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
   set public             = excluded.public,
       file_size_limit    = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;

create policy "catalog-media: dono lista a própria pasta" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'catalog-media'
    and (storage.foldername(name))[1] in (
      select c.id::text from public.catalogs c where c.owner_id = (select auth.uid())
    )
  );

create policy "catalog-media: dono envia para a própria pasta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'catalog-media'
    and (storage.foldername(name))[1] in (
      select c.id::text from public.catalogs c where c.owner_id = (select auth.uid())
    )
  );

create policy "catalog-media: dono substitui na própria pasta" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'catalog-media'
    and (storage.foldername(name))[1] in (
      select c.id::text from public.catalogs c where c.owner_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'catalog-media'
    and (storage.foldername(name))[1] in (
      select c.id::text from public.catalogs c where c.owner_id = (select auth.uid())
    )
  );

create policy "catalog-media: dono apaga da própria pasta" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'catalog-media'
    and (storage.foldername(name))[1] in (
      select c.id::text from public.catalogs c where c.owner_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- Arquivos órfãos: objetos com mais de 24h que nenhuma linha referencia
-- (imagem trocada, item/catálogo excluído, upload abandonado).
-- NÃO apague direto de storage.objects via SQL (o arquivo físico fica no
-- S3). Um cron (Edge Function com service_role) chama esta função e remove
-- os nomes retornados pela Storage API: storage.from('catalog-media').remove([...]).
-- -----------------------------------------------------------------------------
create or replace function public.list_orphan_media(p_limit integer default 500)
returns table (name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, o.created_at
    from storage.objects o
    left join public.catalogs c
      on c.id::text = (storage.foldername(o.name))[1]
   where o.bucket_id = 'catalog-media'
     and o.created_at < now() - interval '24 hours'
     and (
       c.id is null   -- pasta de catálogo que não existe mais
       or not (
         -- "is not distinct from": logo/capa nulos não podem virar NULL no OR
         o.name is not distinct from c.logo_path
         or o.name is not distinct from c.cover_path
         or position(o.name in c.layout::text) > 0
         or position(o.name in c.attributes::text) > 0
         or exists (select 1 from public.media m
                     where m.catalog_id = c.id
                       and o.name in (m.storage_path, m.secondary_storage_path))
         or exists (select 1 from public.testimonials t
                     where t.catalog_id = c.id and t.author_photo_path = o.name)
       )
     )
   order by o.created_at
   limit greatest(1, least(p_limit, 1000));
$$;

revoke execute on function public.list_orphan_media(integer) from public, anon, authenticated;
grant execute on function public.list_orphan_media(integer) to service_role;
