// Captura TELAS REAIS do sistema (conta demo) para a página de vendas:
// public/marketing/prints/*.png (390x844 @2x) e public/marketing/og.png.
// Pré-requisitos: app rodando (BASE_URL) e vitrine demo criada (npm run seed:demo).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { loadEnv, root } from "./env.mjs";

const env = loadEnv();
const BASE = env.BASE_URL || "http://localhost:3100";
const out = join(root, "public", "marketing", "prints");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "pt-BR" });
const page = await ctx.newPage();
const shot = async (name) => {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r))))));
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log(`  ${name}.png`);
};

// vitrine pública
await page.goto(`${BASE}/vitrine/encanto-cestas`);
await shot("vitrine");
await page.getByRole("button", { name: /Cesta Romântica Premium/ }).click();
const dialog = page.getByRole("dialog");
await dialog.waitFor();
await dialog.getByLabel("Balão de coração").check();
await dialog.locator(".overflow-y-auto").evaluate((el) => el.scrollTo(0, 260));
await shot("detalhe");

// painel (conta demo)
await page.goto(`${BASE}/login`);
await page.getByLabel("E-mail").fill(env.DEMO_EMAIL);
await page.getByLabel("Senha", { exact: true }).fill(env.DEMO_PASSWORD);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL(/\/app$/);
await page.goto(`${BASE}/app/cestas`);
await shot("lista");
await page.getByRole("link", { name: /Cesta Romântica Premium/ }).first().click();
await page.waitForURL(/\/app\/cestas\/[0-9a-f-]{36}/);
await shot("cadastro");
await page.goto(`${BASE}/app/link`);
await shot("link");

// imagem de compartilhamento da página de vendas
const og = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const ogPage = await og.newPage();
await ogPage.goto(`${BASE}/`);
await ogPage.waitForLoadState("networkidle");
await ogPage.addStyleTag({ content: "header{display:none!important}" });
await ogPage.waitForTimeout(500);
await ogPage.screenshot({ path: join(root, "public", "marketing", "og.png") });
console.log("  og.png");

await browser.close();
