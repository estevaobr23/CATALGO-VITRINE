import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess } from "@/core/auth/guard";
import { Logo } from "@/vertical/brand";
import { vertical } from "@/vertical/config";
import { supportEmail } from "@/vertical/offer";

export default async function NoAccessPage() {
  const { user, plan } = await getAccess(vertical.productKey);
  if (plan) redirect("/app");

  return (
    <main className="flex min-h-dvh flex-col items-center bg-bg px-4 py-10">
      <Logo className="mb-8" />
      <div className="card w-full max-w-md p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-2xl">🔎</div>
        <h1 className="font-display text-2xl font-semibold">Não encontramos sua compra</h1>
        <p className="mt-3 text-sm leading-relaxed text-body">
          Você entrou com <b className="text-ink">{user.email}</b>, mas não há uma compra ativa do CestaVitrine com este e-mail.
        </p>
        <ul className="mt-5 space-y-2 rounded-xl bg-bg-deep p-4 text-left text-sm text-body">
          <li>• Confira se usou <b className="text-ink">o mesmo e-mail da compra</b>.</li>
          <li>• Pagamento por Pix ou boleto pode levar alguns minutos para aparecer.</li>
          <li>• Se a compra foi reembolsada, o acesso é encerrado.</li>
        </ul>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/app" className="btn-primary">Já paguei, verificar de novo</Link>
          <Link href="/#planos" className="btn-secondary">Ver planos</Link>
          <form action="/auth/sair" method="post">
            <button className="btn-ghost w-full">Entrar com outro e-mail</button>
          </form>
        </div>
        {supportEmail && (
          <p className="mt-6 text-xs text-body">
            Precisa de ajuda? <a className="font-semibold text-primary" href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>
        )}
      </div>
    </main>
  );
}
