import Link from "next/link";
import { Logo } from "@/vertical/brand";

export default function StoreNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-3xl">🔎</div>
      <h1 className="font-display text-2xl font-semibold">Vitrine não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-body">
        O endereço pode estar errado ou a loja ainda não publicou a vitrine. Confira o link com quem enviou para você.
      </p>
      <Link href="/" className="mt-10 opacity-70 transition hover:opacity-100">
        <Logo />
      </Link>
    </main>
  );
}
