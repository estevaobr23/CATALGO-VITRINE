import Link from "next/link";
import { FlashFromUrl } from "@/core/ui/toast";
import { vertical } from "@/vertical/config";
import { library } from "@/vertical/library";
import { painelCtx } from "../../ctx";
import { ItemForm, type ItemFormValues } from "../ItemForm";
import { Steps } from "../../../Steps";

export default async function NewItemPage(props: PageProps<"/app/cestas/nova">) {
  const sp = await props.searchParams;
  const { catalog, supabase } = await painelCtx();
  const { data: categories } = await supabase.from("categories").select("id, name").eq("catalog_id", catalog.id).order("sort_order").order("name");

  const idea = typeof sp.modelo === "string" ? library.find((l) => l.slug === sp.modelo) : undefined;
  const matchCategory = idea ? (categories ?? []).find((c) => c.name.toLowerCase() === idea.occasion.toLowerCase()) : undefined;
  const values: ItemFormValues = {
    name: idea?.name ?? "",
    summary: idea?.summary ?? "",
    description: "",
    features: idea?.features ?? [],
    price_mode: "fixed",
    price: "",
    compare_at_price: "",
    category_id: matchCategory?.id ?? "",
    is_visible: true,
    is_available: true,
    is_featured: false,
    attributes: {},
    image_path: null,
    extras: [],
  };

  return (
    <div className="space-y-5">
      <FlashFromUrl message={typeof sp.ok === "string" ? sp.ok : null} />
      {sp.boasvindas === "1" && <Steps current={3} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/app/cestas" className="text-sm text-body hover:text-ink">← Minhas cestas</Link>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Adicionar cesta</h1>
        </div>
        <Link href="/app/cestas/ideias" className="btn-secondary min-h-9 px-3 py-1.5 text-xs">💡 Ver ideias de cestas</Link>
      </div>
      {idea && (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">
          Modelo <b>{idea.name}</b> carregado. Ajuste a composição, coloque sua foto e o seu preço.
        </p>
      )}
      <ItemForm
        catalogId={catalog.id}
        values={values}
        categories={categories ?? []}
        vocabulary={vertical.vocabulary}
        attributes={vertical.itemAttributes}
      />
    </div>
  );
}
