// Formato devolvido por public.get_public_catalog (whitelist do banco).

export type PublicOptionValue = {
  id: string;
  name: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  is_available: boolean;
};

export type PublicOptionGroup = {
  id: string;
  name: string;
  selection: "single" | "multiple";
  pricing: "add" | "replace";
  min_select: number;
  max_select: number | null;
  values: PublicOptionValue[];
};

export type PublicMedia = {
  id: string;
  kind: "image" | "before_after" | "video_embed";
  storage_path: string | null;
  alt_text: string | null;
  caption: string | null;
};

export type PublicItem = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  summary: string | null;
  description: string | null;
  features: string[];
  price_mode: "fixed" | "from" | "on_request";
  price_cents: number | null;
  compare_at_price_cents: number | null;
  is_available: boolean;
  is_featured: boolean;
  cta_label: string | null;
  cta_message: string | null;
  attributes: Record<string, unknown>;
  options: PublicOptionGroup[];
  media: PublicMedia[];
};

export type CatalogTheme = {
  primary?: string;
  secondary?: string;
  style?: string;
};

export type PublicCatalog = {
  catalog: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    whatsapp: string | null;
    logo_path: string | null;
    cover_path: string | null;
    contact: Record<string, unknown>;
    theme: CatalogTheme;
    /** Documento de seções (catalogs.layout). Normalizado antes de usar. */
    layout: unknown;
    attributes: Record<string, unknown>;
    plan_features: string[];
  };
  categories: { id: string; name: string; slug: string; description: string | null }[];
  items: PublicItem[];
  /** Mídia do catálogo (item_id nulo) = galeria/portfólio. */
  gallery: PublicMedia[];
  /** Só vem preenchido quando o plano tem o recurso 'testimonials'. */
  testimonials: PublicTestimonial[];
};

export type PublicTestimonial = {
  id: string;
  item_id: string | null;
  author_name: string;
  author_photo_path: string | null;
  rating: number | null;
  body: string | null;
  given_on: string | null;
};
