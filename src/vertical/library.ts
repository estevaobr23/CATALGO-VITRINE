/**
 * Biblioteca de combinações — ideias de cestas para inspirar e acelerar o
 * cadastro ("Usar como modelo" preenche o formulário, sem preço nem foto).
 *
 * É CONTEÚDO da vertical, versionado com o código. Esta é uma AMOSTRA
 * inicial; a biblioteca completa (+100 combinações da oferta) entra aqui
 * quando o conteúdo estiver pronto, no mesmo formato.
 */
export type LibraryIdea = {
  slug: string;
  name: string;
  occasion: string;
  summary: string;
  features: string[];
};

export const library: LibraryIdea[] = [
  {
    slug: "cafe-da-manha-classico",
    name: "Café da Manhã Clássico",
    occasion: "Café da Manhã",
    summary: "Para começar o dia com carinho",
    features: ["Pães variados", "Bolo caseiro em fatia", "Frutas da estação", "Suco natural", "Geleia e manteiga", "Cartão com mensagem"],
  },
  {
    slug: "romantica-vinho-chocolate",
    name: "Romântica Vinho & Chocolate",
    occasion: "Românticas",
    summary: "Para celebrar a dois",
    features: ["Vinho tinto ou espumante", "2 taças", "Chocolates finos", "Pétalas de rosa", "Cartão personalizado"],
  },
  {
    slug: "aniversario-festa-na-caixa",
    name: "Festa na Caixa",
    occasion: "Aniversário",
    summary: "Um mini aniversário surpresa",
    features: ["Mini bolo decorado", "Docinhos", "Balão", "Vela e topo de bolo", "Refrigerante ou espumante", "Cartão de parabéns"],
  },
  {
    slug: "chocolate-lovers",
    name: "Chocolate Lovers",
    occasion: "Chocolate",
    summary: "Para quem ama chocolate",
    features: ["Barras de chocolate sortidas", "Bombons", "Brownie", "Chocolate quente em pó", "Caneca"],
  },
  {
    slug: "masculina-happy-hour",
    name: "Happy Hour",
    occasion: "Masculinas",
    summary: "Petiscos e bebida para relaxar",
    features: ["Cervejas especiais", "Amendoim e castanhas", "Salame ou copa", "Queijo", "Copo personalizado"],
  },
  {
    slug: "maternidade-boas-vindas",
    name: "Boas-vindas ao Bebê",
    occasion: "Maternidade",
    summary: "Mimo para a mamãe e o bebê",
    features: ["Body ou manta", "Pelúcia", "Chá para a mamãe", "Biscoitos", "Cartão de boas-vindas"],
  },
];
