import "server-only";
import { revalidatePath } from "next/cache";
import { requireCatalog } from "@/core/auth/guard";
import { STORAGE_BUCKET } from "@/core/supabase/env";
import { createClient } from "@/core/supabase/server";
import { vertical } from "@/vertical/config";

export type ActionResult = { ok: boolean; message: string; id?: string } | undefined;

/** Sessão + acesso ativo + vitrine do usuário + client com RLS. */
export async function painelCtx() {
  const access = await requireCatalog(vertical.productKey);
  const supabase = await createClient();
  return { ...access, supabase };
}

export function revalidateStore(slug: string) {
  revalidatePath("/app", "layout");
  revalidatePath(`/vitrine/${slug}`);
}

/** Path enviado pelo client só é aceito se for da pasta desta vitrine. */
export function ownPath(value: FormDataEntryValue | null, catalogId: string, folder: string): string | null | "invalid" {
  const path = String(value ?? "").trim();
  if (!path) return null;
  const re = new RegExp(`^${catalogId}/${folder}/[0-9a-f-]{36}\\.(webp|jpg)$`);
  return re.test(path) ? path : "invalid";
}

/** Remove arquivos substituídos. Falha aqui não quebra o fluxo: o cron de órfãos limpa depois. */
export async function removeFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  catalogId: string,
  paths: (string | null | undefined)[],
) {
  const valid = paths.filter((p): p is string => !!p && p.startsWith(`${catalogId}/`));
  if (valid.length) await supabase.storage.from(STORAGE_BUCKET).remove(valid);
}

export function text(fd: FormData, key: string, max: number): string {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}
