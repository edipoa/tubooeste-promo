# Design SaaS — Promovix

> Documento gerado via sessão de brainstorming. Validado pelo founder antes da implementação.

---

## Understanding Summary

- **O que:** SaaS multi-tenant sobre o Node.js existente, com frontend Vue.js
- **Produto:** Display TV de promoções (HTML puro + Vue moderno) + editor de stories com IA (Gemini Flash) + gerador de PNG
- **Quem:** Pequenos negócios diretos (1 loja) e agências (N lojas como sub-tenants)
- **Modelo:** 4 tiers fixos por número de lojas, trial 20 dias, self-service, pagamento via Asaas
- **Fora do MVP:** Publicação direta no Instagram (OAuth multi-conta — complexidade desnecessária agora)

---

## Assumptions

- Um único login por account (email + senha) — sem múltiplos usuários por conta no MVP
- Adicionar lojas além do plano = upgrade manual pelo cliente via painel
- Display TV nunca é bloqueado por inadimplência — só o admin
- Storage externo obrigatório (Railway não persiste disco)
- Preços preliminares — validar com pesquisa de mercado antes do lançamento
- App Meta para publicação Instagram entra em versão futura

---

## Stack

| Componente | Escolha |
|---|---|
| Backend | Node.js + Express (mantido) |
| Banco | PostgreSQL (Railway) |
| Frontend | Vue.js SPA |
| Auth | JWT em cookie httpOnly |
| Pagamento | Asaas (boleto + Pix + cartão) |
| Storage | Cloudinary |
| Hospedagem | Railway |
| IA (stories) | Gemini Flash (gratuito, multimodal) |
| Editor visual | Fabric.js ou Vue Konva |

---

## Data Model

```sql
planos
  id          UUID PK
  nome        TEXT      -- 'starter' | 'pro' | 'agency' | 'agency_pro'
  max_lojas   INT       -- 1 | 5 | 15 | 30
  preco       NUMERIC   -- 39.90 | 129.90 | 279.90 | 479.90
  asaas_id    TEXT      -- id do plano no Asaas

accounts
  id            UUID PK
  tipo          TEXT      -- 'direct' | 'agency'
  nome          TEXT
  email         TEXT UNIQUE
  senha_hash    TEXT
  plano_id      UUID FK → planos
  asaas_id      TEXT      -- customer id no Asaas
  status        TEXT      -- 'trial' | 'active' | 'suspended'
  trial_ends_at TIMESTAMP
  criado_em     TIMESTAMP

lojas
  id              UUID PK
  account_id      UUID FK → accounts
  nome            TEXT
  slug            TEXT UNIQUE   -- URL pública: /tv/:slug
  cor_primaria    TEXT
  cor_secundaria  TEXT
  logo_url        TEXT          -- Cloudinary URL
  telefone        TEXT
  fallback_tagline    TEXT
  fallback_cidade     TEXT
  fallback_categorias TEXT
  ativo           BOOLEAN
  criado_em       TIMESTAMP

promocoes
  id            UUID PK
  loja_id       UUID FK → lojas
  titulo        TEXT
  descricao     TEXT
  preco_de      NUMERIC
  preco_por     NUMERIC
  imagem_url    TEXT            -- Cloudinary URL
  data_validade DATE
  ativo         BOOLEAN
  criado_em     TIMESTAMP
```

---

## Tiers de Preço

| Tier | Lojas | Preço/mês | Target |
|---|---|---|---|
| Starter | 1 loja | R$39,90 | Pequeno negócio direto |
| Pro | até 5 lojas | R$129,90 | Múltiplos pontos |
| Agência | até 15 lojas | R$279,90 | Pequenas agências |
| Agência Pro | até 30 lojas | R$479,90 | Agências maiores |

> ⚠️ Preços preliminares — validar com pesquisa de mercado e benchmark de concorrentes.

---

## Auth Flow

**Cadastro (self-service):**
1. `POST /api/auth/cadastro` recebe nome, email, senha, tipo
2. Cria `account` com `status: 'trial'` e `trial_ends_at: now + 20 dias`
3. Cria 1 loja inicial automaticamente para contas 'direct'
4. Cria cliente no Asaas em background (sem bloquear o fluxo)
5. Retorna JWT em cookie httpOnly

**Login:**
1. `POST /api/auth/login` valida credenciais
2. Gera JWT com `{ accountId, tipo }` em cookie httpOnly (8h)
3. Vue.js redireciona para dashboard

**Proteção de rotas:**
- `requireAuth` — valida JWT do cookie em toda rota `/api/admin/*`
- `requireActive` — bloqueia com 403 se `status === 'suspended'`
- Display TV nunca passa por `requireActive`
- Vue Router usa `GET /api/auth/me` como guard global

---

## Frontend Vue.js — Estrutura de Páginas

```
/login                              → público
/cadastro                           → público
/tv/:slug                           → público (HTML puro, compatível com TVs antigas)
/tv/:slug/moderno                   → público (Vue.js, layout moderno)

/dashboard                          → autenticado
/dashboard/lojas                    → lista de lojas (agências veem todas)
/dashboard/lojas/:id/promocoes      → gerenciar promoções
/dashboard/lojas/:id/stories        → gerar stories PNG
/dashboard/lojas/:id/config         → branding, cores, logo, fallback TV
/dashboard/conta                    → plano atual, upgrade, trocar senha
```

**Decisão:** Display TV permanece HTML puro (leve, sem dependência de JS pesado, roda em TVs antigas). Versão `/moderno` usa Vue.js com animações e layout rico. Ambas consomem a mesma API pública.

---

## API Routes

**Auth**
```
POST /api/auth/cadastro     → cria account + loja inicial + cliente Asaas
POST /api/auth/login        → valida credenciais, seta cookie JWT
POST /api/auth/logout       → limpa cookie
GET  /api/auth/me           → retorna account + plano + lojas
```

**Admin — Lojas**
```
GET    /api/admin/lojas              → lista lojas do account
POST   /api/admin/lojas              → cria loja (verifica max_lojas do plano)
GET    /api/admin/lojas/:id          → dados da loja
PUT    /api/admin/lojas/:id          → atualiza branding/config
DELETE /api/admin/lojas/:id          → desativa loja
```

**Admin — Promoções**
```
GET    /api/admin/lojas/:id/promocoes
POST   /api/admin/lojas/:id/promocoes
PUT    /api/admin/lojas/:id/promocoes/:pid
DELETE /api/admin/lojas/:id/promocoes/:pid
```

**Admin — Stories & Templates**
```
GET  /api/admin/lojas/:id/stories              → lista PNGs gerados
POST /api/admin/lojas/:id/stories/exportar     → canvas_json → PNG → Cloudinary
DELETE /api/admin/stories/:id                  → remove story

GET    /api/admin/lojas/:id/templates          → templates da loja + da agência
POST   /api/admin/lojas/:id/templates          → salva novo template
PUT    /api/admin/templates/:id                → atualiza template
DELETE /api/admin/templates/:id                → remove template

GET    /api/admin/conta/templates              → templates compartilhados da agência
POST   /api/admin/conta/templates              → cria template compartilhado

POST   /api/admin/lojas/:id/stories/gerar-layout
  body: { prompt, promocao_id, template_base_id? }
  returns: { canvas_json }   → carregado no editor, totalmente editável
```

**Billing**
```
GET  /api/admin/conta/plano          → plano atual + uso (lojas ativas / max)
POST /api/admin/conta/upgrade        → troca de plano no Asaas
POST /webhooks/asaas                 → atualiza status do account
```

**Público (sem auth)**
```
GET /api/public/:slug/promocoes      → promoções ativas da loja
GET /api/public/:slug/branding       → branding da loja
```

---

## Billing — Asaas

**Fluxo:**
1. Cadastro cria cliente no Asaas (`POST /customers`) em background
2. Trial de 20 dias — nenhuma cobrança
3. Cron job diário verifica trial expirado → muda para `suspended`, cria assinatura no Asaas
4. Webhooks atualizam `accounts.status`:
   - `PAYMENT_RECEIVED` → `active`
   - `PAYMENT_OVERDUE` → `suspended`
   - `SUBSCRIPTION_CANCELLED` → `suspended`
5. Upgrade de plano troca assinatura no Asaas e atualiza `account.plano_id` imediatamente

**Regra:** Display TV nunca verifica `status` — loja não para de funcionar por inadimplência.

---

## Edge Cases

**Trial expirado:**
- Cron job diário: `trial_ends_at < now AND status = 'trial'` → `suspended`
- Admin mostra banner de upgrade
- Display TV continua funcionando

**Limite de lojas atingido:**
- `POST /api/admin/lojas` retorna 403 com mensagem de upgrade
- Frontend exibe modal de upgrade com os tiers disponíveis

**Upgrade de plano:**
- Troca imediata (sem esperar webhook)
- Nova loja pode ser criada na hora

**Storage:**
- Todas as imagens (logo, promoções, stories) vão para Cloudinary
- Organizadas por `loja_id/` dentro do bucket
- Railway não persiste disco — nunca salvar imagem localmente em produção

---

## Stories & Layout Editor

### Data Model

```sql
layout_templates
  id            UUID PK
  account_id    UUID FK → accounts    -- dono do template
  loja_id       UUID FK → lojas NULL  -- NULL = compartilhado na agência
  nome          TEXT
  thumbnail_url TEXT                  -- preview PNG no Cloudinary
  canvas_json   JSONB                 -- estado completo do editor (Fabric.js)
  criado_em     TIMESTAMP

stories
  id              UUID PK
  loja_id         UUID FK → lojas
  promocao_id     UUID FK → promocoes NULL
  template_id     UUID FK → layout_templates NULL
  imagem_url      TEXT                -- PNG final no Cloudinary
  canvas_json     JSONB               -- snapshot do canvas no momento da geração
  criado_em       TIMESTAMP
```

- `loja_id IS NULL` no template → compartilhado com todas as lojas da agência
- `loja_id IS NOT NULL` → template privado da loja
- `canvas_json` em JSONB permite reabrir e editar qualquer story ou template salvo

### Gemini Flash — Prompt Engineering

```
System: Você é um designer de stories para Instagram.
        Retorne APENAS JSON válido no formato Fabric.js canvas.
        Canvas: 1080x1920px.
        Elementos disponíveis: image, textbox, rect, circle, line, qrcode.

User: Crie um layout de story com as seguintes informações:
      - Produto: {promocao.titulo}
      - Descrição: {promocao.descricao}
      - Preço de: R$ {promocao.preco_de}
      - Preço por: R$ {promocao.preco_por}
      - Imagem do produto: {promocao.imagem_url}  ← Gemini analisa visualmente
      - Logo da loja: {loja.logo_url}
      - Cor primária: {loja.cor_primaria}
      - Cor secundária: {loja.cor_secundaria}
      - Pedido do cliente: {prompt}
```

- Gemini recebe a imagem do produto via URL e analisa visualmente para compor o layout
- Fallback: canvas em branco com mensagem amigável se o JSON retornado for inválido
- Groq (Llama 3) como fallback se Gemini estiver indisponível

### Fluxo completo

1. Cliente escolhe promoção + digita prompt livre
2. `POST /gerar-layout` → backend enriquece com dados da promoção e imagem → Gemini retorna `canvas_json`
3. Editor carrega o JSON — todos os elementos são drag-and-drop e editáveis
4. Cliente ajusta o que quiser
5. `POST /exportar` → canvas → PNG → Cloudinary → salvo em `stories`

---

## Decision Log

| Decisão | Alternativas consideradas | Motivo |
|---|---|---|
| Account → Lojas (flat hierarchy) | Hierarquia estrita agencias/diretos | Menos código, billing trivial, cresce bem |
| PostgreSQL | SQLite | Multi-tenant com escrita concorrente, padrão SaaS |
| JWT em cookie httpOnly | Session-based, JWT localStorage | Stateless + seguro contra XSS |
| Vue.js SPA + Node.js API | SSR, rewrite completo | Mantém backend existente, frontend moderno |
| Display TV duplo (HTML puro + Vue moderno) | Só HTML, só Vue | Flexibilidade por tipo de TV e preferência do cliente |
| Tiers fixos (4 planos por número de lojas) | Per-loja dinâmico | Simples com Asaas, previsível pro cliente |
| Asaas | Stripe, Pagar.me | Boleto + Pix essencial pro público local brasileiro |
| Cloudinary | S3/R2, Supabase Storage | Free tier generoso + transformações de imagem nativas |
| Stories = só gerador de PNG no MVP | PNG + publicação automática no Instagram | OAuth multi-conta = complexidade desnecessária agora |
| Cron job para trial expiry | Webhook Asaas | Controle local, sem depender de evento externo |
| Preços em tiers fixos | Preço único por loja | Incentiva agências a crescerem dentro do produto |
| IA gera JSON de layout (não imagem flat) | Stable Diffusion, Imagen | Layout permanece editável no editor visual |
| Gemini Flash como IA principal | Groq, OpenAI | Multimodal — analisa imagem do produto; free tier generoso |
| Groq como fallback da IA | Só Gemini | Resiliência sem custo adicional |
| Templates com escopo duplo (loja / agência) | Só por loja | Agências precisam de consistência visual entre lojas |
| canvas_json em JSONB | Arquivo externo, S3 | Query simples, sem roundtrip extra para carregar editor |
