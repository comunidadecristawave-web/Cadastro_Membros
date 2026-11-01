-- Diagnostico SOMENTE LEITURA para o mapa das celulas: quantas celulas ativas
-- tem endereco completo, parcial ou vazio, e em quais cidades. Nao altera nada
-- e devolve apenas contagens (nenhum nome, telefone ou endereco).
--
-- Mesma regra do app (getAllCelulasFlat): celula "outro" usa o endereco da
-- propria celula; "residencial" (ou lider sem celulas cadastradas) usa o
-- endereco do lider. So lideres ativos e sem referencia_externa.
--
-- Rodar no Editor SQL do painel do Supabase (projeto de producao). Sao duas
-- consultas: rode cada uma separadamente e copie as contagens.

-- 1) Qualidade do endereco por celula
with lideres as (
  select
    rua, numero, bairro, cidade,
    case
      when celulas_json is null or btrim(celulas_json) in ('', '[]', 'null') then '[{"tipoEndereco":"residencial"}]'::jsonb
      else celulas_json::jsonb
    end as celulas
  from pessoas
  where e_lider = true
    and status = 'ATIVO'
    and coalesce(referencia_externa, false) = false
),
enderecos as (
  select
    nullif(btrim(case when c->>'tipoEndereco' = 'outro' then c->>'rua'    else l.rua    end), '') as rua,
    nullif(btrim(case when c->>'tipoEndereco' = 'outro' then c->>'numero' else l.numero end), '') as numero,
    nullif(btrim(case when c->>'tipoEndereco' = 'outro' then c->>'bairro' else l.bairro end), '') as bairro
  from lideres l
  cross join lateral jsonb_array_elements(l.celulas) c
)
select
  count(*)                                                                    as total_celulas,
  count(*) filter (where rua is not null and numero is not null)              as com_rua_e_numero,
  count(*) filter (where rua is not null and numero is null)                  as so_rua,
  count(*) filter (where rua is null and bairro is not null)                  as so_bairro,
  count(*) filter (where rua is null and bairro is null)                      as sem_endereco
from enderecos;

-- 2) Celulas por cidade (nome da cidade normalizado: minusculas, sem espacos nas pontas)
with lideres as (
  select
    cidade,
    case
      when celulas_json is null or btrim(celulas_json) in ('', '[]', 'null') then '[{"tipoEndereco":"residencial"}]'::jsonb
      else celulas_json::jsonb
    end as celulas
  from pessoas
  where e_lider = true
    and status = 'ATIVO'
    and coalesce(referencia_externa, false) = false
)
select
  coalesce(nullif(lower(btrim(case when c->>'tipoEndereco' = 'outro' then c->>'cidade' else l.cidade end)), ''), '(vazia = Mandaguari)') as cidade,
  count(*) as celulas
from lideres l
cross join lateral jsonb_array_elements(l.celulas) c
group by 1
order by 2 desc;
