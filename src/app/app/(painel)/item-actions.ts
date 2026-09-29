"use server";
import { redirect } from "next/navigation";
import { friendlyDbError } from "@/core/access/errors";
import { parsePriceToCents } from "@/core/catalog/format";
import type { Json } from "@/core/supabase/database.types";
import { vertical } from "@/vertical/config";
import { type ActionResult, ownPath, painelCtx, removeFiles, revalidateStore, text } from "./ctx";

const V = vertical.vocabulary;
const Item = V.item.singular[0].toUpperCase() + V.item.singular.slice(1);

function readAttributes(fd: FormData): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const field of vertical.itemAttributes) {
    const raw = text(fd, `attr_${field.key}`, field.type === "text" ? field.maxLength ?? 200 : 10);
    if (!raw) continue;
    if (field.type === "number") {
      const n = Number(raw);
      if (Number.isInteger(n) && n >= (field.min ?? 0) && n <= (field.max ?? 1e6)) out[field.key] = n;
    } else {
      out[field.key] = raw;
    }
  }
  return out;
}

function readExtras(fd: FormData): { name: string; price_cents: number }[] | string {
  const names = fd.getAll("extra_name").map((v) => String(v).trim().slice(0, 80));
  const prices = fd.getAll("extra_price").map((v) => String(v));
  const extras: { name: string; price_cents: number }[] = [];
  for (let i = 0; i < names.length; i++) {
    if (!names[i]) continue;
    const cents = prices[i]?.trim() ? parsePriceToCents(prices[i]) : 0;
    if (cents == null) return `Valor inválido no adicional "${names[i]}".`;
    extras.push({ name: names[i], price_cents: cents });
  }
  return extras.slice(0, 20);
}

/** Item gravado mas foto/adicionais falharam: numa cesta NOVA, leva para a edição (salvar de novo não duplica). */
function partialFailure(formId: string | null, itemId: string, message: string): ActionResult {
  if (!formId) redirect(`/app/cestas/${itemId}?erro=${encodeURIComponent(message)}`);
  return { ok: false, message, id: itemId };
}

export async function saveItem(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const id = text(fd, "id", 40) || null;

  const name = text(fd, "name", 140);
  if (name.length < 2) return { ok: false, message: `Dê um nome para ${V.item.article} ${V.item.singular}.` };

  const priceMode = fd.get("price_mode") === "on_request" ? "on_request" : fd.get("price_mode") === "from" ? "from" : "fixed";
  const price = parsePriceToCents(text(fd, "price", 20));
  if (priceMode !== "on_request" && (price == null || price <= 0)) return { ok: false, message: "Informe um preço válido, ex.: 149,90." };
  const compareRaw = text(fd, "compare_at_price", 20);
  const compare = compareRaw ? parsePriceToCents(compareRaw) : null;
  if (compareRaw && compare == null) return { ok: false, message: "Preço \"de\" inválido." };
  if (compare != null && price != null && compare <= price) return { ok: false, message: "O preço \"de\" precisa ser maior que o preço atual." };

  const features = fd
    .getAll("features")
    .map((f) => String(f).trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 40);
  const extras = readExtras(fd);
  if (typeof extras === "string") return { ok: false, message: extras };

  const image = ownPath(fd.get("image_path"), catalog.id, "items");
  if (image === "invalid") return { ok: false, message: "Foto inválida. Envie de novo." };

  const categoryId = text(fd, "category_id", 40) || null;
  const row = {
    name,
    summary: text(fd, "summary", 300) || null,
    description: text(fd, "description", 5000) || null,
    features,
    price_mode: priceMode,
    price_cents: priceMode === "on_request" ? null : price,
    compare_at_price_cents: priceMode === "on_request" ? null : compare,
    category_id: categoryId, // FK composta: categoria de outra vitrine é rejeitada pelo banco
    is_visible: fd.get("is_visible") === "on",
    is_available: fd.get("is_available") === "on",
    is_featured: fd.get("is_featured") === "on",
    attributes: readAttributes(fd),
  };

  let itemId = id;
  if (id) {
    const { error } = await supabase.from("items").update({ ...row, slug: "" }).eq("id", id).eq("catalog_id", catalog.id);
    if (error) return { ok: false, message: friendlyDbError(error, V) };
  } else {
    const { count } = await supabase.from("items").select("id", { count: "exact", head: true }).eq("catalog_id", catalog.id);
    const { data, error } = await supabase
      .from("items")
      .insert({ ...row, catalog_id: catalog.id, kind: "product", sort_order: count ?? 0 })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: friendlyDbError(error, V) };
    itemId = data.id;
  }

  // foto principal (media kind=image, 1ª posição)
  const { data: current, error: mediaReadError } = await supabase
    .from("media")
    .select("id, storage_path")
    .eq("catalog_id", catalog.id)
    .eq("item_id", itemId!)
    .eq("kind", "image")
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  let mediaError = mediaReadError;
  if (!mediaError && image && current && current.storage_path !== image) {
    mediaError = (await supabase.from("media").update({ storage_path: image, alt_text: name.slice(0, 200) }).eq("id", current.id)).error;
    if (!mediaError) await removeFiles(supabase, catalog.id, [current.storage_path]);
  } else if (!mediaError && image && !current) {
    mediaError = (
      await supabase.from("media").insert({ catalog_id: catalog.id, item_id: itemId, kind: "image", storage_path: image, alt_text: name.slice(0, 200) })
    ).error;
  } else if (!mediaError && !image && current) {
    mediaError = (await supabase.from("media").delete().eq("id", current.id)).error;
    if (!mediaError) await removeFiles(supabase, catalog.id, [current.storage_path]);
  }
  if (mediaError) {
    console.error("saveItem media:", mediaError.code, mediaError.message);
    return partialFailure(id, itemId!, `${Item} salva, mas a foto não foi registrada. Toque em salvar de novo.`);
  }

  // adicionais: um grupo "add/multiple" regravado a cada salvamento
  const { error: delGroupsError } = await supabase.from("item_option_groups").delete().eq("catalog_id", catalog.id).eq("item_id", itemId!);
  let extrasError = delGroupsError;
  if (!extrasError && extras.length) {
    const { data: group, error: groupError } = await supabase
      .from("item_option_groups")
      .insert({ catalog_id: catalog.id, item_id: itemId!, name: V.extras, selection: "multiple", pricing: "add", min_select: 0 })
      .select("id")
      .single();
    extrasError = groupError;
    if (group) {
      extrasError = (
        await supabase
          .from("item_option_values")
          .insert(extras.map((e, i) => ({ catalog_id: catalog.id, group_id: group.id, name: e.name, price_cents: e.price_cents, sort_order: i })))
      ).error;
    }
  }
  if (extrasError) {
    console.error("saveItem extras:", extrasError.code, extrasError.message);
    return partialFailure(id, itemId!, `${Item} salva, mas os ${V.extras.toLowerCase()} não foram gravados. Toque em salvar de novo.`);
  }

  revalidateStore(catalog.slug);
  const msg = id ? "Alterações salvas." : `${Item} adicionada.`;
  if (fd.get("after") === "new") redirect(`/app/cestas/nova?ok=${encodeURIComponent(msg)}`);
  redirect(`/app/cestas?ok=${encodeURIComponent(msg)}`);
}

export async function deleteItem(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const id = text(fd, "id", 40);
  const { data: media } = await supabase.from("media").select("storage_path").eq("catalog_id", catalog.id).eq("item_id", id);
  const { error } = await supabase.from("items").delete().eq("id", id).eq("catalog_id", catalog.id);
  if (error) return { ok: false, message: friendlyDbError(error, V) };
  await removeFiles(supabase, catalog.id, (media ?? []).map((m) => m.storage_path));
  revalidateStore(catalog.slug);
  if (fd.get("from") === "edit") redirect(`/app/cestas?ok=${encodeURIComponent(`${Item} removida.`)}`);
  return { ok: true, message: `${Item} removida.` };
}

export async function toggleItem(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const field = fd.get("field") === "is_available" ? "is_available" : "is_visible";
  const value = fd.get("value") === "1";
  const { error } = await supabase
    .from("items")
    .update(field === "is_available" ? { is_available: value } : { is_visible: value })
    .eq("id", text(fd, "id", 40))
    .eq("catalog_id", catalog.id);
  if (error) return { ok: false, message: friendlyDbError(error, V) };
  revalidateStore(catalog.slug);
  const messages = {
    is_visible: value ? `${Item} aparecendo na vitrine.` : `${Item} escondida da vitrine.`,
    is_available: value ? `${Item} disponível.` : `${Item} marcada como esgotada.`,
  };
  return { ok: true, message: messages[field] };
}

export async function moveItem(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const id = text(fd, "id", 40);
  const dir = fd.get("dir") === "up" ? -1 : 1;
  const { data: rows } = await supabase.from("items").select("id, sort_order").eq("catalog_id", catalog.id).order("sort_order").order("name");
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true, message: "" };
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((r, idx) => (r.sort_order === idx ? null : supabase.from("items").update({ sort_order: idx }).eq("id", r.id))));
  revalidateStore(catalog.slug);
  return { ok: true, message: "Ordem atualizada." };
}
