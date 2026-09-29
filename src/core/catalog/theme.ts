import type { CSSProperties } from "react";
import type { CatalogTheme } from "./types";

const HEX = /^#[0-9a-f]{6}$/i;
export const DEFAULT_PRIMARY = "#9a4a36";
export const DEFAULT_SECONDARY = "#d9b27c";

export function safeHex(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : fallback;
}

export function sanitizeTheme(input: unknown, styleIds: string[]): CatalogTheme {
  const t = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    primary: safeHex(t.primary, DEFAULT_PRIMARY),
    secondary: safeHex(t.secondary, DEFAULT_SECONDARY),
    style: typeof t.style === "string" && styleIds.includes(t.style) ? t.style : styleIds[0],
  };
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Cor de texto legível sobre a cor dada (luminância relativa WCAG). */
export function readableOn(hex: string): string {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l > 0.45 ? "#1f1715" : "#ffffff";
}

/** Variáveis CSS da vitrine: tudo que a loja pinta vem daqui. */
export function themeStyle(theme: CatalogTheme): CSSProperties {
  const primary = safeHex(theme.primary, DEFAULT_PRIMARY);
  const secondary = safeHex(theme.secondary, DEFAULT_SECONDARY);
  const style = theme.style ?? "classico";
  return {
    "--store-primary": primary,
    "--store-on-primary": readableOn(primary),
    "--store-secondary": secondary,
    "--store-on-secondary": readableOn(secondary),
    "--store-radius": style === "delicado" ? "1.5rem" : style === "moderno" ? "0.75rem" : "1rem",
    "--store-heading": style === "classico" ? "var(--font-serif)" : "var(--font-sans)",
  } as CSSProperties;
}
