---

[Módulo: Membros](../../README.md) › **Reativar Membro**

**Versão:** 0.1 | **Última atualização:** 29/04/2026

---

# Contextualização

A reativação de membro permite restabelecer o vínculo ativo de uma pessoa que havia sido inativada, reintegrando-a à congregação no sistema sem necessidade de um novo cadastro.

É comum que membros que se afastaram temporariamente retornem — por mudança de situação pessoal, reconciliação com a congregação ou simples retomada de participação. Nesses casos, o histórico completo do membro já está preservado no sistema, e a reativação deve ser um processo simples e direto.

Diferente da inativação, a reativação não envolve redistribuição de membros. O único ponto de atenção é que o membro reativado precisa ter um líder de célula válido e ativo vinculado — caso o líder anterior tenha sido inativado, o sistema deve solicitar a seleção de um novo líder no momento da reativação.

---

# Detalhamento Funcional

## Acesso à Funcionalidade

A ação **"Reativar"** está disponível:
- Em cada linha da listagem de membros (visível ao filtrar membros Inativos)
- Na tela de visualização do membro inativo

## Fluxo de Reativação — Líder anterior ainda ativo

Ao clicar em "Reativar", o sistema exibe um modal de confirmação simples:

> "Deseja reativar **[Nome do membro]**? Ele voltará a ser vinculado à célula de **[Nome do líder]**."

**Ações disponíveis:**
- **Confirmar** — reativa o membro e restaura o vínculo com o líder anterior
- **Cancelar** — fecha o modal sem alterações

## Fluxo de Reativação — Líder anterior inativo

Quando o líder de célula ao qual o membro estava vinculado também está inativo, o sistema não pode restaurar o vínculo original. Nesse caso, o modal de reativação exibe:

> "O líder anterior de **[Nome do membro]** está inativo. Selecione um novo líder de célula para concluir a reativação."

O modal apresenta um seletor de líder (busca/seleção entre líderes ativos). A confirmação só é habilitada após selecionar um líder.

## Estado após a reativação

O membro passa a ter status **Ativo** e:
- Volta a aparecer na listagem padrão
- Volta a ser contabilizado nos totais do dashboard
- Fica vinculado ao líder confirmado na reativação

---

# Mensagens e Estados

- **Confirmação com líder ativo**
  - **Condição:** Líder anterior do membro está ativo
  - **Mensagem exibida:** "Deseja reativar [Nome do membro]? Ele voltará a ser vinculado à célula de [Nome do líder]."

- **Confirmação com seleção de novo líder**
  - **Condição:** Líder anterior do membro está inativo
  - **Mensagem exibida:** "O líder anterior de [Nome do membro] está inativo. Selecione um novo líder de célula para concluir a reativação."

- **Reativação concluída**
  - **Condição:** Reativação confirmada com sucesso
  - **Mensagem exibida:** Toast "Membro reativado com sucesso."

---

# Fluxos Relacionados e Navegação

## Fluxos Anteriores

- **[Listar Membros](./listar-membros.md)**
  Ação "Reativar" visível ao filtrar membros com status Inativo.

- **[Visualizar Membro](./visualizar-membro.md)**
  Botão "Reativar" disponível na tela de visualização de membros Inativos.

## Fluxos Alternativos

- **[Inativar Membro](./inativar-membro.md)**
  A reativação reverte o efeito da inativação.

---

# Regras e Comportamentos do Sistema

- O sistema deve exibir a ação "Reativar" apenas para membros com status **Inativo**.

- O sistema deve verificar, no momento da reativação, se o líder de célula anterior do membro está ativo ou inativo.

- O sistema deve exigir a seleção de um novo líder quando o líder anterior estiver inativo, bloqueando a confirmação até que um novo líder seja escolhido.

- O sistema deve alterar o status do membro para **Ativo** e registrar o vínculo de liderança confirmado.

- O sistema deve registrar data, hora e usuário responsável pela reativação para fins de auditoria.

---

# Cenários de Comportamento

## Cenário 1: Reativação com líder anterior ativo

**Dado que** `Ana Paula Ferreira` está inativa e estava vinculada ao líder `Carlos Souza`, que permanece ativo
**E** o usuário filtra a listagem por status Inativo
**E** clica em "Reativar" na linha de `Ana Paula Ferreira`

**Quando** o sistema exibe o modal: "Deseja reativar Ana Paula Ferreira? Ela voltará a ser vinculada à célula de Carlos Souza."
**E** o usuário clica em "Confirmar"

**Então** o sistema deve:
  - Alterar o status de `Ana Paula Ferreira` para Ativo
  - Restaurar o vínculo com `Carlos Souza`
  - Exibir toast "Membro reativado com sucesso."
  - `Ana Paula Ferreira` volta a aparecer na listagem padrão

---

## Cenário 2: Reativação com líder anterior inativo — seleção obrigatória de novo líder

**Dado que** `Pedro Alves` está inativo e estava vinculado ao líder `Roberto Nunes`, que também está inativo

**Quando** o usuário clica em "Reativar" na linha de `Pedro Alves`

**Então** o sistema deve:
  - Exibir o modal: "O líder anterior de Pedro Alves está inativo. Selecione um novo líder de célula para concluir a reativação."
  - Exibir seletor de líderes com apenas líderes Ativos
  - Manter o botão "Confirmar" desabilitado até a seleção de um líder

**Quando** o usuário seleciona `Marcos Lima` como novo líder
**E** clica em "Confirmar"

**Então** o sistema deve:
  - Reativar `Pedro Alves` com vínculo ao líder `Marcos Lima`
  - Exibir toast "Membro reativado com sucesso."

---

## Cenário 3: Cancelamento da reativação

**Dado que** o modal de confirmação de reativação está aberto para `Ana Paula Ferreira`

**Quando** o usuário clica em "Cancelar"

**Então** o sistema deve:
  - Fechar o modal
  - Manter `Ana Paula Ferreira` com status Inativo
  - Não realizar nenhuma alteração

---

## Cenário 4: Membro reativado volta à listagem padrão

**Dado que** `Ana Paula Ferreira` foi reativada com sucesso

**Quando** o usuário acessa a listagem de membros sem filtros

**Então** o sistema deve:
  - Exibir `Ana Paula Ferreira` na listagem
  - Exibir seu status como `Ativo`

---

# Permissões e Regras de Acesso

| Permissão | Descrição |
|-----------|-----------|
| `MEMBRO_REATIVAR` | Permite reativar membros inativos |

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
