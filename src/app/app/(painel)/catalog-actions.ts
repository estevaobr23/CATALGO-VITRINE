"use server";
import { redirect } from "next/navigation";
import { friendlyDbError } from "@/core/access/errors";
import { normalizeWhatsapp } from "@/core/catalog/format";
import { safeHex, DEFAULT_PRIMARY, DEFAULT_SECONDARY } from "@/core/catalog/theme";
import { normalizeLayout } from "@/core/catalog/layout";
import { sections } from "@/vertical/sections";
import { vertical } from "@/vertical/config";
import { type ActionResult, ownPath, painelCtx, removeFiles, revalidateStore, text } from "./ctx";

const V = vertical.vocabulary;

export async function updateBrand(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const name = text(fd, "name", 120);
  if (name.length < 2) return { ok: false, message: "Informe o nome da sua marca." };
  const whatsapp = normalizeWhatsapp(text(fd, "whatsapp", 30));
  if (!whatsapp) return { ok: false, message: "WhatsApp inválido. Digite com DDD, ex.: (11) 99999-8888." };

  const instagram = text(fd, "instagram", 60).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "");
  if (instagram && !/^[a-zA-Z0-9._]{1,30}$/.test(instagram)) {
    return { ok: false, message: "Instagram inválido. Use só o nome de usuário, ex.: cestasdaana." };
  }
  const contact = {
    ...(catalog.contact as Record<string, unknown>),
    instagram: instagram || undefined,
    city: text(fd, "city", 120) || undefined,
  };
  const attributes = {
    ...(catalog.attributes as Record<string, unknown>),
    delivery_info: text(fd, "delivery_info", 300) || undefined,
  };

  const { error } = await supabase
    .from("catalogs")
    .update({ name, whatsapp, description: text(fd, "description", 500) || null, contact, attributes })
    .eq("id", catalog.id);
  if (error) return { ok: false, message: friendlyDbError(error, V) };
  revalidateStore(catalog.slug);
  return { ok: true, message: "Alterações salvas." };
}

export async function updateAppearance(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const logo = ownPath(fd.get("logo_path"), catalog.id, "logo");
  const cover = ownPath(fd.get("cover_path"), catalog.id, "cover");
  if (logo === "invalid" || cover === "invalid") return { ok: false, message: "Arquivo inválido. Envie a foto de novo." };

  const style = text(fd, "style", 20);
  const theme = {
    ...(catalog.theme as Record<string, unknown>),
    primary: safeHex(fd.get("primary"), DEFAULT_PRIMARY),
    secondary: safeHex(fd.get("secondary"), DEFAULT_SECONDARY),
    style: vertical.styles.some((s) => s.id === style) ? style : vertical.styles[0].id,
  };

  // O layout vem do editor como JSON. normalizeLayout no SERVIDOR é a trava:
  // seção inventada, campo fora do schema ou URL não-https são descartados.
  let layout = catalog.layout;
  const rawLayout = text(fd, "layout", 200000);
  if (rawLayout) {
    try {
      layout = normalizeLayout(JSON.parse(rawLayout), sections) as unknown as typeof catalog.layout;
    } catch {
      return { ok: false, message: "Não conseguimos salvar as seções. Recarregue a página e tente de novo." };
    }
  }

  const { error } = await supabase.from("catalogs").update({ logo_path: logo, cover_path: cover, theme, layout }).eq("id", catalog.id);
  if (error) return { ok: false, message: friendlyDbError(error, V) };

  await removeFiles(supabase, catalog.id, [
    catalog.logo_path !== logo ? catalog.logo_path : null,
    catalog.cover_path !== cover ? catalog.cover_path : null,
  ]);
  revalidateStore(catalog.slug);
  if (fd.get("next") === "primeira-cesta") redirect("/app/cestas/nova?boasvindas=1");
  return { ok: true, message: "Aparência salva." };
}

export async function updateSlug(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const slug = text(fd, "slug", 60)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length < 3 || slug.length > 48) return { ok: false, message: "Use de 3 a 48 letras, números ou hífens." };
  if (slug === catalog.slug) return { ok: true, message: "Esse já é o seu link." };

  const { error } = await supabase.from("catalogs").update({ slug }).eq("id", catalog.id);
  if (error) return { ok: false, message: friendlyDbError(error, V) };
  revalidateStore(catalog.slug);
  revalidateStore(slug);
  return { ok: true, message: "Link atualizado. Envie o novo link para seus clientes." };
}

export async function setPublished(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { catalog, supabase } = await painelCtx();
  const publish = fd.get("publish") === "1";
  if (publish && !catalog.whatsapp) {
    return { ok: false, message: "Cadastre seu WhatsApp em Configurações antes de publicar." };
  }
  const { error } = await supabase.rpc("set_catalog_published", { p_catalog_id: catalog.id, p_published: publish });
  if (error) return { ok: false, message: friendlyDbError(error, V) };
  revalidateStore(catalog.slug);
  return {
    ok: true,
    message: publish ? `Sua ${V.catalog.singular} está no ar!` : `${V.catalog.singular[0].toUpperCase()}${V.catalog.singular.slice(1)} tirada do ar.`,
  };
}

export async function updateDisplayName(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { user, supabase } = await painelCtx();
  const name = text(fd, "display_name", 120);
  const { error } = await supabase.from("profiles").update({ display_name: name || null }).eq("id", user.id);
  if (error) return { ok: false, message: friendlyDbError(error, V) };
  return { ok: true, message: "Nome atualizado." };
}
