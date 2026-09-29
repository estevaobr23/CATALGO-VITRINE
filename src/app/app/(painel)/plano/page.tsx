import Link from "next/link";
import { formatCents } from "@/core/catalog/format";
import { CheckoutButton } from "@/vertical/landing/CheckoutButton";
import { offer, supportEmail } from "@/vertical/offer";
import { painelCtx } from "../ctx";

/**
 * Upgrade dentro do app. O plano efetivo é sempre o entitlement de MAIOR rank:
 * comprando a oferta do Profissional com o mesmo e-mail, o webhook cria o novo
 * direito e a pessoa sobe sozinha — sem cancelar nada, sem suporte.
 */
export default async function PlanPage() {
  const { plan, user } = await painelCtx();
  const pro = offer.plans.find((p) => p.key === "profissional")!;
  const isPro = plan.key === "profissional";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Meu plano</h1>
        <p className="mt-1 text-sm text-body">
          Você está no plano <b className="text-ink">{plan.name}</b>.
        </p>
      </div>

      {isPro ? (
        <section className="card p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-2xl">✓</div>
          <h2 className="font-display text-xl font-semibold">Você tem tudo liberado</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-body">
            Cestas ilimitadas, depoimentos, vídeo, todas as seções, sem a marca CestaVitrine e com contador de visitas.
          </p>
          <Link href="/app/aparencia" className="btn-primary mt-5">Montar minha vitrine</Link>
        </section>
      ) : (
        <>
          <section className="card overflow-hidden">
            <div className="bg-primary px-6 py-5 text-center text-white">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-on-dark">Upgrade</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">Plano {pro.name}</h2>
              <p className="mt-1 text-sm text-white/85">{pro.tagline}</p>
            </div>
            <div className="p-6 text-center">
              <p className="font-display text-4xl font-bold text-buy-dark">{formatCents(pro.priceCents)}</p>
              <p className="mt-1 text-sm text-body">{offer.paymentNote}</p>

              <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left text-sm">
                {pro.includes.map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-buy-dark text-[11px] font-bold text-white">✓</span>
                    {t}
                  </li>
                ))}
              </ul>

              <CheckoutButton
                url={pro.checkoutUrl}
                className="btn-primary mt-6 w-full bg-buy-dark hover:brightness-110 sm:w-auto sm:px-10"
              >
                FAZER UPGRADE AGORA
              </CheckoutButton>

              <p className="mx-auto mt-4 max-w-sm text-xs text-body">
                Use o mesmo e-mail desta conta (<b className="text-ink">{user.email}</b>) na compra. O acesso é liberado
                automaticamente e sua vitrine continua igual — nada se perde.
              </p>
            </div>
          </section>

          <section className="card p-5 text-sm">
            <h2 className="font-semibold">O que muda no seu plano atual</h2>
            <ul className="mt-3 space-y-2 text-body">
              {plan.limits.max_visible_items && (
                <li>
                  • Hoje você pode ter <b className="text-ink">{plan.limits.max_visible_items} cestas</b> no ar. No Profissional
                  ficam ilimitadas.
                </li>
              )}
              <li>• Depoimentos e vídeo na vitrine ficam disponíveis.</li>
              <li>• Sai a marca CestaVitrine do rodapé da sua vitrine.</li>
              <li>• Você passa a ver quantas pessoas abriram sua vitrine e clicaram no WhatsApp.</li>
            </ul>
            {supportEmail && (
              <p className="mt-4 text-xs">
                Dúvida antes de decidir? <a href={`mailto:${supportEmail}`} className="font-semibold text-primary">{supportEmail}</a>
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
