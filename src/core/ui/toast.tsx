"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Toast = { id: number; message: string; tone: "success" | "error" };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`animate-fade-up pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              t.tone === "error" ? "bg-danger text-white" : "bg-ink text-white"
            }`}
          >
            <span aria-hidden>{t.tone === "error" ? "!" : "✓"}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/** Mostra um aviso vindo da URL (?ok=... ou ?erro=...) depois de um redirect de Server Action. */
export function FlashFromUrl({ message, tone = "success" }: { message?: string | null; tone?: Toast["tone"] }) {
  const toast = useToast();
  useEffect(() => {
    if (!message) return;
    toast(message, tone);
    const url = new URL(window.location.href);
    url.searchParams.delete("ok");
    url.searchParams.delete("erro");
    window.history.replaceState(null, "", url.toString());
  }, [message, tone, toast]);
  return null;
}
