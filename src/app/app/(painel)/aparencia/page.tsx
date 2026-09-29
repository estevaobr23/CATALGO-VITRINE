import Link from "next/link";
import { normalizeLayout } from "@/core/catalog/layout";
import { formatCents } from "@/core/catalog/format";
import { sanitizeTheme } from "@/core/catalog/theme";
import { publicMediaUrl } from "@/core/supabase/env";
import { vertical } from "@/vertical/config";
import { sections } from "@/vertical/sections";
import { painelCtx } from "../ctx";
import { Steps } from "../../Steps";
import { AppearanceForm } from "./AppearanceForm";

export default async function AppearancePage(props: PageProps<"/app/aparencia">) {
  const sp = await props.searchParams;
  const onboarding = sp.boasvindas === "1";
  const { catalog, plan, supabase } = await painelCtx();
  const theme = sanitizeTheme(catalog.theme, vertical.styles.map((s) => s.id)) as Required<ReturnType<typeof sanitizeTheme>>;
  const layout = normalizeLayout(catalog.layout, sections);

  // amostras reais para a prévia ficar parecida com a vitrine da pessoa
  const [{ data: items }, { data: cats }, { data: media }] = await Promise.all([
    supabase.from("items").select("id, name, price_cents, price_mode").eq("catalog_id", catalog.id).eq("is_visible", true).order("sort_order").limit(4),
    supabase.from("categories").select("name").eq("catalog_id", catalog.id).eq("is_visible", true).order("sort_order").limit(3),
    supabase.from("media").select("item_id, storage_path").eq("catalog_id", catalog.id).not("item_id", "is", null).order("sort_order"),
  ]);
  const photoOf = new Map<string, string>();
  for (const m of media ?? []) if (m.item_id && m.storage_path && !photoOf.has(m.item_id)) photoOf.set(m.item_id, m.storage_path);

  const sampleItems = (items ?? []).length
    ? (items ?? []).map((i) => ({
        name: i.name,
        price: i.price_mode === "on_request" ? "Sob consulta" : formatCents(i.price_cents),
        photo: publicMediaUrl(photoOf.get(i.id) ?? null),
      }))
    : [
        { name: "Cesta Romântica", price: "R$ 149,90", photo: null },
        { name: "Café da Manhã", price: "R$ 129,90", photo: null },
        { name: "Chocolate", price: "R$ 119,90", photo: null },
        { name: "Aniversário", price: "R$ 159,90", photo: null },
      ];

  return (
    <div className="space-y-5">
      {onboarding && <Steps current={2} />}
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Aparência</h1>
        <p className="mt-1 text-sm text-body">Monte sua vitrine: escolha as seções, a ordem, a logo e as cores.</p>
      </div>
      {onboarding && (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">
          Vitrine criada! Agora coloque sua logo e escolha as cores. Se preferir, <Link href="/app/cestas/nova?boasvindas=1" className="font-semibold text-primary underline">pule esta etapa</Link>.
        </p>
      )}
      <AppearanceForm
        catalogId={catalog.id}
        name={catalog.name}
        logoPath={catalog.logo_path}
        coverPath={catalog.cover_path}
        theme={theme}
        palettes={vertical.palettes}
        styles={vertical.styles}
        onboarding={onboarding}
        sections={sections}
        layout={layout}
        planFeatures={plan.features}
        sampleItems={sampleItems}
        sampleCategories={(cats ?? []).map((c) => c.name)}
        ctaLabel={vertical.cta.label}
      />
    </div>
  );
}
