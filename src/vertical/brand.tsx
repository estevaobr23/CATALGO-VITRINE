/** Marca CestaVitrine: uma cesta com alça formando um arco de vitrine. */
export function LogoMark({ className = "h-8 w-8", tone = "primary" }: { className?: string; tone?: "primary" | "white" }) {
  const bg = tone === "white" ? "#ffffff" : "var(--primary)";
  const fg = tone === "white" ? "var(--primary)" : "#ffffff";
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" rx="11" fill={bg} />
      <path d="M11 18c0-6 4-10 9-10s9 4 9 10" fill="none" stroke={fg} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M8 18h24l-2.6 12.2A2.5 2.5 0 0 1 27 32H13a2.5 2.5 0 0 1-2.4-1.8z" fill={fg} />
      <path d="M14 22.5v5M20 22.5v5M26 22.5v5" stroke={bg} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className = "", tone = "primary" }: { className?: string; tone?: "primary" | "white" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark tone={tone} />
      <span className={`font-display text-xl font-semibold tracking-tight ${tone === "white" ? "text-white" : "text-ink"}`}>
        Cesta<span className={tone === "white" ? "text-on-dark" : "text-primary"}>Vitrine</span>
      </span>
    </span>
  );
}
