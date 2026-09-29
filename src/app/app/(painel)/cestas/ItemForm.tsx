"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { ImageField } from "@/core/ui/ImageField";
import { SubmitButton } from "@/core/ui/SubmitButton";
import { useToast } from "@/core/ui/toast";
import { blockWhileUploading } from "@/core/ui/upload-guard";
import type { AttributeField, Vocabulary } from "@/core/vertical-types";
import { saveItem } from "../item-actions";

export type ItemFormValues = {
  id?: string;
  name: string;
  summary: string;
  description: string;
  features: string[];
  price_mode: "fixed" | "from" | "on_request";
  price: string;
  compare_at_price: string;
  category_id: string;
  is_visible: boolean;
  is_available: boolean;
  is_featured: boolean;
  attributes: Record<string, string>;
  image_path: string | null;
  extras: { name: string; price: string }[];
};

let uid = 0;
const nextId = () => ++uid;

function useList<T>(initial: T[], blank: T) {
  const [rows, setRows] = useState(() => (initial.length ? initial : [blank]).map((v) => ({ id: nextId(), v })));
  return {
    rows,
    add: () => setRows((r) => [...r, { id: nextId(), v: blank }]),
    remove: (id: number) => setRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : [{ id: nextId(), v: blank }])),
  };
}

export function ItemForm({
  catalogId,
  values,
  categories,
  vocabulary: V,
  attributes,
}: {
  catalogId: string;
  values: ItemFormValues;
  categories: { id: string; name: string }[];
  vocabulary: Vocabulary;
  attributes: AttributeField[];
}) {
  const [state, action] = useActionState(saveItem, undefined);
  const toast = useToast();
  const [mode, setMode] = useState(values.price_mode);
  const features = useList(values.features, "");
  const extras = useList(values.extras, { name: "", price: "" });
  const [showExtras, setShowExtras] = useState(values.extras.length > 0);
  const featureBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state && !state.ok) toast(state.message, "error");
  }, [state, toast]);

  return (
    <form action={action} className="space-y-6" onSubmit={(e) => blockWhileUploading(e, (m) => toast(m, "error"))}>
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <section className="card space-y-5 p-5">
        <ImageField catalogId={catalogId} folder="items" name="image_path" initialPath={values.image_path} label="Foto da cesta" emptyText="Toque para enviar a foto da cesta" />

        <div>
          <label className="label" htmlFor="name">Nome da {V.item.singular}</label>
          <input id="name" name="name" required maxLength={140} defaultValue={values.name} placeholder="Ex.: Cesta Romântica Premium" className="field" />
        </div>

        <div>
          <label className="label" htmlFor="category_id">Categoria</label>
          <select id="category_id" name="category_id" defaultValue={values.category_id} className="field">
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {categories.length === 0 && (
            <p className="hint">
              Você ainda não tem categorias. <Link href="/app/categorias" className="font-semibold text-primary">Criar categorias</Link>
            </p>
          )}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">Preço</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de preço">
          {([
            ["fixed", "Preço fixo"],
            ["from", "A partir de"],
            ["on_request", "Sob consulta"],
          ] as const).map(([value, label]) => (
            <label key={value} className={`cursor-pointer rounded-xl border px-2 py-2.5 text-center text-sm font-medium transition ${mode === value ? "border-primary bg-primary-soft text-primary" : "border-line bg-white text-body"}`}>
              <input type="radio" name="price_mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
        {mode !== "on_request" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="price">Preço (R$)</label>
              <input id="price" name="price" inputMode="decimal" required defaultValue={values.price} placeholder="149,90" className="field" />
            </div>
            <div>
              <label className="label" htmlFor="compare_at_price">Preço “de” <span className="font-normal text-body">(opcional)</span></label>
              <input id="compare_at_price" name="compare_at_price" inputMode="decimal" defaultValue={values.compare_at_price} placeholder="179,90" className="field" />
              <p className="hint">Aparece riscado, para mostrar desconto.</p>
            </div>
          </div>
        )}
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-semibold">{V.features}</h2>
          <p className="text-xs text-body">Um item por linha. Aparece como lista na vitrine.</p>
        </div>
        <div ref={featureBox} className="space-y-2">
          {features.rows.map((row, i) => (
            <div key={row.id} className="flex gap-2">
              <input
                name="features"
                defaultValue={row.v}
                maxLength={120}
                placeholder={i === 0 ? V.featuresPlaceholder : "Mais um item"}
                className="field"
                aria-label={`Item ${i + 1}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    features.add();
                    setTimeout(() => featureBox.current?.querySelectorAll("input")[i + 1]?.focus(), 0);
                  }
                }}
              />
              <button type="button" onClick={() => features.remove(row.id)} className="btn-ghost min-h-11 w-11 shrink-0 px-0" aria-label="Remover item">✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={features.add} className="btn-secondary min-h-9 px-3 py-1.5 text-xs">+ Adicionar item</button>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="summary">Resumo curto <span className="font-normal text-body">(aparece no card)</span></label>
          <input id="summary" name="summary" maxLength={300} defaultValue={values.summary} placeholder="Ideal para surpreender no Dia dos Namorados" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="description">Descrição <span className="font-normal text-body">(opcional)</span></label>
          <textarea id="description" name="description" rows={4} maxLength={5000} defaultValue={values.description} placeholder="Conte os detalhes: personalização, embalagem, recados..." className="field" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {attributes.map((f) => (
            <div key={f.key}>
              <label className="label" htmlFor={`attr_${f.key}`}>{f.label} <span className="font-normal text-body">(opcional)</span></label>
              <input
                id={`attr_${f.key}`}
                name={`attr_${f.key}`}
                defaultValue={values.attributes[f.key] ?? ""}
                placeholder={f.placeholder}
                className="field"
                {...(f.type === "number" ? { type: "number", min: f.min, max: f.max, inputMode: "numeric" as const } : { maxLength: f.maxLength })}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{V.extras}</h2>
            <p className="text-xs text-body">Itens que o cliente pode acrescentar: balão, cartão, pelúcia...</p>
          </div>
          {!showExtras && (
            <button type="button" onClick={() => setShowExtras(true)} className="btn-secondary min-h-9 shrink-0 px-3 py-1.5 text-xs">+ Adicionais</button>
          )}
        </div>
        {showExtras && (
          <>
            <div className="space-y-2">
              {extras.rows.map((row, i) => (
                <div key={row.id} className="flex gap-2">
                  <input name="extra_name" defaultValue={row.v.name} maxLength={80} placeholder={i === 0 ? "Balão metalizado" : "Nome do adicional"} className="field" aria-label={`Adicional ${i + 1}`} />
                  <input name="extra_price" defaultValue={row.v.price} inputMode="decimal" placeholder="+ R$ 15,00" className="field w-32 shrink-0" aria-label={`Valor do adicional ${i + 1}`} />
                  <button type="button" onClick={() => extras.remove(row.id)} className="btn-ghost min-h-11 w-11 shrink-0 px-0" aria-label="Remover adicional">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={extras.add} className="btn-secondary min-h-9 px-3 py-1.5 text-xs">+ Outro adicional</button>
          </>
        )}
      </section>

      <section className="card divide-y divide-line">
        {([
          ["is_visible", "Mostrar na vitrine", "Desmarque para esconder sem apagar.", values.is_visible],
          ["is_available", "Disponível para pedido", "Desmarque se estiver esgotada. Ela continua aparecendo, marcada como esgotada.", values.is_available],
          ["is_featured", "Destaque", "Aparece com um selo de destaque.", values.is_featured],
        ] as const).map(([name, label, hint, checked]) => (
          <label key={name} className="flex cursor-pointer items-start gap-3 p-4">
            <input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
            <span className="text-sm">
              <b className="text-ink">{label}</b>
              <span className="block text-body">{hint}</span>
            </span>
          </label>
        ))}
      </section>

      {state && !state.ok && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.message}</p>
      )}

      <div className="sticky bottom-20 z-20 -mx-4 flex flex-col gap-2 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:flex-row md:bottom-0">
        <SubmitButton className="btn-primary flex-1">{values.id ? "Salvar alterações" : `Adicionar ${V.item.singular}`}</SubmitButton>
        {!values.id && (
          <button type="submit" name="after" value="new" className="btn-secondary">Salvar e adicionar outra</button>
        )}
        <Link href="/app/cestas" className="btn-ghost">Cancelar</Link>
      </div>
    </form>
  );
}
