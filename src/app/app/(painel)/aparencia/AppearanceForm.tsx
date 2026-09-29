"use client";
import { useState } from "react";
import { ActionForm } from "@/core/ui/ActionForm";
import { ImageField } from "@/core/ui/ImageField";
import { SubmitButton } from "@/core/ui/SubmitButton";
import { publicMediaUrl } from "@/core/supabase/env";
import { themeStyle } from "@/core/catalog/theme";
import type { CatalogTheme } from "@/core/catalog/types";
import type { CatalogLayout, SectionDef } from "@/core/catalog/layout";
import { SectionEditor } from "@/core/catalog/editor/SectionEditor";
import { LayoutPreview } from "@/core/catalog/editor/LayoutPreview";
import type { VerticalConfig } from "@/core/vertical-types";
import { updateAppearance } from "../catalog-actions";

export function AppearanceForm({
  catalogId,
  name,
  logoPath,
  coverPath,
  theme,
  palettes,
  styles,
  onboarding,
  sections,
  layout: initialLayout,
  planFeatures,
  sampleItems,
  sampleCategories,
  ctaLabel,
}: {
  catalogId: string;
  name: string;
  logoPath: string | null;
  coverPath: string | null;
  theme: Required<CatalogTheme>;
  palettes: VerticalConfig["palettes"];
  styles: VerticalConfig["styles"];
  onboarding: boolean;
  sections: SectionDef[];
  layout: CatalogLayout;
  planFeatures: string[];
  sampleItems: { name: string; price: string; photo: string | null }[];
  sampleCategories: string[];
  ctaLabel: string;
}) {
  const [primary, setPrimary] = useState(theme.primary);
  const [secondary, setSecondary] = useState(theme.secondary);
  const [style, setStyle] = useState(theme.style);
  const [layout, setLayout] = useState(initialLayout);
  const [logo, setLogo] = useState(logoPath);
  const [cover, setCover] = useState(coverPath);

  const preview = { primary, secondary, style };

  return (
    <ActionForm action={updateAppearance} className="space-y-6">
      {onboarding && <input type="hidden" name="next" value="primeira-cesta" />}
      <input type="hidden" name="primary" value={primary} />
      <input type="hidden" name="secondary" value={secondary} />
      <input type="hidden" name="layout" value={JSON.stringify(layout)} />

      <div className="lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-6">
        <div className="space-y-6">
          <section className="card grid gap-6 p-5 sm:grid-cols-[auto_1fr]">
            <ImageField
              catalogId={catalogId}
              folder="logo"
              name="logo_path"
              initialPath={logoPath}
              label="Logo"
              shape="round"
              emptyText="Logo"
              onChange={setLogo}
            />
            <ImageField
              catalogId={catalogId}
              folder="cover"
              name="cover_path"
              initialPath={coverPath}
              label="Foto de capa (opcional)"
              emptyText="Uma foto bonita das suas cestas para o topo"
              onChange={setCover}
            />
          </section>

          <SectionEditor
            defs={sections}
            layout={layout}
            planFeatures={planFeatures}
            onChange={setLayout}
            upgradeHref="/app/plano"
          />

          <section className="card space-y-4 p-5">
            <div>
              <h2 className="font-semibold">Cores</h2>
              <p className="text-xs text-body">Escolha uma combinação pronta ou use as cores da sua marca.</p>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {palettes.map((p) => {
                const active = p.primary === primary && p.secondary === secondary;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setPrimary(p.primary);
                      setSecondary(p.secondary);
                    }}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-medium transition ${active ? "border-primary ring-2 ring-primary/20" : "border-line"}`}
                    aria-pressed={active}
                  >
                    <span className="flex overflow-hidden rounded-full">
                      <span className="h-7 w-4" style={{ background: p.primary }} />
                      <span className="h-7 w-4" style={{ background: p.secondary }} />
                    </span>
                    {p.name}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm">
                <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent" />
                <span><b className="block text-ink">Cor principal</b><span className="text-xs text-body">botões e destaques</span></span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm">
                <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent" />
                <span><b className="block text-ink">Cor de apoio</b><span className="text-xs text-body">detalhes e fundo</span></span>
              </label>
            </div>
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">Estilo</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {styles.map((s) => (
                <label key={s.id} className={`cursor-pointer rounded-xl border p-3 text-sm transition ${style === s.id ? "border-primary bg-primary-soft" : "border-line"}`}>
                  <input type="radio" name="style" value={s.id} checked={style === s.id} onChange={() => setStyle(s.id)} className="sr-only" />
                  <b className={`block text-ink ${s.id === "classico" ? "font-serif" : ""}`}>{s.name}</b>
                  <span className="text-xs text-body">{s.description}</span>
                </label>
              ))}
            </div>
          </section>

          {/* prévia no celular: fica no fluxo, logo abaixo do editor */}
          <section className="card p-5 lg:hidden">
            <h2 className="mb-3 font-semibold">Prévia da sua vitrine</h2>
            <div style={themeStyle(preview)}>
              <LayoutPreview
                defs={sections}
                layout={layout}
                planFeatures={planFeatures}
                theme={preview}
                storeName={name}
                logoUrl={publicMediaUrl(logo)}
                coverUrl={publicMediaUrl(cover)}
                sampleItems={sampleItems}
                sampleCategories={sampleCategories}
                ctaLabel={ctaLabel}
              />
            </div>
          </section>
        </div>

        {/* no computador a prévia acompanha a rolagem */}
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:w-[19rem]">
          <div className="card p-4">
            <h2 className="mb-3 text-center font-semibold">Prévia da sua vitrine</h2>
            <LayoutPreview
              defs={sections}
              layout={layout}
              planFeatures={planFeatures}
              theme={preview}
              storeName={name}
              logoUrl={publicMediaUrl(logo)}
              coverUrl={publicMediaUrl(cover)}
              sampleItems={sampleItems}
              sampleCategories={sampleCategories}
              ctaLabel={ctaLabel}
            />
          </div>
        </aside>
      </div>

      <div className="sticky bottom-20 z-20 -mx-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0">
        <SubmitButton className="btn-primary w-full sm:w-auto">{onboarding ? "Salvar e cadastrar a primeira cesta →" : "Salvar aparência"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
