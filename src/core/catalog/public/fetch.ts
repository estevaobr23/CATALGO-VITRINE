import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/core/supabase/database.types";
import { assertSupabaseEnv, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/core/supabase/env";
import type { PublicCatalog } from "../types";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Leitura pública: UMA chamada à RPC com whitelist de campos, sempre como
 * visitante anônimo (sem cookie), então o dono logado vê o mesmo que o cliente.
 * null = slug inexistente ou vitrine fora do ar.
 */
export const getPublicCatalog = cache(async (productKey: string, slug: string): Promise<PublicCatalog | null> => {
  const s = slug.toLowerCase();
  if (!SLUG.test(s) || s.length > 48) return null;
  assertSupabaseEnv();
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("get_public_catalog", { p_product_key: productKey, p_slug: s });
  if (error) throw new Error(`get_public_catalog: ${error.message}`);
  return (data as PublicCatalog | null) ?? null;
});
