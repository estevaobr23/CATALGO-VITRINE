import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/core/ui/ActionForm";
import { FlashFromUrl } from "@/core/ui/toast";
import { SubmitButton } from "@/core/ui/SubmitButton";
import { centsToInput } from "@/core/catalog/format";
import { vertical } from "@/vertical/config";
import { painelCtx } from "../../ctx";
import { deleteItem } from "../../item-actions";
import { ItemForm, type ItemFormValues } from "../ItemForm";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditItemPage(props: PageProps<"/app/cestas/[id]">) {
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  if (!UUID.test(id)) notFound();
  const { catalog, supabase } = await painelCtx();

  // RLS: item de outra conta simplesmente não volta -> 404
  const { data: item } = await supabase.from("items").select("*").eq("id", id).eq("catalog_id", catalog.id).maybeSingle();
  if (!item) notFound();

  const [{ data: categories }, { data: photo }, { data: groups }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("catalog_id", catalog.id).order("sort_order").order("name"),
    supabase.from("media").select("storage_path").eq("catalog_id", catalog.id).eq("item_id", id).eq("kind", "image").order("sort_order").limit(1).maybeSingle(),
    supabase.from("item_option_groups").select("id").eq("catalog_id", catalog.id).eq("item_id", id).eq("pricing", "add"),
  ]);
  const groupIds = (groups ?? []).map((g) => g.id);
  const { data: optionValues } = groupIds.length
    ? await supabase.from("item_option_values").select("name, price_cents, sort_order").eq("catalog_id", catalog.id).in("group_id", groupIds).order("sort_order")
    : { data: [] };

  const attrs = (item.attributes ?? {}) as Record<string, unknown>;
  const values: ItemFormValues = {
    id: item.id,
    name: item.name,
    summary: item.summary ?? "",
    description: item.description ?? "",
    features: item.features,
    price_mode: item.price_mode as ItemFormValues["price_mode"],
    price: centsToInput(item.price_cents),
    compare_at_price: centsToInput(item.compare_at_price_cents),
    category_id: item.category_id ?? "",
    is_visible: item.is_visible,
    is_available: item.is_available,
    is_featured: item.is_featured,
    attributes: Object.fromEntries(vertical.itemAttributes.map((f) => [f.key, attrs[f.key] != null ? String(attrs[f.key]) : ""])),
    image_path: photo?.storage_path ?? null,
    extras: (optionValues ?? []).map((v) => ({ name: v.name, price: v.price_cents ? centsToInput(v.price_cents) : "" })),
  };

  return (
    <div className="space-y-5">
      <FlashFromUrl message={typeof sp.erro === "string" ? sp.erro : null} tone="error" />
      <div>
        <Link href="/app/cestas" className="text-sm text-body hover:text-ink">← Minhas cestas</Link>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Editar cesta</h1>
      </div>
      <ItemForm catalogId={catalog.id} values={values} categories={categories ?? []} vocabulary={vertical.vocabulary} attributes={vertical.itemAttributes} />
      <ActionForm action={deleteItem} confirm={`Excluir "${item.name}"? Isso não pode ser desfeito.`} className="pt-2">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="from" value="edit" />
        <SubmitButton className="btn-danger w-full sm:w-auto" pendingText="Excluindo...">Excluir esta cesta</SubmitButton>
      </ActionForm>
    </div>
  );
}
