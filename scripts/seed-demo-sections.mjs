// Preenche a vitrine demo com o conteúdo das seções (layout, sobre, dúvidas,
// banner, contato) e com depoimentos de exemplo. Roda como a conta demo, pela
// API normal (RLS). Uso: node scripts/seed-demo-sections.mjs
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./env.mjs";

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
};

must(await supabase.auth.signInWithPassword({ email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD }), "login demo");
const catalog = must(await supabase.from("catalogs").select("id, slug").eq("slug", "encanto-cestas").single(), "achar demo");

// Ordem e conteúdo das seções — o mesmo formato que a tela Aparência salva.
const layout = {
  schemaVersion: 1,
  sections: [
    { id: "header", enabled: true },
    {
      id: "banner",
      enabled: true,
      data: { texto: "Encomendas para o Dia das Mães: peça até 05/05" },
    },
    { id: "categorias", enabled: true },
    { id: "cestas", enabled: true },
    {
      id: "video",
      enabled: false, // fica pronta para ligar; sem link real de vídeo da loja
      data: {},
    },
    { id: "galeria", enabled: true },
    { id: "depoimentos", enabled: true },
    {
      id: "sobre",
      enabled: true,
      data: {
        titulo: "Feito à mão, com carinho",
        texto:
          "A Encanto Cestas nasceu em 2019, na cozinha de casa, montando cestas para amigos.\n\nHoje são mais de 2.000 cestas entregues em São Paulo — e cada uma continua sendo montada à mão, com produtos escolhidos um a um no dia da entrega.",
      },
    },
    {
      id: "duvidas",
      enabled: true,
      data: {
        p1: "Com quanto tempo preciso encomendar?",
        r1: "Peça com pelo menos 1 dia de antecedência. Para datas comemorativas (Dia das Mães, Namorados, Natal), recomendamos 3 dias.",
        p2: "Vocês entregam em qual região?",
        r2: "Entregamos em toda São Paulo capital e Grande SP. A taxa varia conforme o bairro e combinamos pelo WhatsApp.",
        p3: "Quais as formas de pagamento?",
        r3: "Pix, cartão de crédito em até 3x e dinheiro na entrega. O pagamento é combinado direto comigo pelo WhatsApp.",
        p4: "Posso personalizar a cesta?",
        r4: "Pode sim! Trocamos itens, incluímos algo que a pessoa goste e escrevemos o cartão com a sua mensagem. É só me contar a ideia.",
      },
    },
    { id: "contato", enabled: true, data: { horario: "Seg a Sáb, das 8h às 19h" } },
  ],
};

must(await supabase.from("catalogs").update({ layout }).eq("id", catalog.id), "salvar layout");
console.log("layout salvo:", layout.sections.filter((s) => s.enabled).length, "seções no ar");

// Depoimentos de exemplo (plano Profissional libera o recurso no banco).
const depoimentos = [
  { author_name: "Juliana M.", rating: 5, body: "A cesta chegou linda, exatamente como na foto. Minha mãe amou e todo mundo ficou perguntando onde comprei!" },
  { author_name: "Rafael S.", rating: 5, body: "Pedi o café da manhã para a minha namorada e entregaram cedinho, tudo fresquinho. Já virou tradição aqui em casa." },
  { author_name: "Carla P.", rating: 5, body: "Atendimento maravilhoso pelo WhatsApp. Personalizaram a cesta do jeitinho que pedi, com o chocolate que ela gosta." },
  { author_name: "Marcos A.", rating: 5, body: "Precisei de uma cesta de última hora e conseguiram entregar no mesmo dia. Salvou meu aniversário de casamento!" },
  { author_name: "Beatriz L.", rating: 4, body: "Cesta linda e bem montada. Só demorou um pouquinho na entrega, mas avisaram antes. Recomendo demais." },
];

const { data: existing } = await supabase.from("testimonials").select("id").eq("catalog_id", catalog.id);
if (existing?.length) {
  await supabase.from("testimonials").delete().eq("catalog_id", catalog.id);
}
must(
  await supabase.from("testimonials").insert(depoimentos.map((d, i) => ({ ...d, catalog_id: catalog.id, sort_order: i }))),
  "inserir depoimentos",
);
console.log("depoimentos:", depoimentos.length);

// Galeria: reaproveita as ilustrações já enviadas das cestas como portfólio.
const { data: itemMedia } = await supabase
  .from("media")
  .select("storage_path")
  .eq("catalog_id", catalog.id)
  .not("item_id", "is", null)
  .order("sort_order")
  .limit(4);
const { data: galleryNow } = await supabase.from("media").select("id").eq("catalog_id", catalog.id).is("item_id", null);
if (!galleryNow?.length && itemMedia?.length) {
  // duplicar o PATH faria duas linhas apontarem para o mesmo arquivo: a
  // exclusão de uma apagaria a foto da outra. Copiamos o arquivo no bucket.
  const legendas = ["Entrega do Dia das Mães", "Cesta personalizada com o nome", "Café da manhã entregue às 7h", "Montagem da semana"];
  for (const [i, m] of itemMedia.entries()) {
    const copy = `${catalog.id}/items/${crypto.randomUUID()}.webp`;
    const { error: copyErr } = await supabase.storage.from("catalog-media").copy(m.storage_path, copy);
    if (copyErr) {
      console.warn("  galeria: não copiou", copyErr.message);
      continue;
    }
    must(
      await supabase.from("media").insert({ catalog_id: catalog.id, item_id: null, kind: "image", storage_path: copy, caption: legendas[i], sort_order: i }),
      "galeria",
    );
  }
  console.log("galeria: fotos adicionadas");
}

console.log(`\nPronto: ${env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100"}/vitrine/${catalog.slug}`);
