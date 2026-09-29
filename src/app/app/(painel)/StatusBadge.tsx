const LABELS: Record<string, { text: string; className: string }> = {
  published: { text: "No ar", className: "bg-success/10 text-success" },
  draft: { text: "Não publicada", className: "bg-accent-soft text-ink" },
  suspended: { text: "Fora do ar (acesso encerrado)", className: "bg-danger/10 text-danger" },
  archived: { text: "Arquivada", className: "bg-bg-deep text-body" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = LABELS[status] ?? LABELS.draft;
  return (
    <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {s.text}
    </span>
  );
}
