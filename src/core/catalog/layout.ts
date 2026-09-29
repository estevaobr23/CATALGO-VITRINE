/**
 * Documento de layout da vitrine — mora em catalogs.layout (jsonb, ≤256 KB).
 * O core define a MECÂNICA (ordem, ligar/desligar, recurso de plano); quais
 * seções existem e como se chamam é da vertical (src/vertical/sections.ts).
 *
 * Compatibilidade: vitrine sem layout (ou com layout de versão antiga) cai no
 * padrão. Nenhuma migration é necessária para adicionar uma seção nova.
 */

export const LAYOUT_SCHEMA_VERSION = 1;

/** Campos que uma seção pode pedir no editor. */
export type SectionFieldDef =
  | { key: string; label: string; type: "text"; maxLength: number; placeholder?: string; hint?: string }
  | { key: string; label: string; type: "textarea"; maxLength: number; placeholder?: string; hint?: string }
  | { key: string; label: string; type: "url"; maxLength: number; placeholder?: string; hint?: string };

export type SectionDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Esqueleto da vitrine: não pode ser removido nem desligado. */
  locked?: boolean;
  /** Recurso de plano exigido pelo banco (ex.: 'video', 'testimonials'). */
  feature?: string;
  /** Só pode existir uma vez na vitrine (todas hoje; multi fica para depois). */
  fields?: SectionFieldDef[];
  /** Conteúdo vem de outra tela do painel (depoimentos, galeria). */
  managedAt?: { href: string; label: string };
};

export type SectionState = {
  id: string;
  enabled: boolean;
  data?: Record<string, string>;
};

export type CatalogLayout = {
  schemaVersion: number;
  sections: SectionState[];
};

/**
 * Normaliza o layout guardado contra o catálogo de seções da vertical:
 * remove seção desconhecida, acrescenta seção nova no fim (desligada),
 * força as travadas a existirem e ficarem ligadas, e limpa campos estranhos.
 * É o que permite lançar uma seção nova sem tocar em vitrine nenhuma.
 */
export function normalizeLayout(raw: unknown, defs: SectionDef[]): CatalogLayout {
  const byId = new Map(defs.map((d) => [d.id, d]));
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<CatalogLayout>;
  const stored = Array.isArray(input.sections) ? input.sections : [];

  const seen = new Set<string>();
  const sections: SectionState[] = [];

  for (const item of stored) {
    if (!item || typeof item !== "object") continue;
    const def = byId.get(String((item as SectionState).id));
    if (!def || seen.has(def.id)) continue;
    seen.add(def.id);
    sections.push({
      id: def.id,
      enabled: def.locked ? true : (item as SectionState).enabled !== false,
      data: sanitizeSectionData(def, (item as SectionState).data),
    });
  }

  // seções novas (ou primeira visita): travadas entram ligadas, o resto desligado
  for (const def of defs) {
    if (seen.has(def.id)) continue;
    const isFirstVisit = stored.length === 0;
    sections.push({
      id: def.id,
      enabled: def.locked ? true : isFirstVisit && !def.feature ? defaultOn(def.id) : false,
      data: sanitizeSectionData(def, undefined),
    });
  }

  // travadas nunca podem ficar fora da ordem natural do topo
  sections.sort((a, b) => Number(isPinnedTop(b.id, byId)) - Number(isPinnedTop(a.id, byId)));

  return { schemaVersion: LAYOUT_SCHEMA_VERSION, sections };
}

function isPinnedTop(id: string, byId: Map<string, SectionDef>) {
  return byId.get(id)?.locked === true && id === "header";
}

/** Seções que já vêm ligadas numa vitrine nova (as demais a pessoa escolhe). */
function defaultOn(id: string) {
  return id === "contato";
}

function sanitizeSectionData(def: SectionDef, data: unknown): Record<string, string> | undefined {
  if (!def.fields?.length) return undefined;
  const input = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const field of def.fields) {
    const value = typeof input[field.key] === "string" ? (input[field.key] as string).trim() : "";
    if (!value) continue;
    if (field.type === "url" && !/^https:\/\//i.test(value)) continue;
    out[field.key] = value.slice(0, field.maxLength);
  }
  return out;
}

/** Seções visíveis na vitrine, na ordem, já filtrando recurso de plano. */
export function visibleSections(layout: CatalogLayout, defs: SectionDef[], planFeatures: string[]): SectionState[] {
  const byId = new Map(defs.map((d) => [d.id, d]));
  return layout.sections.filter((s) => {
    const def = byId.get(s.id);
    if (!def || !s.enabled) return false;
    return !def.feature || planFeatures.includes(def.feature);
  });
}
