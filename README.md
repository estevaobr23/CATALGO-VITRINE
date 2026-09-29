# CestaVitrine

Vitrine digital para quem vende cestas personalizadas. A pessoa cadastra marca, cestas, fotos e preços, recebe um link próprio, e o cliente escolhe a cesta e toca em **Quero esta cesta**. O WhatsApp da loja abre com a cesta identificada.

Um projeto só com três ambientes: **página de vendas** (`/`), **painel** (`/app`) e **vitrine pública** (`/vitrine/[slug]`).

- **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind 4 + Supabase (Postgres, Auth, Storage, Edge Functions). Deploy na Vercel.
- **Banco:** core **SQL Catálogo SaaS** (skill `sql-catalogo-saas`), sem alterações. A vertical CestaVitrine fica só em `supabase/migrations/100_cestavitrine_seed.sql` e em `src/vertical/`.

## Como rodar

```bash
npm install
cp .env.example .env.local     # preencha (ver abaixo)
npm run dev                    # http://localhost:3000
```

Produção local: `npm run build && npm start`.

## Variáveis de ambiente

| Variável | Onde | Para quê |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app | cliente Supabase (chave pública; a RLS protege os dados) |
| `NEXT_PUBLIC_SITE_URL` | app | domínio público: link da vitrine, e-mails de confirmação, preview do WhatsApp |
| `NEXT_PUBLIC_CHECKOUT_URL_INICIANTE` / `_PROFISSIONAL` | app | **PENDENTE:** links reais da Cakto |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | app | e-mail de suporte exibido (opcional) |
| `CAKTO_WEBHOOK_SECRET` | **secret da Edge Function** | **PENDENTE:** segredo do webhook da Cakto |

⚠️ **A service role nunca vai para o app.** O Next não usa essa chave. Ela existe só dentro da Edge Function, injetada pelo Supabase.

## Supabase

Projeto: `cestavitrine` (`srzyiwbwobucuavpvipi`, sa-east-1).

**Migrations** (`supabase/migrations`, aplicar em ordem):

| Arquivo | Conteúdo |
|---|---|
| `001`–`006` | core SQL Catálogo SaaS: tabelas, acesso, RLS, API pública, storage. **Não editar.** |
| `100_cestavitrine_seed.sql` | produto `cestavitrine`, slugs reservados, planos `iniciante` (15 cestas visíveis) e `profissional` (ilimitado, sem marca d'água, métricas, vídeo e depoimentos), ofertas (comentadas até existirem na Cakto) |
| `101_planos_video_depoimentos.sql` | acrescenta `video` e `testimonials` ao plano Profissional |

**Configurações no painel do Supabase:**

1. Em *Auth → Providers → Email*, manter **Confirm email ligado**. É isso que impede alguém de criar conta com o e-mail de um comprador e herdar o acesso.
2. Em *Auth → URL Configuration*, definir o **Site URL** = domínio de produção e adicionar `https://SEU-DOMINIO/auth/callback` nas Redirect URLs.
3. Em *Auth → Email Templates*, recomendado (funciona mesmo se o link for aberto em outro aparelho): trocar o link de "Confirm signup" por `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/app` e o de "Reset password" por `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`.
4. Configurar **SMTP próprio** (Resend, SES...). O e-mail padrão do Supabase tem limite baixo por hora e não serve para tráfego pago.
5. Em *Auth → Password security*, ligar **Leaked password protection**.
6. Em *API → Exposed schemas*, **não** expor `app_private`.

## Storage

Bucket público `catalog-media`, com arquivos em `{catalog_id}/{logo|cover|items}/{uuid}.webp`:

- As fotos são comprimidas no celular (WebP, no máximo 1600px) antes do envio.
- Só o dono envia, troca ou apaga na própria pasta.
- O visitante não lista arquivos.
- SVG é recusado.
- Trocar ou excluir uma foto apaga o arquivo antigo.
- **A fazer:** agendar um cron diário que chama `list_orphan_media()` para limpar sobras de uploads abandonados.

## Rotas

| Rota | O quê |
|---|---|
| `/` | página de vendas (estática) |
| `/login`, `/cadastro`, `/recuperar-senha`, `/nova-senha` | autenticação |
| `/auth/callback`, `/auth/sair` (POST) | confirmação de e-mail / recuperação, logout |
| `/app` | Minha vitrine (status, publicar, checklist, métricas) |
| `/app/primeiro-acesso` | configuração guiada: marca → logo e cores → primeira cesta |
| `/app/cestas`, `/app/cestas/nova`, `/app/cestas/[id]`, `/app/cestas/ideias` | Minhas cestas |
| `/app/categorias`, `/app/aparencia`, `/app/link`, `/app/configuracoes` | painel |
| `/app/galeria`, `/app/depoimentos` | conteúdo das seções Galeria e Depoimentos |
| `/app/plano` | plano atual e upgrade para o Profissional |
| `/app/sem-acesso` | conta sem compra ativa |
| `/vitrine/[slug]` (`?cesta=slug` abre uma cesta) | vitrine pública |

**Acesso ao painel, em 3 camadas:**

1. O `proxy.ts` exige sessão.
2. O guard (`src/core/auth/guard.ts`) exige entitlement ativo e vitrine criada.
3. A RLS no banco faz a proteção real.

## Seções da vitrine (editor)

A vitrine é montada por seções, em `/app/aparencia`: a pessoa liga o que quer mostrar, muda a ordem com ↑↓ e vê a prévia atualizar na hora. Tudo num único "Salvar".

- **Onde mora:** `catalogs.layout` (jsonb). Nenhuma migration é necessária para criar uma seção nova.
- **Catálogo de seções:** `src/vertical/sections.ts` (da vertical). A mecânica é do core, em `src/core/catalog/layout.ts`.
- **Seções fixas** (não dá para remover): Capa e marca, Categorias, Minhas cestas.
- **Livres em qualquer plano:** Aviso em destaque, Galeria de fotos, Sobre a loja, Perguntas frequentes, Contato e entrega.
- **Só no Profissional** (o banco bloqueia, não só a UI): Depoimentos (`testimonials`) e Vídeo (`video`).
- **Segurança:** o layout enviado pelo navegador passa por `normalizeLayout` **no servidor** — seção inventada, campo fora do schema e URL que não seja `https` são descartados. O vídeo só aceita links do YouTube.
- **Compatibilidade:** vitrine sem layout cai no padrão; seção nova aparece desligada para quem já existe, sem quebrar nada.

## Login e acesso

O fluxo é **compra primeiro, cadastro depois**:

1. A pessoa compra na Cakto.
2. O webhook grava a compra e o direito de acesso (entitlement) vinculado ao e-mail.
3. Ela cria a conta em `/cadastro` com **o mesmo e-mail**.
4. Ao confirmar o e-mail, o direito é vinculado automaticamente.

Quem não tem compra vê "Não encontramos sua compra". Reembolso ou chargeback revogam o direito e tiram a vitrine do ar sozinhos.

**Acesso de cortesia ou teste** (SQL editor), antes ou depois de a conta existir:

```sql
insert into entitlements (product_id, plan_id, buyer_email, source)
select p.id, pl.id, 'email@cliente.com', 'manual'
from products p join plans pl on pl.product_id = p.id and pl.key = 'profissional'
where p.key = 'cestavitrine';
```

## Checkout

Preço, preço "de", parcelas, nome dos planos, garantia e textos da oferta ficam **só** em `src/vertical/offer.ts`.

Os links de checkout vêm de `NEXT_PUBLIC_CHECKOUT_URL_*`. Enquanto estiverem vazios, os botões mostram "Checkout em configuração". Todo clique repassa `utm_*`/`fbclid` da página para o link da Cakto.

Os CTAs espalhados pela página rolam até `#planos`; só os cards de plano abrem o checkout.

## Webhook (Cakto)

A Edge Function `purchase-webhook` já está publicada (`verify_jwt = false`, autenticação própria):

```
https://srzyiwbwobucuavpvipi.supabase.co/functions/v1/purchase-webhook?provider=cakto
```

O adaptador segue a documentação oficial da Cakto (lida em 2026-09-28):

- **Autenticação:** assinatura `X-Cakto-Signature` (HMAC-SHA256 com janela anti-replay), com fallback para o campo `secret` do corpo.
- **Eventos:**
  - `purchase_approved` (com `status: "paid"`) → libera o acesso
  - `refund` → revoga
  - `chargeback` → revoga
  - os demais eventos são registrados e ignorados
- **Formatos:** aceita `data` como objeto (webhook V1) ou lista (V2).
- **Plano:** vem do **ID da oferta** (`data.offer.id`), nunca do valor pago.
- **Idempotência** em 3 níveis (evento, compra, direito). Evento fora de ordem é descartado.
- **Nunca cria usuário**, e o segredo nunca é salvo no log.

**PENDENTE DE CREDENCIAL**, nesta ordem:

1. Criar produto e ofertas na Cakto (skill `criar-produto-cakto`).
2. Descomentar e rodar o bloco de ofertas do `100_cestavitrine_seed.sql` com os IDs reais.
3. Cadastrar o webhook na Cakto com a URL acima e os eventos `purchase_approved`, `refund` e `chargeback`.
4. Gravar o `secret` retornado em *Edge Functions → Secrets* como `CAKTO_WEBHOOK_SECRET`. Sem ele a função recusa tudo (401).
5. Testar com o endpoint de teste de webhook da Cakto e conferir `webhook_events`.

## Deploy (Vercel)

1. Importar o repositório.
2. Configurar as variáveis `NEXT_PUBLIC_*` (Production e Preview).
3. Escolher a região **gru1**, que fica perto do banco em sa-east-1.
4. Depois do deploy, atualizar `NEXT_PUBLIC_SITE_URL` e as URLs do Supabase Auth com o domínio final.

## Dados demo

- **Vitrine demo:** `/vitrine/encanto-cestas` (6 cestas, 4 categorias, plano Profissional).
- **Credenciais:** as contas demo e de teste ficam em `.env.local` (`DEMO_*`, `E2E_*`) e usam e-mails `@example.com`.
- **Scripts:**
  - `npm run seed:demo` cria a vitrine demo; com `-- --reset` recria do zero. Usa a API normal, com RLS.
  - `npm run seed:demo:sections` preenche as seções da demo (layout, sobre, dúvidas, banner, galeria) e os depoimentos de exemplo.
  - `npm run demo:images` regenera as ilustrações em `public/demo`. São ilustrações, **troque por fotos reais**.
  - `npm run prints` recaptura as telas reais usadas na página de vendas (app rodando e demo criada).

## Imagens da demo e da oferta

As imagens de hoje são **ilustrações geradas por código** (`npm run demo:images`),
feitas para o projeto não ficar vazio. O material definitivo vem do GPT:

1. **`PROMPT-IMAGENS-GPT.md`** (na raiz) — o briefing completo das 24 imagens:
   6 cestas, logo e capa da loja demo, 4 de galeria, 5 avatares de depoimento,
   3 lifestyle, 3 mockups da oferta e 1 de compartilhamento. Traz a paleta, a
   direção de arte e a proporção exata de cada uma. O bloco de mockups manda
   usar a skill `mockup-digital`.
2. Jogue os arquivos que o GPT devolver em **`imagens-novas/`** (a pasta é
   ignorada pelo git). O **nome do arquivo** é o que manda:
   `romantica-premium.png` vira a foto daquela cesta.
3. `npm run import:images` — confere o que chegou e o que falta.
4. `npm run import:images -- --aplicar` — converte para WebP no tamanho certo,
   grava em `public/` e publica na vitrine demo (foto de cada cesta, logo, capa,
   galeria e avatares dos depoimentos), apagando os arquivos antigos do Storage.
5. `npm run prints` — recaptura as telas reais da página de vendas, já com as
   fotos novas.

## Testes

| Comando | O quê |
|---|---|
| `npm run typecheck`, `npm run lint`, `npm run build` | qualidade |
| `npm run test:db` | 60 verificações do banco (Postgres embutido): isolamento A×B, slug, publicação, limite do plano, reembolso/chargeback, idempotência, storage |
| `npm run test:e2e` | 58 verificações no navegador real contra o Supabase: vendas, login, primeiro acesso, CRUD, upload, publicação, vitrine no celular, WhatsApp, multitenancy, storage, sem acesso, logout. Requer o app rodando em `BASE_URL` (padrão `http://localhost:3100`) e limpa os dados de teste ao final |
| `node ~/.claude/skills/sql-catalogo-saas/tests/rls-smoke.test.mjs` | 51 verificações do core |

## Antes de produção

- [ ] Links de checkout da Cakto em `NEXT_PUBLIC_CHECKOUT_URL_*` e ofertas no seed
- [ ] Webhook cadastrado na Cakto + `CAKTO_WEBHOOK_SECRET`
- [ ] Confirmar preço, garantia e textos em `src/vertical/offer.ts` (hoje: Iniciante R$ 22,90 e Profissional R$ 37,90, ambos pagamento único)
- [ ] Criar as DUAS ofertas na Cakto (a do Iniciante e a do Profissional) — o upgrade dentro do app depende da oferta do Profissional estar cadastrada em `offers`
- [ ] Domínio: `NEXT_PUBLIC_SITE_URL` + Site URL/Redirect URLs no Supabase
- [ ] SMTP próprio + templates de e-mail com `token_hash`
- [ ] Leaked password protection ligado
- [ ] Trocar as ilustrações da demo por fotos reais (ver "Imagens da demo e da oferta") e rodar `npm run prints`
- [ ] Remover as contas de teste `@example.com` do Auth (a demo pode ficar)
- [ ] Cron de órfãos (`list_orphan_media`) e expurgo de `webhook_events.payload` antigo
- [ ] Biblioteca de combinações completa em `src/vertical/library.ts` (hoje é uma amostra de 6)
- [ ] Trocar os depoimentos de exemplo da demo por reais, ou deixar claro que são ilustrativos

## Estrutura

```
src/
  app/          rotas (finas: compõem core + vertical)
  core/         genérico, reutilizável em outros SaaS de catálogo (sem "cesta" no código)
  vertical/     CestaVitrine: config (vocabulário, CTA, atributos), oferta, biblioteca, marca, landing
supabase/       migrations (core + seed) e Edge Function do webhook
scripts/        demo, ilustrações, prints
tests/          banco (PGlite) e ponta a ponta (Playwright)
```
