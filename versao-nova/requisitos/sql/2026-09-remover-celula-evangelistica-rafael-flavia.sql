-- Remove a celula Evangelistica do Rafael Miamoto e da Flavia Miamoto,
-- mantendo a celula de Lideranca de cada um intacta.
--
-- Atencao: o app normalmente exige que todo lider tenha ao menos 1 celula
-- Evangelistica ativa (fecharCelulaIndividual bloqueia isso pela tela).
-- Este SQL contorna essa regra de proposito, direto no banco. Depois de
-- rodar, o Rafael e a Flavia ficam só com a celula de Lideranca.
--
-- Rodar no Editor SQL do painel do Supabase (projeto de producao), uma unica vez.

update pessoas
set celulas_json = '[{"id":"cel-rafael-lid","rua":"","bairro":"","cidade":"Mandaguari","numero":"","horario":"20:00","diaSemana":"Quarta","finalidade":"Liderança","complemento":"","faixaEtaria":["Adulto"],"tipoEndereco":"residencial"}]'
where id = 'b5d39aec-f0aa-4f4f-994e-c7f17540340f'; -- Rafael Miamoto

update pessoas
set celulas_json = '[{"id":"cel-flavia-lid","rua":"","bairro":"","cidade":"Mandaguari","numero":"","horario":"20:00","diaSemana":"Quarta","finalidade":"Liderança","complemento":"","faixaEtaria":["Adulto"],"tipoEndereco":"residencial"}]'
where id = '5f3058a0-0e38-4c42-931b-6a1db68d9429'; -- Flavia Miamoto
