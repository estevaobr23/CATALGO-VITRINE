import type { Metadata } from "next";
import { safeNext } from "@/core/auth/guard";
import { LoginForm } from "../AuthForms";

export const metadata: Metadata = { title: "Entrar · CestaVitrine", robots: { index: false } };

const ERRORS: Record<string, string> = {
  link: "O link expirou ou já foi usado. Se você já confirmou o e-mail, é só entrar.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const redirectTo = safeNext(typeof sp.redirect === "string" ? sp.redirect : null);
  const error = typeof sp.erro === "string" ? ERRORS[sp.erro] : null;
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Entrar na sua vitrine</h1>
      <p className="mb-6 mt-1 text-sm text-body">Use o e-mail e a senha da sua conta.</p>
      {error && <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm">{error}</p>}
      <LoginForm redirectTo={redirectTo} />
    </>
  );
}
