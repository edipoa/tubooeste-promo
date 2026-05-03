-- Campos de nicho para melhorar stories gerados por IA
ALTER TABLE lojas
  ADD COLUMN IF NOT EXISTS tipo_negocio      TEXT,
  ADD COLUMN IF NOT EXISTS imagem_fundo_url  TEXT;

ALTER TABLE promocoes
  ADD COLUMN IF NOT EXISTS condicoes TEXT;
