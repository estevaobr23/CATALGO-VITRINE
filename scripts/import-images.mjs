// Importa as imagens geradas pelo GPT (ver PROMPT-IMAGENS-GPT.md) para dentro
// do projeto: converte para WebP no tamanho certo, grava em public/ e sobe as
// que pertencem à vitrine demo para o Storage.
//
//   1. jogue os arquivos do GPT em  ./imagens-novas/  (qualquer formato)
//   2. node scripts/import-images.mjs            confere o que falta
//   3. node scripts/import-images.mjs --aplicar  converte, grava e publica
//
// O nome do arquivo manda: romantica-premium.png vira public/demo/romantica-premium.webp.
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, root } from "./env.mjs";

const env = loadEnv();
const IN = join(root, "imagens-novas");
const apply = process.argv.includes("--aplicar");

// destino, proporção e a que item da demo cada imagem pertence
const SPEC = {
  // Bloco 1 — cestas (item da vitrine demo, pelo nome)
  "romantica-premium": { dir: "demo", w: 1200, h: 1200, item: "Cesta Romântica Premium" },
  "cafe-da-manha": { dir: "demo", w: 1200, h: 1200, item: "Café da Manhã Especial" },
  aniversario: { dir: "demo", w: 1200, h: 1200, item: "Festa na Cesta" },
  chocolate: { dir: "demo", w: 1200, h: 1200, item: "Chocolate Lovers" },
  "mimo-romantico": { dir: "demo", w: 1200, h: 1200, item: "Mimo Romântico" },
  "cafe-mini": { dir: "demo", w: 1200, h: 1200, item: "Café da Manhã Mini" },
  // Bloco 2 — marca
  logo: { dir: "demo", w: 600, h: 600, catalog: "logo_path" },
  capa: { dir: "demo", w: 1600, h: 600, catalog: "cover_path" },
  // Bloco 3 — galeria
  "galeria-entrega": { dir: "demo", w: 1200, h: 1200, gallery: "Entrega do Dia das Mães" },
  "galeria-personalizada": { dir: "demo", w: 1200, h: 1200, gallery: "Cesta personalizada com o nome" },
  "galeria-cafe-manha": { dir: "demo", w: 1200, h: 1200, gallery: "Café da manhã entregue às 7h" },
  "galeria-montagem": { dir: "demo", w: 1200, h: 1200, gallery: "Montagem da semana" },
  // Bloco 4 — avatares dos depoimentos
  "avatar-juliana": { dir: "demo", w: 400, h: 400, testimonial: "Juliana M." },
  "avatar-rafael": { dir: "demo", w: 400, h: 400, testimonial: "Rafael S." },
  "avatar-carla": { dir: "demo", w: 400, h: 400, testimonial: "Carla P." },
  "avatar-marcos": { dir: "demo", w: 400, h: 400, testimonial: "Marcos A." },
  "avatar-beatriz": { dir: "demo", w: 400, h: 400, testimonial: "Beatriz L." },
  // Bloco 5 — lifestyle (página de vendas)
  "lifestyle-atelie": { dir: "marketing", w: 1200, h: 1500 },
  "lifestyle-whatsapp": { dir: "marketing", w: 1200, h: 1500 },
  "lifestyle-entrega": { dir: "marketing", w: 1200, h: 1500 },
  // Bloco 6 — mockups
  "mockup-oferta-completa": { dir: "marketing", w: 1600, h: 1600 },
  "mockup-plano-profissional": { dir: "marketing", w: 1600, h: 1600 },
  "mockup-plano-iniciante": { dir: "marketing", w: 1600, h: 1600 },
  // Bloco 7 — compartilhamento
  "og-cestavitrine": { dir: "marketing", w: 1200, h: 630, out: "og" },
};

mkdirSync(IN, { recursive: true });
const found = new Map();
for (const f of readdirSync(IN)) {
  const key = basename(f, extname(f)).toLowerCase().replace(/\s+/g, "-");
  // aceita "atelie" e "ateliê"
  const norm = key.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (SPEC[norm]) found.set(norm, join(IN, f));
}

const missing = Object.keys(SPEC).filter((k) => !found.has(k));
console.log(`encontradas: ${found.size}/${Object.keys(SPEC).length}`);
if (missing.length) console.log("faltando:", missing.join(", "));
if (!apply) {
  console.log("\nRode com --aplicar para converter e publicar.");
  process.exit(0);
}
if (!found.size) {
  console.log(`\nColoque os arquivos em ${IN} primeiro.`);
  process.exit(1);
}

// 1. converte para public/
const written = new Map();
for (const [key, src] of found) {
  const spec = SPEC[key];
  const dir = join(root, "public", spec.dir);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${spec.out ?? key}.webp`);
  await sharp(src).resize(spec.w, spec.h, { fit: "cover", position: "attention" }).webp({ quality: 86 }).toFile(out);
  written.set(key, out);
  console.log(`  public/${spec.dir}/${spec.out ?? key}.webp`);
}

// 2. publica na vitrine demo o que pertence a ela
const demoKeys = [...written.keys()].filter((k) => SPEC[k].dir === "demo");
if (!demoKeys.length) process.exit(0);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { error: authErr } = await supabase.auth.signInWithPassword({ email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD });
if (authErr) {
  console.error("\nNão consegui entrar na conta demo:", authErr.message);
  process.exit(1);
}
const { data: catalog } = await supabase.from("catalogs").select("id").eq("slug", "encanto-cestas").maybeSingle();
if (!catalog) {
  console.log("\nVitrine demo não existe. Rode: npm run seed:demo");
  process.exit(1);
}

async function upload(file, folder) {
  const path = `${catalog.id}/${folder}/${randomUUID()}.webp`;
  const { error } = await supabase.storage.from("catalog-media").upload(path, readFileSync(file), {
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  if (error) throw new Error(`upload ${folder}: ${error.message}`);
  return path;
}

const trash = [];
console.log("\npublicando na vitrine demo:");

for (const key of demoKeys) {
  const spec = SPEC[key];
  const file = written.get(key);

  if (spec.catalog) {
    const { data: row } = await supabase.from("catalogs").select(spec.catalog).eq("id", catalog.id).single();
    const path = await upload(file, spec.catalog === "logo_path" ? "logo" : "cover");
    await supabase.from("catalogs").update({ [spec.catalog]: path }).eq("id", catalog.id);
    if (row?.[spec.catalog]) trash.push(row[spec.catalog]);
    console.log(`  ${spec.catalog}`);
  }

  if (spec.item) {
    const { data: item } = await supabase.from("items").select("id").eq("catalog_id", catalog.id).eq("name", spec.item).maybeSingle();
    if (!item) {
      console.log(`  (pulado) item não encontrado: ${spec.item}`);
      continue;
    }
    const path = await upload(file, "items");
    const { data: current } = await supabase
      .from("media")
      .select("id, storage_path")
      .eq("catalog_id", catalog.id)
      .eq("item_id", item.id)
      .eq("kind", "image")
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    if (current) {
      await supabase.from("media").update({ storage_path: path, alt_text: spec.item }).eq("id", current.id);
      if (current.storage_path) trash.push(current.storage_path);
    } else {
      await supabase.from("media").insert({ catalog_id: catalog.id, item_id: item.id, kind: "image", storage_path: path, alt_text: spec.item });
    }
    console.log(`  ${spec.item}`);
  }

  if (spec.gallery) {
    const path = await upload(file, "items");
    const { data: current } = await supabase
      .from("media")
      .select("id, storage_path")
      .eq("catalog_id", catalog.id)
      .is("item_id", null)
      .eq("caption", spec.gallery)
      .maybeSingle();
    if (current) {
      await supabase.from("media").update({ storage_path: path }).eq("id", current.id);
      if (current.storage_path) trash.push(current.storage_path);
    } else {
      const { count } = await supabase.from("media").select("id", { count: "exact", head: true }).eq("catalog_id", catalog.id).is("item_id", null);
      await supabase.from("media").insert({ catalog_id: catalog.id, item_id: null, kind: "image", storage_path: path, caption: spec.gallery, sort_order: count ?? 0 });
    }
    console.log(`  galeria: ${spec.gallery}`);
  }

  if (spec.testimonial) {
    const { data: row } = await supabase
      .from("testimonials")
      .select("id, author_photo_path")
      .eq("catalog_id", catalog.id)
      .eq("author_name", spec.testimonial)
      .maybeSingle();
    if (!row) {
      console.log(`  (pulado) depoimento não encontrado: ${spec.testimonial}`);
      continue;
    }
    const path = await upload(file, "items");
    await supabase.from("testimonials").update({ author_photo_path: path }).eq("id", row.id);
    if (row.author_photo_path) trash.push(row.author_photo_path);
    console.log(`  avatar: ${spec.testimonial}`);
  }
}

if (trash.length) {
  await supabase.storage.from("catalog-media").remove(trash);
  console.log(`\n${trash.length} arquivo(s) antigo(s) removido(s) do storage`);
}

console.log(`\nPronto: ${env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100"}/vitrine/encanto-cestas`);
console.log("Depois rode: npm run prints   (recaptura as telas da página de vendas)");
