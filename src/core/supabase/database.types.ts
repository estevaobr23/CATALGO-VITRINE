// Gerado a partir do banco (Supabase generate_typescript_types) e reduzido às
// tabelas/funções que o app usa. Regenere após mudar o schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type CatalogRow = {
  attributes: Json;
  contact: Json;
  cover_path: string | null;
  created_at: string;
  currency: string;
  description: string | null;
  id: string;
  layout: Json;
  logo_path: string | null;
  name: string;
  owner_id: string;
  product_id: string;
  published_at: string | null;
  slug: string;
  status: string;
  theme: Json;
  updated_at: string;
  whatsapp: string | null;
};

type CatalogRpc = {
  Returns: CatalogRow;
  SetofOptions: { from: "*"; to: "catalogs"; isOneToOne: true; isSetofReturn: false };
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      catalog_events: {
        Row: { catalog_id: string; event_type: string; id: number; item_id: string | null; occurred_at: string };
        Insert: { catalog_id: string; event_type: string; item_id?: string | null; occurred_at?: string };
        Update: { catalog_id?: string; event_type?: string; item_id?: string | null; occurred_at?: string };
        Relationships: [];
      };
      catalogs: {
        Row: CatalogRow;
        Insert: Partial<CatalogRow> & { name: string; owner_id: string; product_id: string; slug: string };
        Update: Partial<CatalogRow>;
        Relationships: [];
      };
      categories: {
        Row: {
          catalog_id: string;
          created_at: string;
          description: string | null;
          id: string;
          is_visible: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          catalog_id: string;
          description?: string | null;
          id?: string;
          is_visible?: boolean;
          name: string;
          slug?: string;
          sort_order?: number;
        };
        Update: {
          description?: string | null;
          is_visible?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      entitlements: {
        Row: {
          buyer_email: string;
          created_at: string;
          granted_at: string;
          id: string;
          plan_id: string;
          product_id: string;
          purchase_id: string | null;
          revoke_reason: string | null;
          revoked_at: string | null;
          source: string;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      item_option_groups: {
        Row: {
          catalog_id: string;
          created_at: string;
          id: string;
          item_id: string;
          max_select: number | null;
          min_select: number;
          name: string;
          pricing: string;
          selection: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          catalog_id: string;
          id?: string;
          item_id: string;
          max_select?: number | null;
          min_select?: number;
          name: string;
          pricing?: string;
          selection?: string;
          sort_order?: number;
        };
        Update: {
          max_select?: number | null;
          min_select?: number;
          name?: string;
          pricing?: string;
          selection?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      item_option_values: {
        Row: {
          catalog_id: string;
          compare_at_price_cents: number | null;
          created_at: string;
          group_id: string;
          id: string;
          is_available: boolean;
          name: string;
          price_cents: number;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          catalog_id: string;
          compare_at_price_cents?: number | null;
          group_id: string;
          id?: string;
          is_available?: boolean;
          name: string;
          price_cents?: number;
          sort_order?: number;
        };
        Update: {
          compare_at_price_cents?: number | null;
          is_available?: boolean;
          name?: string;
          price_cents?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      items: {
        Row: {
          attributes: Json;
          catalog_id: string;
          category_id: string | null;
          compare_at_price_cents: number | null;
          created_at: string;
          cta_label: string | null;
          cta_message: string | null;
          description: string | null;
          features: string[];
          id: string;
          is_available: boolean;
          is_featured: boolean;
          is_visible: boolean;
          kind: string;
          name: string;
          price_cents: number | null;
          price_mode: string;
          slug: string;
          sort_order: number;
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          attributes?: Json;
          catalog_id: string;
          category_id?: string | null;
          compare_at_price_cents?: number | null;
          cta_label?: string | null;
          cta_message?: string | null;
          description?: string | null;
          features?: string[];
          id?: string;
          is_available?: boolean;
          is_featured?: boolean;
          is_visible?: boolean;
          kind?: string;
          name: string;
          price_cents?: number | null;
          price_mode?: string;
          slug?: string;
          sort_order?: number;
          summary?: string | null;
        };
        Update: {
          attributes?: Json;
          category_id?: string | null;
          compare_at_price_cents?: number | null;
          cta_label?: string | null;
          cta_message?: string | null;
          description?: string | null;
          features?: string[];
          is_available?: boolean;
          is_featured?: boolean;
          is_visible?: boolean;
          kind?: string;
          name?: string;
          price_cents?: number | null;
          price_mode?: string;
          slug?: string;
          sort_order?: number;
          summary?: string | null;
        };
        Relationships: [];
      };
      media: {
        Row: {
          alt_text: string | null;
          attributes: Json;
          caption: string | null;
          catalog_id: string;
          created_at: string;
          external_url: string | null;
          id: string;
          is_featured: boolean;
          is_visible: boolean;
          item_id: string | null;
          kind: string;
          secondary_storage_path: string | null;
          sort_order: number;
          storage_path: string | null;
          updated_at: string;
        };
        Insert: {
          alt_text?: string | null;
          caption?: string | null;
          catalog_id: string;
          id?: string;
          is_featured?: boolean;
          is_visible?: boolean;
          item_id?: string | null;
          kind: string;
          sort_order?: number;
          storage_path?: string | null;
        };
        Update: {
          alt_text?: string | null;
          caption?: string | null;
          is_visible?: boolean;
          sort_order?: number;
          storage_path?: string | null;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          created_at: string;
          features: string[];
          id: string;
          key: string;
          limits: Json;
          name: string;
          product_id: string;
          rank: number;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      products: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          key: string;
          name: string;
          reserved_slugs: string[];
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      testimonials: {
        Row: {
          author_name: string;
          author_photo_path: string | null;
          body: string | null;
          catalog_id: string;
          created_at: string;
          given_on: string | null;
          id: string;
          is_visible: boolean;
          item_id: string | null;
          rating: number | null;
          sort_order: number;
          source: string;
          updated_at: string;
        };
        Insert: {
          author_name: string;
          author_photo_path?: string | null;
          body?: string | null;
          catalog_id: string;
          id?: string;
          is_visible?: boolean;
          item_id?: string | null;
          rating?: number | null;
          sort_order?: number;
        };
        Update: {
          author_name?: string;
          author_photo_path?: string | null;
          body?: string | null;
          is_visible?: boolean;
          item_id?: string | null;
          rating?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: { created_at: string; display_name: string | null; id: string; updated_at: string };
        Insert: never;
        Update: { display_name?: string | null };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      claim_my_entitlements: { Args: never; Returns: number };
      create_catalog: { Args: { p_name: string; p_product_key: string; p_slug?: string } } & CatalogRpc;
      get_public_catalog: { Args: { p_product_key: string; p_slug: string }; Returns: Json };
      set_catalog_archived: { Args: { p_archived: boolean; p_catalog_id: string } } & CatalogRpc;
      set_catalog_published: { Args: { p_catalog_id: string; p_published: boolean } } & CatalogRpc;
      track_catalog_event: {
        Args: { p_catalog_id: string; p_event_type: string; p_item_id?: string };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];
export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
