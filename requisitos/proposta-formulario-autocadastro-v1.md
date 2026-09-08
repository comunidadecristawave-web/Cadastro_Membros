[Cadastro Membros](../README.md) > **Proposta — Formulário de Autocadastro de Membros (Link Público)**

---

# Proposta — Formulário de Autocadastro de Membros

**Versão:** 0.1 (proposta, aguardando aprovação do PO) | **Data:** 04/09/2026 | **Autor:** Thiago Oliveira (com apoio de IA)

**Contexto:** o EAP original (`Documentação/escopo_projeto`) já previa esta funcionalidade como 🟣 Futuro: *"Perfil Membro: auto-cadastro via link externo, sujeito à aprovação do administrador."* Esta proposta traz essa funcionalidade para o escopo agora, com uma decisão diferente da premissa original (ver Decisão 1 abaixo).

---

## Objetivo

Um link único e público (sem necessidade de login) será distribuído pelos próprios líderes de célula aos seus membros via WhatsApp. A pessoa preenche seus próprios dados, e o cadastro entra diretamente na base do sistema — sem necessidade de digitação manual pela secretaria.

---

## Decisões de produto já fechadas

| # | Decisão |
|---|---|
| 1 | **Sem fila de aprovação** — ao enviar, o cadastro entra **direto como Membro Ativo** (mesmo comportamento do cadastro feito pelo admin hoje). Diferente da premissa original do EAP, que prevía aprovação prévia. |
| 2 | **Link genérico** — um único link para todos; a pessoa seleciona seu **Líder Responsável** num dropdown, igual ao formulário do admin. Não há link individual por líder. |
| 3 | **Célula, se for líder** — o formulário pede apenas a célula **Evangelística** (Ponto 1). A célula de Liderança **não é pedida aqui** — ela só passa a ser exigida depois, no momento em que um discípulo dessa pessoa também se cadastrar como líder (mesma regra já vigente no cadastro do admin). |

---

## Estrutura do Formulário

O formulário reaproveita integralmente os campos e regras já especificados para o cadastro de Membro pelo admin (`membros/criar-membro.md`, Pontos 1, 8, 16), na mesma ordem definida no Termo 5:

### 1. Dados Pessoais (obrigatórios)

- Nome Completo *
- WhatsApp *
- Data de Nascimento *
- Sexo * (Feminino / Masculino)
- Tipo de Ingresso * (Recepção / Batismo)

> **Data de Ingresso** não é preenchida pela pessoa — assumida automaticamente como a data de envio do formulário.

### 2. Endereço Residencial (obrigatório)

- Rua / Logradouro *
- Número *
- Bairro *
- Cidade *
- Complemento (opcional)

### 3. Selfie (obrigatória — novo campo, não existe no cadastro do admin)

- Campo de upload de foto, com opção de **tirar foto na hora** (câmera do celular) ou **selecionar da galeria**.
- Formatos aceitos: JPG, PNG. Tamanho máximo: 5 MB.
- Finalidade: identificação visual do membro pela secretaria/liderança (rosto visível, sem exigência de enquadramento formal).
- Armazenada vinculada ao registro do membro (Supabase Storage, mesmo backend já usado pela aplicação).

### 4. Vínculo & Liderança (mesma ordem e regras do Termo 5 / Ponto 1)

- **Líder Responsável \* (Discipulado por)** — dropdown de busca entre líderes ativos.
  - Aplica a mesma validação de **mesmo sexo** já vigente (Ponto 16): o dropdown mostra apenas líderes do mesmo sexo selecionado no passo 1. Se a pessoa mudar o campo Sexo depois de já ter escolhido um líder, a seleção de líder é limpa e a lista é refiltrada.
- **É Líder de Célula?** * (Não / Sim)
  - Se **Sim**, exibe o bloco abaixo:
    - **Faixa Etária \*** (Kids / Teens / Adolescente / Jovem Adulto / Adulto)
    - **Dia da Célula \***
    - **Horário \***
    - **Local da Célula \*** — toggle "Usar meu endereço residencial" / "Outro endereço" (Ponto 1)
  - A Finalidade desta célula é fixada automaticamente como **Evangelística** (não é um campo visível/editável neste formulário — decisão 3 acima).

### 5. Envio

- Botão **"Enviar Cadastro"**.
- Validações de campos obrigatórios e de mesmo sexo se comportam de forma **bloqueante** (a pessoa não consegue enviar até corrigir) — não há administrador para intervir depois.

---

## Comportamento em cenários específicos

### Alerta de duplicata (Ponto 8) — comportamento diferente do admin

**Proposta:** ao contrário do cadastro pelo admin (onde o alerta de duplicata é um aviso **contornável** — "Salvar Mesmo Assim"), no formulário público a duplicata detectada (mesmo nome + data de nascimento já cadastrados) deve **bloquear o envio por completo**, exibindo uma mensagem orientando a pessoa a procurar a secretaria ou seu líder diretamente, em vez de oferecer a opção de continuar mesmo assim.

> **Por quê:** não há um admin humano observando cada envio em tempo real para julgar se é uma duplicata legítima ou um erro — é mais seguro travar e direcionar para contato humano do que deixar uma pessoa desconhecida decidir isso sozinha.

**⚠️ Preciso da sua confirmação neste ponto específico** — quer manter essa trava total, ou prefere manter o mesmo comportamento do admin (aviso contornável) mesmo no formulário público?

### Célula de Liderança ainda não existe quando um discípulo se cadastra como líder

Comportamento herdado sem alteração (Ponto 1): se a pessoa que preenche o formulário escolhe um "Líder Responsável" que ainda não tem nenhuma célula de Liderança cadastrada, **e** ela mesma se declara líder, o sistema bloqueia o envio com a mesma mensagem já usada no admin: *"Para que [Nome] se torne líder, [Líder Responsável] precisa ter uma célula de Liderança cadastrada. Cadastre-a antes de continuar."* — nesse caso, a pessoa precisa contatar seu líder responsável para que ele cadastre a célula de Liderança dele primeiro (via admin), antes de reenviar o formulário.

### Confirmação pós-envio

**Proposta:** tela de sucesso simples, sem redirecionar a pessoa para nenhuma área administrativa (ela nunca teve login). Sugestão de texto: *"Cadastro realizado com sucesso! Seja bem-vindo(a) à [Nome da Igreja]. 🎉"*

---

## Fora de escopo desta proposta

- **Notificação ao admin** de que um novo autocadastro aconteceu (ex: e-mail ou badge no Dashboard) — não incluído nesta v1, pode ser um incremento futuro se a equipe sentir necessidade de acompanhar em tempo real.
- **Edição do próprio cadastro** pela pessoa depois de enviado — não existe (ela não tem login); qualquer correção depende de pedir para a secretaria editar via admin.
- **Link individual por líder** (decisão 2 acima) — descartado nesta versão.

---

## Próximos passos

1. Confirmar o comportamento do alerta de duplicata no formulário público (ver caixa de decisão acima).
2. Validar o texto exato da mensagem de confirmação pós-envio.
3. Depois de aprovado, este documento vira a base para o dev implementar a nova tela pública (`/cadastro` ou rota equivalente, fora da área autenticada).

---

# Histórico de Alterações

| Data | Autor | Descrição |
|---|---|---|
| 04/09/2026 | Thiago Oliveira (com apoio de IA) | Criação inicial da proposta — trouxe para o escopo atual a funcionalidade de autocadastro via link, antes marcada como Futuro no EAP |

---

<div align="center">
  <sub><strong>🔒 Documento Confidencial</strong> • Uso Interno</sub>
</div>
