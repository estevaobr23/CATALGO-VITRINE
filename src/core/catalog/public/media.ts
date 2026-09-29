import { publicMediaUrl } from "@/core/supabase/env";

/** Path do bucket -> URL pública. Paths iniciados em "/" são arquivos locais (demo da página de vendas). */
export function resolveMedia(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("/") ? path : publicMediaUrl(path);
}
