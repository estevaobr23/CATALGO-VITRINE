import { formatCents } from "./format";

export type CtaVars = {
  loja: string;
  item?: string;
  preco?: string;
  opcoes?: string;
  link?: string;
};

// Só texto puro: a mensagem vai inteira para encodeURIComponent, e o número
// é validado como dígitos. Nada do usuário vira HTML nem URL crua.
export function fillTemplate(template: string, vars: CtaVars): string {
  return template
    .replace(/\{(loja|item|preco|opcoes|link)\}/g, (_, key: keyof CtaVars) => vars[key] ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildWhatsappUrl(whatsapp: string | null | undefined, message: string): string | null {
  const digits = String(whatsapp ?? "").replace(/\D/g, "");
  if (!/^[1-9][0-9]{9,14}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message.slice(0, 1500))}`;
}

export function describePrice(item: {
  price_mode: string;
  price_cents: number | null;
}, totalCents?: number | null): string {
  if (item.price_mode === "on_request") return "valor sob consulta";
  const cents = totalCents ?? item.price_cents;
  if (cents == null) return "valor sob consulta";
  return item.price_mode === "from" && totalCents == null ? `a partir de ${formatCents(cents)}` : formatCents(cents);
}

export function describeSelectedOptions(labels: string[], extrasLabel: string): string {
  if (!labels.length) return "";
  return `\n${extrasLabel}: ${labels.join(", ")}`;
}
