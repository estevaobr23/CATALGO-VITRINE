/**
 * Contrato entre o core e a vertical. O core só conhece estes tipos; os
 * valores (vocabulário, CTA, atributos) moram em src/vertical/config.ts.
 */

export type AttributeField =
  | { key: string; label: string; type: "text"; maxLength?: number; placeholder?: string }
  | { key: string; label: string; type: "number"; min?: number; max?: number; suffix?: string; placeholder?: string };

export type Vocabulary = {
  catalog: { singular: string; possessive: string }; // "vitrine", "Minha vitrine"
  item: { singular: string; plural: string; article: "a" | "o" }; // "cesta", "cestas", "a"
  category: { singular: string; plural: string };
  features: string; // rótulo de items.features: "O que vem na cesta"
  featuresPlaceholder: string;
  extras: string; // rótulo do grupo de opções 'add': "Adicionais"
  itemParam: string; // parâmetro de URL do link direto ("?cesta=slug")
};

export type VerticalConfig = {
  productKey: string; // = products.key
  brand: { name: string; watermark: string };
  vocabulary: Vocabulary;
  itemAttributes: AttributeField[];
  /** CTA. Variáveis: {item} {preco} {opcoes} {loja} {link} */
  cta: { label: string; message: string; fallbackMessage: string };
  starterCategories: string[];
  /** Paletas oferecidas em Aparência (a pessoa pode escolher outra cor). */
  palettes: { name: string; primary: string; secondary: string }[];
  styles: { id: string; name: string; description: string }[];
};
