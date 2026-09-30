"use client";

const UTM_STORAGE_KEY = "cv_utm_params";

// Parâmetros que a UTMify e o gerenciador de anúncios usam para atribuir a venda.
const TRACKED_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "fbclid",
  "gclid",
  "sck",
  "src",
];

/**
 * Guarda os parâmetros de rastreio da primeira visita em sessionStorage.
 * Sem isso, um visitante que navega por mais de uma página antes de comprar
 * perde o utm_* assim que a URL não carrega mais a query string.
 */
function captureUtm() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const found = new URLSearchParams();
  for (const key of TRACKED_PARAMS) {
    const value = params.get(key);
    if (value) found.set(key, value);
  }
  if ([...found].length === 0) return;
  try {
    window.sessionStorage.setItem(UTM_STORAGE_KEY, found.toString());
  } catch {
    // sessionStorage indisponível (modo privado, etc.) — segue sem persistir
  }
}

function getStoredUtm(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(UTM_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

if (typeof window !== "undefined") {
  captureUtm();
}

/**
 * Anexa a query string da página (utm_*, fbclid, sck...) ao link do checkout.
 * Cai para o valor salvo em sessionStorage quando a URL atual não carrega
 * mais os parâmetros (ex.: usuário navegou para outra página antes de comprar).
 * Sem isso, venda de anúncio chega na Cakto sem origem (skill saas-padrao-pgv §2.1).
 */
export function withUtm(baseUrl: string): string {
  if (typeof window === "undefined") return baseUrl;
  const incoming = window.location.search.replace(/^\?/, "");
  const query = incoming || getStoredUtm();
  if (!query) return baseUrl;
  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${query}`;
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
