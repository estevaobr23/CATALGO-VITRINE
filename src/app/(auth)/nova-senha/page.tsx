import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/core/auth/guard";
import { NewPasswordForm } from "../AuthForms";

export const metadata: Metadata = { title: "Nova senha · CestaVitrine", robots: { index: false } };

export default async function NewPasswordPage() {
  // chega aqui pelo link do e-mail, que já abriu a sessão em /auth/callback
  if (!(await getUser())) redirect("/recuperar-senha");
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Crie uma nova senha</h1>
      <p className="mb-6 mt-1 text-sm text-body">Depois disso você já entra na sua vitrine.</p>
      <NewPasswordForm />
    </>
  );
}
