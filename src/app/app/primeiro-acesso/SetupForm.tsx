"use client";
import { useActionState } from "react";
import { SubmitButton } from "@/core/ui/SubmitButton";
import { createStore } from "./actions";

export function SetupForm({ starterCategories }: { starterCategories: string[] }) {
  const [state, action] = useActionState(createStore, undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="name">Nome da sua marca</label>
        <input id="name" name="name" required maxLength={120} defaultValue={v.name} placeholder="Ex.: Cestas da Ana" className="field" autoFocus />
        <p className="hint">É o nome que o cliente vê no topo da vitrine.</p>
      </div>
      <div>
        <label className="label" htmlFor="whatsapp">WhatsApp para receber pedidos</label>
        <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" required defaultValue={v.whatsapp} placeholder="(11) 99999-8888" className="field" autoComplete="tel" />
        <p className="hint">Com DDD. É para esse número que o botão “Quero esta cesta” manda o cliente.</p>
      </div>
      <div>
        <label className="label" htmlFor="description">Frase de apresentação <span className="font-normal text-body">(opcional)</span></label>
        <textarea id="description" name="description" rows={3} maxLength={500} defaultValue={v.description} placeholder="Cestas especiais para transformar momentos em presentes inesquecíveis." className="field" />
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-line bg-bg p-4 text-sm">
        <input type="checkbox" name="starter" defaultChecked className="mt-0.5 h-5 w-5 accent-[var(--primary)]" />
        <span>
          <b className="text-ink">Criar categorias sugeridas</b>
          <span className="block text-body">{starterCategories.join(", ")}. Você pode mudar depois.</span>
        </span>
      </label>
      {state?.error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p>}
      <SubmitButton className="btn-primary w-full" pendingText="Criando sua vitrine...">Criar minha vitrine</SubmitButton>
    </form>
  );
}
