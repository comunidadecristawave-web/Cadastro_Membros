---

[Módulo: Células](../../README.md) › **Visualizar Célula**

**Versão:** 0.1 | **Última atualização:** 29/04/2026

---

# Contextualização

A tela de visualização de célula reúne em um único lugar todas as informações relevantes sobre uma célula: os dados operacionais (líder, dia, horário e endereço) e a lista de membros ativos que a compõem.

A necessidade surge da rotina de acompanhamento pastoral: a secretaria precisa consultar quais membros frequentam determinada célula, confirmar o endereço de reunião ou verificar o volume de pessoas para apoiar decisões de redistribuição ou crescimento.

Esta tela é somente leitura. Alterações nos dados operacionais da célula são feitas pelo fluxo de edição; alterações no vínculo de membros são feitas pelo cadastro do membro.

---

# Detalhamento Funcional

## Acesso à Funcionalidade

O usuário acessa a visualização de uma célula pela ação **"Visualizar"** disponível em cada linha da listagem de células.

## Dados Exibidos

### Informação Calculada (exibida em destaque)

- **Total de membros ativos** — quantidade de membros ativos vinculados à célula, exibida em card de destaque no topo.

### Dados Operacionais da Célula

- **Líder** — nome do membro que lidera a célula (clicável, navega para a visualização do membro-líder)
- **Dia da semana**
- **Horário**
- **Endereço completo:** Rua, Número, Complemento (exibido somente se preenchido), Bairro, Cidade

### Lista de Membros

Abaixo dos dados operacionais, a tela exibe a lista de todos os membros **ativos** vinculados à célula:

| Coluna | Descrição |
|--------|-----------|
| **Nome** | Nome completo do membro |
| **Telefone** | Celular com máscara `(##) # ####-####` |

A lista é ordenada por **Nome** em ordem alfabética crescente.

Cada linha da lista é clicável e navega para a **tela de visualização do respectivo membro**.

Membros inativos não aparecem nesta lista.

## Ações Disponíveis

- **Editar** — abre o formulário de edição da célula (dados operacionais: dia, horário, endereço)

---

# Mensagens e Estados

- **Célula sem membros ativos**
  - **Condição:** Nenhum membro ativo está vinculado ao líder da célula
  - **Comportamento do sistema:** Exibe a área de lista vazia com mensagem orientativa
  - **Mensagem exibida:** "Nenhum membro ativo vinculado a esta célula."

---

# Fluxos Relacionados e Navegação

## Fluxos Anteriores

- **[Listar Células](./listar-celulas.md)**
  Ação "Visualizar" em cada linha da listagem de células.

## Fluxos Posteriores

- **[Editar Célula](./editar-celula.md)**
  Botão "Editar" presente na tela de visualização.

- **[Visualizar Membro](../membros/visualizar-membro.md)**
  Clique em qualquer linha da lista de membros navega para o perfil do membro.
  Clique no nome do líder navega para o perfil do membro-líder.

---

# Regras e Comportamentos do Sistema

- O sistema deve exibir apenas membros com status **Ativo** na lista de membros da célula.

- O sistema deve calcular o total de membros ativos excluindo membros com status Inativo.

- O sistema deve exibir o campo Complemento do endereço somente quando estiver preenchido.

- A tela é somente leitura — nenhum dado pode ser alterado diretamente nela.

---

# Cenários de Comportamento

## Cenário 1: Visualização de célula com membros ativos

**Dado que** a célula liderada por `Carlos Souza` reúne-se às `Quartas-feiras` às `19:30`, no `Bairro Centro, São Paulo`, e possui 8 membros ativos e 2 inativos

**Quando** o usuário acessa a visualização desta célula

**Então** o sistema deve:
  - Exibir card `Total de membros ativos: 8`
  - Exibir `Líder: Carlos Souza` como link clicável
  - Exibir `Dia: Quarta-feira`, `Horário: 19:30`, endereço completo
  - Listar os 8 membros ativos com nome e telefone, ordenados alfabeticamente
  - Não exibir os 2 membros inativos

---

## Cenário 2: Clique em membro da lista navega para o perfil

**Dado que** o usuário está na tela de visualização da célula de `Carlos Souza`
**E** `Ana Paula Ferreira` aparece na lista de membros

**Quando** clica na linha de `Ana Paula Ferreira`

**Então** o sistema deve:
  - Navegar para a tela de visualização do membro `Ana Paula Ferreira`

---

## Cenário 3: Clique no líder navega para o perfil do líder

**Dado que** o usuário está na tela de visualização da célula

**Quando** clica no nome `Carlos Souza` no campo Líder

**Então** o sistema deve:
  - Navegar para a tela de visualização do membro `Carlos Souza`

---

## Cenário 4: Célula sem membros ativos exibe estado vazio

**Dado que** a célula liderada por `Juliana Costa` não possui membros ativos vinculados

**Quando** o usuário acessa a visualização desta célula

**Então** o sistema deve:
  - Exibir card `Total de membros ativos: 0`
  - Exibir os dados operacionais normalmente
  - Exibir "Nenhum membro ativo vinculado a esta célula." na área da lista

---

# Permissões e Regras de Acesso

| Permissão | Descrição |
|-----------|-----------|
| `CELULA_VISUALIZAR` | Permite acessar a tela de visualização da célula |

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
