"use client";
import { createClient } from "@/core/supabase/client";
import { STORAGE_BUCKET } from "@/core/supabase/env";

export type MediaFolder = "logo" | "cover" | "items";

const MAX_INPUT_BYTES = 15 * 1024 * 1024; // antes de comprimir
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024; // limite do bucket

/**
 * Redimensiona e converte para WebP no próprio aparelho: foto de celular
 * (4-8 MB) vira ~200-400 KB, sobe rápido no 4G e a vitrine abre leve.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("unsupported_image");
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("unsupported_image");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (blob) return blob;
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!jpeg) throw new Error("unsupported_image");
  return jpeg;
}

/**
 * Sobe para {catalog_id}/{pasta}/{uuid}.{ext}. A policy do Storage só
 * aceita a pasta de um catálogo do próprio usuário; o nome é UUID (nunca o
 * nome original do arquivo).
 */
export async function uploadCatalogImage(
  catalogId: string,
  folder: MediaFolder,
  file: File,
): Promise<{ path: string } | { error: string }> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return { error: "Envie uma foto em JPG, PNG ou WebP." };
  }
  if (file.size > MAX_INPUT_BYTES) return { error: "Foto muito grande (máximo 15 MB)." };

  let blob: Blob;
  try {
    blob = await compressImage(file, folder === "logo" ? 600 : 1600);
  } catch {
    return { error: "Não conseguimos ler essa foto. Tente outra em JPG ou PNG." };
  }
  if (blob.size > MAX_OUTPUT_BYTES) return { error: "Foto muito grande mesmo após compactar. Tente outra." };

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${catalogId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient()
    .storage.from(STORAGE_BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
  if (error) {
    return { error: error.message.includes("row-level") ? "Sem permissão para enviar nesta vitrine." : "Falha no envio. Verifique a internet e tente de novo." };
  }
  return { path };
}
