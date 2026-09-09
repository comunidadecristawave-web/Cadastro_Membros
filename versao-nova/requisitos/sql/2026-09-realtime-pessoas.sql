-- Habilita o Supabase Realtime pra tabela pessoas, necessario para o
-- painel admin atualizar sozinho (sem F5) quando alguem preenche o
-- formulario publico de autocadastro.
--
-- Rodar no Editor SQL do painel do Supabase (projeto de producao), uma unica vez.
-- Alternativa sem SQL: no painel do Supabase, ir em Database > Replication
-- e ativar a tabela "pessoas" na publicacao "supabase_realtime".

alter publication supabase_realtime add table pessoas;
