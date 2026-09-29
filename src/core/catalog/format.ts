const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "";
  return brl.format(cents / 100);
}

/** "149,90" | "149.90" | "R$ 1.249,90" -> 14990. null se inválido. */
export function parsePriceToCents(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input).replace(/[^\d,.]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && s.length - lastDot - 1 !== 2 && s.length - lastDot - 1 !== 1) {
    s = s.replace(/\./g, ""); // "1.249" = milhar
  } else {
    s = s.replace(/,/g, "");
  }
  const value = Number(s);
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000) return null;
  return Math.round(value * 100);
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * WhatsApp em E.164 só com dígitos (o banco exige ^[1-9][0-9]{9,14}$).
 * Aceita "(11) 99999-8888" e assume Brasil (55) quando vier sem DDI.
 */
export function normalizeWhatsapp(input: string | null | undefined): string | null {
  const digits = String(input ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return null;
  const full = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return /^[1-9][0-9]{9,14}$/.test(full) ? full : null;
}

export function formatWhatsapp(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = e164.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : `+${e164}`;
}
