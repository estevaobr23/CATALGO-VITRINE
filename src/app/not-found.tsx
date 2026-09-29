import Link from "next/link";
import { Logo } from "@/vertical/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
      <Logo className="mb-8" />
      <h1 className="font-display text-2xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-body">O link pode estar incorreto ou a página foi removida.</p>
      <Link href="/" className="btn-primary mt-6">Ir para o início</Link>
    </main>
  );
}
