import Link from "next/link";
import { ActionForm } from "@/core/ui/ActionForm";
import { EmptyState } from "@/core/ui/EmptyState";
import { SubmitButton } from "@/core/ui/SubmitButton";
import { SectionIcon } from "@/core/ui/SectionIcon";
import { painelCtx } from "../ctx";
import { deleteTestimonial, saveTestimonial } from "../content-actions";

export default async function TestimonialsPage() {
  const { catalog, plan, supabase } = await painelCtx();
  const allowed = plan.features.includes("testimonials");
  const { data: rows } = await supabase
    .from("testimonials")
    .select("id, author_name, body, rating, is_visible")
    .eq("catalog_id", catalog.id)
    .order("sort_order");
  const list = rows ?? [];

  return (
    <div className="space-y-5">
      <div>
        <Link href="/app/aparencia" className="text-sm text-body hover:text-ink">← Aparência</Link>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Depoimentos</h1>
        <p className="mt-1 text-sm text-body">
          Recados de quem já comprou com você. É o que mais ajuda quem está em dúvida a fechar o pedido.
        </p>
      </div>

      {!allowed ? (
        <div className="card p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-primary">
            <SectionIcon name="quote" className="h-7 w-7" />
          </div>
          <h2 className="font-display text-xl font-semibold">Depoimentos são do plano Profissional</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-body">
            Mostre na sua vitrine o que seus clientes falam de você. Quem está em dúvida decide vendo outra pessoa satisfeita.
          </p>
          <Link href="/app/plano" className="btn-primary mt-5">Ver o plano Profissional</Link>
        </div>
      ) : (
        <>
          <ActionForm action={saveTestimonial} resetOnSuccess className="card space-y-4 p-5">
            <h2 className="font-semibold">Adicionar depoimento</h2>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="label" htmlFor="author_name">Nome do cliente</label>
                <input id="author_name" name="author_name" required maxLength={80} placeholder="Juliana M." className="field" />
              </div>
              <div>
                <label className="label" htmlFor="rating">Nota</label>
                <select id="rating" name="rating" defaultValue="5" className="field sm:w-28">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{"★".repeat(n)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="body">O que ele disse</label>
              <textarea id="body" name="body" required rows={3} maxLength={2000} placeholder="A cesta chegou linda, todo mundo amou! Já encomendei outra." className="field" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_visible" defaultChecked className="h-5 w-5 accent-[var(--primary)]" />
              Mostrar na vitrine
            </label>
            <SubmitButton>Adicionar depoimento</SubmitButton>
          </ActionForm>

          {list.length === 0 ? (
            <EmptyState
              icon={<SectionIcon name="quote" className="h-7 w-7" />}
              title="Nenhum depoimento ainda"
              text="Peça um recado para quem já comprou com você e copie aqui. Pode ser o print do WhatsApp mesmo."
            />
          ) : (
            <ul className="space-y-3">
              {list.map((t) => (
                <li key={t.id} className={`card p-4 ${t.is_visible ? "" : "opacity-70"}`}>
                  <ActionForm action={saveTestimonial} className="space-y-3">
                    <input type="hidden" name="id" value={t.id} />
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input name="author_name" defaultValue={t.author_name} required maxLength={80} className="field py-2" aria-label="Nome do cliente" />
                      <select name="rating" defaultValue={String(t.rating ?? 5)} className="field py-2 sm:w-28" aria-label="Nota">
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>{"★".repeat(n)}</option>
                        ))}
                      </select>
                    </div>
                    <textarea name="body" defaultValue={t.body ?? ""} required rows={2} maxLength={2000} className="field" aria-label="Depoimento" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm text-body">
                        <input type="checkbox" name="is_visible" defaultChecked={t.is_visible} className="h-5 w-5 accent-[var(--primary)]" />
                        Mostrar na vitrine
                      </label>
                      <SubmitButton className="btn-secondary min-h-9 px-3 py-1.5 text-xs">Salvar</SubmitButton>
                    </div>
                  </ActionForm>
                  <ActionForm action={deleteTestimonial} confirm={`Remover o depoimento de ${t.author_name}?`} className="mt-2 border-t border-line pt-2 text-right">
                    <input type="hidden" name="id" value={t.id} />
                    <SubmitButton className="btn-ghost min-h-8 px-2 py-1 text-xs text-danger" pendingText="...">Remover</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
