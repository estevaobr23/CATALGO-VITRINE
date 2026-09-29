export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Sua marca", "Logo e cores", "Primeira cesta"];
  return (
    <ol className="flex items-center gap-2 text-xs font-medium" aria-label="Etapas">
      {steps.map((s, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "now" : "next";
        return (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={state === "now" ? "step" : undefined}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                state === "next" ? "bg-bg-deep text-body" : "bg-primary text-white"
              }`}
            >
              {state === "done" ? "✓" : n}
            </span>
            <span className={state === "next" ? "text-body" : "text-ink"}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
