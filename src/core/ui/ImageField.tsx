"use client";
import { useRef, useState } from "react";
import { publicMediaUrl } from "@/core/supabase/env";
import { uploadCatalogImage, type MediaFolder } from "@/core/storage/upload";
import { Spinner } from "./SubmitButton";
import { useToast } from "./toast";

/**
 * Campo de imagem: envia na hora para o Storage e guarda o PATH num input
 * hidden (`name`). O formulário salva o path; a Server Action apaga o
 * arquivo antigo quando ele é trocado ou removido.
 */
export function ImageField({
  catalogId,
  folder,
  name,
  initialPath,
  label,
  shape = "wide",
  emptyText = "Toque para enviar uma foto",
  onChange,
}: {
  catalogId: string;
  folder: MediaFolder;
  name: string;
  initialPath: string | null;
  label: string;
  shape?: "wide" | "square" | "round";
  emptyText?: string;
  /** Avisa a tela (ex.: prévia ao vivo) quando o path muda. */
  onChange?: (path: string | null) => void;
}) {
  const [path, setPath] = useState<string | null>(initialPath);
  const [preview, setPreview] = useState<string | null>(publicMediaUrl(initialPath));
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    const local = URL.createObjectURL(file);
    const result = await uploadCatalogImage(catalogId, folder, file);
    setBusy(false);
    if ("error" in result) {
      URL.revokeObjectURL(local);
      toast(result.error, "error");
      return;
    }
    setPath(result.path);
    setPreview(local);
    onChange?.(result.path);
    toast("Foto enviada. Lembre de salvar.");
  }

  const box =
    shape === "round"
      ? "h-28 w-28 rounded-full"
      : shape === "square"
        ? "aspect-square w-full max-w-xs rounded-2xl"
        : "aspect-[4/3] w-full rounded-2xl";

  return (
    <div>
      <span className="label">{label}</span>
      {/* data-uploading: o formulário não salva enquanto a foto ainda está subindo */}
      <input type="hidden" name={name} value={path ?? ""} data-uploading={busy ? "true" : undefined} />
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" className="sr-only" onChange={onPick} tabIndex={-1} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className={`relative flex items-center justify-center overflow-hidden border-2 border-dashed border-line bg-bg-deep text-body transition hover:border-primary/50 ${box}`}
        aria-label={preview ? `Trocar ${label.toLowerCase()}` : `Enviar ${label.toLowerCase()}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview local (blob:) ou do bucket
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 px-4 text-center text-sm">
            <CameraIcon />
            {emptyText}
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center gap-2 bg-white/80 text-sm font-medium text-ink">
            <Spinner /> Enviando...
          </span>
        )}
      </button>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary min-h-9 px-3 py-1.5 text-xs" onClick={() => input.current?.click()} disabled={busy}>
          {preview ? "Trocar foto" : "Enviar foto"}
        </button>
        {preview && (
          <button
            type="button"
            className="btn-ghost min-h-9 px-3 py-1.5 text-xs text-danger"
            onClick={() => {
              setPath(null);
              setPreview(null);
              onChange?.(null);
            }}
            disabled={busy}
          >
            Remover
          </button>
        )}
      </div>
      <p className="hint">JPG, PNG ou WebP. A foto é compactada automaticamente.</p>
    </div>
  );
}

export function CameraIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
