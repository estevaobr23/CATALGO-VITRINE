"use server";
import { friendlyDbError } from "@/core/access/errors";
import { vertical } from "@/vertical/config";
import { type ActionResult, ownPath, painelCtx, removeFiles, revalidateStore, text } from "./ctx";

const V = vertical.vocabulary;

// ─────────────────────────────── Galeria ───────────────────────────────
// media com item_id nulo = portfólio do catálogo (não é produto à venda).

export async function addGalleryPhoto(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const path = ownPath(fd.get("storage_path"), catalog.id, "items");
  if (path === "invalid" || !path) return { ok: false, message: "Envie uma foto antes de salvar." };

  const { count } = await supabase
    .from("media")
    .select("id", { count: "exact", head: true })
    .eq("catalog_id", catalog.id)
    .is("item_id", null);
  if ((count ?? 0) >= 12) return { ok: false, message: "A galeria aceita até 12 fotos. Remova uma para adicionar outra." };

  const { error } = await supabase.from("media").insert({
    catalog_id: catalog.id,
    item_id: null,
    kind: "image",
    storage_path: path,
    caption: text(fd, "caption", 300) || null,
    sort_order: count ?? 0,
  });
  if (error) return { ok: false, message: friendlyDbError(error, V) };
  revalidateStore(catalog.slug);
  return { ok: true, message: "Foto adicionada à galeria." };
}

export async function deleteGalleryPhoto(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const id = text(fd, "id", 40);
  const { data: row } = await supabase
    .from("media")
    .select("storage_path")
    .eq("id", id)
    .eq("catalog_id", catalog.id)
    .is("item_id", null)
    .maybeSingle();
  const { error } = await supabase.from("media").delete().eq("id", id).eq("catalog_id", catalog.id).is("item_id", null);
  if (error) return { ok: false, message: friendlyDbError(error, V) };
  await removeFiles(supabase, catalog.id, [row?.storage_path]);
  revalidateStore(catalog.slug);
  return { ok: true, message: "Foto removida." };
}

// ───────────────────────────── Depoimentos ─────────────────────────────
// RLS exige o recurso 'testimonials' do plano: sem ele, o insert é recusado
// pelo banco (não só pela UI).

export async function saveTestimonial(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const id = text(fd, "id", 40);
  const author = text(fd, "author_name", 80);
  if (author.length < 2) return { ok: false, message: "Informe o nome de quem escreveu." };
  const body = text(fd, "body", 2000);
  if (body.length < 5) return { ok: false, message: "Escreva o depoimento." };
  const ratingRaw = Number(text(fd, "rating", 2));
  const rating = Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : null;

  const row = { author_name: author, body, rating, is_visible: fd.get("is_visible") !== null };

  if (id) {
    const { error } = await supabase.from("testimonials").update(row).eq("id", id).eq("catalog_id", catalog.id);
    if (error) return { ok: false, message: planError(error, "editar") };
  } else {
    const { count } = await supabase.from("testimonials").select("id", { count: "exact", head: true }).eq("catalog_id", catalog.id);
    if ((count ?? 0) >= 30) return { ok: false, message: "Limite de 30 depoimentos." };
    const { error } = await supabase.from("testimonials").insert({ ...row, catalog_id: catalog.id, sort_order: count ?? 0 });
    if (error) return { ok: false, message: planError(error, "adicionar") };
  }
  revalidateStore(catalog.slug);
  return { ok: true, message: id ? "Depoimento salvo." : "Depoimento adicionado." };
}

export async function deleteTestimonial(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const { error } = await supabase.from("testimonials").delete().eq("id", text(fd, "id", 40)).eq("catalog_id", catalog.id);
  if (error) return { ok: false, message: friendlyDbError(error, V) };
  revalidateStore(catalog.slug);
  return { ok: true, message: "Depoimento removido." };
}

function planError(error: { message?: string; code?: string }, verbo: string): string {
  if (error.code === "42501" || (error.message ?? "").includes("row-level security")) {
    return `Depoimentos fazem parte do plano Profissional. Faça o upgrade para ${verbo} depoimentos.`;
  }
  return friendlyDbError(error, V);
}
