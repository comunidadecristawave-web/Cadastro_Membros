[Cadastro Membros](../README.md) > **Critérios de Aceitação — QA (Bateria de Testes Pós-Entrega v1)**

---

# Critérios de Aceitação — QA

**Versão:** 1.1 | **Última atualização:** 17/08/2026 | **Autor:** Thiago Oliveira (com apoio de IA)

**Base:** [`plano-revisao-implementacao-v1.md`](./plano-revisao-implementacao-v1.md) (v1.3) — cada critério abaixo referencia o Ponto ou Termo correspondente naquele documento, onde está o contexto completo (o quê, por quê, e a decisão do PO).

---

## Como usar este documento

Este é o roteiro de testes para validar a entrega do dev **depois** que ele implementar o que está no plano de revisão. Cada item abaixo é um critério binário: **passa** ou **falha**. Marque o checkbox conforme for testando.

- ✅ Se o comportamento descrito acontecer exatamente como escrito → **passa**
- ❌ Se divergir de qualquer forma (mesmo que "pareça funcionar melhor") → **falha**, reportar ao dev com o número do critério (ex: "MEM-07 falhou")

Os critérios estão agrupados por tela/módulo, na mesma ordem do plano de revisão. Cada critério tem um código curto (ex: `AUT-01`, `MEM-05`) para facilitar referência em bugs/comentários.

Este documento é **um resumo executável**, não a especificação completa — para qualquer dúvida de contexto ("por que isso é assim?", "e se X acontecer?"), a resposta quase sempre já existe no [`plano-revisao-implementacao-v1.md`](./plano-revisao-implementacao-v1.md) ou nos requisitos originais em `requisitos/funcionais/`. Consulte-os antes de reportar algo como "ambíguo".

## Notas de contexto do produto (leia antes de testar)

Estas premissas evitam interpretar como "gap" algo que é comportamento intencional deste produto específico:

- **Não existe campo CPF** em nenhum lugar do sistema. A identificação de duplicatas usa **nome completo + data de nascimento** (Ponto 8, IMP-02).
- **Só o perfil Administrador loga no v1.** Não existe sessão de Líder de Célula nem de Membro — logo, não há cenário de "um líder acessando dados de outro líder" para testar.
- **Não há bloqueio de conta por tentativas de login incorretas (brute force).** Isso é uma decisão consciente já documentada no requisito original de Autenticação, não uma omissão.
- **O vínculo é sempre membro→líder, nunca membro→célula específica.** Um discípulo pertence ao líder, não a uma célula dele. Por isso um líder com 2 células mostra o mesmo total de discípulos nas duas — isso é esperado, não duplicação.
- **Exclusão permanente não existe** em nenhuma entidade (membro, célula, usuário) — só inativação/fechamento. Não testar fluxo de "deletar".
- Preferências de UI (colunas visíveis) são salvas **por conta de usuário**, não por navegador/dispositivo local.

---

## 1. Autenticação (`AUT`)

- [ ] **AUT-01** — Fazer login e, sem fechar o navegador, dar **F5** (reload) na página. O usuário **permanece logado** (não volta para a tela de login). *(Ponto 2)*
- [ ] **AUT-02** — Fazer login **marcando** "Lembrar de mim", fechar o navegador, abrir de novo dentro de poucos minutos e acessar a URL do sistema. O usuário **continua logado** (sessão vale por 7 dias). *(Ponto 2)*
- [ ] **AUT-03** — Fazer login **sem marcar** "Lembrar de mim" e fechar completamente o navegador. Ao abrir de novo, o usuário **precisa logar de novo** (sessão não persiste ao fechar o navegador quando a opção não foi marcada). *(Ponto 2)*
- [ ] **AUT-04** — Na tela de login, **não deve existir** nenhum link "Esqueci minha senha" ou fluxo de recuperação por e-mail. *(Ponto 3)*
- [ ] **AUT-05** — Um admin ativo consegue redefinir a senha de outro usuário manualmente pela tela de Permissões/Acessos (fluxo de reset continua existindo, só não é self-service por e-mail). *(Ponto 3)*

---

## 2. Membros — Cadastro (`MEM`)

- [ ] **MEM-01** — No formulário de cadastro/edição de membro, **não existe** o campo "Grupo" (Kids/Teens/Movement/Ripe/Família) em nenhum lugar. *(Termo 1)*
- [ ] **MEM-02** — No formulário, o campo **"Líder Responsável (Discipulado por)"** aparece **antes** do campo "É Líder de Célula?". *(Termo 5)*
- [ ] **MEM-03** — Cadastrar um membro com o **mesmo nome completo e mesma data de nascimento** de um membro já existente. O sistema exibe um **alerta não bloqueante** avisando da possível duplicata, mas permite confirmar e salvar mesmo assim. *(Ponto 8)*
- [ ] **MEM-04** — Tentar vincular (como discípulo, ao criar ou editar) um membro do sexo **Feminino** a um líder do sexo **Masculino** (ou vice-versa). O sistema **bloqueia por completo o salvamento** — não é um alerta contornável, não deve ser possível confirmar e salvar mesmo assim. *(Ponto 16 — comportamento é bloqueio total, diferente do alerta de duplicata do MEM-03)*

### 2.1 Bloco de Célula (quando "É Líder de Célula" = Sim)

- [ ] **MEM-05** — Ao marcar "Sim", aparece a opção de escolher **Finalidade**: Evangelística ou Liderança. *(Ponto 1)*
- [ ] **MEM-06** — Ao marcar "Sim", aparece a opção de escolher **Faixa Etária**: Kids / Teens / Adolescente / Jovem Adulto / Adulto. *(Termo 1)*
- [ ] **MEM-07** — Existe um botão **"+ Adicionar outra célula"**, permitindo cadastrar mais de uma célula para o mesmo líder (dias/horários diferentes). *(Ponto 1)*
- [ ] **MEM-08** — O campo do dia da célula tem o rótulo **"Dia da Célula"** — não "Dia do Encontro" — neste formulário. *(Termo 8)*
- [ ] **MEM-09** — Existe a opção **"Usar meu endereço residencial"** (marcada por padrão) ou **"Outro endereço"**. Ao selecionar "Outro endereço", habilitam os campos Rua, Número, Bairro, Cidade, Complemento para preenchimento manual. *(Ponto 1)*
- [ ] **MEM-10** — Cadastrar um líder com célula em endereço **diferente** do residencial (ex: uma quadra de esportes em outro bairro) e confirmar que o endereço salvo é o informado manualmente, não o residencial. *(Ponto 1)*
- [ ] **MEM-11** — Tentar marcar como líder um membro cujo **"Líder Responsável"** ainda **não tem nenhuma célula de Finalidade "Liderança"** cadastrada. O sistema **bloqueia o salvamento** com a mensagem: *"Para que [Liderado] se torne líder, [Líder X] precisa ter uma célula de Liderança cadastrada. Cadastre-a antes de continuar."* Isso exige um passo manual separado: editar primeiro o líder responsável, adicionar a célula de Liderança nele, salvar, e só depois voltar e promover o discípulo. Não há criação automática/inline da célula de Liderança neste fluxo. *(Ponto 1)*
- [ ] **MEM-12** — O botão **"Novo Líder"** **não existe mais** em nenhum lugar da tela de Células. *(Ponto 9)*
- [ ] **MEM-29** — No formulário de edição de célula, o campo **Finalidade** aparece como **somente leitura** (não editável) — não é possível mudar uma célula de Evangelística para Liderança (ou vice-versa) depois de criada. *(Ponto 1, item 7)*

---

## 3. Membros — Listagem, Visualização e Edição (`MEM`)

- [ ] **MEM-13** — A listagem de Membros tem **paginação** com opções 10/50/100 registros por página (padrão 50). *(Ponto 7)*
- [ ] **MEM-14** — Clicar no cabeçalho de uma coluna ordenável alterna a ordenação crescente/decrescente, com indicador visual. *(Ponto 7)*
- [ ] **MEM-15** — O filtro dinâmico inclui **Dia da Célula** e **Horário da Célula** (evangelística), retornando apenas líderes com célula evangelística naquele dia/horário. *(Ponto 7)*
- [ ] **MEM-16** — Existe um controle de **"Colunas"** na listagem de Membros, permitindo marcar/desmarcar quais colunas aparecem na tabela. A coluna "Ações" não pode ser desmarcada. *(Ponto 19)*
- [ ] **MEM-17** — Desmarcar uma coluna, sair da tela (ou dar reload) e voltar à listagem de Membros: a coluna **continua oculta** (preferência foi lembrada). *(Ponto 19)*
- [ ] **MEM-18** — Existe um botão de **exportar** a listagem em **CSV** e em **PDF**, e o arquivo exportado reflete apenas os registros que estão **filtrados/visíveis na tela no momento**, não a base inteira. *(Ponto 17)*
- [ ] **MEM-19** — Na ficha de visualização de um membro, aparecem os campos calculados: **idade atual** (em anos completos, considerando se já fez aniversário no ano corrente) e **"membro há X"** (baseado na data de ingresso; exibe em anos completos se ≥ 12 meses, senão em meses). *(Ponto 6, cálculo já especificado em `visualizar-membro.md`)*
- [ ] **MEM-20** — Se o membro visualizado for líder, aparece o card **"X discípulos (em N células)"**. O "X" conta cada discípulo **uma única vez** (o vínculo é por líder, não por célula — um discípulo não é contado 2x mesmo se o líder tiver várias células evangelísticas), excluindo discípulos inativos. O "N" conta apenas células de Finalidade Evangelística (célula de Liderança não entra no N). *(Ponto 6, Ponto 1)*
- [ ] **MEM-21** — Editar um membro **ativo** e trocar o campo "Líder Responsável" para outro líder. Ao salvar, aparece um **modal de confirmação** ("Você está transferindo [Nome] do líder [Atual] para [Novo]. Confirmar?") antes de efetivar. *(Ponto 5)*
- [ ] **MEM-22** — Repetir o MEM-21 com um membro **inativo**: a troca salva **direto, sem modal**. *(Ponto 5)*

---

## 4. Membros — Inativação e Reativação (`MEM`)

- [ ] **MEM-23** — Inativar um membro **sem discípulos vinculados**: aparece um **modal de confirmação simples** antes de efetivar (não dispara em um clique só). *(Ponto 4)*
- [ ] **MEM-24** — Inativar um líder **com discípulos ativos** (comuns): o sistema **bloqueia** e abre o modal de **redistribuição**, exigindo escolher um novo líder para cada discípulo antes de continuar. *(Ponto 4 — já funcionava, confirmar que continua)*
- [ ] **MEM-25** — Inativar um líder que tem **discípulos que também são líderes** (formados na célula de Liderança dele): esses também aparecem no modal de redistribuição, exigindo um novo líder-mentor para eles. *(Ponto 4 — extensão nova)*
- [ ] **MEM-26** — Após confirmar a inativação de um líder, todas as células dele (Evangelística e Liderança) são **fechadas** — não aparecem mais na listagem de Células, nem em estado "oculto" reativável automaticamente. *(Ponto 4)*
- [ ] **MEM-27** — Reativar um membro que **não era líder**: pede confirmação e exige **selecionar um líder responsável** (não tenta restaurar automaticamente o líder anterior). *(Ponto 4)*
- [ ] **MEM-28** — Reativar um membro que **era líder** antes de ser inativado: o sistema pergunta explicitamente **"Reativar também como líder de célula?"**. Se sim, exige cadastrar ao menos 1 célula Evangelística nova (não restaura a antiga automaticamente). Se não, reativa como membro comum. *(Ponto 4)*
- [ ] **MEM-30** — No modal de redistribuição de discípulos (ao inativar ou fechar célula de um líder), o seletor de "novo líder" mostra **apenas líderes ativos** e **do mesmo sexo** do discípulo sendo redistribuído. *(Ponto 4 + Ponto 16, esclarecido)*
- [ ] **MEM-31** — No fluxo de reativação, o seletor de "líder responsável" mostra **apenas líderes ativos** e **do mesmo sexo** do membro sendo reativado. *(Ponto 4 + Ponto 16, esclarecido)*

---

## 5. Células (`CEL`)

- [ ] **CEL-01** — Um líder com **2 células** aparece em **2 linhas separadas** na listagem de Células (não 1 linha só). *(Ponto 1)*
- [ ] **CEL-02** — A listagem de Células tem colunas e filtros de **Finalidade** (Evangelística/Liderança) e **Faixa Etária**. *(Ponto 1, Termo 1)*
- [ ] **CEL-03** — Existe um controle de **"Colunas"** na listagem de Células, com a mesma regra de persistência do MEM-16/17. *(Ponto 19)*
- [ ] **CEL-04** — Existe exportação **CSV e PDF** respeitando os filtros ativos, igual ao MEM-18. *(Ponto 17)*
- [ ] **CEL-05** — Na ficha de uma célula, cada discípulo **ativo** do líder aparece **exatamente uma vez** na lista — mesmo que esse líder tenha mais de uma célula (o vínculo é membro→líder, não membro→célula; não existe "discípulo de uma célula específica", então não há cenário de duplicidade legítima — se aparecer 2x, é sempre bug de dado/consulta). *(Ponto 10)*
- [ ] **CEL-06** — Membros **inativos** não aparecem na lista de discípulos da ficha da célula. *(Ponto 10, Ponto 4)*
- [ ] **CEL-07** — No formulário de editar célula, o campo de dia tem o rótulo **"Dia da Célula"** (não "Dia do Encontro"). *(Termo 8)*
- [ ] **CEL-08** — O formulário de editar célula tem a opção **Faixa Etária** e o toggle **"Usar endereço residencial do líder" / "Outro endereço"** com o campo Complemento também disponível. *(Ponto 1)*
- [ ] **CEL-09** — O formulário de editar célula **não** expõe mais o campo "Grupo" do líder. *(Termo 1, Termo 8)*
- [ ] **CEL-10** — Existe uma ação **"Fechar Célula"** na ficha/edição de uma célula individual, independente de inativar o líder inteiro. Fechar 1 célula de um líder que tem outra(s) **não afeta** as demais células dele, que continuam ativas. *(Ponto 20 — novo)*
- [ ] **CEL-11** — Tentar fechar uma célula Evangelística que tem discípulos vinculados: o sistema exige redistribuí-los antes (mesmo modal usado na inativação de líder). *(Ponto 20 — novo)*
- [ ] **CEL-12** — Tentar fechar a **última** célula Evangelística de um líder: o sistema **bloqueia**, orientando a inativar o líder em vez de fechar a célula. *(Ponto 20 — novo)*

---

## 6. Dashboard (`DSH`)

- [ ] **DSH-01** — Ao carregar o Dashboard pela primeira vez após login, todos os cards (Membros Ativos, Células Ativas, Aniversariantes, Líderes) mostram o **valor correto** — não deve haver nenhum momento visível em que um número errado apareça antes do certo (ex: "1" piscando antes de virar "3"). Validação visual, não é necessário cronometrar milissegundos — se o QA conseguir *ver* o número errado antes do certo, o critério falha. *(Ponto 11, esclarecido)*
- [ ] **DSH-02** — Clicar no card **"Total de Células Ativas"** navega para a listagem de Células. *(Ponto 11 — já funcionava, confirmar que continua)*
- [ ] **DSH-03** — Clicar no card **"Aniversariantes do Mês"** abre um **modal** (popup — não uma página nova/URL própria) com todos os aniversariantes do mês corrente, ordenada pelo dia do aniversário. Mesmo padrão visual de "Ficha do Membro"/"Ficha da Célula". *(Ponto 11, esclarecido)*
- [ ] **DSH-04** — Cada **linha** dessa lista tem seu **próprio botão** "Enviar Parabéns" (não um botão único para o card inteiro). *(Ponto 11)*
- [ ] **DSH-05** — Clicar em "Enviar Parabéns" de uma linha específica abre o WhatsApp com o número **daquele membro** e a mensagem de aniversário **pré-formatada** já preenchida. *(Ponto 11)*
- [ ] **DSH-06** — O gráfico **"Ingressos de Membros por Mês"** (e seus seletores Ano Atual/6 Meses/3 Meses) **não existe mais** em nenhum lugar do Dashboard. *(Ponto 18)*

---

## 7. Importação CSV (`IMP`)

- [ ] **IMP-01** — O template CSV baixado inclui colunas para **Finalidade** (Evangelística/Liderança) e suporta múltiplas linhas para o mesmo líder (uma por célula). A chave de deduplicação usada é **nome completo + data de nascimento** (não CPF — este campo não existe no sistema). *(Ponto 1, Ponto 12)*
- [ ] **IMP-02** — Importar um arquivo com um líder que tem 2 células (2 linhas, mesmo nome + data de nascimento) resulta em **1 registro de membro** com **2 células vinculadas** — não 2 membros duplicados. *(Ponto 12)*

> ℹ️ **Fora de escopo do v1 (não é critério de teste — não reportar como bug se não funcionar):** a Importação CSV **não precisa** suportar adicionar uma célula a um líder que já existe no sistema via reimportação. Esse crescimento incremental é sempre feito pela tela (editar membro), nunca por CSV. Ver [Ponto 12](./plano-revisao-implementacao-v1.md#ponto-12--importação-csv-estrutura-não-suporta-o-novo-modelo-de-células).

---

## 8. Administração — Usuários do Sistema (`ADM`)

- [ ] **ADM-01** — No formulário de "Novo Usuário", o campo de perfil/nível de permissão só oferece **"Administrador"** como opção (Pastor/Pastora, Secretaria, Líder de Célula não aparecem mais). *(Ponto 13)*
- [ ] **ADM-02** — Logado como um admin, tentar **bloquear o próprio usuário** (o que está com a sessão ativa). O sistema **impede a ação**, com aviso claro (ex: "Você não pode bloquear seu próprio acesso"). *(Ponto 15 — crítico)*
- [ ] **ADM-03** — Bloquear um usuário **diferente** do logado, que esteja com uma sessão ativa em outro navegador/aba: a sessão desse usuário é **encerrada imediatamente** (ele é deslogado, não consegue continuar navegando). *(Ponto 15)*
- [ ] **ADM-04** — Clicar em "Alterar Cargo" (ou botão equivalente de editar usuário) abre um formulário funcional com **apenas dois campos editáveis: Nome completo e E-mail** (e-mail deve continuar sendo validado como único entre usuários). **Senha e Perfil/Cargo não são editáveis por este formulário** — perfil só é definido na criação (e hoje só existe "Administrador", Ponto 13); senha só muda pelo fluxo de reset manual (Ponto 3). Salvar com sucesso exibe confirmação. *(Ponto 15, campos especificados em `gerenciar-usuarios.md`)*
- [ ] **ADM-05** — Os cards de contagem (Total de Usuários, Liberados, Bloqueados) mostram o valor correto **desde o primeiro carregamento** da tela. *(Ponto 15, Ponto 11)*
- [ ] **ADM-06** — Os botões seguem sendo **"Bloquear Acesso"/"Liberar Acesso"** nesta tela (não "Inativar/Reativar", que é terminologia exclusiva da tela de Membros). *(Termo 4 — validação de que a distinção intencional foi preservada)*
- [ ] **ADM-07** — Existe um controle de **"Colunas"** na listagem de Usuários, com a mesma regra de persistência dos itens MEM-16/17. *(Ponto 19)*

---

## 9. Módulos Removidos — Testes de Regressão Negativa (`NEG`)

Estes testes confirmam que algo **não existe mais** — o critério passa quando o item testado **está ausente**.

- [ ] **NEG-01** — Não existe nenhum link, botão ou rota chamada "Início", "Chamada", "Agenda" ou "Minha Célula" em nenhum menu (topo, rodapé mobile ou dropdown de perfil). *(Ponto 14)*
- [ ] **NEG-02** — Não existe o botão "Painel Admin" (alternador de modo) em nenhuma tela. *(Ponto 14)*
- [ ] **NEG-03** — Com o console do navegador (DevTools) aberto, visitar em sequência: Dashboard, Membros (listar/criar/editar/ver ficha), Células (listar/ver ficha/editar/fechar célula), Permissões, Importar. Em nenhuma dessas telas deve aparecer, em vermelho (erro — avisos/warnings em amarelo não contam para este critério), qualquer mensagem contendo `getCelulasByLider` ou qualquer referência a "Modo Líder", "Chamada" ou "Agenda". Repetir este teste a cada nova entrega do dev (não é um teste "de uma vez só"). *(Ponto 14, esclarecido)*
- [ ] **NEG-04** — Não existe o módulo "Eventos, Avisos & Programação" em nenhum menu ou rota. *(Seção 8.2)*
- [ ] **NEG-05** — O campo "Grupo" (Kids/Teens/Movement/Ripe/Família) não existe em **nenhuma** tela do sistema — nem em Membros, nem em Células, nem em filtros. *(Termo 1)*
- [ ] **NEG-06** — A palavra "Encontro" não aparece mais como rótulo em nenhum lugar relacionado a célula (deve estar "Dia da Célula" em todos os 3 pontos: cadastro de membro, filtros de célula, edição de célula). *(Termo 8)*

---

## 10. Terminologia — Checagem Textual (`LNG`)

- [ ] **LNG-01** — Em todo **texto visível ao usuário** (labels de campo, títulos de coluna, mensagens de erro/confirmação, textos de botão) onde aparecia "liderado(s)", o texto agora usa **"discípulo(s)"**. Não se aplica a URLs, nomes de variáveis/rotas internas ou código-fonte — só à interface visível. *(Termo 2, escopo esclarecido)*
- [ ] **LNG-02** — Os rótulos "Célula Evangelística" e "Célula de Liderança" aparecem exatamente com esse texto (sem variações como "célula de multiplicação"). *(Termo 3)*
- [ ] **LNG-03** — O campo de Tipo de Ingresso continua com apenas as opções **"Recepção"** e **"Batismo"**. *(Termo 6)*

---

## Resumo de Cobertura

| Módulo | Qtd. de critérios |
|---|---|
| Autenticação (AUT) | 5 |
| Membros — Cadastro (MEM 01-12, 29) | 13 |
| Membros — Listagem/Edição (MEM 13-22) | 10 |
| Membros — Inativação/Reativação (MEM 23-28, 30-31) | 8 |
| Células (CEL) | 12 |
| Dashboard (DSH) | 6 |
| Importação CSV (IMP) | 2 (+ 1 nota de escopo removido, não testável) |
| Administração (ADM) | 7 |
| Regressão Negativa (NEG) | 6 |
| Terminologia (LNG) | 3 |
| **Total** | **72 critérios** |

> ⚠️ **Atenção especial ao MEM-03** (alerta de duplicata): este foi o único ponto do plano de revisão que **não teve confirmação 100% limpa** durante a auditoria original (teste inconclusivo por instabilidade da ferramenta usada, não do produto). Testar com atenção redobrada.

> ⚠️ **Atenção especial ao ADM-02** (auto-bloqueio de admin): este é o achado de **maior risco** de todo o plano de revisão — se o dev não implementar corretamente, um único admin pode travar o próprio acesso ao sistema sem nenhum caminho de recuperação (recuperação de senha por e-mail foi removida do escopo — Ponto 3). Testar isso **antes** de considerar qualquer outra entrega aprovada.

---

# Histórico de Alterações

| Data | Autor | Descrição |
|---|---|---|
| 15/08/2026 | Thiago Oliveira (com apoio de IA) | Criação inicial — 67 critérios de aceitação derivados dos 19 pontos e 8 termos do `plano-revisao-implementacao-v1.md` (v1.2), organizados por tela/módulo para bateria de testes de QA pós-entrega |
| 17/08/2026 | Thiago Oliveira (com apoio de IA) | Revisão a partir da análise crítica do QA: adicionada seção "Notas de contexto do produto"; MEM-04 corrigido para bloqueio total (não alerta); MEM-11 detalhado com fluxo manual explícito; MEM-29/30/31 e CEL-10/11/12 adicionados (Finalidade imutável, redistribuição/reativação só ativos+mesmo sexo, fechar célula individual — Ponto 20); CEL-05 e MEM-20 esclarecidos (modelo membro→líder); DSH-01/03, ADM-04, LNG-01 detalhados; IMP-03 removido da lista testável e movido para nota de escopo — total agora 72 critérios |

---

<div align="center">
  <sub><strong>🔒 Documento Confidencial</strong> • Uso Interno</sub>
</div>
