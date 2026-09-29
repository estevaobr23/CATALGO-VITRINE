import Image from "next/image";
import Link from "next/link";
import { ActionForm } from "@/core/ui/ActionForm";
import { EmptyState } from "@/core/ui/EmptyState";
import { ImageField, CameraIcon } from "@/core/ui/ImageField";
import { SubmitButton } from "@/core/ui/SubmitButton";
import { publicMediaUrl } from "@/core/supabase/env";
import { painelCtx } from "../ctx";
import { addGalleryPhoto, deleteGalleryPhoto } from "../content-actions";

export default async function GalleryPage() {
  const { catalog, supabase } = await painelCtx();
  const { data: photos } = await supabase
    .from("media")
    .select("id, storage_path, caption")
    .eq("catalog_id", catalog.id)
    .is("item_id", null)
    .order("sort_order");
  const list = photos ?? [];

  return (
    <div className="space-y-5">
      <div>
        <Link href="/app/aparencia" className="text-sm text-body hover:text-ink">← Aparência</Link>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Galeria de fotos</h1>
        <p className="mt-1 text-sm text-body">
          Fotos de cestas que você já entregou. Aparecem na vitrine como portfólio, sem preço e sem botão de pedido.
        </p>
      </div>

      {list.length < 12 && (
        <ActionForm action={addGalleryPhoto} resetOnSuccess className="card space-y-4 p-5">
          <ImageField catalogId={catalog.id} folder="items" name="storage_path" initialPath={null} label="Nova foto" emptyText="Toque para enviar uma foto" />
          <div>
            <label className="label" htmlFor="caption">Legenda <span className="font-normal text-body">(opcional)</span></label>
            <input id="caption" name="caption" maxLength={300} placeholder="Cesta entregue no Dia das Mães" className="field" />
          </div>
          <SubmitButton>Adicionar à galeria</SubmitButton>
        </ActionForm>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<CameraIcon />}
          title="Nenhuma foto na galeria"
          text="Envie fotos das cestas que você já entregou. É o que mostra ao cliente que você entrega de verdade o que está na foto."
        />
      ) : (
        <>
          <p className="text-xs text-body">{list.length} de 12 fotos</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((p) => (
              <li key={p.id} className="card overflow-hidden">
                <div className="relative aspect-square bg-bg-deep">
                  {p.storage_path && <Image src={publicMediaUrl(p.storage_path)!} alt={p.caption ?? ""} fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover" />}
                </div>
                <div className="flex items-center justify-between gap-2 p-2">
                  <p className="min-w-0 flex-1 truncate text-xs text-body">{p.caption || "Sem legenda"}</p>
                  <ActionForm action={deleteGalleryPhoto} confirm="Remover esta foto da galeria?">
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton className="btn-ghost min-h-8 px-2 py-1 text-xs text-danger" pendingText="...">Remover</SubmitButton>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
