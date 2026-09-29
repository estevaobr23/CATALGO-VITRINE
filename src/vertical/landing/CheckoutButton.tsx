"use client";

/**
 * Anexa a query string da página (utm_*, fbclid, sck...) ao link do checkout.
 * Sem isso, venda de anúncio chega na Cakto sem origem (skill saas-padrao-pgv §2.1).
 */
export function withUtm(baseUrl: string): string {
  if (typeof window === "undefined") return baseUrl;
  const incoming = window.location.search;
  if (!incoming || incoming === "?") return baseUrl;
  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${incoming.slice(1)}`;
}

export function CheckoutButton({
  url,
  children,
  className = "",
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  // PENDENTE DE CREDENCIAL: sem URL da Cakto o botão não finge que funciona
  if (!url) {
    return (
      <span className={`${className} cursor-not-allowed opacity-60`} title="Configure NEXT_PUBLIC_CHECKOUT_URL_* no ambiente">
        Checkout em configuração
      </span>
    );
  }
  return (
    <a
      href={url}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        window.location.href = withUtm(url);
      }}
    >
      {children}
    </a>
  );
}
