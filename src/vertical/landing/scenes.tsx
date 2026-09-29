import Image from "next/image";
import { formatCents } from "@/core/catalog/format";
import { Device, WaGlyph } from "./Device";

/*
 * Cenas que rodam DENTRO do celular. Tudo em CSS (landing.css): nada de vídeo,
 * nada de GIF. Os dados vêm da vitrine demo "Encanto Cestas" — os mesmos
 * produtos, preços e adicionais que existem de verdade no sistema.
 */

const PHOTO = {
  romantica: "/demo/romantica-premium.webp",
  cafe: "/demo/cafe-da-manha.webp",
  festa: "/demo/aniversario.webp",
  choco: "/demo/chocolate.webp",
  mimo: "/demo/mimo-romantico.webp",
  mini: "/demo/cafe-mini.webp",
  logo: "/demo/logo.webp",
};

const EXTRAS = [
  { name: "Balão de coração", cents: 1500 },
  { name: "Pelúcia", cents: 2990 },
  { name: "Rosas extras", cents: 1990 },
];
const BASE = 14990;
const TOTALS = EXTRAS.reduce<number[]>((acc, e) => [...acc, acc[acc.length - 1] + e.cents], [BASE]);

// ─────────────── CENA A — o cliente marca os adicionais e o total sobe ───────────────

export function SceneAdicionais({ width }: { width?: string }) {
  return (
    <Device width={width} statusLight label="Cliente marcando adicionais na cesta e o total subindo">
      <div className="ui">
        <div className="sa-photo">
          <Image src={PHOTO.romantica} alt="" fill sizes="18rem" className="object-cover" />
        </div>
        <p className="sa-title">Cesta Romântica Premium</p>
        <p className="sa-price">{formatCents(BASE)}</p>
        <p className="sa-label">ADICIONAIS</p>
        {EXTRAS.map((e, i) => (
          <div key={e.name} className={`sa-row sa-row-${i + 1}`}>
            <span className="sa-chk">✓</span>
            <span>{e.name}</span>
            <b>+ {formatCents(e.cents)}</b>
          </div>
        ))}
        <div className="sa-foot">
          <div className="sa-total">
            Total:{" "}
            <span className="sa-tbox">
              {TOTALS.map((t, i) => (
                <span key={t} className={`sa-t sa-t${i}`}>
                  {formatCents(t)}
                </span>
              ))}
            </span>
          </div>
          <div className="sa-btn">
            <WaGlyph className="h-[4.6cqw] w-[4.6cqw]" /> Quero esta cesta
          </div>
        </div>
        <span className="finger sa-finger" aria-hidden />
      </div>
    </Device>
  );
}

export const ADICIONAIS_GANHO = TOTALS[TOTALS.length - 1] - BASE;
export const ADICIONAIS_TOTAL = TOTALS[TOTALS.length - 1];
export const ADICIONAIS_BASE = BASE;

// ─────────────── CENA B — PDF do concorrente (rascunho) ───────────────

export function ScenePdf({ width }: { width?: string }) {
  const thumbs = [PHOTO.romantica, PHOTO.cafe, PHOTO.festa, PHOTO.choco, PHOTO.mimo, PHOTO.mini, PHOTO.cafe, PHOTO.romantica, PHOTO.choco];
  return (
    <Device width={width} label="Catálogo em PDF: arquivo pesado, texto minúsculo e zoom para ler">
      <div className="ui pdf">
        <div className="pdf-bar">
          <b />
          <span className="truncate">catalogo_cestas_2024_final_v3.pdf</span>
        </div>
        <div className="pdf-page">
          <p>CATÁLOGO DE CESTAS — TABELA DE PREÇOS</p>
          <div className="pdf-grid">
            {thumbs.map((src, i) => (
              <span key={i} style={{ backgroundImage: `url(${src})` }} />
            ))}
          </div>
          <div className="pdf-lines">
            {Array.from({ length: 9 }).map((_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>
        <span className="pdf-pinch" aria-hidden />
        <div className="pdf-pager">Página 1 de 18</div>
        <div className="pdf-loading">
          <i />
          Baixando arquivo… 14,8 MB
        </div>
      </div>
    </Device>
  );
}

// ─────────────── CENA B — vitrine viva rolando ───────────────

const VITRINE = [
  { name: "Cesta Romântica Premium", price: 14990, src: PHOTO.romantica },
  { name: "Café da Manhã Especial", price: 12990, src: PHOTO.cafe },
  { name: "Festa na Cesta", price: 15990, src: PHOTO.festa },
  { name: "Chocolate Lovers", price: 11990, src: PHOTO.choco },
  { name: "Mimo Romântico", price: 8990, src: PHOTO.mimo },
  { name: "Café da Manhã Mini", price: 7990, src: PHOTO.mini },
];

export function SceneVitrine({ width }: { width?: string }) {
  return (
    <Device width={width} statusLight label="Vitrine de cestas: fotos grandes, categorias e preços legíveis">
      <div className="ui">
        <div className="vv-scroll">
          <div className="vv-cover" />
          <div className="vv-logo">
            <Image src={PHOTO.logo} alt="" fill sizes="4rem" className="object-cover" />
          </div>
          <p className="vv-name">Encanto Cestas</p>
          <p className="vv-desc">Cestas especiais para transformar momentos em presentes inesquecíveis.</p>
          <div className="vv-chips">
            <span className="vv-chip vv-chip--on">Todas</span>
            <span className="vv-chip">Café da Manhã</span>
            <span className="vv-chip">Românticas</span>
            <span className="vv-chip">Aniversário</span>
          </div>
          <div className="vv-grid">
            {VITRINE.map((v) => (
              <div key={v.name} className="vv-card">
                <div className="vv-card-img">
                  <Image src={v.src} alt="" fill sizes="8rem" className="object-cover" />
                </div>
                <p>{v.name}</p>
                <b>{formatCents(v.price)}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Device>
  );
}

// ─────────────── CENA C — do toque ao pedido no WhatsApp ───────────────

export function ScenePedido({ width, message, link }: { width?: string; message: string; link: string }) {
  const lines = message.split("\n").filter((l, i, a) => !(l === "" && a[i - 1] === ""));
  return (
    <Device width={width} statusLight label="Cliente toca em Quero esta cesta e o WhatsApp abre com o pedido escrito">
      {/* 1. a cesta na vitrine */}
      <div className="ui sc-shop">
        <div className="sc-photo">
          <Image src={PHOTO.romantica} alt="" fill sizes="18rem" className="object-cover" />
        </div>
        <div className="sc-body">
          <p className="sc-name">Cesta Romântica Premium</p>
          <p className="sc-price">{formatCents(BASE)}</p>
          <div className="sc-extra">
            <i>✓</i> Balão de coração <b>+ {formatCents(1500)}</b>
          </div>
          <p className="sc-total">
            Total com adicionais: <b>{formatCents(BASE + 1500)}</b>
          </p>
        </div>
        <div className="sc-btn">
          <WaGlyph className="h-[5cqw] w-[5cqw]" /> Quero esta cesta
        </div>
      </div>

      {/* 2. o WhatsApp abre com a mensagem pronta */}
      <div className="ui sc-wa">
        <div className="wa-head">
          <span className="wa-back">‹</span>
          <span className="wa-avatar">
            <Image src={PHOTO.logo} alt="" fill sizes="3rem" className="object-cover" />
          </span>
          <span className="wa-who">
            <b>Encanto Cestas</b>
            <span>online</span>
          </span>
        </div>
        <div className="wa-chat">
          <span className="wa-date">HOJE</span>
          <div className="wa-out">
            {lines.map((l, i) =>
              l === "" ? (
                <p key={i} className="h-[1.4cqw]" />
              ) : l.includes("/vitrine/") ? (
                <p key={i} className="wa-link">
                  {link}
                </p>
              ) : (
                <p key={i}>{l.split(/\*(.+?)\*/).map((part, j) => (j % 2 ? <b key={j}>{part}</b> : part))}</p>
              ),
            )}
            <div className="wa-meta">
              14:32 <span className="wa-ticks" />
            </div>
          </div>
          <div className="wa-in wa-typing" aria-hidden>
            <i />
            <i />
            <i />
          </div>
          <div className="wa-in wa-reply">
            Oiee! Temos sim 😊 Para qual dia você quer?
            <div className="wa-meta">14:33</div>
          </div>
        </div>
        <div className="wa-input">
          <div className="wa-field">
            Mensagem
            <span className="wa-draft">{lines[0]}</span>
          </div>
          <span className="wa-send">
            <svg viewBox="0 0 24 24" className="h-[4.6cqw] w-[4.6cqw]" fill="currentColor" aria-hidden>
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </span>
        </div>
      </div>

      <span className="finger sc-finger" aria-hidden />
    </Device>
  );
}

// ─────────────── MOCKUPS EXPLODIDOS (seção "O que é") ───────────────
// Um celular + as peças daquele recurso "saltando" para fora da tela.

function MiniStore() {
  return (
    <div className="ui">
      <div className="vv-cover" />
      <div className="vv-logo">
        <Image src={PHOTO.logo} alt="" fill sizes="4rem" className="object-cover" />
      </div>
      <p className="vv-name">Encanto Cestas</p>
      <p className="vv-desc">Cestas especiais para transformar momentos em presentes inesquecíveis.</p>
      <div className="vv-chips">
        <span className="vv-chip vv-chip--on">Todas</span>
        <span className="vv-chip">Românticas</span>
        <span className="vv-chip">Café</span>
      </div>
      <div className="vv-grid">
        {VITRINE.slice(0, 4).map((v) => (
          <div key={v.name} className="vv-card">
            <div className="vv-card-img">
              <Image src={v.src} alt="" fill sizes="6rem" className="object-cover" />
            </div>
            <p>{v.name}</p>
            <b>{formatCents(v.price)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExplodeMarca() {
  return (
    <div className="xp">
      <Device width="10.5rem" statusLight>
        <MiniStore />
      </Device>
      <div className="xp-part float-a left-0 top-3 h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-white -rotate-6">
        <Image src={PHOTO.logo} alt="" fill sizes="5rem" className="object-cover" />
      </div>
      <div className="xp-part float-b right-0 top-10 flex gap-1.5 rounded-2xl bg-white p-2 rotate-3">
        {["#9a4a36", "#d9b27c", "#7a2e3b", "#5d6b3a"].map((c) => (
          <span key={c} className="h-6 w-6 rounded-full ring-2 ring-white" style={{ background: c }} />
        ))}
      </div>
      <div className="xp-part float-c bottom-6 left-1 rounded-xl bg-white px-3 py-2 text-left -rotate-3">
        <p className="font-display text-sm font-semibold leading-tight">Encanto Cestas</p>
        <p className="text-[10px] text-[var(--lp-body)]">sua marca, suas cores</p>
      </div>
    </div>
  );
}

export function ExplodeFotos() {
  return (
    <div className="xp">
      <Device width="10.5rem" statusLight>
        <div className="ui">
          <div className="sc-photo" style={{ inset: "0 0 46% 0" }}>
            <Image src={PHOTO.cafe} alt="" fill sizes="10rem" className="object-cover" />
          </div>
          <div className="sc-body" style={{ top: "56%" }}>
            <p className="sc-name">Café da Manhã Especial</p>
            <p className="sc-price">{formatCents(12990)}</p>
          </div>
        </div>
      </Device>
      <div className="xp-part float-a right-0 top-6 rounded-xl bg-[var(--lp-alert)] px-3 py-2 rotate-6">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--lp-auth-deep)]">preço</p>
        <p className="font-display text-lg font-bold leading-none text-[var(--lp-auth-ink)]">{formatCents(12990)}</p>
      </div>
      <div className="xp-part float-b bottom-4 left-0 w-36 rounded-xl bg-white p-2.5 text-left -rotate-3">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-[var(--lp-body)]">O que vem na cesta</p>
        {["Pães artesanais", "Croissant", "Frutas", "Suco natural"].map((t) => (
          <p key={t} className="flex items-center gap-1.5 text-[11px] leading-snug">
            <span className="text-[var(--lp-hl)]">✓</span>
            {t}
          </p>
        ))}
      </div>
      <div className="xp-part float-c left-2 top-4 h-14 w-14 overflow-hidden rounded-lg border-[3px] border-white -rotate-12">
        <Image src={PHOTO.mini} alt="" fill sizes="4rem" className="object-cover" />
      </div>
    </div>
  );
}

export function ExplodeCategorias() {
  const chips = [
    { t: "Românticas", c: "left-0 top-6 -rotate-6 float-a" },
    { t: "Café da Manhã", c: "right-0 top-16 rotate-6 float-b" },
    { t: "Aniversário", c: "left-1 bottom-12 rotate-3 float-c" },
    { t: "Chocolate", c: "right-1 bottom-5 -rotate-3 float-a" },
  ];
  return (
    <div className="xp">
      <Device width="10.5rem" statusLight>
        <MiniStore />
      </Device>
      {chips.map((c, i) => (
        <span
          key={c.t}
          className={`xp-part ${c.c} rounded-full px-3.5 py-1.5 text-xs font-bold`}
          style={i === 0 ? { background: "#9a4a36", color: "#fff" } : { background: "#fff", color: "var(--lp-ink)" }}
        >
          {c.t}
        </span>
      ))}
    </div>
  );
}

export function ExplodeWhatsapp({ firstLine }: { firstLine: string }) {
  return (
    <div className="xp">
      <Device width="10.5rem" statusLight>
        <div className="ui">
          <div className="sc-photo" style={{ inset: "0 0 44% 0" }}>
            <Image src={PHOTO.romantica} alt="" fill sizes="10rem" className="object-cover" />
          </div>
          <div className="sc-body" style={{ top: "58%" }}>
            <p className="sc-name">Cesta Romântica Premium</p>
            <p className="sc-price">{formatCents(BASE)}</p>
          </div>
          <div className="sc-btn" style={{ animation: "none" }}>
            <WaGlyph className="h-[5cqw] w-[5cqw]" /> Quero esta cesta
          </div>
        </div>
      </Device>
      <div className="xp-part float-a right-0 top-4 w-44 rounded-2xl rounded-tr-sm bg-[#d9fdd3] p-2.5 text-left text-[11px] leading-snug text-[#111b21] rotate-3">
        {firstLine.split(/\*(.+?)\*/).map((part, j) => (j % 2 ? <b key={j}>{part}</b> : part))}
        <span className="mt-1 block text-right text-[9px] text-[#53bdeb]">14:32 ✓✓</span>
      </div>
      <div className="xp-part float-b bottom-8 left-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25d366] text-white -rotate-6">
        <WaGlyph className="h-7 w-7" />
      </div>
    </div>
  );
}
