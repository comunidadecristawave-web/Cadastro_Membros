-- Cache de geocodificacao dos enderecos das celulas (bloco "Mapa das celulas" do painel).
--
-- Guarda so o endereco NORMALIZADO (chave) -> latitude/longitude. Nao tem nome,
-- telefone nem vinculo com a pessoa: a tabela `pessoas` nunca e alterada pelo mapa.
--   endereco_chave: 'v1|rua|numero|bairro|cidade' (endereco) ou 'v1|cidade|<cidade>'
--                   (centro da cidade usado pelo seletor de cidade)
--   encontrado:     false = o Nominatim nao achou nem o bairro (tentado de novo apos 30 dias)
--
-- RLS ligado com politicas abertas para a chave anon do app (ler/inserir/atualizar, sem delete).
-- Idempotente: pode ser rodado mais de uma vez.
--
-- Rodar no Editor SQL do painel do Supabase (projeto de producao) ANTES da
-- pre-carga (node versao-nova/scripts/geocodificar-enderecos.js) e do deploy do mapa.

create table if not exists geocodificacao_enderecos (
  endereco_chave text primary key,
  lat double precision,
  lng double precision,
  encontrado boolean not null,
  atualizado_em timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'geocodificacao_enderecos_lat_faixa') then
    alter table geocodificacao_enderecos
      add constraint geocodificacao_enderecos_lat_faixa check (lat is null or (lat between -90 and 90));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'geocodificacao_enderecos_lng_faixa') then
    alter table geocodificacao_enderecos
      add constraint geocodificacao_enderecos_lng_faixa check (lng is null or (lng between -180 and 180));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'geocodificacao_enderecos_coerencia') then
    alter table geocodificacao_enderecos
      add constraint geocodificacao_enderecos_coerencia check (not encontrado or (lat is not null and lng is not null));
  end if;
end
$$;

grant select, insert, update on table geocodificacao_enderecos to anon, authenticated;

-- O Supabase pode ativar RLS automaticamente em tabelas novas; sem politica, a chave anon
-- le zero linhas e nao grava. Politicas explicitas: ler, inserir e atualizar (sem delete).
alter table geocodificacao_enderecos enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'geocodificacao_enderecos' and policyname = 'geocodificacao_ler') then
    create policy geocodificacao_ler on geocodificacao_enderecos
      for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'geocodificacao_enderecos' and policyname = 'geocodificacao_inserir') then
    create policy geocodificacao_inserir on geocodificacao_enderecos
      for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'geocodificacao_enderecos' and policyname = 'geocodificacao_atualizar') then
    create policy geocodificacao_atualizar on geocodificacao_enderecos
      for update to anon, authenticated using (true) with check (true);
  end if;
end
$$;
