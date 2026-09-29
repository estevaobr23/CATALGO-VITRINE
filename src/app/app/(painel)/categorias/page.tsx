import { ActionForm } from "@/core/ui/ActionForm";
import { EmptyState } from "@/core/ui/EmptyState";
import { SubmitButton } from "@/core/ui/SubmitButton";
import { vertical } from "@/vertical/config";
import { createCategory, deleteCategory, moveCategory, updateCategory } from "../category-actions";
import { painelCtx } from "../ctx";
import { NavIcon } from "../Nav";

export default async function CategoriesPage() {
  const { catalog, supabase } = await painelCtx();
  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from("categories").select("*").eq("catalog_id", catalog.id).order("sort_order").order("name"),
    supabase.from("items").select("category_id").eq("catalog_id", catalog.id),
  ]);
  const counts = new Map<string, number>();
  for (const i of items ?? []) if (i.category_id) counts.set(i.category_id, (counts.get(i.category_id) ?? 0) + 1);
  const list = categories ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Categorias</h1>
        <p className="mt-1 text-sm text-body">
          Organizam suas cestas na vitrine. O cliente toca em uma categoria e vê só as cestas dela.
        </p>
      </div>

      <ActionForm action={createCategory} resetOnSuccess className="card flex flex-col gap-2 p-4 sm:flex-row">
        <label htmlFor="new-cat" className="sr-only">Nome da nova categoria</label>
        <input id="new-cat" name="name" required maxLength={80} placeholder="Ex.: Café da Manhã, Românticas, Aniversário" className="field" />
        <SubmitButton className="btn-primary shrink-0" pendingText="Criando...">+ Criar categoria</SubmitButton>
      </ActionForm>

      {list.length === 0 ? (
        <EmptyState
          icon={<NavIcon name="tags" className="h-7 w-7" />}
          title="Nenhuma categoria ainda"
          text={`Categorias são opcionais, mas ajudam o cliente a achar a cesta certa. Sugestões: ${vertical.starterCategories.join(", ")}.`}
        />
      ) : (
        <ul className="space-y-2">
          {list.map((cat, idx) => (
            <li key={cat.id} className="card p-3 sm:p-4">
              <div className="flex items-start gap-2">
                <ActionForm action={updateCategory} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <input type="hidden" name="id" value={cat.id} />
                  <input name="name" defaultValue={cat.name} required maxLength={80} className="field py-2" aria-label="Nome da categoria" />
                  <label className="flex shrink-0 items-center gap-2 text-sm text-body">
                    <input type="checkbox" name="is_visible" defaultChecked={cat.is_visible} className="h-5 w-5 accent-[var(--primary)]" />
                    Mostrar
                  </label>
                  <SubmitButton className="btn-secondary min-h-10 shrink-0 px-3 py-1.5 text-xs">Salvar</SubmitButton>
                </ActionForm>
                <div className="flex flex-col">
                  <ActionForm action={moveCategory}>
                    <input type="hidden" name="id" value={cat.id} />
                    <input type="hidden" name="dir" value="up" />
                    <SubmitButton className="btn-ghost min-h-9 w-9 px-0 py-0" pendingText="·" disabled={idx === 0}><span aria-label="Mover para cima">↑</span></SubmitButton>
                  </ActionForm>
                  <ActionForm action={moveCategory}>
                    <input type="hidden" name="id" value={cat.id} />
                    <input type="hidden" name="dir" value="down" />
                    <SubmitButton className="btn-ghost min-h-9 w-9 px-0 py-0" pendingText="·" disabled={idx === list.length - 1}><span aria-label="Mover para baixo">↓</span></SubmitButton>
                  </ActionForm>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-body">
                <span>
                  {counts.get(cat.id) ?? 0} {(counts.get(cat.id) ?? 0) === 1 ? "cesta" : "cestas"}
                  {!cat.is_visible && " · oculta: as cestas dela também não aparecem"}
                </span>
                <ActionForm action={deleteCategory} confirm={`Excluir a categoria "${cat.name}"? As cestas dela NÃO são apagadas, só ficam sem categoria.`}>
                  <input type="hidden" name="id" value={cat.id} />
                  <SubmitButton className="btn-ghost min-h-8 px-2 py-1 text-xs text-danger" pendingText="...">Excluir</SubmitButton>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-body">Para colocar uma cesta numa categoria, abra a cesta em “Minhas cestas” e escolha a categoria.</p>
    </div>
  );
}
