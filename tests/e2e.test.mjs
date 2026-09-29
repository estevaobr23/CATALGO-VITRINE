// Teste ponta a ponta: navegador real (Playwright) + Supabase real.
// Pré-requisitos: app rodando (BASE_URL, padrão http://localhost:3100) e as
// contas E2E_A/E2E_B/E2E_NOACCESS no .env.local (ver README).
// Uso: npm run test:e2e      (limpa os dados de teste no final)
import { join } from "node:path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, root } from "../scripts/env.mjs";

const env = loadEnv();
const BASE = env.BASE_URL || "http://localhost:3100";
const IMG = (f) => join(root, "public", "demo", f);
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "pt-BR" };

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> ${String(detail).slice(0, 300)}` : ""}`);
};
const step = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    check(name, false, e.message);
  }
};

const sb = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
async function session(email, password) {
  const c = sb();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}
async function wipe(client) {
  // limpa vitrine + arquivos da conta de teste (via sessão dela, com RLS)
  const { data: cats } = await client.from("catalogs").select("id");
  for (const c of cats ?? []) {
    for (const folder of ["logo", "cover", "items"]) {
      const { data: files } = await client.storage.from("catalog-media").list(`${c.id}/${folder}`);
      if (files?.length) await client.storage.from("catalog-media").remove(files.map((f) => `${c.id}/${folder}/${f.name}`));
    }
    await client.from("catalogs").delete().eq("id", c.id);
  }
}
const noHorizontalScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const toast = (page, text) => page.getByRole("status").filter({ hasText: text }).first().waitFor({ timeout: 15000 });

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

// ── preparação: contas A e B começam sem vitrine ───────────────────────────────
const clientA = await session(env.E2E_A_EMAIL, env.E2E_A_PASSWORD);
const clientB = await session(env.E2E_B_EMAIL, env.E2E_B_PASSWORD);
await wipe(clientA);
await wipe(clientB);

const browser = await chromium.launch();
let slugA = "";
let itemIdA = "";

try {
  // ── PÁGINA DE VENDAS ──────────────────────────────────────────────────────────
  await step("vendas", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?utm_source=teste`);
    check("vendas: hero com a promessa", await page.getByRole("heading", { level: 1, name: /vitrine digital de cestas/i }).isVisible());
    const heroCta = page.getByRole("link", { name: /QUERO MINHA VITRINE/ }).first();
    check("vendas: CTA do hero rola para #planos", (await heroCta.getAttribute("href")) === "#planos");
    check("vendas: header sem 'Entrar'", (await page.locator("header").getByText(/entrar/i).count()) === 0);
    await heroCta.click();
    await page.waitForTimeout(600);
    check("vendas: seção de planos visível após o CTA", await page.locator("#planos").isVisible());
    const pending = await page.getByText("Checkout em configuração").count();
    const configured = await page.getByRole("link", { name: /QUERO O (PROFISSIONAL|INICIANTE)/ }).count();
    check("vendas: botões dos planos = checkout configurado ou pendente sinalizado", pending === 2 || configured === 2, `pend=${pending} conf=${configured}`);
    check("vendas: sem scroll horizontal no celular", await noHorizontalScroll(page));
    check("vendas: prints reais carregados", await page.locator('img[src*="/marketing/prints/"]').first().evaluate((i) => i.complete && i.naturalWidth > 0));
    await ctx.close();
  });

  // ── AUTENTICAÇÃO + ROTA PRIVADA ─────────────────────────────────────────────
  const ctxA = await browser.newContext(MOBILE);
  const pageA = await ctxA.newPage();
  await step("auth", async () => {
    await pageA.goto(`${BASE}/app/cestas`);
    check("rota privada sem sessão -> login com redirect", pageA.url().includes("/login?redirect=%2Fapp%2Fcestas"));
    await pageA.getByLabel("E-mail").fill(env.E2E_A_EMAIL);
    await pageA.getByLabel("Senha", { exact: true }).fill("senha-errada-123");
    await pageA.getByRole("button", { name: "Entrar" }).click();
    await pageA.getByText("E-mail ou senha incorretos.").waitFor();
    check("login com senha errada mostra erro", true);
    await login(pageA, env.E2E_A_EMAIL, env.E2E_A_PASSWORD);
    await pageA.waitForURL(/\/app\/primeiro-acesso/);
    check("login OK sem vitrine -> primeiro acesso", true);
  });

  // ── PRIMEIRO ACESSO ───────────────────────────────────────────────────────────
  await step("primeiro acesso", async () => {
    await pageA.getByLabel("WhatsApp para receber pedidos").fill("(11) 9999");
    await pageA.getByLabel("Nome da sua marca").fill("Cestas da Ana Teste");
    await pageA.getByRole("button", { name: "Criar minha vitrine" }).click();
    await pageA.getByText(/WhatsApp inválido/).waitFor();
    check("primeiro acesso: WhatsApp inválido é recusado", true);
    await pageA.getByLabel("WhatsApp para receber pedidos").fill("(11) 98888-7777");
    await pageA.getByLabel(/Frase de apresentação/).fill("Cestas especiais para momentos inesquecíveis.");
    await pageA.getByRole("button", { name: "Criar minha vitrine" }).click();
    await pageA.waitForURL(/\/app\/aparencia\?boasvindas=1/);
    check("primeiro acesso: vitrine criada -> passo Logo e cores", true);
  });

  // ── APARÊNCIA: LOGO ───────────────────────────────────────────────────────────
  await step("aparência", async () => {
    await pageA.locator('input[type=file]').first().setInputFiles(IMG("logo.webp"));
    await pageA.waitForFunction(() => /\/logo\/.+\.webp$/.test(document.querySelector('input[name="logo_path"]')?.value ?? ""), null, { timeout: 30000 });
    await pageA.getByRole("button", { name: /Rosé/ }).click();
    await pageA.getByRole("button", { name: /Salvar e cadastrar a primeira cesta/ }).click();
    await pageA.waitForURL(/\/app\/cestas\/nova/);
    check("aparência: logo enviado e salvo -> cadastro da 1ª cesta", true);
  });

  // ── CRIAR CESTA ───────────────────────────────────────────────────────────────
  await step("criar cesta", async () => {
    await pageA.locator('input[type=file]').first().setInputFiles(IMG("romantica-premium.webp"));
    await pageA.waitForFunction(() => /\/items\/.+\.webp$/.test(document.querySelector('input[name="image_path"]')?.value ?? ""), null, { timeout: 30000 });
    await pageA.getByLabel("Nome da cesta").fill("Cesta Teste Romântica");
    await pageA.getByLabel("Categoria").selectOption({ label: "Românticas" });
    await pageA.getByLabel("Preço (R$)").fill("149,90");
    const feats = ["Caixa decorada", "Chocolates", "Caneca", "Bebida", "Cartão personalizado"];
    for (const [i, f] of feats.entries()) {
      if (i > 0) await pageA.getByRole("button", { name: "+ Adicionar item" }).click();
      await pageA.getByLabel(`Item ${i + 1}`, { exact: true }).fill(f);
    }
    await pageA.getByLabel(/Resumo curto/).fill("Para surpreender");
    await pageA.getByRole("button", { name: "+ Adicionais" }).click();
    await pageA.getByLabel("Adicional 1", { exact: true }).fill("Balão");
    await pageA.getByLabel("Valor do adicional 1").fill("15");
    await pageA.getByRole("button", { name: "Adicionar cesta" }).click();
    await pageA.waitForURL(/\/app\/cestas\?|\/app\/cestas$/);
    await toast(pageA, "Cesta adicionada.");
    check("cesta criada com feedback 'Cesta adicionada.'", true);
    check("cesta aparece na lista com preço", await pageA.getByText("R$ 149,90").first().isVisible());
    const { data } = await clientA.from("items").select("id").eq("name", "Cesta Teste Romântica").single();
    itemIdA = data.id;
  });

  // ── EDITAR CESTA ──────────────────────────────────────────────────────────────
  await step("editar cesta", async () => {
    await pageA.goto(`${BASE}/app/cestas/${itemIdA}`);
    await pageA.getByLabel("Preço (R$)").fill("159,90");
    await pageA.getByRole("button", { name: "Salvar alterações" }).click();
    await toast(pageA, "Alterações salvas.");
    check("editar cesta: 'Alterações salvas.' e novo preço", await pageA.getByText("R$ 159,90").first().isVisible());
  });

  // ── OCULTAR / EXIBIR ─────────────────────────────────────────────────────────
  await step("ocultar cesta", async () => {
    await pageA.getByRole("button", { name: "Ocultar" }).first().click();
    await toast(pageA, "escondida");
    await pageA.getByRole("button", { name: "Exibir" }).first().click();
    await toast(pageA, "aparecendo");
    check("ocultar e exibir cesta", true);
  });

  // ── CATEGORIAS ────────────────────────────────────────────────────────────────
  await step("categorias", async () => {
    await pageA.goto(`${BASE}/app/categorias`);
    await pageA.getByLabel("Nome da nova categoria").fill("Datas Especiais");
    await pageA.getByRole("button", { name: "+ Criar categoria" }).click();
    await toast(pageA, "Categoria criada.");
    const row = pageA.locator("li", { has: pageA.locator('input[value="Datas Especiais"]') });
    await row.getByLabel("Nome da categoria").fill("Datas Comemorativas");
    await row.getByRole("button", { name: "Salvar" }).click();
    await toast(pageA, "Alterações salvas.");
    const row2 = pageA.locator("li", { has: pageA.locator('input[value="Datas Comemorativas"]') });
    await row2.getByRole("button", { name: "Mover para cima" }).click();
    await toast(pageA, "Ordem atualizada.");
    pageA.once("dialog", (d) => d.accept());
    await pageA.locator("li", { has: pageA.locator('input[value="Datas Comemorativas"]') }).getByRole("button", { name: "Excluir" }).click();
    await toast(pageA, "Categoria removida.");
    check("categorias: criar, renomear, ordenar e excluir", true);
  });

  // ── PUBLICAR + MEU LINK ──────────────────────────────────────────────────────
  await step("publicar", async () => {
    await pageA.goto(`${BASE}/app`);
    await pageA.getByRole("button", { name: "Publicar minha vitrine" }).click();
    await toast(pageA, "está no ar");
    await pageA.goto(`${BASE}/app/link`);
    const url = (await pageA.locator("p.select-all").first().innerText()).trim();
    slugA = url.split("/vitrine/")[1];
    check("meu link: mostra /vitrine/<slug>", slugA === "cestas-da-ana-teste", url);
    check("painel: sem scroll horizontal no celular", await noHorizontalScroll(pageA));
  });

  // ── CLIENTE NO CELULAR ───────────────────────────────────────────────────────
  await step("vitrine pública", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    const res = await page.goto(`${BASE}/vitrine/${slugA}`);
    check("vitrine pública abre (200)", res.status() === 200);
    check("vitrine: nome e descrição da loja", await page.getByRole("heading", { name: "Cestas da Ana Teste" }).isVisible());
    check("vitrine: logo carregado", await page.getByAltText("Logo Cestas da Ana Teste").evaluate((i) => i.complete && i.naturalWidth > 0));
    await page.getByRole("button", { name: "Românticas", exact: true }).click();
    check("vitrine: filtro por categoria mostra a cesta", await page.getByRole("button", { name: /Cesta Teste Romântica/ }).isVisible());
    await page.getByRole("button", { name: /Cesta Teste Romântica/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    check("detalhe: composição listada", await dialog.getByText("Cartão personalizado").isVisible());
    check("detalhe: URL com ?cesta= (link direto)", page.url().includes("cesta=cesta-teste-romantica"));
    await dialog.getByLabel("Balão").check();
    check("detalhe: total com adicional", await dialog.getByText("R$ 174,90").first().isVisible());
    const href = await dialog.getByRole("link", { name: /Quero esta cesta/ }).getAttribute("href");
    const wa = new URL(href);
    const msg = (wa.searchParams.get("text") ?? "").replace(/ /g, " ");
    check("WhatsApp: número da loja", wa.origin === "https://wa.me" && wa.pathname === "/5511988887777", href);
    check("WhatsApp: cesta identificada na mensagem", msg.includes("*Cesta Teste Romântica*") && msg.includes("R$ 159,90"), msg);
    check("WhatsApp: adicional e total na mensagem", msg.includes("Balão (+R$ 15,00)") && msg.includes("Total: R$ 174,90"), msg);
    check("WhatsApp: link direto da cesta na mensagem", msg.includes(`/vitrine/${slugA}?cesta=cesta-teste-romantica`), msg);
    check("vitrine: sem scroll horizontal no celular", await noHorizontalScroll(page));
    await page.getByRole("button", { name: "Fechar" }).last().click();
    await dialog.waitFor({ state: "detached" });
    check("detalhe fecha e volta para a vitrine", !page.url().includes("cesta="));
    // link direto aberto do zero: fechar não sai do site
    await page.goto(`${BASE}/vitrine/${slugA}?cesta=cesta-teste-romantica`);
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "Fechar" }).last().click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    check("link direto: fechar mantém a cliente na vitrine", page.url().startsWith(`${BASE}/vitrine/${slugA}`));
    const desktop = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const dp = await desktop.newPage();
    await dp.goto(`${BASE}/vitrine/${slugA}`);
    check("vitrine: desktop sem scroll horizontal", await noHorizontalScroll(dp));
    await desktop.close();
    await ctx.close();
  });

  // ── STORAGE ───────────────────────────────────────────────────────────────────
  await step("storage", async () => {
    const { data: media } = await clientA.from("media").select("storage_path").eq("item_id", itemIdA).single();
    const pub = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/catalog-media/${media.storage_path}`;
    check("storage: foto da cesta acessível pela URL pública", (await fetch(pub)).status === 200);
    const catalogIdA = media.storage_path.split("/")[0];
    const { data: anonList } = await sb().storage.from("catalog-media").list(`${catalogIdA}/items`);
    check("storage: visitante não lista arquivos", (anonList ?? []).length === 0);
    const { error: upErr } = await clientB.storage.from("catalog-media").upload(`${catalogIdA}/items/invasao.webp`, new Blob(["x"], { type: "image/webp" }));
    check("storage: B não envia arquivo para a pasta de A", !!upErr, upErr?.message);
    const { data: removed } = await clientB.storage.from("catalog-media").remove([media.storage_path]);
    check("storage: B não apaga arquivo de A", (removed ?? []).length === 0 && (await fetch(pub)).status === 200);
    const { error: svgErr } = await clientA.storage.from("catalog-media").upload(`${catalogIdA}/items/x.svg`, new Blob(["<svg/>"], { type: "image/svg+xml" }), { contentType: "image/svg+xml" });
    check("storage: SVG recusado pelo bucket", !!svgErr, svgErr?.message);
  });

  // ── MULTITENANCY (B contra A) ────────────────────────────────────────────────
  await step("multitenancy", async () => {
    const ctxB = await browser.newContext(MOBILE);
    const pageB = await ctxB.newPage();
    await login(pageB, env.E2E_B_EMAIL, env.E2E_B_PASSWORD);
    await pageB.waitForURL(/primeiro-acesso/);
    await pageB.getByLabel("Nome da sua marca").fill("Amor em Cestas Teste");
    await pageB.getByLabel("WhatsApp para receber pedidos").fill("21977776666");
    await pageB.getByRole("button", { name: "Criar minha vitrine" }).click();
    await pageB.waitForURL(/aparencia/);
    await pageB.goto(`${BASE}/app/cestas/${itemIdA}`);
    await pageB.getByRole("heading", { name: "Página não encontrada" }).waitFor();
    check("B abrindo a URL de edição da cesta de A -> página não encontrada", (await pageB.getByLabel("Nome da cesta").count()) === 0);
    await pageB.goto(`${BASE}/app/link`);
    await pageB.getByLabel("Endereço da vitrine").fill(slugA);
    await pageB.getByRole("button", { name: "Salvar endereço" }).click();
    await pageB.getByRole("alert").filter({ hasText: "já está em uso" }).waitFor();
    check("slug: conflito com a vitrine de A recusado", true);
    await pageB.getByLabel("Endereço da vitrine").fill("Cestas Ána Nova!!");
    await pageB.getByRole("button", { name: "Salvar endereço" }).click();
    await toast(pageB, "Link atualizado");
    await pageB.locator("p.select-all", { hasText: "/vitrine/cestas-ana-nova" }).waitFor({ timeout: 15000 });
    check("slug: normalizado ('Cestas Ána Nova!!' -> cestas-ana-nova)", true);
    await ctxB.close();

    const upd = await clientB.from("items").update({ price_cents: 1 }).eq("id", itemIdA).select("id");
    check("API: B não altera cesta de A", (upd.data ?? []).length === 0);
    const del = await clientB.from("items").delete().eq("id", itemIdA).select("id");
    check("API: B não exclui cesta de A", (del.data ?? []).length === 0);
    const { data: cataA } = await clientA.from("catalogs").select("id").single();
    const ins = await clientB.from("items").insert({ catalog_id: cataA.id, name: "Invasão", price_cents: 100 });
    check("API: B não insere cesta na vitrine de A (catalog_id forjado)", !!ins.error, ins.error?.message);
    const own = await clientB.from("catalogs").select("id, name");
    check("API: B só enxerga a própria vitrine", own.data?.length === 1 && own.data[0].name === "Amor em Cestas Teste");
    const plan = await clientB.from("catalogs").update({ status: "published" }).eq("id", own.data[0].id);
    check("API: B não publica por UPDATE direto", !!plan.error, plan.error?.message);
    const pur = await clientB.from("purchases").select("*");
    check("API: purchases invisível ao cliente", !!pur.error || (pur.data ?? []).length === 0);
    const ent = await sb().from("entitlements").select("*");
    check("API: visitante não lê entitlements", !!ent.error || (ent.data ?? []).length === 0);
    const tbl = await sb().from("items").select("*");
    check("API: visitante não lê tabela de cestas", !!tbl.error || (tbl.data ?? []).length === 0);
  });

  // ── SEM ENTITLEMENT ──────────────────────────────────────────────────────────
  await step("sem acesso", async () => {
    const ctx = await browser.newContext(MOBILE);
    const page = await ctx.newPage();
    await login(page, env.E2E_NOACCESS_EMAIL, env.E2E_NOACCESS_PASSWORD);
    await page.waitForURL(/\/app\/sem-acesso/);
    check("usuária sem compra -> tela 'Não encontramos sua compra'", await page.getByRole("heading", { name: /Não encontramos sua compra/ }).isVisible());
    const r = await page.goto(`${BASE}/app/cestas`);
    check("sem compra: painel bloqueado", page.url().includes("/app/sem-acesso"), r?.url());
    await ctx.close();
  });

  // ── DESPUBLICAR, EXCLUIR, SAIR ───────────────────────────────────────────────
  await step("despublicar", async () => {
    await pageA.goto(`${BASE}/app`);
    await pageA.getByRole("button", { name: "Tirar do ar" }).click();
    await toast(pageA, "tirada do ar");
    const r = await fetch(`${BASE}/vitrine/${slugA}`);
    check("vitrine despublicada -> 404 para o público", r.status === 404);
    const r2 = await fetch(`${BASE}/vitrine/slug-que-nao-existe`);
    check("slug inexistente -> 404", r2.status === 404);
  });

  await step("excluir cesta", async () => {
    await pageA.goto(`${BASE}/app/cestas`);
    pageA.once("dialog", (d) => d.accept());
    await pageA.getByRole("button", { name: "Excluir" }).first().click();
    await toast(pageA, "Cesta removida.");
    await pageA.getByText("Sua vitrine ainda está vazia").waitFor({ timeout: 15000 });
    check("excluir cesta: 'Cesta removida.' e estado vazio", true);
    const { data: files } = await clientA.storage.from("catalog-media").list(`${(await clientA.from("catalogs").select("id").single()).data.id}/items`);
    check("excluir cesta: foto apagada do storage (sem órfão)", (files ?? []).length === 0, JSON.stringify(files));
  });

  await step("logout", async () => {
    await pageA.goto(`${BASE}/app/configuracoes`);
    await pageA.getByRole("button", { name: "Sair da conta" }).click();
    await pageA.waitForURL(/\/login/);
    await pageA.goto(`${BASE}/app`);
    check("logout encerra a sessão (painel volta ao login)", pageA.url().includes("/login"));
  });
  await ctxA.close();
} finally {
  await browser.close();
  if (!env.E2E_KEEP) {
    await wipe(clientA);
    await wipe(clientB);
  }
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
