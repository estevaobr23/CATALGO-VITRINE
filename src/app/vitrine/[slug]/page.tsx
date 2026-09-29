import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatCents } from "@/core/catalog/format";
import { getPublicCatalog } from "@/core/catalog/public/fetch";
import { resolveMedia } from "@/core/catalog/public/media";
import { Storefront } from "@/core/catalog/public/Storefront";
import { normalizeLayout } from "@/core/catalog/layout";
import { vertical } from "@/vertical/config";
import { sections } from "@/vertical/sections";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

async function load(props: PageProps<"/vitrine/[slug]">) {
  const [{ slug }, sp] = await Promise.all([props.params, props.searchParams]);
  const data = await getPublicCatalog(vertical.productKey, slug);
  const itemSlug = typeof sp[vertical.vocabulary.itemParam] === "string" ? (sp[vertical.vocabulary.itemParam] as string) : null;
  return { data, itemSlug, slug };
}

// Preview do link no WhatsApp/Instagram: da loja, ou da cesta quando o link é direto.
export async function generateMetadata(props: PageProps<"/vitrine/[slug]">): Promise<Metadata> {
  const { data, itemSlug } = await load(props);
  if (!data) return { title: "Vitrine não encontrada", robots: { index: false } };
  const { catalog, items } = data;
  const item = itemSlug ? items.find((i) => i.slug === itemSlug) : undefined;
  const firstPhoto = items.find((i) => i.media.length)?.media[0]?.storage_path;
  const image = resolveMedia(item?.media[0]?.storage_path ?? catalog.cover_path ?? firstPhoto ?? catalog.logo_path);
  const url = `${siteUrl}/vitrine/${catalog.slug}`;

  const title = item ? `${item.name} · ${catalog.name}` : catalog.name;
  const description = item
    ? [item.price_cents != null && item.price_mode !== "on_request" ? formatCents(item.price_cents) : null, item.summary ?? item.features.slice(0, 4).join(", ")]
        .filter(Boolean)
        .join(" · ")
    : catalog.description || `Veja as ${vertical.vocabulary.item.plural} de ${catalog.name} e peça pelo WhatsApp.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url: item ? `${url}?${vertical.vocabulary.itemParam}=${item.slug}` : url,
      siteName: catalog.name,
      type: "website",
      locale: "pt_BR",
      images: image ? [{ url: image, width: 1200, height: 1200, alt: item?.name ?? catalog.name }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

export default async function PublicStorePage(props: PageProps<"/vitrine/[slug]">) {
  const { data, itemSlug } = await load(props);
  if (!data) notFound();

  const noWatermark = data.catalog.plan_features.includes("no_watermark");
  return (
    <Storefront
      data={data}
      cta={vertical.cta}
      vocabulary={vertical.vocabulary}
      itemAttributes={vertical.itemAttributes}
      watermark={noWatermark ? null : { text: vertical.brand.watermark, href: `${siteUrl}/?utm_source=vitrine&utm_medium=rodape` }}
      pageUrl={`${siteUrl}/vitrine/${data.catalog.slug}`}
      layout={normalizeLayout(data.catalog.layout, sections)}
      sectionDefs={sections}
      initialItemSlug={itemSlug}
    />
  );
}
