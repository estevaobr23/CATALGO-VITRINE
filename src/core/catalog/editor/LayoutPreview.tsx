"use client";
import { readableOn, themeStyle } from "../theme";
import type { CatalogTheme } from "../types";
import { visibleSections, type CatalogLayout, type SectionDef } from "../layout";

/**
 * Prévia ao vivo dentro de um celular: reflete ordem das seções, cores e
 * estilo na hora. É o que faz a pessoa entender que está montando a vitrine.
 */
export function LayoutPreview({
  defs,
  layout,
  planFeatures,
  theme,
  storeName,
  logoUrl,
  coverUrl,
  sampleItems,
  sampleCategories,
  ctaLabel,
}: {
  defs: SectionDef[];
  layout: CatalogLayout;
  planFeatures: string[];
  theme: Required<CatalogTheme>;
  storeName: string;
  logoUrl: string | null;
  coverUrl: string | null;
  sampleItems: { name: string; price: string; photo: string | null }[];
  sampleCategories: string[];
  ctaLabel: string;
}) {
  const byId = new Map(defs.map((d) => [d.id, d]));
  const shown = visibleSections(layout, defs, planFeatures);
  const onPrimary = readableOn(theme.primary);

  return (
    <div className="mx-auto w-full max-w-[17rem]">
      <div className="relative rounded-[2.2rem] border-[9px] border-ink bg-ink shadow-xl">
        <div className="absolute left-1/2 top-1.5 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-ink" aria-hidden />
        <div
          style={themeStyle(theme)}
          className="h-[27rem] overflow-y-auto overscroll-contain rounded-[1.6rem] bg-[#fbf9f7] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {shown.map((state) => {
            const def = byId.get(state.id);
            if (!def) return null;
            const d = state.data ?? {};
            return (
              <div key={state.id} className="animate-fade-up">
                {state.id === "header" && (
                  <header>
                    <div className="h-16 w-full" style={{ background: coverUrl ? `center/cover url(${coverUrl})` : `color-mix(in srgb, ${theme.secondary} 45%, white)` }} />
                    <div className="-mt-6 px-3 pb-3 text-center">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white shadow-sm">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- prévia local, sem otimização
                          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-base font-bold" style={{ color: theme.primary, fontFamily: "var(--store-heading)" }}>
                            {storeName.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <p className="mt-1.5 text-[13px] font-semibold leading-tight text-ink" style={{ fontFamily: "var(--store-heading)" }}>
                        {storeName}
                      </p>
                    </div>
                  </header>
                )}

                {state.id === "banner" && (
                  <p className="px-3 py-2 text-center text-[10px] font-semibold" style={{ background: theme.primary, color: onPrimary }}>
                    {d.texto || "Seu aviso em destaque aparece aqui"}
                  </p>
                )}

                {state.id === "categorias" && (
                  <div className="flex gap-1.5 overflow-hidden px-3 py-2">
                    {["Todas", ...sampleCategories.slice(0, 2)].map((c, i) => (
                      <span
                        key={c}
                        className="shrink-0 whitespace-nowrap px-2.5 py-1 text-[9px] font-semibold"
                        style={
                          i === 0
                            ? { background: theme.primary, color: onPrimary, borderRadius: 999 }
                            : { background: "white", color: "#241b18", border: "1px solid rgba(0,0,0,.1)", borderRadius: 999 }
                        }
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {state.id === "cestas" && (
                  <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
                    {sampleItems.slice(0, 4).map((item, i) => (
                      <div key={i} className="overflow-hidden bg-white shadow-sm" style={{ borderRadius: "var(--store-radius)" }}>
                        <div className="aspect-square bg-[#f1ebe5]" style={item.photo ? { background: `center/cover url(${item.photo})` } : undefined} />
                        <div className="p-1.5">
                          <p className="truncate text-[9px] font-semibold text-ink">{item.name}</p>
                          <p className="text-[9px] font-bold" style={{ color: theme.primary }}>{item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {state.id === "galeria" && (
                  <div className="px-3 pb-3">
                    <p className="mb-1.5 text-[10px] font-semibold text-ink" style={{ fontFamily: "var(--store-heading)" }}>Galeria</p>
                    <div className="flex gap-1.5">
                      {sampleItems.slice(0, 3).map((item, i) => (
                        <div key={i} className="h-12 flex-1 rounded-md bg-[#f1ebe5]" style={item.photo ? { background: `center/cover url(${item.photo})` } : undefined} />
                      ))}
                    </div>
                  </div>
                )}

                {state.id === "depoimentos" && (
                  <div className="px-3 pb-3">
                    <p className="mb-1.5 text-[10px] font-semibold text-ink" style={{ fontFamily: "var(--store-heading)" }}>O que dizem os clientes</p>
                    <div className="rounded-lg bg-white p-2 shadow-sm">
                      <p className="text-[8px]" style={{ color: theme.secondary }}>★★★★★</p>
                      <p className="mt-0.5 text-[9px] leading-snug text-body">“A cesta chegou linda, todo mundo amou!”</p>
                      <p className="mt-1 text-[8px] font-semibold text-ink">Juliana M.</p>
                    </div>
                  </div>
                )}

                {state.id === "video" && (
                  <div className="px-3 pb-3">
                    <div className="flex aspect-video items-center justify-center rounded-lg bg-ink/90">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[10px] text-ink">▶</span>
                    </div>
                  </div>
                )}

                {state.id === "sobre" && (
                  <div className="px-3 pb-3">
                    <p className="text-[10px] font-semibold text-ink" style={{ fontFamily: "var(--store-heading)" }}>{d.titulo || "Sobre a nossa loja"}</p>
                    <p className="mt-0.5 line-clamp-3 text-[9px] leading-snug text-body">
                      {d.texto || "Conte aqui a sua história: desde quando você monta cestas e o que faz as suas serem especiais."}
                    </p>
                  </div>
                )}

                {state.id === "duvidas" && (
                  <div className="space-y-1 px-3 pb-3">
                    <p className="text-[10px] font-semibold text-ink" style={{ fontFamily: "var(--store-heading)" }}>Perguntas frequentes</p>
                    {[d.p1 || "Com quanto tempo preciso encomendar?", d.p2 || "Vocês entregam em qual região?"].map((q) => (
                      <p key={q} className="flex items-center justify-between rounded-md bg-white px-2 py-1 text-[9px] text-ink shadow-sm">
                        <span className="truncate">{q}</span>
                        <span style={{ color: theme.primary }}>+</span>
                      </p>
                    ))}
                  </div>
                )}

                {state.id === "contato" && (
                  <div className="px-3 pb-3 text-center">
                    <p className="text-[9px] text-body">📍 Sua cidade{d.horario ? ` · ${d.horario}` : ""}</p>
                    <span
                      className="mt-1.5 inline-block px-3 py-1.5 text-[9px] font-bold text-white"
                      style={{ background: "#1faa55", borderRadius: "var(--store-radius)" }}
                    >
                      {ctaLabel}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          <div className="h-3" />
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-body">Prévia · role para ver tudo</p>
    </div>
  );
}
