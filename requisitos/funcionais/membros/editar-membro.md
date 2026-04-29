---

[Módulo: Membros](../../README.md) › **Editar Membro**

**Versão:** 0.1 | **Última atualização:** 29/04/2026

---

# Contextualização

A edição de membro permite atualizar qualquer informação cadastral de um membro já existente, mantendo o histórico de vínculos e garantindo a integridade da estrutura de células.

A necessidade surge naturalmente da dinâmica da congregação: membros mudam de endereço, trocam de número de telefone, são transferidos entre células ou assumem (ou deixam) a função de liderança. Essas mudanças precisam ser refletidas no sistema sem perda de dados anteriores.

Dois fluxos merecem atenção especial: a troca do líder de um membro — que representa uma transferência entre células e requer confirmação explícita — e a remoção do status de líder de célula, que exige a redistribuição prévia de todos os membros vinculados antes de ser confirmada.

O formulário de edição é acessado a partir da listagem ou da tela de visualização do membro e, após salvar, retorna o usuário à listagem.

---

# Detalhamento Funcional

## Acesso à Funcionalidade

O usuário acessa o formulário de edição de duas formas:
- Pela ação **"Editar"** em cada linha da listagem de membros
- Pelo botão **"Editar"** na tela de visualização do membro

## Formulário de Edição

O formulário de edição apresenta os mesmos campos do formulário de criação, pré-preenchidos com os dados atuais do membro:

- Nome completo
- Telefone (com máscara `(##) # ####-####`)
- Data de nascimento
- Data de ingresso
- Tipo de ingresso (`Batismo` | `Recepção`)
- Endereço: Rua, Número, Complemento (opcional), Bairro, Cidade
- Líder de célula (discipulado por)
- É líder de célula (checkbox)
- Dados da célula — exibidos dinamicamente quando "É líder de célula" estiver marcado: Dia, Horário, Endereço da célula

As mesmas regras de validação do formulário de criação se aplicam à edição.

## Troca de Líder de Célula (Transferência de Célula)

Quando o usuário altera o campo **"Líder de célula (discipulado por)"** para um líder diferente do atual e clica em "Salvar", o sistema exibe um modal de confirmação antes de efetivar a mudança.

**Conteúdo do modal de confirmação:**

> "Você está transferindo **[Nome do membro]** da célula de **[Líder atual]** para a célula de **[Novo líder]**. Confirmar transferência?"

**Ações disponíveis no modal:**
- **Confirmar** — efetiva a troca de líder e salva todas as demais alterações do formulário
- **Cancelar** — fecha o modal e retorna ao formulário com o líder original mantido

## Remoção do Status de Líder de Célula

Quando o usuário **desmarca** o checkbox "É líder de célula" em um membro que possui membros vinculados à sua célula e clica em "Salvar", o sistema **bloqueia a ação** e exibe o **modal de redistribuição**.

### Modal de Redistribuição

O modal de redistribuição exibe:

- Título: "Redistribuir membros de [Nome do líder]"
- Mensagem explicativa: "Antes de remover o status de líder, transfira todos os membros desta célula para outros líderes."
- Lista de todos os membros **ativos** vinculados ao líder, cada um com:
  - Nome do membro
  - Seletor de novo líder (busca/seleção entre todos os líderes de célula ativos, excluindo o próprio líder sendo editado)
- Indicador de progresso: quantos membros já foram atribuídos a novos líderes vs. total (ex: "3 de 8 redistribuídos")
- Botão **"Confirmar redistribuição"** — habilitado somente quando **todos** os membros tiverem um novo líder selecionado
- Botão **"Cancelar"** — fecha o modal, mantém o flag de líder como estava e descarta as seleções feitas no modal

O administrador pode direcionar todos os membros para o mesmo líder ou distribuí-los entre líderes diferentes — a escolha é livre, desde que todos sejam atribuídos antes de confirmar.

Ao confirmar a redistribuição:
1. Todos os membros listados são transferidos para os novos líderes selecionados
2. O flag "É líder de célula" é removido do membro editado
3. Os dados da célula (dia, horário, endereço) são apagados
4. Todas as demais alterações do formulário são salvas
5. O usuário é redirecionado para a listagem de membros

Caso o líder sendo editado **não possua membros vinculados**, o sistema remove o flag de líder diretamente, sem exibir o modal de redistribuição.

## Ação de Salvar

Ao clicar em **"Salvar"**, o sistema valida os campos, executa os fluxos de confirmação pertinentes (troca de líder e/ou redistribuição) e, após todas as confirmações, salva as alterações e redireciona para a **listagem de membros**.

---

# Mensagens e Estados

- **Confirmação de troca de líder**
  - **Condição:** Usuário alterou o campo "Discipulado por" e clicou em "Salvar"
  - **Comportamento do sistema:** Exibe modal de confirmação antes de salvar
  - **Mensagem exibida:** "Você está transferindo [Nome] da célula de [Líder atual] para a célula de [Novo líder]. Confirmar transferência?"

- **Modal de redistribuição bloqueante**
  - **Condição:** Usuário desmarcou "É líder de célula" em membro com membros vinculados
  - **Comportamento do sistema:** Bloqueia o salvamento e exibe modal com lista de redistribuição
  - **Mensagem exibida:** "Antes de remover o status de líder, transfira todos os membros desta célula para outros líderes."

- **Botão "Confirmar redistribuição" desabilitado**
  - **Condição:** Nem todos os membros da lista possuem um novo líder selecionado
  - **Comportamento do sistema:** O botão permanece desabilitado e não pode ser clicado
  - **Mensagem exibida:** Indicador de progresso "X de Y redistribuídos"

- **Membro salvo com sucesso**
  - **Condição:** Alterações salvas com sucesso
  - **Comportamento do sistema:** Redireciona para a listagem de membros
  - **Mensagem exibida:** Toast "Dados do membro atualizados com sucesso."

---

# Fluxos Relacionados e Navegação

## Fluxos Anteriores

- **[Listar Membros](./listar-membros.md)**
  Ação "Editar" em cada linha da listagem.

- **[Visualizar Membro](./visualizar-membro.md)**
  Botão "Editar" na tela de visualização.

## Fluxos Posteriores

- **[Listar Membros](./listar-membros.md)**
  Destino após salvar com sucesso.

---

# Regras e Comportamentos do Sistema

- O sistema deve exibir o modal de confirmação de transferência sempre que o campo "Líder de célula" for alterado para um líder diferente do atual, independentemente das demais alterações feitas no formulário.

- O sistema deve bloquear o salvamento quando "É líder de célula" for desmarcado e o membro possuir membros ativos vinculados, exibindo obrigatoriamente o modal de redistribuição.

- O sistema deve habilitar o botão "Confirmar redistribuição" somente após todos os membros listados no modal receberem um novo líder selecionado.

- O sistema deve excluir o próprio líder sendo editado da lista de opções no seletor de novos líderes dentro do modal de redistribuição.

- O sistema deve efetivar a redistribuição de todos os membros atomicamente: ou todos são transferidos com sucesso, ou nenhuma transferência é realizada em caso de falha.

- O sistema deve apagar os dados da célula (dia, horário, endereço) quando o flag "É líder de célula" for removido com sucesso.

- O sistema deve permitir a edição de membros inativos, mantendo o status Inativo após salvar.

- O sistema deve registrar data, hora e usuário responsável por cada alteração para fins de auditoria.

---

# Cenários de Comportamento

## Cenário 1: Edição de dados simples sem troca de líder

**Dado que** o membro `Ana Paula Ferreira` está cadastrado com telefone `(11) 9 8765-4321`
**E** o usuário acessa o formulário de edição do membro

**Quando** altera o campo telefone para `(11) 9 9999-1234`
**E** clica em "Salvar"

**Então** o sistema deve:
  - Salvar a alteração sem exibir modal de confirmação
  - Exibir toast "Dados do membro atualizados com sucesso."
  - Redirecionar para a listagem de membros

---

## Cenário 2: Troca de líder de célula exibe confirmação

**Dado que** o membro `Ana Paula Ferreira` está vinculado ao líder `Carlos Souza`
**E** o usuário acessa o formulário de edição

**Quando** altera o campo "Líder de célula" de `Carlos Souza` para `Marcos Lima`
**E** clica em "Salvar"

**Então** o sistema deve:
  - Exibir o modal: "Você está transferindo Ana Paula Ferreira da célula de Carlos Souza para a célula de Marcos Lima. Confirmar transferência?"
  - Aguardar a ação do usuário antes de salvar

**Quando** clica em "Confirmar" no modal

**Então** o sistema deve:
  - Salvar a alteração e atualizar o vínculo do membro
  - Exibir toast "Dados do membro atualizados com sucesso."
  - Redirecionar para a listagem

---

## Cenário 3: Cancelamento da troca de líder no modal

**Dado que** o modal de confirmação de transferência está aberto

**Quando** o usuário clica em "Cancelar" no modal

**Então** o sistema deve:
  - Fechar o modal
  - Manter o líder original no campo "Líder de célula"
  - Manter o usuário no formulário de edição com todos os dados preservados

---

## Cenário 4: Remoção do status de líder com membros vinculados exibe modal de redistribuição

**Dado que** `Carlos Souza` é líder de célula com 8 membros ativos vinculados
**E** o usuário acessa o formulário de edição de `Carlos Souza`

**Quando** desmarca o checkbox "É líder de célula"
**E** clica em "Salvar"

**Então** o sistema deve:
  - Bloquear o salvamento
  - Exibir o modal de redistribuição com os 8 membros listados
  - Exibir indicador "0 de 8 redistribuídos"
  - Exibir o botão "Confirmar redistribuição" desabilitado

---

## Cenário 5: Redistribuição parcial não permite confirmar

**Dado que** o modal de redistribuição está aberto com 8 membros
**E** o usuário selecionou novos líderes para apenas 5 dos 8 membros

**Quando** tenta clicar em "Confirmar redistribuição"

**Então** o sistema deve:
  - Manter o botão "Confirmar redistribuição" desabilitado
  - Exibir indicador "5 de 8 redistribuídos"
  - Não fechar o modal

---

## Cenário 6: Redistribuição completa e confirmação

**Dado que** o modal de redistribuição está aberto com 8 membros de `Carlos Souza`
**E** o usuário selecionou novos líderes para todos os 8 membros (alguns para `Marcos Lima`, outros para `Juliana Costa`)

**Quando** o indicador mostra "8 de 8 redistribuídos"
**E** o usuário clica em "Confirmar redistribuição"

**Então** o sistema deve:
  - Transferir todos os 8 membros para os novos líderes selecionados
  - Remover o flag "É líder de célula" de `Carlos Souza`
  - Apagar os dados de célula (dia, horário, endereço da célula) de `Carlos Souza`
  - Salvar as demais alterações do formulário
  - Exibir toast "Dados do membro atualizados com sucesso."
  - Redirecionar para a listagem

---

## Cenário 7: Remoção do status de líder sem membros vinculados

**Dado que** `Juliana Costa` é líder de célula e não possui membros vinculados

**Quando** o usuário desmarca "É líder de célula" no formulário de edição de `Juliana Costa`
**E** clica em "Salvar"

**Então** o sistema deve:
  - Salvar diretamente, sem exibir modal de redistribuição
  - Remover o flag de líder e apagar os dados de célula
  - Exibir toast "Dados do membro atualizados com sucesso."
  - Redirecionar para a listagem

---

## Cenário 8: Cancelamento da redistribuição preserva o status de líder

**Dado que** o modal de redistribuição está aberto

**Quando** o usuário clica em "Cancelar" no modal

**Então** o sistema deve:
  - Fechar o modal
  - Manter o checkbox "É líder de célula" marcado
  - Manter o usuário no formulário de edição com todos os dados preservados
  - Não transferir nenhum membro

---

# Permissões e Regras de Acesso

| Permissão | Descrição |
|-----------|-----------|
| `MEMBRO_EDITAR` | Permite acessar o formulário de edição e salvar alterações |

No MVP, o perfil **Administrador** possui esta permissão por padrão.

---

# Histórico de Alterações

| Data       | Card | Autor           | Descrição da Alteração        |
|------------|------|-----------------|-------------------------------|
| 29/04/2026 | —    | Thiago Oliveira | Criação inicial do requisito  |

---

<div align="center">
  <sub><strong>🔒 Documento Confidencial</strong> • Uso Interno</sub>
</div>
