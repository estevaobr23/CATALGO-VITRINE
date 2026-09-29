import "server-only";
import { headers } from "next/headers";

/** URL pública da vitrine. Usa NEXT_PUBLIC_SITE_URL (produção) ou o host atual. */
export async function storeUrl(slug: string): Promise<string> {
  let base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!base) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    base = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  }
  return `${base}/vitrine/${slug}`;
}
