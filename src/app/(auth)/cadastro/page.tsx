import type { Metadata } from "next";
import { SignUpForm } from "../AuthForms";

export const metadata: Metadata = { title: "Criar conta · CestaVitrine", robots: { index: false } };

export default function SignUpPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Criar sua conta</h1>
      <p className="mb-6 mt-1 text-sm text-body">Leva 1 minuto. Depois é só montar sua vitrine.</p>
      <SignUpForm />
    </>
  );
}
