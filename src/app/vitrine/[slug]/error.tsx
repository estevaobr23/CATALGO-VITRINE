"use client";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
      <h1 className="font-display text-2xl font-semibold">Não conseguimos abrir a vitrine</h1>
      <p className="mt-2 max-w-sm text-sm text-body">Pode ser a sua internet. Tente de novo em instantes.</p>
      <button onClick={reset} className="btn-primary mt-6">Tentar de novo</button>
    </main>
  );
}
