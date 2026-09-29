import Link from "next/link";
import { ActionForm } from "@/core/ui/ActionForm";
import { SubmitButton } from "@/core/ui/SubmitButton";
import { formatWhatsapp } from "@/core/catalog/format";
import { supportEmail } from "@/vertical/offer";
import { updateBrand } from "../catalog-actions";
import { painelCtx } from "../ctx";

export default async function SettingsPage() {
  const { catalog, user, plan } = await painelCtx();
  const contact = catalog.contact as Record<string, string | undefined>;
  const attrs = catalog.attributes as Record<string, string | undefined>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-body">Informações da sua marca e da sua conta.</p>
      </div>

      <ActionForm action={updateBrand} className="card space-y-4 p-5">
        <h2 className="font-semibold">Sua marca</h2>
        <div>
          <label className="label" htmlFor="name">Nome da marca</label>
          <input id="name" name="name" required maxLength={120} defaultValue={catalog.name} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="whatsapp">WhatsApp para pedidos</label>
          <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" required defaultValue={formatWhatsapp(catalog.whatsapp)} placeholder="(11) 99999-8888" className="field" />
          <p className="hint">O botão “Quero esta cesta” abre uma conversa com este número.</p>
        </div>
        <div>
          <label className="label" htmlFor="description">Frase de apresentação</label>
          <textarea id="description" name="description" rows={3} maxLength={500} defaultValue={catalog.description ?? ""} className="field" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="instagram">Instagram <span className="font-normal text-body">(opcional)</span></label>
            <input id="instagram" name="instagram" maxLength={60} defaultValue={contact.instagram ? `@${contact.instagram}` : ""} placeholder="@suamarca" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="city">Cidade / região <span className="font-normal text-body">(opcional)</span></label>
            <input id="city" name="city" maxLength={120} defaultValue={contact.city ?? ""} placeholder="São Paulo - SP" className="field" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="delivery_info">Entrega e retirada <span className="font-normal text-body">(opcional)</span></label>
          <input id="delivery_info" name="delivery_info" maxLength={300} defaultValue={attrs.delivery_info ?? ""} placeholder="Entregamos em toda a zona sul. Retirada no Jardim Ângela." className="field" />
        </div>
        <SubmitButton>Salvar alterações</SubmitButton>
      </ActionForm>

      <section className="card space-y-3 p-5 text-sm">
        <h2 className="font-semibold">Sua conta</h2>
        <p className="text-body">E-mail: <b className="text-ink">{user.email}</b></p>
        <p className="text-body">
          Plano: <b className="text-ink">{plan.name}</b>
          {plan.limits.max_visible_items ? ` · até ${plan.limits.max_visible_items} cestas na vitrine` : " · cestas ilimitadas"}
          {" "}
          <Link href="/app/plano" className="font-semibold text-primary hover:underline">
            {plan.key === "profissional" ? "ver detalhes" : "fazer upgrade"}
          </Link>
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/recuperar-senha" className="btn-secondary">Trocar senha</Link>
          <form action="/auth/sair" method="post">
            <button className="btn-danger">Sair da conta</button>
          </form>
        </div>
        {supportEmail && (
          <p className="pt-2 text-xs text-body">Suporte: <a href={`mailto:${supportEmail}`} className="font-semibold text-primary">{supportEmail}</a></p>
        )}
      </section>
    </div>
  );
}
