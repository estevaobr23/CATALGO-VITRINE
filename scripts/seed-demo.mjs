// Cria a vitrine demo "Encanto Cestas" (/vitrine/encanto-cestas) entrando
// como a conta demo e usando o MESMO caminho do app (RPCs + RLS), sem service role.
//
//   node scripts/seed-demo.mjs          cria (se ainda não existir)
//   node scripts/seed-demo.mjs --reset  apaga e recria
//
// Requer em .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
// DEMO_EMAIL, DEMO_PASSWORD (conta com direito ativo ao cestavitrine).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, root } from "./env.mjs";

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
};

const DEMO = {
  name: "Encanto Cestas",
  slug: "encanto-cestas",
  description: "Cestas especiais para transformar momentos em presentes inesquecíveis. Montadas à mão, com carinho, do jeitinho que você imaginou.",
  whatsapp: "5511999990000", // número fictício de demonstração
  contact: { instagram: "encantocestas", city: "São Paulo - SP" },
  attributes: { delivery_info: "Entregamos em São Paulo e Grande SP. Encomendas com 1 dia de antecedência." },
  theme: { primary: "#9a4a36", secondary: "#d9b27c", style: "classico" },
  categories: ["Café da Manhã", "Românticas", "Aniversário", "Chocolate"],
  items: [
    {
      category: "Românticas", image: "romantica-premium", name: "Cesta Romântica Premium", price: 14990, compare: 17990, featured: true,
      summary: "Para surpreender quem você ama",
      features: ["Caixa decorada", "Chocolates finos", "Caneca personalizada", "Bebida (vinho ou espumante)", "Cartão personalizado"],
      description: "Montada com carinho para aniversário de namoro, Dia dos Namorados ou só para dizer \"eu te amo\".\nA caneca pode levar o nome ou uma frase curta.",
      attributes: { serves: 2, lead_time: "Encomendar com 1 dia de antecedência" },
      extras: [["Balão de coração", 1500], ["Pelúcia", 2990], ["Rosas extras", 1990]],
    },
    {
      category: "Café da Manhã", image: "cafe-da-manha", name: "Café da Manhã Especial", price: 12990, featured: true,
      summary: "Um bom dia inesquecível, entregue na porta",
      features: ["Pães artesanais", "Croissant", "Frutas da estação", "Suco natural", "Geleia e manteiga", "Caneca"],
      description: "Entregamos cedinho, entre 6h e 9h. Ótima para aniversários e datas especiais.",
      attributes: { serves: 2, lead_time: "Encomendar até as 18h do dia anterior" },
      extras: [["Balão", 1500], ["Mini buquê de flores", 2490]],
    },
    {
      category: "Aniversário", image: "aniversario", name: "Festa na Cesta", price: 15990,
      summary: "Um mini aniversário surpresa",
      features: ["Mini bolo decorado", "Balões", "Presente surpresa", "Bebida", "Vela e cartão de parabéns"],
      attributes: { serves: 4, lead_time: "Encomendar com 2 dias de antecedência" },
      extras: [["Topo de bolo com nome", 1200]],
    },
    {
      category: "Chocolate", image: "chocolate", name: "Chocolate Lovers", price: 11990,
      summary: "Para quem ama chocolate",
      features: ["Barras de chocolate sortidas", "Bombons", "Caneca", "Chocolate quente"],
      attributes: { serves: 2 },
      extras: [],
    },
    {
      category: "Românticas", image: "mimo-romantico", name: "Mimo Romântico", price: 8990,
      summary: "Pequena no tamanho, enorme no carinho",
      features: ["Ursinho de pelúcia", "Rosas", "Bombons", "Balão de coração"],
      attributes: { serves: 1 },
      extras: [["Cartão personalizado", 500]],
    },
    {
      category: "Café da Manhã", image: "cafe-mini", name: "Café da Manhã Mini", price: 7990,
      summary: "Para um bom dia a dois",
      features: ["Caneca", "Croissant", "Frutas", "Cartão com mensagem"],
      attributes: { serves: 1 },
      extras: [],
    },
  ],
};

async function upload(catalogId, folder, file) {
  const path = `${catalogId}/${folder}/${randomUUID()}.webp`;
  const body = readFileSync(join(root, "public", "demo", `${file}.webp`));
  must(await supabase.storage.from("catalog-media").upload(path, body, { contentType: "image/webp", cacheControl: "31536000" }), `upload ${file}`);
  return path;
}

must(await supabase.auth.signInWithPassword({ email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD }), "login demo");
const reset = process.argv.includes("--reset");

const { data: existing } = await supabase.from("catalogs").select("id, slug").eq("slug", DEMO.slug).maybeSingle();
if (existing && !reset) {
  console.log(`Demo já existe: /vitrine/${existing.slug}  (use --reset para recriar)`);
  process.exit(0);
}
if (existing) {
  const { data: files } = await supabase.storage.from("catalog-media").list(existing.id, { limit: 100 });
  for (const folder of files ?? []) {
    const { data: inner } = await supabase.storage.from("catalog-media").list(`${existing.id}/${folder.name}`, { limit: 100 });
    const paths = (inner ?? []).map((f) => `${existing.id}/${folder.name}/${f.name}`);
    if (paths.length) await supabase.storage.from("catalog-media").remove(paths);
  }
  must(await supabase.from("catalogs").delete().eq("id", existing.id), "apagar demo");
  console.log("demo antiga removida");
}

const catalog = must(await supabase.rpc("create_catalog", { p_product_key: "cestavitrine", p_name: DEMO.name, p_slug: DEMO.slug }), "create_catalog");
const logo = await upload(catalog.id, "logo", "logo");
const cover = await upload(catalog.id, "cover", "capa");
must(
  await supabase
    .from("catalogs")
    .update({ description: DEMO.description, whatsapp: DEMO.whatsapp, contact: DEMO.contact, attributes: DEMO.attributes, theme: DEMO.theme, logo_path: logo, cover_path: cover })
    .eq("id", catalog.id),
  "atualizar vitrine",
);

const cats = must(
  await supabase.from("categories").insert(DEMO.categories.map((name, i) => ({ catalog_id: catalog.id, name, sort_order: i }))).select("id, name"),
  "categorias",
);
const catId = Object.fromEntries(cats.map((c) => [c.name, c.id]));

for (const [i, it] of DEMO.items.entries()) {
  const item = must(
    await supabase
      .from("items")
      .insert({
        catalog_id: catalog.id,
        category_id: catId[it.category],
        name: it.name,
        summary: it.summary,
        description: it.description ?? null,
        features: it.features,
        price_cents: it.price,
        compare_at_price_cents: it.compare ?? null,
        is_featured: !!it.featured,
        sort_order: i,
        attributes: it.attributes,
      })
      .select("id")
      .single(),
    `item ${it.name}`,
  );
  const path = await upload(catalog.id, "items", it.image);
  must(await supabase.from("media").insert({ catalog_id: catalog.id, item_id: item.id, kind: "image", storage_path: path, alt_text: it.name }), "mídia");
  if (it.extras.length) {
    const group = must(
      await supabase.from("item_option_groups").insert({ catalog_id: catalog.id, item_id: item.id, name: "Adicionais", selection: "multiple", pricing: "add", min_select: 0 }).select("id").single(),
      "grupo",
    );
    must(
      await supabase.from("item_option_values").insert(it.extras.map(([name, price], j) => ({ catalog_id: catalog.id, group_id: group.id, name, price_cents: price, sort_order: j }))),
      "adicionais",
    );
  }
  console.log(`  + ${it.name}`);
}

must(await supabase.rpc("set_catalog_published", { p_catalog_id: catalog.id, p_published: true }), "publicar");
console.log(`\nDemo publicada: ${env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/vitrine/${catalog.slug}`);
