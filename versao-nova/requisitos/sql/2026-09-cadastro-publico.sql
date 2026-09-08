-- Migração: suporte ao Formulário Público de Autocadastro
-- Rodar no Editor SQL do painel do Supabase (projeto de produção), uma única vez.
--
-- A coluna foto_url já existe na tabela pessoas (usada por outra tela) — nada a fazer nela.
-- Este script só adiciona o registro do consentimento LGPD/uso de imagem.

alter table pessoas
  add column if not exists consentimento_aceito boolean not null default false;

alter table pessoas
  add column if not exists consentimento_aceito_em timestamptz;
