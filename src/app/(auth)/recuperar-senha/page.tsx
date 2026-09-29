import type { Metadata } from "next";
import { ResetRequestForm } from "../AuthForms";

export const metadata: Metadata = { title: "Recuperar senha · CestaVitrine", robots: { index: false } };

export default function ResetPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Esqueceu a senha?</h1>
      <p className="mb-6 mt-1 text-sm text-body">Enviamos um link para você criar uma nova.</p>
      <ResetRequestForm />
    </>
  );
}
