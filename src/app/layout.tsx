import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Meta Pixel oficial (Gerenciador de Eventos). Script documentado publicamente
// pela Meta — https://developers.facebook.com/docs/meta-pixel/get-started —
// sem ofuscação: qualquer pessoa consegue ler o que ele faz.
const META_PIXEL_ID = "1448193050495748";

// Pixel oficial da UTMify (https://cdn.utmify.com.br/scripts/pixel/pixel.js).
// Carregado de forma explícita — sem o wrapper ofuscado que a UTMify distribui
// por padrão — para que o script seja auditável.
const UTMIFY_PIXEL_ID = "6abc847b789fcd1a07a281cd";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "CestaVitrine — sua vitrine digital de cestas", template: "%s" },
  description:
    "Cadastre suas cestas com foto, preço e composição, receba seu próprio link e deixe o cliente escolher. O pedido chega pelo WhatsApp com a cesta identificada.",
  applicationName: "CestaVitrine",
};

export const viewport: Viewport = {
  themeColor: "#8f3f2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        <Script id="utmify-pixel-config" strategy="afterInteractive">
          {`window.pixelId = "${UTMIFY_PIXEL_ID}";`}
        </Script>
        <Script
          id="utmify-pixel"
          src="https://cdn.utmify.com.br/scripts/pixel/pixel.js"
          strategy="afterInteractive"
          async
          defer
        />
      </body>
    </html>
  );
}
