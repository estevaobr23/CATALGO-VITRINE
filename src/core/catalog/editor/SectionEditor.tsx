"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SectionIcon } from "@/core/ui/SectionIcon";
import type { CatalogLayout, SectionDef, SectionState } from "../layout";

type Props = {
  defs: SectionDef[];
  layout: CatalogLayout;
  planFeatures: string[];
  onChange: (layout: CatalogLayout) => void;
  upgradeHref: string;
};

export function SectionEditor({ defs, layout, planFeatures, onChange, upgradeHref }: Props) {
  const byId = new Map(defs.map((d) => [d.id, d]));
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [moved, setMoved] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const active = layout.sections.filter((s) => s.enabled);
  const available = layout.sections.filter((s) => !s.enabled);

  const locked = useCallback(
    (def: SectionDef) => !!def.feature && !planFeatures.includes(def.feature),
    [planFeatures],
  );

  function update(sections: SectionState[]) {
    onChange({ ...layout, sections });
  }

  function move(id: string, dir: -1 | 1) {
    // reordena só entre as seções LIGADAS: mover algo para o meio das
    // desligadas confundiria (a pessoa vê a lista de cima como "a vitrine")
    const enabledIds = active.map((s) => s.id);
    const i = enabledIds.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= enabledIds.length) return;
    const target = enabledIds[j];
    const full = [...layout.sections];
    const fi = full.findIndex((s) => s.id === id);
    const fj = full.findIndex((s) => s.id === target);
    [full[fi], full[fj]] = [full[fj], full[fi]];
    update(full);
    setMoved(id);
    setTimeout(() => setMoved(null), 420);
  }

  function toggle(id: string, enabled: boolean) {
    update(layout.sections.map((s) => (s.id === id ? { ...s, enabled } : s)));
    if (enabled) {
      setDrawer(false);
      const def = byId.get(id);
      if (def?.fields?.length) setEditing(id);
      setMoved(id);
      setTimeout(() => {
        listRef.current?.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        setMoved(null);
      }, 420);
    }
  }

  function setField(id: string, key: string, value: string) {
    update(layout.sections.map((s) => (s.id === id ? { ...s, data: { ...s.data, [key]: value } } : s)));
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-line p-5">
        <div>
          <h2 className="font-semibold">Seções da vitrine</h2>
          <p className="text-xs text-body">Ligue o que quiser mostrar e use as setas para mudar a ordem.</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">{active.length} no ar</span>
      </header>

      <ul ref={listRef} className="divide-y divide-line">
        {active.map((state, idx) => {
          const def = byId.get(state.id);
          if (!def) return null;
          const isOpen = editing === state.id;
          return (
            <li
              key={state.id}
              data-section={state.id}
              className={`transition-all duration-300 ${moved === state.id ? "bg-primary-soft/60" : "bg-white"}`}
            >
              <div className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-deep text-primary">
                    <SectionIcon name={def.icon} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
                      {def.name}
                      {def.locked && <span className="shrink-0 text-[10px] font-medium text-body">· fixa</span>}
                    </p>
                    <p className="truncate text-xs text-body">{summarize(def, state)}</p>
                  </div>
                  {/* no computador as setas ficam à direita; no celular vão para a linha de baixo */}
                  <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
                    <Arrows idx={idx} total={active.length} name={def.name} onMove={(d) => move(state.id, d)} />
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1 sm:mt-1.5 sm:justify-end">
                  <div className="flex items-center gap-0.5 sm:hidden">
                    <Arrows idx={idx} total={active.length} name={def.name} onMove={(d) => move(state.id, d)} />
                  </div>
                  <span className="flex-1 sm:hidden" />
                  {(def.fields?.length || def.managedAt) && (
                    <button
                      type="button"
                      onClick={() => setEditing(isOpen ? null : state.id)}
                      className="btn-ghost h-9 px-2.5 text-xs"
                      aria-expanded={isOpen}
                    >
                      {isOpen ? "Fechar" : "Editar"}
                    </button>
                  )}
                  {!def.locked && (
                    <button
                      type="button"
                      onClick={() => toggle(state.id, false)}
                      className="btn-ghost h-9 px-2.5 text-xs text-body"
                      aria-label={`Ocultar ${def.name}`}
                    >
                      <EyeOff /> <span className="sm:hidden">Ocultar</span>
                    </button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="animate-fade-up space-y-3 border-t border-line bg-bg px-4 py-4">
                  {def.fields?.map((field) => (
                    <div key={field.key}>
                      <label className="label" htmlFor={`${state.id}-${field.key}`}>{field.label}</label>
                      {field.type === "textarea" ? (
                        <textarea
                          id={`${state.id}-${field.key}`}
                          rows={3}
                          maxLength={field.maxLength}
                          value={state.data?.[field.key] ?? ""}
                          onChange={(e) => setField(state.id, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="field"
                        />
                      ) : (
                        <input
                          id={`${state.id}-${field.key}`}
                          type={field.type === "url" ? "url" : "text"}
                          inputMode={field.type === "url" ? "url" : undefined}
                          maxLength={field.maxLength}
                          value={state.data?.[field.key] ?? ""}
                          onChange={(e) => setField(state.id, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="field"
                        />
                      )}
                      {field.hint && <p className="hint">{field.hint}</p>}
                    </div>
                  ))}
                  {def.managedAt && (
                    <Link href={def.managedAt.href} className="btn-secondary w-full">
                      {def.managedAt.label} →
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="border-t border-line p-4">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-3.5 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary-soft/50"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-base text-white transition-transform duration-300 group-hover:rotate-90">
            +
          </span>
          Adicionar seção
          {available.length > 0 && <span className="text-xs font-normal text-body">({available.length} disponíveis)</span>}
        </button>
      </div>

      {drawer && (
        <SectionDrawer
          items={available.map((s) => byId.get(s.id)).filter(Boolean) as SectionDef[]}
          locked={locked}
          upgradeHref={upgradeHref}
          onPick={(id) => toggle(id, true)}
          onClose={() => setDrawer(false)}
        />
      )}
    </section>
  );
}

function Arrows({ idx, total, name, onMove }: { idx: number; total: number; name: string; onMove: (dir: -1 | 1) => void }) {
  return (
    <>
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={idx === 0}
        className="btn-ghost h-9 w-9 px-0 text-base disabled:opacity-25"
        aria-label={`Mover ${name} para cima`}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={idx === total - 1}
        className="btn-ghost h-9 w-9 px-0 text-base disabled:opacity-25"
        aria-label={`Mover ${name} para baixo`}
      >
        ↓
      </button>
    </>
  );
}

function SectionDrawer({
  items,
  locked,
  upgradeHref,
  onPick,
  onClose,
}: {
  items: SectionDef[];
  locked: (def: SectionDef) => boolean;
  upgradeHref: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Adicionar seção">
      <button type="button" className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Fechar" />
      <div className="animate-sheet-up relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Adicionar seção</h3>
            <p className="text-xs text-body">Toque para colocar na sua vitrine.</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost h-9 w-9 px-0 text-xl" aria-label="Fechar">×</button>
        </header>

        <div className="overflow-y-auto overscroll-contain p-4">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-body">
              Todas as seções já estão na sua vitrine. 🎉
            </p>
          ) : (
            <ul className="grid gap-2.5">
              {items.map((def, i) => {
                const isLocked = locked(def);
                return (
                  <li key={def.id} style={{ animationDelay: `${i * 45}ms` }} className="animate-fade-up">
                    {isLocked ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-line bg-bg-deep/60 p-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-body">
                          <SectionIcon name={def.icon} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 font-semibold text-ink">
                            {def.name}
                            <Lock />
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-body">{def.description}</p>
                          <Link href={upgradeHref} className="mt-2 inline-block text-xs font-bold text-primary hover:underline">
                            Disponível no plano Profissional →
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPick(def.id)}
                        className="flex w-full items-start gap-3 rounded-2xl border border-line bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[.99]"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                          <SectionIcon name={def.icon} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink">{def.name}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-body">{def.description}</p>
                        </div>
                        <span className="mt-1 shrink-0 text-lg text-primary">+</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function summarize(def: SectionDef, state: SectionState): string {
  if (def.managedAt) return def.description;
  const first = def.fields?.find((f) => state.data?.[f.key]);
  if (first) return state.data![first.key];
  if (def.fields?.length) return "Toque em Editar para escrever o conteúdo";
  return def.description;
}

function EyeOff() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
      <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.6A9.6 9.6 0 0 1 12 5c5 0 9 4.5 9 7 0 .9-.5 2-1.4 3.1M6.2 6.6C3.9 8.1 3 10.2 3 12c0 2.5 4 7 9 7 1.3 0 2.5-.3 3.6-.8" />
    </svg>
  );
}

function Lock() {
  return (
    <svg className="h-3.5 w-3.5 text-body" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    </svg>
  );
}
