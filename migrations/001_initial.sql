-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Planos de assinatura
CREATE TABLE IF NOT EXISTS planos (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      TEXT    NOT NULL UNIQUE,  -- 'starter' | 'pro' | 'agency' | 'agency_pro'
  max_lojas INT     NOT NULL,
  preco     NUMERIC(10,2) NOT NULL,
  asaas_id  TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Dados iniciais dos planos
INSERT INTO planos (nome, max_lojas, preco) VALUES
  ('starter',    1,   39.90),
  ('pro',        5,  129.90),
  ('agency',    15,  279.90),
  ('agency_pro', 30, 479.90)
ON CONFLICT (nome) DO NOTHING;

-- Accounts (clientes diretos e agências)
CREATE TABLE IF NOT EXISTS accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          TEXT    NOT NULL CHECK (tipo IN ('direct', 'agency')),
  nome          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  senha_hash    TEXT    NOT NULL,
  plano_id      UUID    NOT NULL REFERENCES planos(id),
  asaas_id      TEXT,
  status        TEXT    NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended')),
  trial_ends_at TIMESTAMP NOT NULL,
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Lojas (sub-tenants)
CREATE TABLE IF NOT EXISTS lojas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  nome                 TEXT NOT NULL,
  slug                 TEXT NOT NULL UNIQUE,
  cor_primaria         TEXT NOT NULL DEFAULT '#1a73e8',
  cor_secundaria       TEXT NOT NULL DEFAULT '#ffffff',
  logo_url             TEXT,
  telefone             TEXT,
  fallback_tagline     TEXT,
  fallback_cidade      TEXT,
  fallback_categorias  TEXT,
  ativo                BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Promoções
CREATE TABLE IF NOT EXISTS promocoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id       UUID    NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  titulo        TEXT    NOT NULL,
  descricao     TEXT,
  preco_de      NUMERIC(10,2),
  preco_por     NUMERIC(10,2),
  imagem_url    TEXT,
  data_validade DATE,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Templates de layout (stories)
CREATE TABLE IF NOT EXISTS layout_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  loja_id       UUID REFERENCES lojas(id) ON DELETE CASCADE,  -- NULL = compartilhado na agência
  nome          TEXT NOT NULL,
  thumbnail_url TEXT,
  canvas_json   JSONB NOT NULL DEFAULT '{}',
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Stories gerados
CREATE TABLE IF NOT EXISTS stories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id      UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  promocao_id  UUID REFERENCES promocoes(id) ON DELETE SET NULL,
  template_id  UUID REFERENCES layout_templates(id) ON DELETE SET NULL,
  imagem_url   TEXT,
  canvas_json  JSONB NOT NULL DEFAULT '{}',
  criado_em    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_lojas_account    ON lojas(account_id);
CREATE INDEX IF NOT EXISTS idx_lojas_slug       ON lojas(slug);
CREATE INDEX IF NOT EXISTS idx_promocoes_loja   ON promocoes(loja_id);
CREATE INDEX IF NOT EXISTS idx_stories_loja     ON stories(loja_id);
CREATE INDEX IF NOT EXISTS idx_templates_account ON layout_templates(account_id);
CREATE INDEX IF NOT EXISTS idx_templates_loja   ON layout_templates(loja_id);
