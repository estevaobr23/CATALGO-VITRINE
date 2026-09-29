import Link from "next/link";
import { library } from "@/vertical/library";

export default function IdeasPage() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/app/cestas/nova" className="text-sm text-body hover:text-ink">← Adicionar cesta</Link>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Ideias de cestas</h1>
        <p className="mt-1 text-sm text-body">Escolha uma combinação, use como modelo e ajuste do seu jeito: sua foto, seus itens, seu preço.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {library.map((idea) => (
          <li key={idea.slug} className="card flex flex-col p-5">
            <span className="self-start rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-ink">{idea.occasion}</span>
            <h2 className="mt-2 font-display text-lg font-semibold">{idea.name}</h2>
            <p className="text-sm text-body">{idea.summary}</p>
            <ul className="mt-3 flex-1 space-y-1 text-sm text-ink">
              {idea.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <Link href={`/app/cestas/nova?modelo=${idea.slug}`} className="btn-secondary mt-4">Usar como modelo</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
