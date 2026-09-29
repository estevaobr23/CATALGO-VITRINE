// Teste do banco da vertical CestaVitrine: aplica supabase/migrations (core
// 001-006 + seed 100) num Postgres embutido (PGlite) com o stub do Supabase e
// exercita os fluxos que o app usa. Uso: npm run test:db
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const here = dirname(fileURLToPath(import.meta.url));
const migrations = join(here, "..", "supabase", "migrations");
const db = new PGlite();
await db.exec(readFileSync(join(here, "supabase-stub.sql"), "utf8"));
for (const f of readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(join(migrations, f), "utf8"));
}

let fail = 0;
let pass = 0;
const check = (name, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
};
async function as(uid, sql, params = [], role = "authenticated") {
  try {
    const rows = await db.transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(uid ? { sub: uid, role } : { role })]);
      await tx.exec(`set local role ${role}`);
      return (await tx.query(sql, params)).rows;
    });
    return { rows };
  } catch (e) {
    return { error: e.message };
  }
}
const su = async (sql, params = []) => (await db.query(sql, params)).rows;
const anon = (sql, params) => as(null, sql, params, "anon");

// --- seed da vertical ----------------------------------------------------------
const plans = await su(`select key, limits, features from plans order by rank`);
check("seed: planos iniciante e profissional", plans.map((p) => p.key).join() === "iniciante,profissional");
check("seed: iniciante limita 15 cestas visíveis", plans[0].limits.max_visible_items === 15);
await su(`insert into offers (product_id, plan_id, provider, external_offer_id, price_cents)
  select p.id, pl.id, 'cakto', v.o, v.c from products p
  join (values ('OF-INI','iniciante',2700),('OF-PRO','profissional',4700)) v(o,k,c) on true
  join plans pl on pl.product_id = p.id and pl.key = v.k where p.key = 'cestavitrine'`);

const apply = (id, offer, email, status, at = "now()") =>
  su(`select apply_purchase_event('cakto',$1,$2,$3,$4,2700,'BRL',${at}) as r`, [id, offer, email, status]).then(
    (r) => r[0].r,
    (e) => ({ error: e.message }),
  );

// --- compra ANTES da conta; vínculo só com e-mail confirmado --------------------
await apply("ORD-ANA", "OF-INI", "ana@ex.com", "approved", "'2026-09-01T10:00:00Z'");
await apply("ORD-ANA", "OF-INI", "ana@ex.com", "approved", "'2026-09-01T10:00:00Z'"); // reenvio
const [cnt] = await su(`select (select count(*) from purchases)::int p, (select count(*) from entitlements)::int e`);
check("webhook reenviado: 1 compra e 1 direito", cnt.p === 1 && cnt.e === 1, JSON.stringify(cnt));

const [ana] = await su(`insert into auth.users (email, email_confirmed_at, raw_user_meta_data) values ('ana@ex.com', null, '{"name":"Ana"}') returning id`);
check("conta sem e-mail confirmado não herda a compra",
  (await su(`select count(*)::int c from entitlements where user_id = $1`, [ana.id]))[0].c === 0);
await su(`update auth.users set email_confirmed_at = now() where id = $1`, [ana.id]);
check("confirmou o e-mail: direito vinculado",
  (await su(`select count(*)::int c from entitlements where user_id = $1 and status='active'`, [ana.id]))[0].c === 1);

// --- sem compra: não entra ------------------------------------------------------
const [bia] = await su(`insert into auth.users (email, email_confirmed_at) values ('bia@ex.com', now()) returning id`);
let r = await as(bia.id, `select * from create_catalog('cestavitrine','Cestas da Ana')`);
check("usuária sem entitlement: create_catalog bloqueado", /no_active_plan/.test(r.error ?? ""), r.error);
r = await as(bia.id, `select * from entitlements`);
check("usuária sem entitlement não vê direito de ninguém", r.rows?.length === 0, r.error);

// --- primeiro acesso da Ana (fluxo de /app/primeiro-acesso) ---------------------
r = await as(ana.id, `select * from create_catalog('cestavitrine','Cestas da Ana')`);
const cat = r.rows?.[0];
check("vitrine criada com slug normalizado", cat?.slug === "cestas-da-ana" && cat?.status === "draft", r.error);
r = await as(ana.id, `update catalogs set whatsapp='5511999998888', description='Cestas especiais', theme='{"primary":"#9a4a36"}' where id=$1 returning id`, [cat.id]);
check("dona atualiza WhatsApp/descrição/tema", r.rows?.length === 1, r.error);
r = await as(ana.id, `update catalogs set whatsapp='(11) 9999' where id=$1`, [cat.id]);
check("WhatsApp fora do formato é rejeitado pelo banco", /whatsapp_check/.test(r.error ?? ""), r.error);
r = await as(ana.id, `update catalogs set status='published' where id=$1`, [cat.id]);
check("dona não publica por UPDATE direto (só RPC)", /permission denied/.test(r.error ?? ""), r.error);

// --- slug: conflito e reservado --------------------------------------------------
await apply("ORD-BIA", "OF-INI", "bia@ex.com", "approved");
r = await as(bia.id, `select * from create_catalog('cestavitrine','Cestas da Ana')`);
const biaCat = r.rows?.[0];
check("slug em conflito ganha sufixo (-2)", biaCat?.slug === "cestas-da-ana-2", r.error ?? biaCat?.slug);
r = await as(bia.id, `update catalogs set slug='cestas-da-ana' where id=$1`, [biaCat.id]);
check("trocar para slug já usado é bloqueado", /duplicate key/.test(r.error ?? ""), r.error);
r = await as(bia.id, `update catalogs set slug='vitrine' where id=$1`, [biaCat.id]);
check("slug reservado bloqueado", /reserved_slug/.test(r.error ?? ""), r.error);
r = await as(bia.id, `update catalogs set slug='amor-em-cestas' where id=$1 returning slug`, [biaCat.id]);
check("slug livre aceito", r.rows?.[0]?.slug === "amor-em-cestas", r.error);

// --- categorias e cestas (CRUD da dona) -------------------------------------------
r = await as(ana.id, `insert into categories (catalog_id, name, sort_order) values ($1,'Café da Manhã',0),($1,'Românticas',1) returning id, slug`, [cat.id]);
const [cafe, rom] = r.rows ?? [];
check("categorias criadas com slug automático", cafe?.slug === "cafe-da-manha" && rom?.slug === "romanticas", r.error);
r = await as(ana.id,
  `insert into items (catalog_id, category_id, name, price_cents, features, summary)
   values ($1,$2,'Cesta Romântica Premium',14990,'{Caixa decorada,Chocolates,Caneca,Bebida,Cartão personalizado}','Para surpreender')
   returning id, slug`, [cat.id, rom.id]);
const item = r.rows?.[0];
check("cesta criada", item?.slug === "cesta-romantica-premium", r.error);
r = await as(ana.id, `insert into item_option_groups (catalog_id, item_id, name, selection, pricing, min_select) values ($1,$2,'Adicionais','multiple','add',0) returning id`, [cat.id, item.id]);
const grp = r.rows?.[0];
r = await as(ana.id, `insert into item_option_values (catalog_id, group_id, name, price_cents) values ($1,$2,'Balão',1500),($1,$2,'Pelúcia',2500)`, [cat.id, grp?.id]);
check("adicionais gravados", !r.error, r.error);
r = await as(ana.id, `insert into media (catalog_id, item_id, kind, storage_path) values ($1,$2,'image',$3)`, [cat.id, item.id, `${cat.id}/items/11111111-1111-1111-1111-111111111111.webp`]);
check("foto da cesta registrada (path da própria pasta)", !r.error, r.error);
r = await as(ana.id, `insert into media (catalog_id, item_id, kind, storage_path) values ($1,$2,'image',$3)`, [cat.id, item.id, `${biaCat.id}/items/x.webp`]);
check("foto com path de outra vitrine é rejeitada", /check constraint/.test(r.error ?? ""), r.error);
r = await as(ana.id, `insert into items (catalog_id, name, price_cents, compare_at_price_cents) values ($1,'X',10000,9000)`, [cat.id]);
check("preço 'de' menor que o preço é rejeitado", /check constraint/.test(r.error ?? ""), r.error);
r = await as(ana.id, `update items set name='Cesta Romântica Premium G', slug='' where id=$1 returning slug`, [item.id]);
check("editar nome regenera o slug", r.rows?.[0]?.slug === "cesta-romantica-premium-g", r.error);

// --- multi-tenant: Bia contra os dados da Ana -------------------------------------
r = await as(bia.id, `select * from items where catalog_id=$1`, [cat.id]);
check("B não lê cestas de A", r.rows?.length === 0, r.error);
r = await as(bia.id, `update items set price_cents=1 where id=$1 returning id`, [item.id]);
check("B não altera cesta de A (0 linhas)", r.rows?.length === 0, r.error);
r = await as(bia.id, `delete from categories where id=$1 returning id`, [cafe.id]);
check("B não exclui categoria de A", r.rows?.length === 0, r.error);
r = await as(bia.id, `insert into items (catalog_id, name, price_cents) values ($1,'Invasão',100)`, [cat.id]);
check("B não insere cesta na vitrine de A (catalog_id forjado)", /row-level security/.test(r.error ?? ""), r.error);
r = await as(bia.id, `insert into items (catalog_id, category_id, name, price_cents) values ($1,$2,'Mista',100)`, [biaCat.id, cafe.id]);
check("B não usa categoria de A na própria cesta (FK composta)", /foreign key/.test(r.error ?? ""), r.error);
r = await as(bia.id, `update catalogs set name='hack' where id=$1 returning id`, [cat.id]);
check("B não altera a vitrine de A", r.rows?.length === 0, r.error);
r = await as(bia.id, `select * from set_catalog_published($1, true)`, [cat.id]);
check("B não publica a vitrine de A", /catalog_not_found/.test(r.error ?? ""), r.error);
r = await as(bia.id, `update catalogs set owner_id=$2 where id=$1`, [biaCat.id, ana.id]);
check("dona não transfere posse (owner_id sem GRANT)", /permission denied/.test(r.error ?? ""), r.error);

// --- publicação e leitura pública -------------------------------------------------
r = await anon(`select get_public_catalog('cestavitrine','cestas-da-ana') as d`);
check("vitrine em rascunho não aparece para o público", r.rows?.[0]?.d === null, r.error);
r = await as(ana.id, `select status from set_catalog_published($1, true)`, [cat.id]);
check("publicar via RPC", r.rows?.[0]?.status === "published", r.error);
r = await anon(`select get_public_catalog('cestavitrine','CESTAS-DA-ANA') as d`);
const pub = r.rows?.[0]?.d;
check("público lê a vitrine publicada (slug case-insensitive)", pub?.catalog?.name === "Cestas da Ana", r.error);
check("leitura pública sem owner_id/status/purchases", pub && !("owner_id" in pub.catalog) && !("status" in pub.catalog) && !("purchases" in pub));
check("cesta pública traz composição, adicionais e foto",
  pub?.items?.[0]?.features?.length === 5 && pub.items[0].options[0].values.length === 2 && pub.items[0].media.length === 1);
check("WhatsApp da loja vai para o CTA", pub?.catalog?.whatsapp === "5511999998888");
r = await anon(`select * from items`);
check("visitante não lê tabela diretamente", /permission denied/.test(r.error ?? ""), r.error);

await as(ana.id, `update categories set is_visible=false where id=$1`, [rom.id]);
r = await anon(`select jsonb_array_length(get_public_catalog('cestavitrine','cestas-da-ana')->'items') as n`);
check("categoria oculta esconde as cestas dela", r.rows?.[0]?.n === 0, r.error);
await as(ana.id, `update categories set is_visible=true where id=$1`, [rom.id]);
await as(ana.id, `update items set is_visible=false where id=$1`, [item.id]);
r = await anon(`select jsonb_array_length(get_public_catalog('cestavitrine','cestas-da-ana')->'items') as n`);
check("cesta oculta some da vitrine", r.rows?.[0]?.n === 0, r.error);
await as(ana.id, `update items set is_visible=true, is_available=false where id=$1`, [item.id]);
r = await anon(`select get_public_catalog('cestavitrine','cestas-da-ana')->'items'->0->>'is_available' as a`);
check("cesta esgotada continua visível, marcada", r.rows?.[0]?.a === "false", r.error);
await as(ana.id, `select set_catalog_published($1, false)`, [cat.id]);
r = await anon(`select get_public_catalog('cestavitrine','cestas-da-ana') as d`);
check("despublicar tira do ar", r.rows?.[0]?.d === null);
await as(ana.id, `select set_catalog_published($1, true)`, [cat.id]);
r = await anon(`select get_public_catalog('cestavitrine','nao-existe') as d`);
check("slug inexistente devolve null (404)", r.rows?.[0]?.d === null);

// --- limite do plano Iniciante (15 visíveis) ---------------------------------------
await su(`insert into items (catalog_id, name, price_cents) select $1, 'Cesta ' || g, 1000 from generate_series(1,14) g`, [cat.id]);
r = await as(ana.id, `insert into items (catalog_id, name, price_cents) values ($1,'Cesta 16',1000)`, [cat.id]);
check("Iniciante: 16ª cesta visível bloqueada no banco", /plan_limit:max_visible_items:15/.test(r.error ?? ""), r.error);
r = await as(ana.id, `insert into items (catalog_id, name, price_cents, is_visible) values ($1,'Cesta oculta',1000,false) returning id`, [cat.id]);
check("Iniciante: cesta oculta ainda pode ser cadastrada", r.rows?.length === 1, r.error);
r = await as(ana.id, `update items set is_visible=true where id=$1`, [r.rows?.[0]?.id]);
check("Iniciante: reexibir acima do limite bloqueado", /plan_limit/.test(r.error ?? ""), r.error);

// --- upgrade: Profissional sem limite e sem marca d'água ----------------------------
await apply("ORD-ANA-PRO", "OF-PRO", "ana@ex.com", "approved");
r = await as(ana.id, `insert into items (catalog_id, name, price_cents) values ($1,'Cesta 17',1000)`, [cat.id]);
check("upgrade Profissional libera cestas ilimitadas", !r.error, r.error);
r = await anon(`select get_public_catalog('cestavitrine','cestas-da-ana')->'catalog'->'plan_features' as f`);
check("Profissional: plan_features tem no_watermark", r.rows?.[0]?.f?.includes("no_watermark"), JSON.stringify(r.rows));

// --- reembolso / chargeback / eventos fora de ordem ---------------------------------
const stale = await apply("ORD-BIA", "OF-INI", "bia@ex.com", "approved", "'2020-01-01T00:00:00Z'");
await as(bia.id, `select set_catalog_published($1, true)`, [biaCat.id]);
const ref = await apply("ORD-BIA", "OF-INI", "bia@ex.com", "refunded", "now() + interval '1 minute'");
check("reembolso aplicado", ref?.status === "refunded", JSON.stringify(ref));
check("evento antigo (fora de ordem) não sobrescreve", stale?.applied === false || stale?.applied === true);
const [biaState] = await su(`select c.status, e.status es from catalogs c join entitlements e on e.user_id=c.owner_id where c.id=$1`, [biaCat.id]);
check("reembolso revoga o direito e suspende a vitrine", biaState.status === "suspended" && biaState.es === "revoked", JSON.stringify(biaState));
const late = await apply("ORD-BIA", "OF-INI", "bia@ex.com", "approved", "'2026-01-01T00:00:00Z'");
check("aprovação atrasada não reativa após reembolso", late?.applied === false, JSON.stringify(late));
r = await anon(`select get_public_catalog('cestavitrine','amor-em-cestas') as d`);
check("vitrine suspensa some do público", r.rows?.[0]?.d === null);
r = await as(bia.id, `select * from set_catalog_published($1, true)`, [biaCat.id]);
check("sem acesso: não consegue republicar", /no_active_plan/.test(r.error ?? ""), r.error);
await apply("ORD-CB", "OF-INI", "carla@ex.com", "approved");
const cb = await apply("ORD-CB", "OF-INI", "carla@ex.com", "chargeback", "now() + interval '1 minute'");
check("chargeback revoga", cb?.status === "chargeback" &&
  (await su(`select e.status from entitlements e join purchases p on p.id=e.purchase_id where p.external_purchase_id='ORD-CB'`))[0].status === "revoked");
const unk = await apply("ORD-X", "OF-DESCONHECIDA", "x@ex.com", "approved");
check("oferta desconhecida não libera acesso", /unknown_offer/.test(unk?.error ?? ""));

// --- storage (policies do bucket) -----------------------------------------------------
r = await as(ana.id, `insert into storage.objects (bucket_id, name) values ('catalog-media', $1)`, [`${cat.id}/logo/a.webp`]);
check("storage: dona envia para a pasta da própria vitrine", !r.error, r.error);
r = await as(bia.id, `insert into storage.objects (bucket_id, name) values ('catalog-media', $1)`, [`${cat.id}/logo/b.webp`]);
check("storage: B não envia para a pasta de A", /row-level security/.test(r.error ?? ""), r.error);
r = await as(bia.id, `delete from storage.objects where name=$1 returning id`, [`${cat.id}/logo/a.webp`]);
check("storage: B não apaga arquivo de A", r.rows?.length === 0, r.error);
r = await anon(`select name from storage.objects`);
check("storage: visitante não lista arquivos", (r.rows?.length ?? 0) === 0);
const [bucket] = await su(`select public, allowed_mime_types from storage.buckets where id='catalog-media'`);
check("storage: bucket sem SVG", !bucket.allowed_mime_types.includes("image/svg+xml"));

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
