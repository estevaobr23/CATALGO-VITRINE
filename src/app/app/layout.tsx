import type { Metadata } from "next";
import { ToastProvider } from "@/core/ui/toast";

export const metadata: Metadata = { title: "Painel · CestaVitrine", robots: { index: false, follow: false } };

export default function AppRootLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
