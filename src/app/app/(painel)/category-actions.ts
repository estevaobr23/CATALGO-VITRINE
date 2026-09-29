"use server";
import { friendlyDbError } from "@/core/access/errors";
import { vertical } from "@/vertical/config";
import { type ActionResult, painelCtx, revalidateStore, text } from "./ctx";

const V = vertical.vocabulary;

export async function createCategory(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const name = text(fd, "name", 80);
  if (!name) return { ok: false, message: "Digite o nome da categoria." };
  const { count } = await supabase.from("categories").select("id", { count: "exact", head: true }).eq("catalog_id", catalog.id);
  if ((count ?? 0) >= 50) return { ok: false, message: "Limite de 50 categorias." };
  const { error } = await supabase.from("categories").insert({ catalog_id: catalog.id, name, sort_order: count ?? 0 });
  if (error) return { ok: false, message: friendlyDbError(error, V) };
  revalidateStore(catalog.slug);
  return { ok: true, message: "Categoria criada." };
}

export async function updateCategory(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const id = text(fd, "id", 40);
  const name = text(fd, "name", 80);
  if (!name) return { ok: false, message: "O nome não pode ficar vazio." };
  // RLS garante a posse; o filtro por catalog_id é só clareza
  const { error } = await supabase
    .from("categories")
    .update({ name, slug: "", is_visible: fd.get("is_visible") === "on" })
    .eq("id", id)
    .eq("catalog_id", catalog.id);
  if (error) return { ok: false, message: friendlyDbError(error, V) };
  revalidateStore(catalog.slug);
  return { ok: true, message: "Alterações salvas." };
}

export async function deleteCategory(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const { error } = await supabase.from("categories").delete().eq("id", text(fd, "id", 40)).eq("catalog_id", catalog.id);
  if (error) return { ok: false, message: friendlyDbError(error, V) };
  revalidateStore(catalog.slug);
  return { ok: true, message: `Categoria removida. As ${V.item.plural} dela continuam na vitrine, sem categoria.` };
}

export async function moveCategory(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const id = text(fd, "id", 40);
  const dir = fd.get("dir") === "up" ? -1 : 1;
  const { data: rows } = await supabase
    .from("categories")
    .select("id, sort_order")
    .eq("catalog_id", catalog.id)
    .order("sort_order")
    .order("name");
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true, message: "" };
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(
    list.map((r, idx) => (r.sort_order === idx ? null : supabase.from("categories").update({ sort_order: idx }).eq("id", r.id))),
  );
  revalidateStore(catalog.slug);
  return { ok: true, message: "Ordem atualizada." };
}
