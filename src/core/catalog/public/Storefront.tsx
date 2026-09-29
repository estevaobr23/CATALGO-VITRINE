"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/core/supabase/client";
import type { VerticalConfig } from "@/core/vertical-types";
import { visibleSections, type CatalogLayout, type SectionDef } from "../layout";
import { formatCents } from "../format";
import { themeStyle } from "../theme";
import type { PublicCatalog, PublicItem } from "../types";
import { buildWhatsappUrl, describePrice, fillTemplate } from "../whatsapp";
import { resolveMedia } from "./media";
import { GallerySection, TestimonialsSection, youtubeEmbed } from "./sections";

export type StorefrontProps = {
  data: PublicCatalog;
  cta: VerticalConfig["cta"];
  vocabulary: VerticalConfig["vocabulary"];
  itemAttributes: VerticalConfig["itemAttributes"];
  watermark: { text: string; href: string } | null;
  pageUrl: string;
  /** Seções escolhidas na Aparência; sem layout, cai na ordem padrão. */
  layout: CatalogLayout;
  sectionDefs: SectionDef[];
  initialItemSlug?: string | null;
  /** Demo (página de vendas): não registra métricas nem mexe na URL. */
  demo?: boolean;
};

function track(catalogId: string, type: "page_view" | "cta_click", itemId?: string) {
  // analytics anônimo; o banco só grava se o plano tiver o recurso
  createClient()
    .rpc("track_catalog_event", { p_catalog_id: catalogId, p_event_type: type, ...(itemId ? { p_item_id: itemId } : {}) })
    .then(() => {}, () => {});
}

export function Storefront({ data, cta, vocabulary: V, itemAttributes, watermark, pageUrl, layout, sectionDefs, initialItemSlug, demo }: StorefrontProps) {
  const { catalog, categories, items } = data;
  const gallery = data.gallery ?? [];
  const testimonials = data.testimonials ?? [];
  const [category, setCategory] = useState<string>("all");
  const [openSlug, setOpenSlug] = useState<string | null>(initialItemSlug ?? null);
  const open = useMemo(() => items.find((i) => i.slug === openSlug) ?? null, [items, openSlug]);
  const pushed = useRef(false);

  const usedCategories = useMemo(
    () => categories.filter((c) => items.some((i) => i.category_id === c.id)),
    [categories, items],
  );
  const visibleItems = category === "all" ? items : items.filter((i) => i.category_id === category);

  useEffect(() => {
    if (!demo) track(catalog.id, "page_view");
  }, [catalog.id, demo]);

  // ?{itemParam}=slug na URL: link direto para um item e o "voltar" do celular fecha o detalhe
  useEffect(() => {
    if (demo) return;
    const onPop = () => {
      pushed.current = false;
      setOpenSlug(new URL(window.location.href).searchParams.get(V.itemParam));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [demo, V.itemParam]);

  const openItem = useCallback(
    (item: PublicItem) => {
      setOpenSlug(item.slug);
      if (!demo) {
        const url = new URL(window.location.href);
        url.searchParams.set(V.itemParam, item.slug);
        window.history.pushState(null, "", url);
        pushed.current = true;
      }
    },
    [demo, V.itemParam],
  );
  const closeItem = useCallback(() => {
    if (demo) return setOpenSlug(null);
    if (pushed.current) {
      pushed.current = false;
      window.history.back(); // o popstate fecha o detalhe
      return;
    }
    // chegou pelo link direto: limpa a URL sem sair do site
    const url = new URL(window.location.href);
    url.searchParams.delete(V.itemParam);
    window.history.replaceState(null, "", url);
    setOpenSlug(null);
  }, [demo, V.itemParam]);

  const shown = useMemo(
    () => visibleSections(layout, sectionDefs, catalog.plan_features),
    [layout, sectionDefs, catalog.plan_features],
  );
  const dataOf = (id: string) => shown.find((s) => s.id === id)?.data ?? {};

  const logo = resolveMedia(catalog.logo_path);
  const cover = resolveMedia(catalog.cover_path);
  const contact = catalog.contact as { instagram?: string; city?: string };
  const deliveryInfo = typeof catalog.attributes?.delivery_info === "string" ? catalog.attributes.delivery_info : null;
  const generalWa = buildWhatsappUrl(catalog.whatsapp, fillTemplate(cta.fallbackMessage, { loja: catalog.name, link: pageUrl }));

  const sectionNodes: Record<string, React.ReactNode> = {
    header: (
      <header className="relative">
        <div className="relative h-36 w-full overflow-hidden sm:h-56" style={{ background: "color-mix(in srgb, var(--store-secondary) 45%, white)" }}>
          {cover && <Image src={cover} alt="" fill priority sizes="100vw" className="object-cover" />}
          {cover && <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/25" />}
        </div>
        <div className="relative mx-auto -mt-12 max-w-5xl px-4 text-center sm:-mt-14">
          <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-md sm:h-28 sm:w-28">
            {logo ? (
              <Image src={logo} alt={`Logo ${catalog.name}`} width={112} height={112} priority className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-semibold" style={{ color: "var(--store-primary)", fontFamily: "var(--store-heading)" }}>
                {catalog.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl" style={{ fontFamily: "var(--store-heading)" }}>
            {catalog.name}
          </h1>
          {catalog.description && <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-[#5f524c]">{catalog.description}</p>}
        </div>
      </header>
    ),

    banner: dataOf("banner").texto ? (
      <p
        className="px-4 py-2.5 text-center text-sm font-semibold"
        style={{ background: "var(--store-primary)", color: "var(--store-on-primary)" }}
      >
        {dataOf("banner").texto}
      </p>
    ) : null,

    categorias:
      usedCategories.length > 0 ? (
        <nav className="sticky top-0 z-20 border-b border-black/5 bg-[#fbf9f7]/95 backdrop-blur" aria-label={V.category.plural}>
          <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[{ id: "all", name: "Todas" }, ...usedCategories].map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  aria-pressed={active}
                  className="shrink-0 whitespace-nowrap border px-4 py-2 text-sm font-semibold transition"
                  style={{
                    borderRadius: "999px",
                    background: active ? "var(--store-primary)" : "white",
                    color: active ? "var(--store-on-primary)" : "#241b18",
                    borderColor: active ? "var(--store-primary)" : "rgba(0,0,0,.1)",
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </nav>
      ) : null,

    cestas: (
      <main className="mx-auto max-w-5xl px-4 pt-5">
        {items.length === 0 ? (
          <p className="py-16 text-center text-[#5f524c]">Em breve, novas {V.item.plural} por aqui.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {visibleItems.map((item, idx) => (
              <li key={item.id}>
                <ItemCard item={item} onOpen={() => openItem(item)} priority={idx < 4} />
              </li>
            ))}
          </ul>
        )}
      </main>
    ),

    galeria: gallery.length > 0 ? <GallerySection photos={gallery} /> : null,

    depoimentos: testimonials.length > 0 ? <TestimonialsSection items={testimonials} /> : null,

    video: (() => {
      const embed = youtubeEmbed(dataOf("video").url ?? "");
      if (!embed) return null;
      const titulo = dataOf("video").titulo;
      return (
        <section className="mx-auto max-w-3xl px-4 pt-8">
          {titulo && (
            <h2 className="mb-3 text-center text-xl font-semibold" style={{ fontFamily: "var(--store-heading)" }}>
              {titulo}
            </h2>
          )}
          <div className="overflow-hidden bg-black shadow-sm" style={{ borderRadius: "var(--store-radius)" }}>
            <iframe
              src={embed}
              title={titulo || "Vídeo"}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="aspect-video w-full"
            />
          </div>
        </section>
      );
    })(),

    sobre: dataOf("sobre").texto ? (
      <section className="mx-auto max-w-2xl px-4 pt-8 text-center">
        <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--store-heading)" }}>
          {dataOf("sobre").titulo || "Sobre a nossa loja"}
        </h2>
        <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[#5f524c]">{dataOf("sobre").texto}</p>
      </section>
    ) : null,

    duvidas: (() => {
      const d = dataOf("duvidas");
      const qa = [1, 2, 3, 4]
        .map((n) => ({ q: d[`p${n}`], a: d[`r${n}`] }))
        .filter((x) => x.q && x.a);
      if (!qa.length) return null;
      return (
        <section className="mx-auto max-w-2xl px-4 pt-8">
          <h2 className="mb-4 text-center text-xl font-semibold" style={{ fontFamily: "var(--store-heading)" }}>
            Perguntas frequentes
          </h2>
          <div className="space-y-2">
            {qa.map((x, i) => (
              <details key={i} className="group bg-white p-4 shadow-sm [&_summary::-webkit-details-marker]:hidden" style={{ borderRadius: "var(--store-radius)" }}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold">
                  {x.q}
                  <span className="text-xl transition group-open:rotate-45" style={{ color: "var(--store-primary)" }} aria-hidden>+</span>
                </summary>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#5f524c]">{x.a}</p>
              </details>
            ))}
          </div>
        </section>
      );
    })(),

    contato: (
      <section className="mx-auto max-w-2xl px-4 pt-8 text-center">
        <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--store-heading)" }}>Fale com a gente</h2>
        <div className="mt-3 flex flex-col items-center gap-1.5 text-sm text-[#5f524c]">
          {contact.city && <span>{contact.city}</span>}
          {dataOf("contato").horario && <span>{dataOf("contato").horario}</span>}
          {deliveryInfo && <span>{deliveryInfo}</span>}
          {contact.instagram && (
            <a
              href={`https://instagram.com/${encodeURIComponent(contact.instagram)}`}
              target="_blank"
              rel="noopener nofollow"
              className="font-medium underline-offset-2 hover:underline"
            >
              @{contact.instagram}
            </a>
          )}
        </div>
        {generalWa && (
          <a
            href={demo ? undefined : generalWa}
            target="_blank"
            rel="noopener"
            onClick={() => !demo && track(catalog.id, "cta_click")}
            className="mt-4 inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-white shadow-sm"
            style={{ background: "#1faa55", borderRadius: "var(--store-radius)" }}
          >
            <WhatsappIcon /> Falar no WhatsApp
          </a>
        )}
      </section>
    ),
  };

  return (
    <div style={themeStyle(catalog.theme)} className="min-h-dvh bg-[#fbf9f7] text-[#241b18]">
      {shown.map((state) => {
        const node = sectionNodes[state.id];
        return node ? <div key={state.id}>{node}</div> : null;
      })}

      <footer className="border-t border-black/5 px-4 pb-24 pt-10 text-center text-xs text-[#5f524c]">
        <p className="font-semibold text-[#241b18]">{catalog.name}</p>
        {watermark && (
          <a href={watermark.href} className="mt-3 inline-block opacity-70 hover:opacity-100" target="_blank" rel="noopener">
            {watermark.text}
          </a>
        )}
      </footer>

      {/* Botão geral de WhatsApp */}
      {generalWa && !open && (
        <a
          href={demo ? undefined : generalWa}
          target="_blank"
          rel="noopener"
          onClick={() => !demo && track(catalog.id, "cta_click")}
          className="fixed bottom-5 right-4 z-30 flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20"
          aria-label="Falar no WhatsApp"
        >
          <WhatsappIcon /> Fazer pedido
        </a>
      )}

      {open && (
        <ItemSheet
          item={open}
          storeName={catalog.name}
          whatsapp={catalog.whatsapp}
          cta={cta}
          vocabulary={V}
          itemAttributes={itemAttributes}
          pageUrl={pageUrl}
          onClose={closeItem}
          onCta={() => !demo && track(catalog.id, "cta_click", open.id)}
          demo={demo}
        />
      )}
    </div>
  );
}

function PriceTag({ item, big = false }: { item: PublicItem; big?: boolean }) {
  if (item.price_mode === "on_request") {
    return <span className={big ? "text-lg font-semibold" : "text-sm font-semibold"}>Sob consulta</span>;
  }
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      {item.price_mode === "from" && <span className="text-xs text-[#5f524c]">a partir de</span>}
      <span className={big ? "text-2xl font-bold" : "text-[15px] font-bold"} style={{ color: "var(--store-primary)" }}>
        {formatCents(item.price_cents)}
      </span>
      {item.compare_at_price_cents != null && (
        <s className="text-xs text-[#8a7d77]">{formatCents(item.compare_at_price_cents)}</s>
      )}
    </span>
  );
}

function ItemCard({ item, onOpen, priority }: { item: PublicItem; onOpen: () => void; priority: boolean }) {
  const photo = resolveMedia(item.media.find((m) => m.kind === "image")?.storage_path);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full w-full flex-col overflow-hidden border border-black/5 bg-white text-left shadow-sm transition hover:shadow-md"
      style={{ borderRadius: "var(--store-radius)" }}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#f1ebe5]">
        {photo ? (
          <Image
            src={photo}
            alt={item.media[0]?.alt_text ?? item.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className={`object-cover transition duration-500 group-hover:scale-[1.03] ${item.is_available ? "" : "grayscale-[60%]"}`}
          />
        ) : (
          <PhotoPlaceholder />
        )}
        {item.is_featured && item.is_available && (
          <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm" style={{ background: "var(--store-secondary)", color: "var(--store-on-secondary)" }}>
            ★ Destaque
          </span>
        )}
        {!item.is_available && (
          <span className="absolute left-2 top-2 rounded-full bg-[#241b18]/85 px-2 py-0.5 text-[11px] font-semibold text-white">Esgotada</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug" style={{ fontFamily: "var(--store-heading)" }}>{item.name}</h2>
        {item.summary && <p className="line-clamp-2 text-xs leading-snug text-[#5f524c]">{item.summary}</p>}
        <div className="mt-auto pt-1">
          <PriceTag item={item} />
        </div>
      </div>
    </button>
  );
}

function ItemSheet({
  item,
  storeName,
  whatsapp,
  cta,
  vocabulary: V,
  itemAttributes,
  pageUrl,
  onClose,
  onCta,
  demo,
}: {
  item: PublicItem;
  storeName: string;
  whatsapp: string | null;
  cta: VerticalConfig["cta"];
  vocabulary: VerticalConfig["vocabulary"];
  itemAttributes: VerticalConfig["itemAttributes"];
  pageUrl: string;
  onClose: () => void;
  onCta: () => void;
  demo?: boolean;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const photo = resolveMedia(item.media.find((m) => m.kind === "image")?.storage_path);
  const extras = item.options.filter((g) => g.pricing === "add").flatMap((g) => g.values.filter((v) => v.is_available));
  const chosen = extras.filter((v) => selected[v.id]);
  const extrasTotal = chosen.reduce((sum, v) => sum + v.price_cents, 0);
  const hasPrice = item.price_mode !== "on_request" && item.price_cents != null;
  const total = hasPrice ? item.price_cents! + extrasTotal : null;

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

  const itemLink = `${pageUrl}${pageUrl.includes("?") ? "&" : "?"}${V.itemParam}=${encodeURIComponent(item.slug)}`;
  let opcoes = "";
  if (chosen.length) {
    opcoes = `\n${V.extras}: ${chosen.map((v) => (v.price_cents ? `${v.name} (+${formatCents(v.price_cents)})` : v.name)).join(", ")}`;
    if (total != null) opcoes += `\nTotal: ${formatCents(total)}`;
  }
  const message = fillTemplate(item.cta_message || cta.message, {
    loja: storeName,
    item: item.name,
    preco: describePrice(item),
    opcoes,
    link: itemLink,
  });
  const waUrl = buildWhatsappUrl(whatsapp, message);
  const attrs = itemAttributes
    .map((f) => {
      const v = item.attributes?.[f.key];
      if (v == null || v === "") return null;
      const value = f.type === "number" && f.suffix ? `${v} ${f.suffix}` : String(v);
      return { label: f.label, value };
    })
    .filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={item.name}>
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-label="Fechar" />
      <div className="animate-sheet-up relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl shadow-md"
          aria-label="Fechar"
        >
          ×
        </button>
        <div className="overflow-y-auto overscroll-contain">
          <div className="relative aspect-square w-full bg-[#f1ebe5] sm:aspect-[4/3]">
            {photo ? (
              <Image src={photo} alt={item.media[0]?.alt_text ?? item.name} fill sizes="(min-width: 640px) 32rem, 100vw" className="object-cover" priority />
            ) : (
              <PhotoPlaceholder />
            )}
          </div>
          <div className="space-y-5 p-5 pb-6">
            <div>
              <h2 className="text-2xl font-semibold leading-tight" style={{ fontFamily: "var(--store-heading)" }}>{item.name}</h2>
              {item.summary && <p className="mt-1 text-sm text-[#5f524c]">{item.summary}</p>}
              <div className="mt-3">
                <PriceTag item={item} big />
              </div>
            </div>

            {item.features.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#5f524c]">{V.features}</h3>
                <ul className="space-y-1.5">
                  {item.features.map((f, i) => (
                    <li key={i} className="flex gap-2 text-[15px]">
                      <span aria-hidden style={{ color: "var(--store-primary)" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {item.description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#3d312d]">{item.description}</p>}

            {attrs.length > 0 && (
              <dl className="grid grid-cols-2 gap-2">
                {attrs.map((a) => (
                  <div key={a.label} className="rounded-xl bg-[#f6f1ec] p-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#5f524c]">{a.label}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{a.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {extras.length > 0 && item.is_available && (
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#5f524c]">{V.extras}</h3>
                <ul className="divide-y divide-black/5 rounded-xl border border-black/10">
                  {extras.map((v) => (
                    <li key={v.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-3 text-[15px]">
                        <input
                          type="checkbox"
                          checked={!!selected[v.id]}
                          onChange={(e) => setSelected((s) => ({ ...s, [v.id]: e.target.checked }))}
                          className="h-5 w-5"
                          style={{ accentColor: "var(--store-primary)" }}
                        />
                        <span className="flex-1">{v.name}</span>
                        {v.price_cents > 0 && <span className="text-sm text-[#5f524c]">+ {formatCents(v.price_cents)}</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        <div className="border-t border-black/5 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {chosen.length > 0 && total != null && (
            <p className="mb-2 text-center text-sm text-[#5f524c]">
              Total com {V.extras.toLowerCase()}: <b className="text-[#241b18]">{formatCents(total)}</b>
            </p>
          )}
          {waUrl ? (
            <a
              href={demo ? undefined : waUrl}
              target="_blank"
              rel="noopener"
              onClick={onCta}
              className="flex min-h-13 w-full items-center justify-center gap-2 px-5 py-3.5 text-base font-bold text-white shadow-md transition active:scale-[.98]"
              style={{ background: item.is_available ? "#1faa55" : "#6b625e", borderRadius: "var(--store-radius)" }}
            >
              <WhatsappIcon />
              {item.is_available ? item.cta_label || cta.label : "Esgotada · perguntar disponibilidade"}
            </a>
          ) : (
            <p className="text-center text-sm text-[#5f524c]">Esta loja ainda não cadastrou o WhatsApp.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function WhatsappIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.08c-.24.68-1.42 1.3-1.95 1.35-.5.05-1.13.07-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.65.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.17-.3.37-.43.5-.14.14-.29.3-.13.59.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.41.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.38-.24.65-.14.26.1 1.68.79 1.97.94.29.14.48.21.55.33.07.12.07.68-.17 1.36z" />
    </svg>
  );
}

function PhotoPlaceholder() {
  return (
    <span className="flex h-full items-center justify-center text-[#b8aaa2]">
      <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.8" />
        <path d="m21 16-5-5-8 8" />
      </svg>
    </span>
  );
}
