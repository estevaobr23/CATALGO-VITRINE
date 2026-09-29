import Link from "next/link";
import { requireCatalog } from "@/core/auth/guard";
import { Logo } from "@/vertical/brand";
import { vertical } from "@/vertical/config";
import { BottomNav, NavIcon, SideNav } from "./Nav";
import { StatusBadge } from "./StatusBadge";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { catalog, plan } = await requireCatalog(vertical.productKey);

  return (
    <div className="min-h-dvh bg-bg md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-6 md:flex">
        <Link href="/app" className="mb-8 px-2">
          <Logo />
        </Link>
        <SideNav />
        <div className="mt-auto space-y-3 px-2">
          <p className="text-xs text-body">
            Plano <b className="text-ink">{plan.name}</b>
          </p>
          <form action="/auth/sair" method="post">
            <button className="text-xs font-medium text-body hover:text-danger">Sair da conta</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur md:px-8">
          <Link href="/app" className="md:hidden" aria-label="Minha vitrine">
            <Logo className="[&>span:last-child]:hidden" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{catalog.name}</p>
            <StatusBadge status={catalog.status} />
          </div>
          {catalog.status === "published" && (
            <a href={`/vitrine/${catalog.slug}`} target="_blank" rel="noopener" className="btn-secondary min-h-9 px-3 py-1.5 text-xs">
              Ver vitrine ↗
            </a>
          )}
          <Link href="/app/configuracoes" className="btn-ghost min-h-9 px-2 md:hidden" aria-label="Configurações">
            <NavIcon name="gear" />
          </Link>
        </header>
        <main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-6 md:px-8 md:pb-12">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
