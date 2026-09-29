"use client";
import { useToast } from "@/core/ui/toast";

export function CopyLink({ url, big = false }: { url: string; big?: boolean }) {
  const toast = useToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiado!");
    } catch {
      toast("Não deu para copiar. Selecione o link e copie manualmente.", "error");
    }
  }
  const display = url.replace(/^https?:\/\//, "");
  return (
    <div className={big ? "space-y-3" : "flex flex-col gap-2 sm:flex-row sm:items-center"}>
      <p className={`min-w-0 flex-1 select-all rounded-xl border border-line bg-white px-3 py-2.5 font-medium text-ink [overflow-wrap:anywhere] ${big ? "text-[15px]" : "text-sm"}`}>
        {display}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className="btn-primary flex-1 sm:flex-none">
          Copiar link
        </button>
        <a href={url} target="_blank" rel="noopener" className="btn-secondary flex-1 sm:flex-none">
          Ver minha vitrine
        </a>
      </div>
    </div>
  );
}
