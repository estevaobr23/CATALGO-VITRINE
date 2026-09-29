import Link from "next/link";
import Image from "next/image";
import { ActionForm } from "@/core/ui/ActionForm";
import { EmptyState } from "@/core/ui/EmptyState";
import { FlashFromUrl } from "@/core/ui/toast";
import { SubmitButton } from "@/core/ui/SubmitButton";
import { CameraIcon } from "@/core/ui/ImageField";
import { formatCents } from "@/core/catalog/format";
import { publicMediaUrl } from "@/core/supabase/env";
import { vertical } from "@/vertical/config";
import { painelCtx } from "../ctx";
import { deleteItem, moveItem, toggleItem } from "../item-actions";
import { NavIcon } from "../Nav";

export default async function ItemsPage(props: PageProps<"/app/cestas">) {
  const sp = await props.searchParams;
  const { catalog, plan, supabase } = await painelCtx();
  const [{ data: items }, { data: media }, { data: categories }] = await Promise.all([
    supabase.from("items").select("*").eq("catalog_id", catalog.id).order("sort_order").order("name"),
    supabase.from("media").select("item_id, storage_path, sort_order").eq("catalog_id", catalog.id).not("item_id", "is", null).order("sort_order"),
    supabase.from("categories").select("id, name").eq("catalog_id", catalog.id),
  ]);
  const photoOf = new Map<string, string>();
  for (const m of media ?? []) if (m.item_id && m.storage_path && !photoOf.has(m.item_id)) photoOf.set(m.item_id, m.storage_path);
  const catName = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const list = items ?? [];
  const visible = list.filter((i) => i.is_visible).length;
  const limit = plan.limits.max_visible_items;

  return (
    <div className="space-y-5">
      <FlashFromUrl message={typeof sp.ok === "string" ? sp.ok : null} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Minhas cestas</h1>
          <p className="mt-1 text-sm text-body">
            {visible} na vitrine{limit ? ` de ${limit} do seu plano` : ""} · {list.length} cadastradas
          </p>
        </div>
        {list.length > 0 && <Link href="/app/cestas/nova" className="btn-primary">+ Adicionar cesta</Link>}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<NavIcon name="basket" className="h-7 w-7" />}
          title="Sua vitrine ainda está vazia"
          text="Cadastre sua primeira cesta para começar. Foto, nome, preço e o que vem dentro — só isso."
          action={<Link href="/app/cestas/nova" className="btn-primary">+ Adicionar cesta</Link>}
        />
      ) : (
        <ul className="space-y-3">
          {list.map((item, idx) => {
            const photo = photoOf.get(item.id);
            return (
              <li key={item.id} className={`card flex gap-3 p-3 sm:gap-4 sm:p-4 ${item.is_visible ? "" : "opacity-70"}`}>
                <Link href={`/app/cestas/${item.id}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bg-deep sm:h-24 sm:w-24">
                  {photo ? (
                    <Image src={publicMediaUrl(photo)!} alt="" fill sizes="96px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-body/60"><CameraIcon /></span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/app/cestas/${item.id}`} className="block">
                    <p className="truncate font-semibold text-ink">{item.name}</p>
                    <p className="text-sm font-semibold text-primary">
                      {item.price_mode === "on_request" ? "Sob consulta" : `${item.price_mode === "from" ? "a partir de " : ""}${formatCents(item.price_cents)}`}
                    </p>
                  </Link>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                    {item.category_id && catName.get(item.category_id) && (
                      <span className="rounded-full bg-bg-deep px-2 py-0.5 text-body">{catName.get(item.category_id)}</span>
                    )}
                    {!item.is_visible && <span className="rounded-full bg-ink/10 px-2 py-0.5 text-ink">Oculta</span>}
                    {!item.is_available && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-danger">Esgotada</span>}
                    {item.is_featured && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-ink">★ Destaque</span>}
                    {!photo && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-ink">Sem foto</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <ActionForm action={toggleItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="field" value="is_visible" />
                      <input type="hidden" name="value" value={item.is_visible ? "0" : "1"} />
                      <SubmitButton className="btn-ghost min-h-8 px-2 py-1 text-xs" pendingText="...">
                        {item.is_visible ? "Ocultar" : "Exibir"}
                      </SubmitButton>
                    </ActionForm>
                    <ActionForm action={toggleItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="field" value="is_available" />
                      <input type="hidden" name="value" value={item.is_available ? "0" : "1"} />
                      <SubmitButton className="btn-ghost min-h-8 px-2 py-1 text-xs" pendingText="...">
                        {item.is_available ? "Marcar esgotada" : "Disponível"}
                      </SubmitButton>
                    </ActionForm>
                    <Link href={`/app/cestas/${item.id}`} className="btn-ghost min-h-8 px-2 py-1 text-xs">Editar</Link>
                    <ActionForm action={deleteItem} confirm={`Excluir "${item.name}"? Isso não pode ser desfeito.`}>
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton className="btn-ghost min-h-8 px-2 py-1 text-xs text-danger" pendingText="...">Excluir</SubmitButton>
                    </ActionForm>
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-1">
                  <ActionForm action={moveItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="dir" value="up" />
                    <SubmitButton className="btn-ghost min-h-9 w-9 px-0 py-0" pendingText="·" disabled={idx === 0}>
                      <span aria-label="Mover para cima">↑</span>
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm action={moveItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="dir" value="down" />
                    <SubmitButton className="btn-ghost min-h-9 w-9 px-0 py-0" pendingText="·" disabled={idx === list.length - 1}>
                      <span aria-label="Mover para baixo">↓</span>
                    </SubmitButton>
                  </ActionForm>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-body">A ordem desta lista é a ordem em que as {vertical.vocabulary.item.plural} aparecem na vitrine.</p>
    </div>
  );
}
