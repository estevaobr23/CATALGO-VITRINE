// =============================================================================
// Edge Function genérica de webhook de compra — SQL Catálogo SaaS / CestaVitrine
// URL: https://<projeto>.supabase.co/functions/v1/purchase-webhook?provider=cakto
// Deploy com verify_jwt = false (a autenticação é a assinatura do provedor).
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (automáticos) + CAKTO_WEBHOOK_SECRET
//
// O banco (apply_purchase_event) só conhece o formato normalizado. Cada gateway
// é um ADAPTADOR. O da Cakto segue a doc oficial (docs.cakto.com.br/conceitos/webhooks,
// lida em 2026-09-28):
//   corpo  { secret, event, data }   — data é objeto (V1) ou lista (V2)
//   header X-Cakto-Timestamp + X-Cakto-Signature: v1=HMAC-SHA256(secret, "{ts}.{corpo cru}")
//   evento purchase_approved (status "paid") | refund | chargeback | ...
//   data.id = pedido (chave de deduplicação), data.offer.id = oferta, data.customer.email
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type PurchaseStatus = "pending" | "approved" | "refunded" | "chargeback" | "canceled";

type NormalizedPurchase = {
  externalPurchaseId: string;
  externalOfferId: string;
  buyerEmail: string;
  status: PurchaseStatus;
  amountCents: number | null;
  currency: string;
  occurredAt: string; // ISO: ordena eventos fora de ordem
};

type NormalizedEvent = {
  dedupeKey: string; // ID único do evento (ou hash do corpo)
  eventType: string; // só para auditoria
  purchases: NormalizedPurchase[]; // vazio = evento que não mexe em acesso -> 'ignored'
};

type Adapter = {
  provider: string; // = offers.provider no banco
  authenticate(req: Request, rawBody: string, body: unknown): Promise<boolean>;
  normalize(body: any, rawBody: string): Promise<NormalizedEvent>;
};

// -----------------------------------------------------------------------------
// Utilitários
// -----------------------------------------------------------------------------
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < Math.max(ba.length, bb.length); i++) diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

// -----------------------------------------------------------------------------
// ADAPTADOR CAKTO (contrato da documentação oficial)
// -----------------------------------------------------------------------------
const CAKTO_STATUS_BY_EVENT: Record<string, PurchaseStatus | undefined> = {
  purchase_approved: "approved",
  refund: "refunded",
  chargeback: "chargeback",
  subscription_canceled: "canceled", // só relevante se um dia houver plano recorrente
};

// data de quando o status mudou, por evento (a doc lista paidAt/refundedAt/chargedbackAt/canceledAt)
const CAKTO_DATE_BY_STATUS: Record<PurchaseStatus, string> = {
  approved: "paidAt",
  refunded: "refundedAt",
  chargeback: "chargedbackAt",
  canceled: "canceledAt",
  pending: "createdAt",
};

const caktoAdapter: Adapter = {
  provider: "cakto",

  async authenticate(req, rawBody, body: any) {
    const secret = Deno.env.get("CAKTO_WEBHOOK_SECRET") ?? "";
    if (!secret) return false; // fail-closed: sem segredo configurado, nada entra

    // 1) assinatura no header (recomendada pela Cakto): prova origem e integridade
    const ts = req.headers.get("x-cakto-timestamp");
    const sigHeader = req.headers.get("x-cakto-signature");
    if (ts && sigHeader) {
      if (!/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // anti-replay 5 min
      const expected = `v1=${await hmacSha256Hex(secret, `${ts}.${rawBody}`)}`;
      return sigHeader.split(",").some((s) => safeEqual(s.trim(), expected));
    }
    // 2) fallback: campo secret no corpo (também documentado)
    const received = typeof body?.secret === "string" ? body.secret : "";
    return !!received && safeEqual(received, secret);
  },

  async normalize(body: any, rawBody: string): Promise<NormalizedEvent> {
    const eventType = String(body?.event ?? "unknown").slice(0, 100);
    const orders: any[] = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : [];
    const status = CAKTO_STATUS_BY_EVENT[eventType];

    // checkout_abandonment, pix_gerado, purchase_refused...: registrados e ignorados
    if (!status || eventType === "checkout_abandonment") {
      return { dedupeKey: await sha256(rawBody), eventType, purchases: [] };
    }

    const purchases: NormalizedPurchase[] = [];
    for (const d of orders) {
      const email = typeof d?.customer?.email === "string" ? d.customer.email.trim().toLowerCase() : "";
      const offerId = d?.offer?.id != null ? String(d.offer.id) : "";
      if (!d?.id || !email || !offerId) continue;
      // aprovação só vale com o pedido efetivamente pago
      if (status === "approved" && d.status !== "paid") continue;
      const when = d[CAKTO_DATE_BY_STATUS[status]] ?? d.createdAt;
      const occurredAt = when && !Number.isNaN(Date.parse(when)) ? new Date(when).toISOString() : new Date().toISOString();
      purchases.push({
        externalPurchaseId: String(d.id),
        externalOfferId: offerId,
        buyerEmail: email,
        status,
        amountCents: typeof d.amount === "number" ? Math.round(d.amount * 100) : null,
        currency: typeof d?.offer?.currency === "string" ? d.offer.currency.slice(0, 3) : "BRL",
        occurredAt,
      });
    }

    // Mesmo pedido recebe vários eventos (aprovado, depois reembolso): a chave
    // inclui o evento. Reenvio do MESMO evento cai na mesma chave.
    const ids = orders.map((d) => String(d?.id ?? "")).sort().join(",");
    const dedupeKey = ids ? `${eventType}:${ids}`.slice(0, 200) : await sha256(rawBody);
    return { dedupeKey: dedupeKey.length < 200 ? dedupeKey : await sha256(dedupeKey), eventType, purchases };
  },
};

const ADAPTERS: Record<string, Adapter> = { cakto: caktoAdapter };

// -----------------------------------------------------------------------------
// Handler — o mesmo para qualquer provedor
// -----------------------------------------------------------------------------
Deno.serve(async (req) => {
  const reqId = crypto.randomUUID();
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const adapter = ADAPTERS[new URL(req.url).searchParams.get("provider") ?? ""];
  if (!adapter) return json(400, { error: "unknown_provider" });

  const rawBody = await req.text();
  if (rawBody.length > 512_000) return json(413, { error: "payload_too_large" });
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "invalid_json" });
  }
  if (!(await adapter.authenticate(req, rawBody, body))) return json(401, { error: "unauthorized" });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const event = await adapter.normalize(body, rawBody);
  // o segredo NUNCA é persistido junto com o payload
  const { secret: _omit, ...payload } = (body ?? {}) as Record<string, unknown>;

  // 1. registra o evento (idempotência de EVENTO)
  const { data: inserted } = await db
    .from("webhook_events")
    .upsert(
      { provider: adapter.provider, dedupe_key: event.dedupeKey, event_type: event.eventType, payload },
      { onConflict: "provider,dedupe_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  let eventId = inserted?.id as string | undefined;
  if (!eventId) {
    const { data: existing } = await db
      .from("webhook_events")
      .select("id, status, attempts")
      .eq("provider", adapter.provider)
      .eq("dedupe_key", event.dedupeKey)
      .single();
    if (existing?.status === "processed" || existing?.status === "ignored") {
      return json(200, { received: true, duplicate: true });
    }
    eventId = existing?.id; // reprocessa 'received'/'failed'
  }

  if (!event.purchases.length) {
    await db.from("webhook_events").update({ status: "ignored", processed_at: new Date().toISOString() }).eq("id", eventId);
    return json(200, { received: true, processed: false });
  }

  // 2. aplica cada pedido (idempotência de COMPRA e de DIREITO — dentro do banco)
  let lastPurchaseId: string | null = null;
  const errors: string[] = [];
  let retryable = false;
  for (const p of event.purchases) {
    const { data: result, error } = await db.rpc("apply_purchase_event", {
      p_provider: adapter.provider,
      p_external_purchase_id: p.externalPurchaseId,
      p_external_offer_id: p.externalOfferId,
      p_buyer_email: p.buyerEmail,
      p_status: p.status,
      p_amount_cents: p.amountCents,
      p_currency: p.currency,
      p_occurred_at: p.occurredAt,
    });
    if (error) {
      errors.push(`${error.code}: ${error.message}`);
      if (!error.message.startsWith("unknown_offer")) retryable = true;
    } else {
      lastPurchaseId = (result as { purchase_id?: string })?.purchase_id ?? lastPurchaseId;
    }
  }

  if (errors.length) {
    // log sem e-mail/nome/documento do comprador
    console.error(`[${reqId}] ${adapter.provider} ${event.eventType}: ${errors.join(" | ")}`);
    await db
      .from("webhook_events")
      .update({ status: "failed", last_error: errors.join(" | ").slice(0, 2000), purchase_id: lastPurchaseId })
      .eq("id", eventId);
    // A Cakto NÃO reenvia sozinha respostas não-2xx; 500 deixa a falha visível
    // no histórico para reenvio manual. Oferta desconhecida não melhora com reenvio.
    return json(retryable ? 500 : 200, { error: "apply_failed", request_id: reqId });
  }

  await db
    .from("webhook_events")
    .update({ status: "processed", processed_at: new Date().toISOString(), purchase_id: lastPurchaseId })
    .eq("id", eventId);

  return json(200, { received: true, processed: true, request_id: reqId });
});
