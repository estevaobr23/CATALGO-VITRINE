import type { CSSProperties, ReactNode } from "react";

/**
 * Celular 9:16 em CSS puro: moldura metálica, Dynamic Island, barra de status,
 * botões laterais, reflexo no vidro e indicador de home. O conteúdo da tela usa
 * unidades cqw (% da largura da tela), então escala junto em qualquer tamanho.
 */
export function Device({
  children,
  width = "16rem",
  statusLight = false,
  className = "",
  style,
  label,
}: {
  children: ReactNode;
  width?: string;
  statusLight?: boolean;
  className?: string;
  style?: CSSProperties;
  label?: string;
}) {
  return (
    <div
      className={`dv ${className}`}
      style={{ "--dv-w": width, ...style } as CSSProperties}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <span className="dv-btn dv-btn--silent" aria-hidden />
      <span className="dv-btn dv-btn--vup" aria-hidden />
      <span className="dv-btn dv-btn--vdown" aria-hidden />
      <span className="dv-btn dv-btn--power" aria-hidden />
      <div className="dv-frame">
        <div className="dv-screen">
          <div className="dv-content">{children}</div>
          <div className={`dv-status ${statusLight ? "dv-status--light" : ""}`} aria-hidden>
            <span>9:41</span>
            <span className="dv-status-icons">
              <span className="dv-bars">
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="dv-batt" />
            </span>
          </div>
          <div className="dv-island" aria-hidden />
          <div className="dv-home" aria-hidden />
          <div className="dv-glare" aria-hidden />
        </div>
      </div>
    </div>
  );
}

/** Cartão de vidro flutuante: sempre um RESULTADO, nunca um recurso. */
export function GlassNote({
  icon,
  title,
  text,
  className = "",
  tone = "wa",
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  className?: string;
  tone?: "wa" | "brand" | "buy";
}) {
  const bg = tone === "wa" ? "#25d366" : tone === "buy" ? "#06a742" : "var(--lp-auth)";
  return (
    <div className={`glass flex items-start gap-2 p-2 sm:gap-2.5 sm:p-3 ${className}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.55rem] text-white sm:h-9 sm:w-9" style={{ background: bg }}>
        {icon ?? <WaGlyph className="h-4 w-4 sm:h-5 sm:w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold sm:text-[13px]">{title}</p>
        {text && <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[var(--lp-body)] sm:text-[12px]">{text}</p>}
      </div>
    </div>
  );
}

export function WaGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.08c-.24.68-1.42 1.3-1.95 1.35-.5.05-1.13.07-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.65.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.17-.3.37-.43.5-.14.14-.29.3-.13.59.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.41.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.38-.24.65-.14.26.1 1.68.79 1.97.94.29.14.48.21.55.33.07.12.07.68-.17 1.36z" />
    </svg>
  );
}
