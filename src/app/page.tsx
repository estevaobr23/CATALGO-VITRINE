import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatCents } from "@/core/catalog/format";
import { fillTemplate } from "@/core/catalog/whatsapp";
import { Logo, LogoMark } from "@/vertical/brand";
import { vertical } from "@/vertical/config";
import { CheckoutButton } from "@/vertical/landing/CheckoutButton";
import { Device, GlassNote } from "@/vertical/landing/Device";
import {
  ADICIONAIS_BASE,
  ADICIONAIS_GANHO,
  ADICIONAIS_TOTAL,
  ExplodeCategorias,
  ExplodeFotos,
  ExplodeMarca,
  ExplodeWhatsapp,
  SceneAdicionais,
  ScenePdf,
  ScenePedido,
  SceneVitrine,
} from "@/vertical/landing/scenes";
import { offer } from "@/vertical/offer";
import "@/vertical/landing/landing.css";

export const metadata: Metadata = {
  title: "CestaVitrine — sua vitrine digital de cestas com pedido no WhatsApp",
  description:
    "Cadastre suas cestas com foto, preço e o que vem dentro. Receba seu link, envie para o cliente e o pedido chega no seu WhatsApp com a cesta identificada.",
  openGraph: {
    title: "Tenha sua própria vitrine digital de cestas",
    description: "Sua marca, suas fotos, seus preços. O cliente escolhe e o pedido chega no seu WhatsApp.",
    images: [{ url: "/marketing/og.webp", width: 1200, height: 630 }],
    locale: "pt_BR",
    type: "website",
  },
};

const DEMO_URL = "/vitrine/encanto-cestas";
const SITE_HOST = (process.env.NEXT_PUBLIC_SITE_URL || "https://seudominio.com.br").replace(/^https?:\/\//, "").replace(/\/$/, "");
const PRINTS = { vitrine: "/marketing/prints/vitrine.png", link: "/marketing/prints/link.png" };

// A mensagem do WhatsApp é gerada pelo MESMO template da vitrine real.
const demoLink = `${SITE_HOST}/vitrine/encanto-cestas?cesta=cesta-romantica-premium`;
const demoMessage = fillTemplate(vertical.cta.message, {
  loja: "Encanto Cestas",
  item: "Cesta Romântica Premium",
  preco: formatCents(ADICIONAIS_BASE),
  opcoes: `\nAdicionais: Balão de coração (+${formatCents(1500)})\nTotal: ${formatCents(ADICIONAIS_BASE + 1500)}`,
  link: demoLink,
});

type Receive = { icon: string; title: string; text: string; tone?: "auth" | "struct" | "alert" };
const RECEIVE: Receive[] = [
  { icon: "🔗", title: "Sua vitrine com link próprio", text: "Um endereço com o nome da sua loja, pronto para a bio e para o WhatsApp.", tone: "auth" },
  { icon: "🧺", title: "Cestas com foto, preço e composição", text: "Cada cesta com o que vem dentro, sem precisar explicar de novo." },
  { icon: "🎈", title: "Adicionais com total", text: "Balão, pelúcia, cartão… o cliente marca e o valor soma sozinho.", tone: "alert" },
  { icon: "🗂️", title: "Categorias e ordem", text: "Você decide o que aparece primeiro na vitrine." },
  { icon: "💬", title: "Pedido direto no WhatsApp", text: "A mensagem já chega com a cesta, os adicionais e o total.", tone: "struct" },
  { icon: "📱", title: "Painel feito para o celular", text: "Cadastra, troca foto e muda preço pelo próprio telefone." },
  { icon: "🎨", title: "Sua marca e suas seções", text: "Logo, capa, cores, depoimentos, dúvidas e galeria.", tone: "auth" },
  { icon: "💡", title: "Ideias de cestas", text: "Modelos prontos para cadastrar mais rápido." },
];

function ReceiveTile({ r, n }: { r: Receive; n: number }) {
  return (
    <article className={`rv rv-d${((n - 1) % 4) + 1} bento ${r.tone ? `bento--${r.tone}` : ""}`}>
      <span className="bento-num" aria-hidden>
        {String(n).padStart(2, "0")}
      </span>
      <span className="bento-ico" aria-hidden>
        {r.icon}
      </span>
      <h3>{r.title}</h3>
      <p>{r.text}</p>
    </article>
  );
}

// ───────────────────────────── peças da página ─────────────────────────────

function SectionHead({ eyebrow, title, text, className = "" }: { eyebrow: string; title: React.ReactNode; text?: string; className?: string }) {
  return (
    <div className={`rv mx-auto max-w-2xl text-center ${className}`}>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--lp-struct-deep)] [.surf-auth_&]:text-[var(--lp-alert)] [.surf-struct_&]:text-[var(--lp-auth-deep)]">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-[2rem] font-semibold leading-[1.1] sm:text-[2.6rem]">{title}</h2>
      <span className="lp-rule" aria-hidden />
      {text && <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed opacity-85 sm:text-lg">{text}</p>}
    </div>
  );
}

function CtaToPlans({ children = "QUERO MINHA VITRINE", variant = "auth" }: { children?: React.ReactNode; variant?: "auth" | "light" | "alert" }) {
  const styles = {
    auth: "bg-[var(--lp-auth)] text-white shadow-[6px_6px_0_var(--lp-auth-ink)] hover:shadow-[9px_9px_0_var(--lp-auth-ink)]",
    light: "bg-white text-[var(--lp-auth-deep)] shadow-[6px_6px_0_var(--lp-auth-ink)] hover:shadow-[9px_9px_0_var(--lp-auth-ink)]",
    alert: "bg-[var(--lp-auth-ink)] text-white shadow-[6px_6px_0_var(--lp-hl-deep)] hover:shadow-[9px_9px_0_var(--lp-hl-deep)]",
  }[variant];
  return (
    <a
      href="#planos"
      className={`group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[var(--lp-auth-ink)] px-7 py-4 text-base font-extrabold tracking-wide transition hover:-translate-x-0.5 hover:-translate-y-0.5 ${styles}`}
    >
      {children}
      <span className="transition group-hover:translate-x-1" aria-hidden>➔</span>
    </a>
  );
}

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#06a742] text-[11px] font-bold text-white" aria-label="Incluído">✓</span>
  ) : (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(354,76%,50%)] text-[11px] font-bold text-white" aria-label="Não incluído">✕</span>
  );
}

/** Conector do "Como funciona": a seta se desenha com a rolagem. */
function FlowArrow({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 120 90" className={`mx-auto -my-1 h-20 w-28 ${flip ? "-scale-x-100" : ""}`} fill="none" aria-hidden>
      <path
        className="flow-line"
        d="M20 4 C 20 48, 100 30, 100 78"
        stroke="var(--lp-auth-ink)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="1"
        pathLength={1}
      />
      <path className="flow-head" d="M88 68 L100 84 L111 68" stroke="var(--lp-auth-ink)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ transformOrigin: "100px 78px" }} />
    </svg>
  );
}

// ─────────────────────────────────── página ───────────────────────────────────

export default function SalesPage() {
  const [entry, pro] = offer.plans;
  // "Tudo do Iniciante, mais:" — o que o Profissional soma
  const proExtras = pro.includes.filter((t) => !entry.includes.includes(t));
  const proShared = pro.includes.filter((t) => entry.includes.includes(t));
  // arredonda para BAIXO: 149,90 / 37,90 = 3,95 -> "3 vezes" (nunca exagerar)
  const basketsToPay = Math.floor(ADICIONAIS_BASE / pro.priceCents);

  return (
    <div className="lp overflow-x-clip">
      {/* 1. HEADER — só logo e âncoras (sem "Entrar": o tráfego é de gente nova) */}
      <header className="sticky top-0 z-[80] border-b border-[var(--lp-auth-ink)]/10 bg-[var(--lp-neutral)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="hidden gap-6 text-sm font-semibold text-[var(--lp-body)] md:flex" aria-label="Seções">
            <a href="#como-funciona" className="hover:text-[var(--lp-ink)]">Como funciona</a>
            <a href="#exemplo" className="hover:text-[var(--lp-ink)]">Exemplo</a>
            <a href="#planos" className="hover:text-[var(--lp-ink)]">Planos</a>
            <a href="#duvidas" className="hover:text-[var(--lp-ink)]">Dúvidas</a>
          </nav>
          <a href="#planos" className="rounded-xl border-2 border-[var(--lp-auth-ink)] bg-[var(--lp-auth)] px-4 py-2 text-sm font-bold text-white md:hidden">
            Ver planos
          </a>
        </div>
      </header>

      <main>
        {/* 2. HERO — headline → sub → mockup → CTA */}
        <section className="surf surf-auth px-4 pb-20 pt-12 sm:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-[var(--lp-alert)]">Vitrine digital para quem vende cestas</p>
            <h1 className="mt-4 font-display text-[2.4rem] font-semibold leading-[1.06] sm:text-6xl">
              Tenha sua própria <span className="hl italic">vitrine digital de cestas</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/85">
              Sua marca, suas fotos, seus preços e o que vem em cada cesta — num link só. O cliente escolhe e o pedido chega no seu{" "}
              <b className="text-white">WhatsApp</b> com a cesta identificada.
            </p>

            <div className="relative mx-auto mt-12 flex w-fit justify-center">
              <Device width="min(70vw, 18rem)" label="Vitrine de cestas aberta no celular">
                <Image src={PRINTS.vitrine} alt="Vitrine de cestas" fill priority unoptimized className="object-cover object-top" sizes="18rem" />
              </Device>
              <div className="glass float-a -right-10 top-10 w-[8.4rem] rotate-2 p-2.5 text-left sm:-right-28 sm:w-44 sm:p-3.5">
                <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--lp-body)] sm:text-[10px]">Cliques em “Quero esta cesta”</p>
                <p className="mt-1 font-display text-lg font-semibold leading-none sm:text-2xl">38 esta semana</p>
                <div className="mt-2 flex h-6 items-end gap-1">
                  {[40, 55, 45, 70, 60, 90, 80].map((h, i) => (
                    <span key={i} style={{ height: `${h}%` }} className="flex-1 rounded-sm bg-[var(--lp-auth)]" />
                  ))}
                </div>
              </div>
              <GlassNote title="Novo pedido · Juliana" text="Olá! Vi a Cesta Romântica Premium na sua vitrine…" className="float-b -left-10 bottom-[24%] w-[10.5rem] -rotate-2 text-left sm:-left-32 sm:w-64" />
              <GlassNote title="Pedido · Marcos" text="Quero o Café da Manhã Especial para sábado" className="float-c -right-8 bottom-[6%] w-[10.5rem] rotate-1 text-left sm:-right-28 sm:w-60" />
            </div>

            <div className="mt-12 flex flex-col items-center gap-3">
              <CtaToPlans variant="light" />
              <p className="text-sm text-white/75">{offer.paymentNote} · sem mensalidade</p>
            </div>
          </div>
        </section>

        {/* 3. A ROTINA DE HOJE */}
        <section className="surf surf-warm px-4 py-20">
          <div className="mx-auto max-w-4xl">
            <SectionHead
              eyebrow="A rotina de hoje"
              title={<>Ainda manda <span className="hl">foto por foto</span> toda vez que alguém pergunta quais cestas você vende?</>}
            />
            <ul className="mx-auto mt-12 grid max-w-3xl justify-center gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["📸", "Procura as fotos na galeria", "no meio de 3 mil fotos do celular"],
                ["💬", "Manda 15 mensagens seguidas", "e o cliente se perde no meio"],
                ["💸", "Repete os preços", "para cada pessoa que chama"],
                ["🧺", "Explica o que vem em cada cesta", "de novo, e de novo"],
                ["🔁", "Reenvia as opções", "quando o cliente volta dias depois"],
                ["😶", "E o cliente some", "antes de você conseguir fechar"],
              ].map(([icon, title, text], i) => (
                <li key={title} className={`rv rv-pop rv-d${(i % 3) + 1} tag-card rounded-2xl bg-white p-5 text-center ${i % 2 ? "rotate-[0.6deg]" : "-rotate-[0.6deg]"}`}>
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--lp-warm)] text-2xl" aria-hidden>{icon}</span>
                  <b className="mt-3 block text-[15px]">{title}</b>
                  <span className="mt-1 block text-sm text-[var(--lp-body)]">{text}</span>
                </li>
              ))}
            </ul>
            <div className="rv rv-pop tag-card tag-card--hl mx-auto mt-14 max-w-2xl rounded-3xl bg-[var(--lp-auth)] px-6 py-8 text-center text-white">
              <p className="font-display text-2xl font-semibold sm:text-3xl">
                Com o CestaVitrine, você envia <span className="text-[var(--lp-alert)]">um link</span>.
              </p>
              <p className="mt-2 text-white/85">O cliente vê todas as cestas, fotos, preços e o que vem dentro — e já chama no seu WhatsApp sabendo o que quer.</p>
            </div>
          </div>
        </section>

        {/* 4. O QUE É — um mockup explodido por recurso */}
        <section className="surf surf-neutral px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <SectionHead
              eyebrow="O que é"
              title={<>Uma loja de cestas <span className="hl">no seu link</span>, sem complicação</>}
              text="Não é site, não é loja virtual cheia de configuração. É a sua vitrine, pronta para mandar no WhatsApp e colocar na bio do Instagram."
            />
            <div className="mt-14 grid gap-8 sm:grid-cols-2">
              {[
                { mock: <ExplodeMarca />, title: "Sua marca", text: "Nome, logo, cores e a sua frase de apresentação. Parece loja própria." },
                { mock: <ExplodeFotos />, title: "Fotos, preços e composição", text: "Cada cesta com foto, preço, o que vem dentro e adicionais." },
                { mock: <ExplodeCategorias />, title: "Categorias", text: "Café da manhã, românticas, aniversário... o cliente acha rápido." },
                { mock: <ExplodeWhatsapp firstLine={demoMessage.split("\n")[0]} />, title: "Pedido no WhatsApp", text: "O botão “Quero esta cesta” abre seu WhatsApp com a cesta já escrita." },
              ].map((c, i) => (
                <article key={c.title} className={`rv rv-d${(i % 2) + 1} overflow-hidden rounded-3xl border-2 border-[var(--lp-auth-ink)]/10 bg-gradient-to-b from-[var(--lp-warm)] to-white`}>
                  {c.mock}
                  <div className="px-6 pb-7 text-center">
                    <h3 className="font-display text-xl font-semibold">{c.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--lp-body)]">{c.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 5. COMO FUNCIONA — setas que se desenham e acendem o próximo passo */}
        <section id="como-funciona" className="surf surf-struct scroll-mt-20 px-4 py-20">
          <div className="mx-auto max-w-xl">
            <SectionHead eyebrow="Como funciona" title={<>Da primeira cesta ao pedido, <span className="hl">em 5 passos</span></>} />
            <ol className="mt-12">
              {[
                ["🎀", "Configure sua marca", "Nome, logo e WhatsApp."],
                ["🧺", "Cadastre suas cestas", "Fotos, preços e o que vem dentro."],
                ["🔗", "Publique sua vitrine", "Receba seu próprio link."],
                ["📲", "Envie para o cliente", "Ele escolhe a cesta pelo celular."],
                ["💬", "Receba o pedido", "O WhatsApp abre com a cesta identificada."],
              ].map(([icon, title, text], i, all) => (
                <li key={title}>
                  <div className={`flow-step relative mx-auto flex max-w-sm items-center gap-4 rounded-2xl border-2 border-[var(--lp-auth-ink)] bg-white p-4 text-left shadow-[8px_8px_0_var(--lp-auth-ink)] ${i % 2 ? "sm:translate-x-10" : "sm:-translate-x-10"}`}>
                    <span className="flow-num flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[var(--lp-auth-ink)] bg-white font-display text-xl font-bold text-[var(--lp-auth)]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold">{title}</h3>
                      <p className="text-sm text-[var(--lp-body)]">{text}</p>
                    </div>
                    <span className="text-2xl" aria-hidden>{icon}</span>
                  </div>
                  {i < all.length - 1 && <FlowArrow flip={i % 2 === 1} />}
                </li>
              ))}
            </ol>
            <div className="rv mt-14 text-center">
              <CtaToPlans />
            </div>
          </div>
        </section>

        {/* 6. BLOCO 1 — VENDA MAIS PARA O MESMO CLIENTE (adicionais) */}
        <section className="surf surf-neutral px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="rv">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--lp-struct-deep)]">Adicionais</p>
              <h2 className="mt-3 font-display text-[2.1rem] font-semibold leading-[1.08] sm:text-5xl">
                Venda mais para <span className="hl">o mesmo cliente</span>
              </h2>
              <span className="lp-rule" aria-hidden />
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[var(--lp-body)]">
                Balão, pelúcia, rosas extras, cartão… Cada cesta mostra os adicionais com o valor, e o cliente vai marcando sozinho. O total sobe na tela — sem você precisar oferecer nada.
              </p>
            </div>

            <div className="rv relative mx-auto mt-12 flex w-fit justify-center">
              <SceneAdicionais width="min(70vw, 18rem)" />
              <GlassNote tone="buy" icon={<span className="text-sm font-black">+</span>} title={`+${formatCents(ADICIONAIS_GANHO)} no mesmo pedido`} text="3 adicionais escolhidos pelo cliente" className="float-a -left-10 top-[6%] w-[11rem] -rotate-2 text-left sm:-left-44 sm:w-60" />
              <GlassNote tone="brand" icon={<span className="text-sm">🎈</span>} title="Balão de coração" text={`+ ${formatCents(1500)} · o mais escolhido`} className="float-b -right-10 top-[24%] w-[10rem] rotate-2 text-left sm:-right-40 sm:w-52" />
            </div>

            <div className="rv rv-pop tag-card tag-card--hl mx-auto mt-12 flex max-w-md items-center gap-4 rounded-2xl bg-white p-5 text-left">
              <div className="shrink-0 text-center">
                <p className="text-xs font-semibold text-[var(--lp-body)] line-through">{formatCents(ADICIONAIS_BASE)}</p>
                <p className="font-display text-3xl font-bold text-[#06a742]">{formatCents(ADICIONAIS_TOTAL)}</p>
              </div>
              <p className="text-sm leading-snug">
                No exemplo, o cliente marcou 3 adicionais e o pedido subiu <b className="text-[var(--lp-hl-deep)]">+{formatCents(ADICIONAIS_GANHO)}</b> — sem uma mensagem sua.
              </p>
            </div>

            <div className="rv mt-10">
              <CtaToPlans />
            </div>
          </div>
        </section>

        {/* 7. BLOCO 2 — SE DESTAQUE DE QUEM AINDA USA PDF */}
        <section id="exemplo" className="surf surf-warm scroll-mt-20 px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <SectionHead
              eyebrow="A vitrine"
              title={<>Se destaque de quem ainda manda <span className="hl">catálogo em PDF</span></>}
              text="PDF pesa, demora para abrir, obriga o cliente a dar zoom e fica errado no dia em que você muda um preço. Sua vitrine abre na hora, parece loja de verdade e está sempre atualizada."
            />

            <div className="mt-14 grid grid-cols-2 items-end gap-4 sm:gap-10">
              <figure className="rv rv-l text-center">
                <div className="relative mx-auto w-fit">
                  <span className="absolute -top-4 left-1/2 z-[80] -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-dashed border-[#8a7a6a] bg-[#efe6d8] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#6b5a48]">
                    Catálogo em PDF
                  </span>
                  <div className="opacity-90 grayscale-[35%]">
                    <ScenePdf width="min(40vw, 15rem)" />
                  </div>
                </div>
                <figcaption className="mt-4 text-sm font-semibold text-[#6b5a48]">Zoom, espera e página 1 de 18</figcaption>
              </figure>
              <figure className="rv rv-r text-center">
                <div className="relative mx-auto w-fit">
                  <span className="win-tag">✦ Sua vitrine</span>
                  <SceneVitrine width="min(40vw, 15rem)" />
                </div>
                <figcaption className="mt-4 text-sm font-bold text-[var(--lp-auth)]">Abre na hora, fotos grandes, preço legível</figcaption>
              </figure>
            </div>

            {/* comparativo "rascunho × produto" (skill padrao-lowticket, regra 4) */}
            <div className="mt-14 grid gap-5 md:grid-cols-2">
              <div className="rv rv-l rounded-2xl border-2 border-dashed border-[#b9a791] bg-[#f3eadc] p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-[.15em] text-[#8a7a6a]">Catálogo em PDF</p>
                <ul className="space-y-3 text-[15px] text-[#6b5a48]">
                  {[
                    "Cliente dá zoom para conseguir ler o preço",
                    "Arquivo pesado, que demora para baixar no 4G",
                    "Mudou um preço? Refaz e reenvia para todo mundo",
                    "O cliente precisa escrever qual cesta quer",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#b9a791] text-[10px] font-bold">✕</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rv rv-r win">
                <div className="win-in h-full p-6">
                  <p className="win-pill mb-5">
                    ✦ <b>Sua vitrine</b>
                  </p>
                  <ul className="relative space-y-3.5 text-[15px] font-medium">
                    {[
                      "Fotos grandes e preço que se lê de primeira",
                      "Abre na hora, sem baixar nada",
                      "Mudou o preço? Muda em 10 segundos, para todos",
                      "O botão já manda a cesta escolhida",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-3">
                        <span className="win-check">✓</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rv mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <CtaToPlans />
              <Link
                href={DEMO_URL}
                target="_blank"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-[var(--lp-auth-ink)] bg-white px-6 py-4 font-bold text-[var(--lp-auth-ink)] transition hover:bg-[var(--lp-neutral)]"
              >
                Abrir uma vitrine de exemplo ↗
              </Link>
            </div>
          </div>
        </section>

        {/* 8. BLOCO 3 — PEDIDO CLARO, SEM INTERROGATÓRIO */}
        <section className="surf surf-struct px-4 py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
            <div className="rv rv-l relative order-2 mx-auto flex justify-center py-6 lg:order-1">
              <ScenePedido width="min(72vw, 18rem)" message={demoMessage} link={demoLink} />
              <GlassNote tone="buy" icon={<span className="text-sm font-black">✓</span>} title="Cesta identificada" text="Cesta Romântica Premium + Balão" className="float-a -left-8 -top-1 w-[10.5rem] -rotate-2 sm:-left-32 sm:w-56 lg:-left-48" />
              <GlassNote tone="brand" icon={<span className="text-sm">⚡</span>} title="Chegou pronto em segundos" text="Sem “qual cesta mesmo?”" className="float-b -right-8 -bottom-1 w-[10.5rem] rotate-2 sm:-right-32 sm:w-56 lg:-right-48" />
            </div>
            <div className="order-1 text-center lg:order-2 lg:text-left">
              <div className="rv">
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--lp-auth-deep)]">O pedido</p>
                <h2 className="mt-3 font-display text-[2.1rem] font-semibold leading-[1.08] sm:text-5xl">
                  Pedido <span className="hl">claro e rápido</span>, sem ficar perguntando o que o cliente quer
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-[var(--lp-auth-ink)]/85 lg:mx-0">
                  Nada de “qual cesta mesmo?”, “tem aquela da foto?” ou “quanto fica com o balão?”. O WhatsApp abre com a cesta, os adicionais e o total escritos. O cliente só toca em enviar.
                </p>
              </div>
              <div className="rv mx-auto mt-8 grid max-w-md grid-cols-3 gap-3 lg:mx-0">
                {[
                  ["Qual cesta", "já vem escrita"],
                  ["Adicionais", "já vêm listados"],
                  ["Total", "já vem somado"],
                ].map(([a, b]) => (
                  <div key={a} className="tag-card rounded-2xl bg-white p-3 text-center">
                    <p className="text-sm font-extrabold text-[var(--lp-auth)]">{a}</p>
                    <p className="mt-0.5 text-xs text-[var(--lp-body)]">{b}</p>
                  </div>
                ))}
              </div>
              <p className="rv mx-auto mt-8 max-w-lg rounded-2xl border-2 border-[var(--lp-auth-ink)]/20 bg-white/70 p-4 text-left text-sm text-[var(--lp-auth-ink)] lg:mx-0">
                <b>Sem sustos:</b> a venda continua sendo fechada por você, na conversa, do jeito que você já faz. O CestaVitrine não cobra comissão e não passa o pagamento do cliente por nenhuma plataforma.
              </p>
              <div className="rv mt-10">
                <CtaToPlans />
              </div>
            </div>
          </div>
        </section>

        {/* 9. O QUE VOCÊ RECEBE — blocos com cor, número e o celular no centro */}
        <section className="surf surf-neutral px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHead eyebrow="O que você recebe" title={<>Tudo para vender com link <span className="hl">a partir de hoje</span></>} />
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
                {RECEIVE.slice(0, 4).map((r, i) => (
                  <ReceiveTile key={r.title} r={r} n={i + 1} />
                ))}
              </div>
              <div className="rv rv-pop order-first mx-auto py-4 sm:col-span-2 lg:order-none lg:col-span-1 lg:px-6">
                <Device width="15rem" label="Tela Meu link do painel">
                  <Image src={PRINTS.link} alt="Tela Meu link" fill unoptimized className="object-cover object-top" sizes="15rem" />
                </Device>
              </div>
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
                {RECEIVE.slice(4).map((r, i) => (
                  <ReceiveTile key={r.title} r={r} n={i + 5} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 10. PLANOS */}
        <section id="planos" className="surf surf-auth scroll-mt-16 px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <SectionHead
              eyebrow="Planos"
              title={<>Escolha e <span className="hl">comece hoje</span></>}
              text={`Uma única cesta de ${formatCents(ADICIONAIS_BASE)} paga o plano Profissional ${basketsToPay} vezes. E é ${offer.paymentNote.toLowerCase()}.`}
            />

            <div className="rv rv-pop mx-auto mt-10 max-w-md">
              <Image
                src="/marketing/mockup-oferta-completa.webp"
                alt="CestaVitrine: painel, vitrine e pedido no celular e no tablet"
                width={1600}
                height={1600}
                sizes="(min-width: 768px) 28rem, 90vw"
                className="h-auto w-full drop-shadow-[0_30px_40px_rgba(0,0,0,.4)]"
              />
            </div>

            <div className="mt-10 grid items-center gap-8 md:grid-cols-[0.85fr_1.15fr]">
              {/* PROFISSIONAL — o recomendado, à direita / depois do Iniciante */}
              <div className="rv rv-pop relative order-2 rounded-[2rem] border-[3px] border-[var(--lp-alert)] bg-white p-6 text-[var(--lp-ink)] shadow-[0_30px_70px_-20px_rgba(0,0,0,.55)] sm:p-8">
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[var(--lp-auth-ink)] bg-[var(--lp-alert)] px-5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-[var(--lp-auth-ink)]">
                  ⭐ Mais escolhido
                </span>
                <div className="text-center">
                  <h3 className="font-display text-3xl font-semibold">{pro.name}</h3>
                  <p className="mt-1 text-sm text-[var(--lp-body)]">{pro.tagline}</p>
                  <div className="mt-5">
                    {pro.compareAtCents && (
                      <p className="text-sm text-[var(--lp-body)]">
                        de <s className="text-[hsl(348,76%,46%)]">{formatCents(pro.compareAtCents)}</s> por
                      </p>
                    )}
                    <p className="font-display text-6xl font-bold leading-none text-[#06a742]">{formatCents(pro.priceCents)}</p>
                    <p className="mt-2 text-sm font-semibold">pagamento único · <b className="text-[#06a742]">acesso vitalício</b></p>
                  </div>
                </div>

                <div className="mt-7 rounded-2xl bg-[var(--lp-neutral)] p-4">
                  <p className="flex items-center gap-2.5 text-[15px] font-semibold">
                    <Check ok />
                    Tudo do plano Iniciante
                  </p>
                  <p className="ml-8 mt-1 text-xs text-[var(--lp-body)]">{proShared.join(" · ")}</p>
                </div>
                <p className="mb-3 mt-5 text-xs font-extrabold uppercase tracking-[.15em] text-[var(--lp-hl-deep)]">E ainda ganha:</p>
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {proExtras.map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-[15px] font-semibold leading-snug">
                      <Check ok />
                      {t}
                    </li>
                  ))}
                </ul>

                <CheckoutButton
                  url={pro.checkoutUrl}
                  className="group mt-8 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-[#06a742] px-6 py-4 text-center text-lg font-extrabold text-white shadow-[0_14px_30px_-8px_rgba(6,167,66,.6)] transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  QUERO O PROFISSIONAL <span className="transition group-hover:translate-x-1" aria-hidden>➔</span>
                </CheckoutButton>
                <p className="mt-3 text-center text-xs text-[var(--lp-body)]">🔒 Pagamento seguro · Garantia de {offer.guaranteeDays} dias</p>
              </div>

              {/* INICIANTE — primeiro, recua */}
              <div className="rv rv-l order-1 rounded-[1.75rem] border-2 border-white/20 bg-white/10 p-6 text-white backdrop-blur-sm sm:p-7">
                <div className="text-center">
                  <h3 className="font-display text-2xl font-semibold">{entry.name}</h3>
                  <p className="mt-1 text-sm text-white/70">{entry.tagline}</p>
                  <p className="mt-5 font-display text-4xl font-bold leading-none">{formatCents(entry.priceCents)}</p>
                  <p className="mt-2 text-xs text-white/70">pagamento único · vitalício</p>
                </div>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {entry.includes.map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <Check ok />
                      {t}
                    </li>
                  ))}
                </ul>
                <ul className="mt-4 space-y-2.5 border-t border-white/15 pt-4 text-sm text-white/65">
                  {entry.excludes.map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <Check ok={false} />
                      {t}
                    </li>
                  ))}
                </ul>
                <CheckoutButton
                  url={entry.checkoutUrl}
                  className="mt-7 flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-white/50 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
                >
                  COMEÇAR COM O INICIANTE
                </CheckoutButton>
                <p className="mt-3 text-center text-xs text-white/60">Dá para subir para o Profissional depois, de dentro do sistema.</p>
              </div>
            </div>

            <p className="rv mx-auto mt-10 max-w-xl text-center text-sm text-white/75">
              Depois do pagamento, você cria sua conta com o mesmo e-mail da compra e já monta sua vitrine.
            </p>
          </div>
        </section>

        {/* 11. GARANTIA — selo padrão da skill padrao-lowticket */}
        <section className="surf surf-warm px-4 py-20">
          <div className="rv rv-pop tag-card tag-card--struct mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl bg-white p-8 text-center sm:flex-row sm:text-left">
            <Image
              src="/marketing/garantia-15-dias.webp"
              alt={`Selo de garantia incondicional de ${offer.guaranteeDays} dias`}
              width={160}
              height={160}
              className="h-36 w-36 shrink-0 drop-shadow-[0_10px_18px_rgba(90,35,23,.35)] sm:h-40 sm:w-40"
            />
            <div>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">Garantia incondicional de {offer.guaranteeDays} dias</h2>
              <p className="mt-3 leading-relaxed text-[var(--lp-body)]">
                Pode começar hoje e testar com calma: monte sua vitrine, cadastre suas cestas e envie para seus clientes. Se não gostar, peça o reembolso em até{" "}
                <strong className="text-[var(--lp-ink)]">{offer.guaranteeDays} dias</strong> e devolvemos todo o seu dinheiro — sem perguntas.
              </p>
            </div>
          </div>
        </section>

        {/* 12. FAQ */}
        <section id="duvidas" className="surf surf-neutral scroll-mt-20 px-4 py-20">
          <div className="mx-auto max-w-3xl">
            <SectionHead eyebrow="Dúvidas" title={<>Perguntas <span className="hl">frequentes</span></>} />
            <div className="mt-12 space-y-3">
              {[
                ["Preciso saber mexer com site ou tecnologia?", "Não. Se você usa WhatsApp e Instagram, consegue usar o CestaVitrine. É preencher nome, foto e preço — o resto já vem pronto."],
                ["Preciso instalar algum aplicativo?", "Não. Funciona no navegador do celular ou do computador. Você entra com seu e-mail e senha."],
                ["O cliente paga pela vitrine?", "Não. A vitrine mostra suas cestas e manda o cliente para o seu WhatsApp. O pagamento e a entrega você combina na conversa, do jeito que já faz hoje."],
                ["Como recebo o acesso depois de comprar?", "Você cria sua conta com o mesmo e-mail usado na compra. O acesso é liberado automaticamente."],
                ["Posso começar no Iniciante e mudar depois?", "Pode. Dentro do sistema tem o botão de upgrade para o Profissional. Tudo que você já montou continua igual — nada se perde."],
                ["É mensalidade?", "Não. É pagamento único, com acesso vitalício ao seu plano."],
              ].map(([q, a], i) => (
                <details
                  key={q}
                  className={`rv rv-d${(i % 3) + 1} group rounded-2xl border-2 border-[var(--lp-auth-ink)]/15 bg-white p-5 transition open:border-[var(--lp-auth-ink)] open:shadow-[6px_6px_0_var(--lp-hl)] [&_summary::-webkit-details-marker]:hidden`}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                    {q}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lp-warm)] text-xl text-[var(--lp-auth)] transition group-open:rotate-45 group-open:bg-[var(--lp-auth)] group-open:text-white" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-[var(--lp-body)]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 13. CTA FINAL — alerta em tela cheia */}
        <section className="surf surf-alert px-4 py-20 text-center">
          <div className="rv mx-auto max-w-2xl">
            <LogoMark className="mx-auto h-14 w-14" />
            <h2 className="mt-5 font-display text-3xl font-semibold leading-tight text-[var(--lp-auth-ink)] sm:text-5xl">
              Pare de mandar foto por foto. <span className="italic text-[var(--lp-hl-deep)]">Mande seu link.</span>
            </h2>
            <p className="mt-4 text-lg text-[var(--lp-auth-ink)]/80">Sua vitrine de cestas pronta hoje, com seus preços e pedidos no seu WhatsApp.</p>
            <p className="mx-auto mt-6 w-fit rounded-full bg-[var(--lp-auth-ink)] px-4 py-1.5 text-xs font-bold text-[var(--lp-alert)]">
              ⏳ A partir de {formatCents(entry.priceCents)} · pagamento único
            </p>
            <div className="mt-8">
              <CtaToPlans variant="alert">QUERO MINHA VITRINE</CtaToPlans>
            </div>
          </div>
        </section>
      </main>

      {/* 14. FOOTER */}
      <footer className="surf surf-ink px-4 py-12 text-center text-xs">
        <Logo tone="white" />
        <p className="mx-auto mt-5 max-w-2xl leading-relaxed">
          O CestaVitrine é uma ferramenta para criar vitrines digitais. Não intermediamos vendas nem pagamentos entre você e seus clientes. Resultados de vendas dependem do seu
          trabalho, dos seus produtos e da sua divulgação.
        </p>
        <p className="mt-4">
          <Link href="/login" className="underline-offset-2 hover:underline">
            Área do cliente
          </Link>
        </p>
      </footer>
    </div>
  );
}
