"use client";
import Image from "next/image";
import { useState } from "react";
import type { PublicMedia, PublicTestimonial } from "../types";
import { resolveMedia } from "./media";

/**
 * Converte um link do YouTube em URL de embed. Só aceita youtube.com e
 * youtu.be: qualquer outra coisa vira null e a seção não é renderizada
 * (evita colocar um iframe arbitrário dentro da vitrine).
 */
export function youtubeEmbed(url: string): string | null {
  if (!url) return null;
  let id = "";
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "m.youtube.com") {
      id = u.searchParams.get("v") ?? (u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : "");
    } else if (host === "youtube-nocookie.com") {
      id = u.pathname.split("/").pop() ?? "";
    }
  } catch {
    return null;
  }
  return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}

export function GallerySection({ photos }: { photos: PublicMedia[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const shots = photos.filter((p) => p.storage_path).slice(0, 12);
  if (!shots.length) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 pt-8">
      <h2 className="mb-3 text-center text-xl font-semibold" style={{ fontFamily: "var(--store-heading)" }}>
        Galeria
      </h2>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
        {shots.map((p) => {
          const src = resolveMedia(p.storage_path);
          if (!src) return null;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOpen(src)}
                className="relative block aspect-square w-full overflow-hidden bg-[#f1ebe5] transition hover:opacity-90"
                style={{ borderRadius: "var(--store-radius)" }}
              >
                <Image src={src} alt={p.alt_text ?? p.caption ?? ""} fill sizes="(min-width: 640px) 25vw, 33vw" className="object-cover" />
              </button>
            </li>
          );
        })}
      </ul>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0" onClick={() => setOpen(null)} aria-label="Fechar" />
          {/* eslint-disable-next-line @next/next/no-img-element -- lightbox simples, imagem já otimizada */}
          <img src={open} alt="" className="relative max-h-[85dvh] max-w-full rounded-2xl object-contain" />
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      )}
    </section>
  );
}

export function TestimonialsSection({ items }: { items: PublicTestimonial[] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-5xl px-4 pt-8">
      <h2 className="mb-4 text-center text-xl font-semibold" style={{ fontFamily: "var(--store-heading)" }}>
        O que dizem os clientes
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 9).map((t) => {
          const photo = resolveMedia(t.author_photo_path);
          return (
            <li key={t.id} className="bg-white p-4 shadow-sm" style={{ borderRadius: "var(--store-radius)" }}>
              {t.rating != null && (
                <p className="text-sm tracking-wide" style={{ color: "var(--store-secondary)" }} aria-label={`${t.rating} de 5`}>
                  {"★".repeat(t.rating)}
                  <span className="text-[#d8cec7]">{"★".repeat(5 - t.rating)}</span>
                </p>
              )}
              {t.body && <p className="mt-2 text-[15px] leading-relaxed text-[#3d312d]">“{t.body}”</p>}
              <div className="mt-3 flex items-center gap-2">
                {photo ? (
                  <Image src={photo} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: "var(--store-primary)", color: "var(--store-on-primary)" }}
                  >
                    {t.author_name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <p className="text-sm font-semibold text-[#241b18]">{t.author_name}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
