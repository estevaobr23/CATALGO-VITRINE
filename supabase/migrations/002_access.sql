-- =============================================================================
-- SQL CATÁLOGO SAAS — 002 MOTOR DE ACESSO
-- -----------------------------------------------------------------------------
-- Separa cinco conceitos que o projeto automotivo misturava:
--
--   identidade  (auth.users / profiles)   quem é a pessoa
--   oferta      (offers -> plans)          o que foi vendido
--   compra      (purchases)                o que aconteceu no gateway
--   direito     (entitlements)             o que a pessoa pode usar AGORA
--   catálogo    (catalogs, 003)            os dados que ela criou
--
-- O plano NÃO mora no catálogo nem no perfil. Ele é sempre calculado a partir
-- dos entitlements ativos; por isso o dono não tem coluna nenhuma para editar
-- e "se promover" (falha crítica do projeto automotivo).
--
-- Fluxo do webhook (Edge Function, service_role):
--   1. valida assinatura/segredo do provedor
--   2. insert em webhook_events ON CONFLICT DO NOTHING  (idempotência de evento)
--   3. normaliza o payload (adaptador por provedor)
--   4. chama public.apply_purchase_event(...)          (idempotência de compra)
--   5. marca o evento como processed / ignored / failed
-- O webhook NUNCA cria usuário: a pessoa cria a conta com o mesmo e-mail e o
-- direito é vinculado quando o e-mail está CONFIRMADO.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- purchases — espelho normalizado de uma transação do gateway.
-- -----------------------------------------------------------------------------
create table public.purchases (
  id                   uuid primary key default gen_random_uuid(),
  provider             text not null check (provider ~ '^[a-z0-9_]{1,32}$'),
  external_purchase_id text not null check (char_length(external_purchase_id) between 1 and 200),
  offer_id             uuid not null references public.offers (id) on delete restrict,
  buyer_email          text not null
                         check (buyer_email = lower(btrim(buyer_email)) and buyer_email like '%_@_%'),
  amount_cents         bigint check (amount_cents >= 0),
  currency             char(3) not null default 'BRL',
  status               text not null
                         check (status in ('pending', 'approved', 'refunded', 'chargeback', 'canceled')),
  -- momento do evento que definiu o status atual: descarta eventos fora de ordem
  status_changed_at    timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (provider, external_purchase_id)
);

create index purchases_buyer_email_idx on public.purchases (buyer_email);
create index purchases_offer_id_idx on public.purchases (offer_id);

create trigger purchases_set_updated_at
  before update on public.purchases
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- entitlements — direito de uso de um plano de um produto.
-- * Nasce ligado ao E-MAIL do comprador; user_id é preenchido quando existir
--   uma conta com esse e-mail confirmado (antes ou depois da compra).
-- * 1 entitlement por compra (purchase_id UNIQUE): reenvio do webhook não
--   duplica. Estorno revoga só o direito daquela compra.
-- * source='manual' permite cortesia/suporte sem compra.
-- * Plano efetivo = entitlement ativo de MAIOR rank (upgrade sem migração).
-- -----------------------------------------------------------------------------
create table public.entitlements (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null,
  plan_id       uuid not null,
  buyer_email   text not null
                  check (buyer_email = lower(btrim(buyer_email)) and buyer_email like '%_@_%'),
  -- SET NULL: excluir a conta não apaga o histórico de direito/compra
  user_id       uuid references public.profiles (id) on delete set null,
  source        text not null check (source in ('purchase', 'manual')),
  purchase_id   uuid unique references public.purchases (id) on delete restrict,
  status        text not null default 'active' check (status in ('active', 'revoked')),
  granted_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  revoke_reason text check (char_length(revoke_reason) <= 200),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (product_id, plan_id) references public.plans (product_id, id) on delete restrict,
  check ((source = 'purchase') = (purchase_id is not null)),
  check ((status = 'revoked') = (revoked_at is not null))
);

create index entitlements_active_user_idx
  on public.entitlements (user_id, product_id) where status = 'active';
create index entitlements_unclaimed_email_idx
  on public.entitlements (buyer_email) where user_id is null;
create index entitlements_product_plan_idx on public.entitlements (product_id, plan_id);

create trigger entitlements_set_updated_at
  before update on public.entitlements
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- webhook_events — registro bruto e idempotente de tudo que o gateway enviou.
-- dedupe_key = ID do evento no provedor; se o provedor não mandar um ID de
-- evento, a Edge Function usa sha256 do corpo cru.
-- O payload contém dados pessoais do comprador: expurgar após o prazo de
-- auditoria (ver references/02-arquitetura.md, "Retenção").
-- -----------------------------------------------------------------------------
create table public.webhook_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null check (provider ~ '^[a-z0-9_]{1,32}$'),
  dedupe_key   text not null check (char_length(dedupe_key) between 1 and 200),
  event_type   text check (char_length(event_type) <= 100),
  payload      jsonb not null,
  status       text not null default 'received'
                 check (status in ('received', 'processed', 'ignored', 'failed')),
  attempts     integer not null default 0 check (attempts >= 0),
  last_error   text check (char_length(last_error) <= 2000),
  purchase_id  uuid references public.purchases (id) on delete set null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, dedupe_key)
);

create index webhook_events_pending_idx
  on public.webhook_events (received_at) where status in ('received', 'failed');
create index webhook_events_purchase_id_idx
  on public.webhook_events (purchase_id) where purchase_id is not null;

-- -----------------------------------------------------------------------------
-- Resolução de plano
-- -----------------------------------------------------------------------------

-- Plano efetivo de um usuário num produto. Linha nula (id is null) = sem acesso.
create or replace function app_private.active_plan(p_user_id uuid, p_product_id uuid)
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
    from public.entitlements e
    join public.plans pl on pl.id = e.plan_id
   where e.user_id = p_user_id
     and e.product_id = p_product_id
     and e.status = 'active'
   order by pl.rank desc
   limit 1;
  return v_plan;
end;
$$;

-- Vincula entitlements ainda sem dono ao usuário — só com e-mail CONFIRMADO.
-- Sem essa exigência, quem criasse conta com o e-mail de um comprador herdaria
-- o direito dele. Por isso a confirmação de e-mail no Supabase Auth deve
-- permanecer LIGADA em todo produto que usar este motor.
create or replace function app_private.claim_entitlements_for(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email     text;
  v_confirmed timestamptz;
  v_count     integer;
begin
  select lower(btrim(u.email)), u.email_confirmed_at
    into v_email, v_confirmed
    from auth.users u
   where u.id = p_user_id;

  if v_email is null or v_confirmed is null then
    return 0;
  end if;

  insert into public.profiles (id) values (p_user_id) on conflict (id) do nothing;

  update public.entitlements
     set user_id = p_user_id
   where buyer_email = v_email
     and user_id is null;
  get diagnostics v_count = row_count;

  if v_count > 0 then
    perform app_private.sync_catalog_access(p_user_id);   -- definida em 003
  end if;
  return v_count;
end;
$$;

-- RPC para o frontend chamar logo após o login (o "portão" do onboarding).
create or replace function public.claim_my_entitlements()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return app_private.claim_entitlements_for(auth.uid());
end;
$$;

-- -----------------------------------------------------------------------------
-- Trigger em auth.users: cria o profile e vincula direitos na confirmação.
-- -----------------------------------------------------------------------------
create or replace function app_private.on_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, display_name)
    values (new.id, left(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), 120))
    on conflict (id) do nothing;
  end if;

  if new.email_confirmed_at is not null
     and (tg_op = 'INSERT'
          or old.email_confirmed_at is null
          or old.email is distinct from new.email) then
    perform app_private.claim_entitlements_for(new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_change
  after insert or update of email_confirmed_at, email on auth.users
  for each row execute function app_private.on_auth_user_change();

-- -----------------------------------------------------------------------------
-- apply_purchase_event — ÚNICA porta de escrita de compra/direito.
-- Chamada pela Edge Function do webhook com service_role, já com o payload
-- normalizado. Idempotente: a mesma chamada N vezes produz o mesmo estado.
-- Retorna jsonb { purchase_id, applied, status | reason }.
-- Erros: 'unknown_offer' (P0002) -> evento marcado failed, nada é liberado.
-- -----------------------------------------------------------------------------
create or replace function public.apply_purchase_event(
  p_provider             text,
  p_external_purchase_id text,
  p_external_offer_id    text,
  p_buyer_email          text,
  p_status               text,
  p_amount_cents         bigint default null,
  p_currency             text default 'BRL',
  p_occurred_at          timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email    text := lower(btrim(p_buyer_email));
  v_offer    public.offers;
  v_purchase public.purchases;
  v_user_id  uuid;
begin
  if p_status not in ('pending', 'approved', 'refunded', 'chargeback', 'canceled') then
    raise exception 'invalid_status: %', p_status using errcode = '22023';
  end if;

  select * into v_offer
    from public.offers
   where provider = p_provider and external_offer_id = p_external_offer_id;
  if not found then
    raise exception 'unknown_offer: %/%', p_provider, p_external_offer_id using errcode = 'P0002';
  end if;

  insert into public.purchases as pu (
    provider, external_purchase_id, offer_id, buyer_email,
    amount_cents, currency, status, status_changed_at
  ) values (
    p_provider, p_external_purchase_id, v_offer.id, v_email,
    p_amount_cents, coalesce(p_currency, 'BRL'), p_status, p_occurred_at
  )
  on conflict (provider, external_purchase_id) do update
     set status            = excluded.status,
         status_changed_at = excluded.status_changed_at,
         amount_cents      = coalesce(excluded.amount_cents, pu.amount_cents)
   where pu.status_changed_at <= excluded.status_changed_at
  returning * into v_purchase;

  if not found then
    -- evento mais antigo que o estado atual: registrado, mas não aplicado
    select id into v_purchase.id
      from public.purchases
     where provider = p_provider and external_purchase_id = p_external_purchase_id;
    return jsonb_build_object('purchase_id', v_purchase.id, 'applied', false, 'reason', 'stale_event');
  end if;

  select u.id into v_user_id
    from auth.users u
   where lower(u.email) = v_email and u.email_confirmed_at is not null
   limit 1;
  if v_user_id is not null then
    insert into public.profiles (id) values (v_user_id) on conflict (id) do nothing;
  end if;

  if v_purchase.status = 'approved' then
    insert into public.entitlements as en (
      product_id, plan_id, buyer_email, user_id, source, purchase_id, status
    ) values (
      v_offer.product_id, v_offer.plan_id, v_email, v_user_id, 'purchase', v_purchase.id, 'active'
    )
    on conflict (purchase_id) do update
       set status        = 'active',
           revoked_at    = null,
           revoke_reason = null,
           user_id       = coalesce(en.user_id, excluded.user_id);
  elsif v_purchase.status in ('refunded', 'chargeback', 'canceled') then
    update public.entitlements
       set status = 'revoked', revoked_at = now(), revoke_reason = v_purchase.status
     where purchase_id = v_purchase.id and status = 'active';
  end if;
  -- 'pending': só registra a compra, não libera nem revoga nada

  select user_id into v_user_id from public.entitlements where purchase_id = v_purchase.id;
  if v_user_id is not null then
    perform app_private.sync_catalog_access(v_user_id);
  end if;

  return jsonb_build_object('purchase_id', v_purchase.id, 'applied', true, 'status', v_purchase.status);
end;
$$;
