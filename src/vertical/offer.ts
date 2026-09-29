/**
 * FONTE ÚNICA DA OFERTA COMERCIAL (página de vendas).
 * Troque preço, nome, garantia e checkout AQUI — nenhum componente tem valor
 * fixo.
 *
 * ⚠ PENDENTE DE CREDENCIAL: as URLs de checkout da Cakto vêm de variáveis de
 * ambiente (NEXT_PUBLIC_CHECKOUT_URL_INICIANTE / _PROFISSIONAL). Enquanto não
 * existirem, o botão do plano mostra "Checkout em configuração".
 * O plano liberado NÃO é decidido aqui: é o ID da oferta cadastrado em
 * public.offers (seed) que o webhook usa.
 */

export type PlanOffer = {
  key: "iniciante" | "profissional"; // = plans.key no banco
  name: string;
  tagline: string;
  priceCents: number;
  compareAtCents: number | null;
  installments: number | null; // "ou 5x de ..." (null = não mostrar)
  checkoutUrl: string; // vazio = pendente
  recommended: boolean;
  includes: string[];
  excludes: string[];
};

export const offer = {
  productName: "CestaVitrine",
  paymentNote: "Pagamento único · acesso vitalício",
  guaranteeDays: 15,
  plans: [
    {
      key: "iniciante",
      name: "Iniciante",
      tagline: "Para começar a vender com link hoje",
      priceCents: 2290,
      compareAtCents: null,
      installments: null,
      checkoutUrl: process.env.NEXT_PUBLIC_CHECKOUT_URL_INICIANTE ?? "",
      recommended: false,
      includes: [
        "1 vitrine com seu link",
        "Até 15 cestas no ar",
        "Categorias ilimitadas",
        "Pedido direto no WhatsApp",
        "Seções: banner, sobre, contato, galeria e dúvidas",
      ],
      excludes: ["Cestas ilimitadas", "Depoimentos de clientes", "Vídeo na vitrine", "Sem a marca CestaVitrine no rodapé", "Contador de visitas e cliques"],
    },
    {
      key: "profissional",
      name: "Profissional",
      tagline: "Para quem vende o ano inteiro",
      priceCents: 3790,
      compareAtCents: 9700,
      installments: null,
      checkoutUrl: process.env.NEXT_PUBLIC_CHECKOUT_URL_PROFISSIONAL ?? "",
      recommended: true,
      includes: [
        "1 vitrine com seu link",
        "Cestas ilimitadas",
        "Categorias ilimitadas",
        "Pedido direto no WhatsApp",
        "Todas as seções da vitrine",
        "Depoimentos de clientes",
        "Vídeo na vitrine",
        "Sem a marca CestaVitrine no rodapé",
        "Contador de visitas e cliques",
      ],
      excludes: [],
    },
  ] satisfies PlanOffer[],
} as const;

export const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
