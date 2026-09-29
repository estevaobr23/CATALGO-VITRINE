import type { Vocabulary } from "@/core/vertical-types";

type DbError = { message?: string; code?: string } | null | undefined;

/**
 * Contrato de erros do banco (references/04-uso-e-reuso.md) traduzido para
 * a linguagem da vertical. Nunca devolve a mensagem crua do Postgres.
 */
export function friendlyDbError(error: DbError, v: Vocabulary): string {
  const msg = error?.message ?? "";
  const limit = msg.match(/plan_limit:max_visible_items:(\d+)/);
  if (limit) {
    return `Seu plano permite ${limit[1]} ${v.item.plural} visíveis na ${v.catalog.singular}. Oculte ${v.item.article === "a" ? "uma" : "um"} ou faça upgrade.`;
  }
  const cat = msg.match(/plan_limit:max_catalogs:(\d+)/);
  if (cat) return `Seu plano permite ${cat[1]} ${v.catalog.singular}.`;
  if (msg.includes("no_active_plan")) return "Não encontramos uma compra ativa para este e-mail.";
  if (msg.includes("reserved_slug")) return "Esse endereço é reservado. Escolha outro.";
  if (error?.code === "23505" && msg.includes("slug")) return "Esse endereço já está em uso. Escolha outro.";
  if (msg.includes("catalogs_whatsapp_check")) return "WhatsApp inválido. Use DDD + número.";
  if (msg.includes("catalogs_slug_check")) return "Endereço inválido: use de 3 a 48 letras, números e hífens.";
  if (msg.includes("compare_at_price")) return "O preço \"de\" precisa ser maior que o preço atual.";
  if (msg.includes("catalog_not_found") || error?.code === "42501" || msg.includes("row-level security")) {
    return "Você não tem permissão para esta ação. Recarregue a página.";
  }
  if (msg.includes("violates check constraint")) return "Algum campo está fora do formato permitido. Revise e tente de novo.";
  if (msg.includes("Failed to fetch") || msg.includes("fetch failed")) return "Sem conexão. Verifique sua internet e tente de novo.";
  return "Não foi possível salvar agora. Tente de novo em instantes.";
}
