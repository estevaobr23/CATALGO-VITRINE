"use server";
import { redirect } from "next/navigation";
import { friendlyDbError } from "@/core/access/errors";
import { getMyCatalog, requireAccess } from "@/core/auth/guard";
import { normalizeWhatsapp } from "@/core/catalog/format";
import { createClient } from "@/core/supabase/server";
import { vertical } from "@/vertical/config";

export type SetupState = { error?: string; values?: Record<string, string> } | undefined;

export async function createStore(_: SetupState, formData: FormData): Promise<SetupState> {
  const access = await requireAccess(vertical.productKey);
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    whatsapp: String(formData.get("whatsapp") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
  };
  if (values.name.length < 2 || values.name.length > 120) return { error: "Informe o nome da sua marca.", values };
  const whatsapp = normalizeWhatsapp(values.whatsapp);
  if (!whatsapp) return { error: "WhatsApp inválido. Digite com DDD, ex.: (11) 99999-8888.", values };
  if (values.description.length > 500) return { error: "Descrição muito longa (máx. 500 caracteres).", values };

  if (await getMyCatalog(access.productId, access.user.id)) redirect("/app");

  const supabase = await createClient();
  // único jeito de criar vitrine: RPC confere direito ativo, limite e slug
  const { data: catalog, error } = await supabase.rpc("create_catalog", {
    p_product_key: vertical.productKey,
    p_name: values.name,
  });
  if (error || !catalog) return { error: friendlyDbError(error, vertical.vocabulary), values };

  const { error: updError } = await supabase
    .from("catalogs")
    .update({
      whatsapp,
      description: values.description || null,
      theme: { primary: vertical.palettes[0].primary, secondary: vertical.palettes[0].secondary, style: vertical.styles[0].id },
    })
    .eq("id", catalog.id);
  if (updError) return { error: friendlyDbError(updError, vertical.vocabulary), values };

  if (formData.get("starter") === "on") {
    await supabase
      .from("categories")
      .insert(vertical.starterCategories.map((name, i) => ({ catalog_id: catalog.id, name, sort_order: i })));
  }

  redirect("/app/aparencia?boasvindas=1");
}
