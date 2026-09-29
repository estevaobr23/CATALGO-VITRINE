import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/core/supabase/server";
import type { Tables } from "@/core/supabase/database.types";

export type ActivePlan = {
  key: string;
  name: string;
  limits: { max_catalogs?: number; max_visible_items?: number };
  features: string[];
};

export type Access = {
  user: User;
  productId: string;
  plan: ActivePlan | null;
};

export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Camada 2: sessão + direito ativo. O plano é SEMPRE calculado dos
 * entitlements (maior rank vence); nenhuma coluna editável decide acesso.
 */
export const getAccess = cache(async (productKey: string): Promise<Access> => {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  // vincula compras feitas com este e-mail (só se o e-mail estiver confirmado)
  await supabase.rpc("claim_my_entitlements");

  const { data: product } = await supabase.from("products").select("id").eq("key", productKey).single();
  if (!product) throw new Error(`Produto ${productKey} não encontrado no banco (rode o seed).`);

  const { data: ents } = await supabase
    .from("entitlements")
    .select("plan_id")
    .eq("product_id", product.id)
    .eq("status", "active");

  let plan: ActivePlan | null = null;
  const planIds = (ents ?? []).map((e) => e.plan_id);
  if (planIds.length) {
    const { data: plans } = await supabase
      .from("plans")
      .select("key, name, limits, features, rank")
      .in("id", planIds)
      .order("rank", { ascending: false })
      .limit(1);
    const p = plans?.[0];
    if (p) plan = { key: p.key, name: p.name, limits: (p.limits ?? {}) as ActivePlan["limits"], features: p.features };
  }
  return { user, productId: product.id, plan };
});

export async function requireAccess(productKey: string) {
  const access = await getAccess(productKey);
  if (!access.plan) redirect("/app/sem-acesso");
  return access as Access & { plan: ActivePlan };
}

export type Catalog = Tables<"catalogs">;

export const getMyCatalog = cache(async (productId: string, userId: string): Promise<Catalog | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalogs")
    .select("*")
    .eq("product_id", productId)
    .eq("owner_id", userId)
    .neq("status", "archived")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
});

/** Guard das telas do painel: acesso ativo + vitrine criada. */
export async function requireCatalog(productKey: string) {
  const access = await requireAccess(productKey);
  const catalog = await getMyCatalog(access.productId, access.user.id);
  if (!catalog) redirect("/app/primeiro-acesso");
  return { ...access, catalog };
}

/** Só aceita caminho relativo interno (evita open redirect). */
export function safeNext(next: string | null | undefined, fallback = "/app"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
