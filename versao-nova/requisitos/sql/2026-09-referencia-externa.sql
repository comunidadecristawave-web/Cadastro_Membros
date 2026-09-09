-- Marca pessoas que existem no sistema apenas para preservar o vinculo de
-- discipulado (ex: Cesinha Sitta e Suellen Sitta, pastores da rede acima dos
-- pastores locais Rafael Miamoto e Flavia Miamoto), mas que nao sao membros
-- nem lideres desta igreja e nao devem aparecer em nenhuma lista, contagem,
-- dropdown ou celula do sistema. O vinculo continua preservado porque o
-- registro do Rafael/Flavia mantem o campo discipulador_id/lider apontando
-- pra eles, so que essas duas pessoas somem de tudo que e listado/contado.
--
-- Rodar no Editor SQL do painel do Supabase (projeto de producao), uma unica vez.

alter table pessoas add column if not exists referencia_externa boolean not null default false;

update pessoas set referencia_externa = true where id in (
  '5933c7c5-265a-4085-8c47-87dc10c94549', -- Cesinha Sitta
  '777e8813-a169-4b2e-aac6-9bbf8ca75e01'  -- Suellen Sitta
);
