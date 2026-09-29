import type { VerticalConfig } from "@/core/vertical-types";

/**
 * CestaVitrine — o ÚNICO lugar com a linguagem do nicho. O banco guarda
 * `items`, `categories` e `attributes`; aqui eles viram cestas, categorias e
 * "serve quantas pessoas".
 */
export const vertical: VerticalConfig = {
  productKey: "cestavitrine",
  brand: { name: "CestaVitrine", watermark: "Vitrine criada com CestaVitrine" },
  vocabulary: {
    catalog: { singular: "vitrine", possessive: "Minha vitrine" },
    item: { singular: "cesta", plural: "cestas", article: "a" },
    category: { singular: "categoria", plural: "categorias" },
    features: "O que vem na cesta",
    featuresPlaceholder: "Caneca personalizada",
    extras: "Adicionais",
    itemParam: "cesta",
  },
  itemAttributes: [
    { key: "serves", label: "Serve quantas pessoas", type: "number", min: 1, max: 30, placeholder: "2", suffix: "pessoas" },
    { key: "lead_time", label: "Prazo de encomenda", type: "text", maxLength: 60, placeholder: "Encomendar com 1 dia de antecedência" },
  ],
  cta: {
    label: "Quero esta cesta",
    message: "Olá, {loja}! Vi a *{item}* ({preco}) na sua vitrine e gostaria de saber mais.{opcoes}\n\n{link}",
    fallbackMessage: "Olá, {loja}! Vi sua vitrine e gostaria de fazer um pedido.",
  },
  starterCategories: ["Café da Manhã", "Românticas", "Aniversário", "Chocolate"],
  palettes: [
    { name: "Terracota", primary: "#9a4a36", secondary: "#d9b27c" },
    { name: "Vinho", primary: "#7a2e3b", secondary: "#e3c3a5" },
    { name: "Rosé", primary: "#b0566a", secondary: "#f0d3cf" },
    { name: "Oliva", primary: "#5d6b3a", secondary: "#e6d9b8" },
    { name: "Azul petróleo", primary: "#2f5d62", secondary: "#e9d8b4" },
    { name: "Chocolate", primary: "#5a3a2b", secondary: "#e8c39e" },
    { name: "Lavanda", primary: "#6b5b95", secondary: "#e7dff3" },
    { name: "Grafite", primary: "#3b3a3a", secondary: "#e3c07a" },
  ],
  styles: [
    { id: "classico", name: "Clássico", description: "Títulos com serifa, elegante" },
    { id: "moderno", name: "Moderno", description: "Letras retas, visual limpo" },
    { id: "delicado", name: "Delicado", description: "Cantos bem arredondados, suave" },
  ],
};
