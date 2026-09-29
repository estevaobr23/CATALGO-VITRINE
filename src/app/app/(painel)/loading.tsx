export default function PainelLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="h-8 w-48 rounded-lg bg-bg-deep" />
      <div className="h-4 w-72 max-w-full rounded bg-bg-deep" />
      <div className="h-28 rounded-2xl bg-bg-deep" />
      <div className="h-20 rounded-2xl bg-bg-deep" />
      <div className="h-20 rounded-2xl bg-bg-deep" />
    </div>
  );
}
