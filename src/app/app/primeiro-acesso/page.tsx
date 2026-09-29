import { redirect } from "next/navigation";
import { getMyCatalog, requireAccess } from "@/core/auth/guard";
import { Logo } from "@/vertical/brand";
import { vertical } from "@/vertical/config";
import { SetupForm } from "./SetupForm";
import { Steps } from "../Steps";

export default async function FirstAccessPage() {
  const access = await requireAccess(vertical.productKey);
  if (await getMyCatalog(access.productId, access.user.id)) redirect("/app");
  const firstName = String(access.user.user_metadata?.name ?? "").split(" ")[0];

  return (
    <main className="flex min-h-dvh flex-col items-center bg-bg px-4 py-8">
      <Logo className="mb-6" />
      <div className="w-full max-w-lg">
        <Steps current={1} />
        <div className="card mt-4 p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold">{firstName ? `Boas-vindas, ${firstName}!` : "Boas-vindas!"}</h1>
          <p className="mb-6 mt-1 text-sm text-body">Vamos montar sua vitrine. Primeiro, as informações da sua marca.</p>
          <SetupForm starterCategories={vertical.starterCategories} />
        </div>
      </div>
    </main>
  );
}

