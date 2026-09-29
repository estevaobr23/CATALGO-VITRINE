import Link from "next/link";
import { FlashFromUrl } from "@/core/ui/toast";
import { ActionForm } from "@/core/ui/ActionForm";
import { SubmitButton } from "@/core/ui/SubmitButton";
import { vertical } from "@/vertical/config";
import { setPublished } from "./catalog-actions";
import { painelCtx } from "./ctx";
import { CopyLink } from "./CopyLink";
import { storeUrl } from "./store-url";

type Db = Awaited<ReturnType<typeof painelCtx>>["supabase"];

/** Visitas e cliques no WhatsApp dos últimos 30 dias (só planos com analytics). */
async function loadStats(supabase: Db, catalogId: string) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const count = (type: string) =>
    supabase.from("catalog_events").select("id", { count: "exact", head: true }).eq("catalog_id", catalogId).eq("event_type", type).gte("occurred_at", since);
  const [v, c] = await Promise.all([count("page_view"), count("cta_click")]);
  return { views: v.count ?? 0, clicks: c.count ?? 0 };
}

export default async function MyStorePage(props: PageProps<"/app">) {
  const sp = await props.searchParams;
  const { catalog, plan, supabase } = await painelCtx();

  const [{ count: itemCount }, { count: visibleCount }, { count: categoryCount }, { count: photoCount }] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }).eq("catalog_id", catalog.id),
    supabase.from("items").select("id", { count: "exact", head: true }).eq("catalog_id", catalog.id).eq("is_visible", true),
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("catalog_id", catalog.id),
    supabase.from("media").select("id", { count: "exact", head: true }).eq("catalog_id", catalog.id).not("item_id", "is", null),
  ]);

  const stats = plan.features.includes("analytics") ? await loadStats(supabase, catalog.id) : null;

  const published = catalog.status === "published";
  const url = await storeUrl(catalog.slug);
  const limit = plan.limits.max_visible_items;
  const steps = [
    { done: !!catalog.whatsapp, label: "WhatsApp para pedidos", href: "/app/configuracoes" },
    { done: !!catalog.logo_path, label: "Logo da sua marca", href: "/app/aparencia" },
    { done: (categoryCount ?? 0) > 0, label: "Pelo menos 1 categoria", href: "/app/categorias" },
    { done: (itemCount ?? 0) > 0 && (photoCount ?? 0) > 0, label: "Primeira cesta com foto", href: "/app/cestas/nova" },
    { done: published, label: "Vitrine publicada", href: "#publicar" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-6">
      <FlashFromUrl message={typeof sp.ok === "string" ? sp.ok : null} />
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Minha vitrine</h1>
        <p className="mt-1 text-sm text-body">Tudo o que seu cliente vê quando abre o seu link.</p>
      </div>

      {catalog.status === "suspended" && (
        <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Sua vitrine saiu do ar porque o acesso foi encerrado (reembolso ou cancelamento). Seus dados continuam salvos.
        </div>
      )}

      <section id="publicar" className={`card overflow-hidden ${published ? "border-success/30" : ""}`}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-body">Situação</p>
            <p className="mt-1 font-display text-xl font-semibold">
              {published ? "Sua vitrine está no ar 🎉" : "Sua vitrine ainda não foi publicada"}
            </p>
            <p className="mt-1 text-sm text-body">
              {published
                ? "Envie o link para seus clientes pelo WhatsApp e Instagram."
                : "Quando estiver pronta, publique para o link funcionar para os clientes."}
            </p>
          </div>
          {catalog.status !== "suspended" && (
            <ActionForm action={setPublished}>
              <input type="hidden" name="publish" value={published ? "0" : "1"} />
              <SubmitButton className={published ? "btn-secondary w-full sm:w-auto" : "btn-primary w-full sm:w-auto"} pendingText={published ? "Tirando do ar..." : "Publicando..."}>
                {published ? "Tirar do ar" : "Publicar minha vitrine"}
              </SubmitButton>
            </ActionForm>
          )}
        </div>
        {published && (
          <div className="border-t border-line bg-bg px-5 py-4">
            <CopyLink url={url} />
          </div>
        )}
      </section>

      {doneCount < steps.length && (
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Deixe sua vitrine pronta</h2>
            <span className="text-xs font-semibold text-body">{doneCount}/{steps.length}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-deep">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <ul className="mt-4 divide-y divide-line">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3 py-3 text-sm">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${s.done ? "bg-success text-white" : "border-2 border-line"}`}>
                    {s.done ? "✓" : ""}
                  </span>
                  <span className={s.done ? "text-body line-through" : "font-medium text-ink"}>{s.label}</span>
                  {!s.done && <span className="ml-auto text-primary">→</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/app/cestas" className="card p-5 transition hover:border-primary/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-body">Cestas na vitrine</p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {visibleCount ?? 0}
            {limit ? <span className="text-base font-normal text-body"> / {limit}</span> : null}
          </p>
          <p className="mt-1 text-xs text-body">{itemCount ?? 0} cadastradas no total</p>
        </Link>
        {stats ? (
          <>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-body">Visitas (30 dias)</p>
              <p className="mt-2 font-display text-3xl font-semibold">{stats.views}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-body">Cliques no WhatsApp</p>
              <p className="mt-2 font-display text-3xl font-semibold">{stats.clicks}</p>
            </div>
          </>
        ) : (
          <Link href="/app/cestas/nova" className="card flex items-center justify-center gap-2 p-5 font-semibold text-primary transition hover:border-primary/40 sm:col-span-2">
            + Adicionar {vertical.vocabulary.item.singular}
          </Link>
        )}
      </section>
      {stats && (
        <Link href="/app/cestas/nova" className="btn-primary w-full sm:w-auto">+ Adicionar {vertical.vocabulary.item.singular}</Link>
      )}
    </div>
  );
}
