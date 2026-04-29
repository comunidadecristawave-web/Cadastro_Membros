---

[Módulo: Membros](../../README.md) › **Visualizar Membro**

**Versão:** 0.1 | **Última atualização:** 29/04/2026

---

# Contextualização

A tela de visualização de membro oferece uma visão completa e consolidada do registro de um membro específico, reunindo dados pessoais, endereço, vínculo com a célula e, quando aplicável, informações de liderança.

A necessidade surge da rotina operacional da secretaria: consultar um membro para confirmar um dado, verificar há quanto tempo ele está na congregação, checar o contato ou entender sua posição na hierarquia de células — tudo sem precisar entrar no modo de edição.

Além dos dados cadastrados, a tela apresenta informações calculadas que enriquecem a leitura do perfil: idade atual, tempo como membro e, para líderes, a quantidade de membros sob sua responsabilidade.

Esta tela é acessada a partir da listagem de membros e concentra também os pontos de ação sobre o registro — edição e inativação ou reativação.

---

# Detalhamento Funcional

## Acesso à Funcionalidade

O usuário acessa a visualização de um membro pela ação **"Visualizar"** disponível em cada linha da listagem de membros.

## Dados Exibidos

### Informações Calculadas (exibidas em destaque)

Apresentadas em cards ou área de destaque no topo do perfil, para leitura rápida:

- **Idade atual** — calculada automaticamente com base na data de nascimento. Exibida em anos completos (ex: "34 anos").
- **Membro há** — calculado com base na data de ingresso. Exibido em anos completos; se menor que 1 ano, exibir em meses (ex: "2 anos" ou "7 meses").
- **Membros na célula** — exibido **somente se o membro for líder de célula**. Indica a quantidade de membros ativos atualmente vinculados à célula liderada por ele (ex: "12 membros").

### Dados Pessoais

- Nome completo
- Telefone (exibido com máscara `(##) # ####-####`)
- Data de nascimento (exibida no formato `DD/MM/AAAA`)
- Idade atual (derivada — também exibida aqui por proximidade com a data de nascimento)
- Data de ingresso (exibida no formato `DD/MM/AAAA`)
- Tempo como membro (derivado — exibido ao lado da data de ingresso)
- Tipo de ingresso (`Batismo` ou `Recepção`)
- Status (`Ativo` ou `Inativo`) — exibido com destaque visual (ex: badge colorido)

### Endereço

- Rua e número
- Complemento (exibido apenas se preenchido)
- Bairro
- Cidade

### Vínculo com Célula

- **Discipulado por:** nome do líder de célula ao qual o membro está vinculado (clicável, navega para a visualização do membro-líder)

### Dados de Liderança (exibidos somente se o membro for líder de célula)

- Dia da célula
- Horário da célula
- Endereço da célula (Rua, Número, Complemento, Bairro, Cidade)
- Quantidade de membros ativos na célula (derivado)

## Ações Disponíveis

A tela oferece acesso direto às principais ações sobre o membro:

- **Editar** — sempre disponível; abre o formulário de edição do membro
- **Inativar** — disponível apenas quando o membro está com status **Ativo**
- **Reativar** — disponível apenas quando o membro está com status **Inativo**

---

# Mensagens e Estados

- **Membro inativo**
  - **Condição:** O membro visualizado possui status Inativo
  - **Comportamento do sistema:** Exibe o perfil normalmente, com badge de status `Inativo` em destaque visual diferenciado (ex: vermelho ou cinza)
  - A ação "Inativar" é ocultada; a ação "Reativar" é exibida no lugar

- **Registro não encontrado**
  - **Condição:** A URL acessada referencia um membro que não existe ou foi removido
  - **Comportamento do sistema:** Exibe mensagem de erro com opção de voltar à listagem
  - **Mensagem exibida:** "Membro não encontrado."

---

# Fluxos Relacionados e Navegação

## Fluxos Anteriores

- **[Listar Membros](./listar-membros.md)**
  A ação "Visualizar" em cada linha da listagem é o ponto de entrada desta tela.

## Fluxos Posteriores

- **[Editar Membro](./editar-membro.md)**
  Botão "Editar" presente na tela de visualização.

- **[Inativar Membro](./inativar-membro.md)**
  Botão "Inativar" presente na tela, disponível apenas para membros Ativos.

- **[Reativar Membro](./reativar-membro.md)**
  Botão "Reativar" presente na tela, disponível apenas para membros Inativos.

---

# Regras e Comportamentos do Sistema

- O sistema deve calcular a **idade atual** em tempo real com base na data de nascimento e na data atual, expressando em anos completos.

- O sistema deve calcular **"membro há"** com base na diferença entre a data de ingresso e a data atual: exibir em anos completos quando igual ou superior a 12 meses; exibir em meses quando inferior a 12 meses.

- O sistema deve calcular **"membros na célula"** contando apenas membros com status **Ativo** vinculados ao líder; membros inativos não entram na contagem.

- O sistema deve exibir a seção de dados de liderança (dia, horário, endereço da célula e quantidade de membros) somente quando o membro visualizado possuir o flag `é líder de célula` ativo.

- O sistema deve exibir o campo Complemento do endereço somente quando ele estiver preenchido; campos vazios opcionais não devem gerar linhas em branco na exibição.

- O sistema deve exibir a ação "Inativar" apenas para membros Ativos e "Reativar" apenas para membros Inativos — nunca as duas ao mesmo tempo.

- A tela é somente leitura — nenhum dado pode ser alterado diretamente nela.

---

# Cenários de Comportamento

## Cenário 1: Visualização de membro ativo não líder

**Dado que** existe um membro ativo `Ana Paula Ferreira`, nascida em `12/03/1990`, ingressou em `15/04/2021`, não é líder, vinculada ao líder `Carlos Souza`
**E** o usuário acessa a tela de listagem

**Quando** clica em "Visualizar" na linha de `Ana Paula Ferreira`

**Então** o sistema deve:
  - Exibir o nome `Ana Paula Ferreira`
  - Exibir idade calculada (ex: `36 anos` em 2026)
  - Exibir `Membro há 5 anos`
  - Exibir status `Ativo` com badge visual
  - Exibir `Discipulado por: Carlos Souza` (clicável)
  - Não exibir seção de dados de liderança
  - Não exibir card "Membros na célula"
  - Exibir botão "Editar" e botão "Inativar"
  - Não exibir botão "Reativar"

---

## Cenário 2: Visualização de membro ativo que é líder de célula

**Dado que** existe um membro ativo `Carlos Souza`, nascido em `05/07/1985`, ingressou em `10/01/2018`, é líder, com célula às quartas 19h, e possui 12 membros ativos vinculados a ele

**Quando** o usuário visualiza o perfil de `Carlos Souza`

**Então** o sistema deve:
  - Exibir card `Membros na célula: 12`
  - Exibir `Membro há 8 anos`
  - Exibir seção de dados de liderança com: Dia `Quarta-feira`, Horário `19:00`, endereço da célula
  - Exibir botão "Editar" e botão "Inativar"

---

## Cenário 3: Visualização de membro com menos de 1 ano de ingresso

**Dado que** existe um membro ativo `Marcos Lima` que ingressou há `7 meses`

**Quando** o usuário visualiza o perfil de `Marcos Lima`

**Então** o sistema deve:
  - Exibir `Membro há 7 meses` (não em anos)

---

## Cenário 4: Visualização de membro inativo

**Dado que** existe um membro com status `Inativo`, `Pedro Alves`

**Quando** o usuário visualiza o perfil de `Pedro Alves`

**Então** o sistema deve:
  - Exibir badge de status `Inativo` com destaque visual diferenciado
  - Exibir todos os dados cadastrais normalmente
  - Exibir botão "Reativar"
  - Não exibir botão "Inativar"

---

## Cenário 5: Endereço sem complemento não gera linha em branco

**Dado que** o membro `Ana Paula Ferreira` foi cadastrado sem complemento de endereço

**Quando** o usuário visualiza o perfil

**Então** o sistema deve:
  - Exibir Rua, Número, Bairro e Cidade normalmente
  - Não exibir o campo Complemento (nem como campo vazio, nem com traço)

---

## Cenário 6: Navegação para perfil do líder pelo link "Discipulado por"

**Dado que** o usuário está visualizando o perfil de `Ana Paula Ferreira`
**E** o campo "Discipulado por" exibe `Carlos Souza` como link

**Quando** clica no nome `Carlos Souza`

**Então** o sistema deve:
  - Navegar para a tela de visualização do membro `Carlos Souza`

---

## Cenário 7: Contagem de membros na célula exclui inativos

**Dado que** `Carlos Souza` é líder e possui 12 membros ativos e 3 membros inativos vinculados a ele

**Quando** o usuário visualiza o perfil de `Carlos Souza`

**Então** o sistema deve:
  - Exibir `Membros na célula: 12`
  - Não contabilizar os 3 membros inativos na contagem

---

# Permissões e Regras de Acesso

| Permissão | Descrição |
|-----------|-----------|
| `MEMBRO_VISUALIZAR` | Permite acessar a tela de visualização de um membro |

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
