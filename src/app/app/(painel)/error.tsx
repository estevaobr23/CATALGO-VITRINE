"use client";
import { useEffect } from "react";

export default function PainelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="card mx-auto max-w-md p-6 text-center">
      <h1 className="font-display text-xl font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-sm text-body">Não conseguimos carregar esta tela. Pode ser a internet ou sua sessão que expirou.</p>
      <div className="mt-5 flex flex-col gap-2">
        <button onClick={reset} className="btn-primary">Tentar de novo</button>
        <a href="/login" className="btn-secondary">Entrar novamente</a>
      </div>
    </div>
  );
}
