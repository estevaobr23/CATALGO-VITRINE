import { ActionForm } from "@/core/ui/ActionForm";
import { SubmitButton } from "@/core/ui/SubmitButton";
import { setPublished, updateSlug } from "../catalog-actions";
import { CopyLink } from "../CopyLink";
import { painelCtx } from "../ctx";
import { storeUrl } from "../store-url";

export default async function MyLinkPage() {
  const { catalog } = await painelCtx();
  const url = await storeUrl(catalog.slug);
  const base = url.slice(0, url.length - catalog.slug.length);
  const published = catalog.status === "published";
  const shareText = `Conheça as cestas da ${catalog.name}! Veja fotos, preços e peça pelo WhatsApp: ${url}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Meu link</h1>
        <p className="mt-1 text-sm text-body">É esse link que você envia para os clientes e coloca na bio do Instagram.</p>
      </div>

      <section className="card space-y-4 p-5">
        <CopyLink url={url} big />
        {published ? (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener"
            className="btn w-full bg-wa-dark text-white hover:brightness-110 sm:w-auto"
          >
            Enviar meu link pelo WhatsApp
          </a>
        ) : (
          <div className="rounded-xl bg-accent-soft p-4 text-sm">
            <p className="font-semibold text-ink">Seu link ainda não está funcionando para os clientes.</p>
            <p className="mt-1 text-body">Publique a vitrine para ele abrir.</p>
            {catalog.status !== "suspended" && (
              <ActionForm action={setPublished} className="mt-3">
                <input type="hidden" name="publish" value="1" />
                <SubmitButton className="btn-primary" pendingText="Publicando...">Publicar agora</SubmitButton>
              </ActionForm>
            )}
          </div>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <div>
          <h2 className="font-semibold">Personalizar o endereço</h2>
          <p className="text-xs text-body">
            Use o nome da sua marca, sem espaços. Atenção: se você já divulgou o link, o endereço antigo deixa de funcionar.
          </p>
        </div>
        <ActionForm action={updateSlug} className="space-y-3">
          <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <span className="hidden items-center bg-bg-deep px-3 text-sm text-body sm:flex">{base.replace(/^https?:\/\//, "")}</span>
            <input
              name="slug"
              defaultValue={catalog.slug}
              required
              minLength={3}
              maxLength={48}
              className="min-w-0 flex-1 px-3 py-3 text-base outline-none"
              aria-label="Endereço da vitrine"
            />
          </div>
          <SubmitButton className="btn-secondary">Salvar endereço</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
