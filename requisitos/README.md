[Cadastro Membros](../README.md) > **Requisitos**

---

# Estrutura de Requisitos — Plataforma de Gestão de Membros

**Versão:** 0.1 | **Última atualização:** 29/04/2026

---

## Visão Geral do Produto

Plataforma web para gestão e cadastro de membros de igrejas, com arquitetura multi-tenant escalável. A Fase 1 foca em uma única igreja para validação do modelo.

**Objetivo central:** oferecer visibilidade clara sobre membros, seus dados e vínculos hierárquicos (membro → líder de célula), facilitando gestão e tomada de decisão pela liderança.

---

## Perfis de Usuário

| Perfil | MVP | Descrição |
|--------|-----|-----------|
| **Administrador** | 🟢 | Secretaria / pastores — acesso total ao sistema |
| **Líder de célula** | 🟣 Futuro | Acesso restrito à própria célula |
| **Membro** | 🟣 Futuro | Auto-cadastro via link externo, sujeito à aprovação |

---

## Estrutura Analítica do Produto (EAP)

### Módulo 1 — Autenticação e Controle de Acesso

| Requisito | Arquivo | Prioridade | Status |
|-----------|---------|------------|--------|
| Autenticação de Usuário (login/logout) | `autenticacao/autenticacao-usuario.md` | 🟢 MVP | 🔄 A escrever |
| Recuperação de Senha | `autenticacao/recuperacao-senha.md` | 🟢 MVP | 🔄 A escrever |

---

### Módulo 2 — Cadastro de Membros

Gerencia o ciclo de vida completo de cada membro. Vínculo obrigatório com líder de célula no momento do cadastro.

**Dados obrigatórios:** Nome completo, Telefone, Data de nascimento, Data de ingresso, Tipo de ingresso (Batismo/Recepção), Endereço completo, Líder de célula (discipulado por).

**Dados adicionais para líder:** Dia da célula, Horário da célula, Endereço da célula.

| Requisito | Arquivo | Prioridade | Status |
|-----------|---------|------------|--------|
| Listar Membros | `membros/listar-membros.md` | 🟢 MVP | 🔄 A escrever |
| Criar Membro | `membros/criar-membro.md` | 🟢 MVP | 🔄 A escrever |
| Editar Membro | `membros/editar-membro.md` | 🟢 MVP | 🔄 A escrever |
| Visualizar Membro | `membros/visualizar-membro.md` | 🟢 MVP | 🔄 A escrever |
| Inativar Membro | `membros/inativar-membro.md` | 🟢 MVP | 🔄 A escrever |
| Reativar Membro | `membros/reativar-membro.md` | 🟢 MVP | 🔄 A escrever |

---

### Módulo 3 — Gestão de Células

Uma célula é definida pelo seu líder + endereço + dia + horário. Um membro pertence a exatamente uma célula. Um líder pode liderar mais de uma célula.

| Requisito | Arquivo | Prioridade | Status |
|-----------|---------|------------|--------|
| Listar Células | `celulas/listar-celulas.md` | 🟢 MVP | 🔄 A escrever |
| Visualizar Célula | `celulas/visualizar-celula.md` | 🟢 MVP | 🔄 A escrever |
| Editar Célula | `celulas/editar-celula.md` | 🟢 MVP | 🔄 A escrever |
| Vincular Membro à Célula | `celulas/vincular-membro-celula.md` | 🟢 MVP | 🔄 A escrever |
| Redistribuir Membros ao Inativar Líder | `celulas/redistribuir-membros-lider.md` | 🟣 P2 | 🔄 A escrever |

---

### Módulo 4 — Importação CSV

Funcionalidade de onboarding obrigatória no MVP. Download de template, upload, prévia com validação linha a linha e resumo pós-importação.

| Requisito | Arquivo | Prioridade | Status |
|-----------|---------|------------|--------|
| Importação de Base via CSV | `importacao/importacao-csv.md` | 🟢 MVP | 🔄 A escrever |

---

### Módulo 5 — Dashboard

| Requisito | Arquivo | Prioridade | Status |
|-----------|---------|------------|--------|
| Dashboard Geral | `dashboard/dashboard.md` | 🟢 MVP | 🔄 A escrever |

**Cards:** total de membros ativos, total de células ativas, membros por célula, aniversariantes do mês.
**Gráfico:** crescimento de membros por período (anual, semestral, trimestral, personalizado).

---

### Módulo 6 — Listagem e Exportação

| Requisito | Arquivo | Prioridade | Status |
|-----------|---------|------------|--------|
| Listar Membros com Filtro Dinâmico | `membros/listar-membros.md` | 🟢 MVP | 🔄 A escrever |
| Exportar Listagem (PDF e Excel) | `membros/exportar-membros.md` | 🟣 P2 | 🔄 A escrever |

**Filtros dinâmicos:** campo + lógica de comparação + valor, combinados. Ênfase em localização, dia e horário de célula.

---

### Módulo 7 — Organograma Hierárquico

| Requisito | Arquivo | Prioridade | Status |
|-----------|---------|------------|--------|
| Visualizar Organograma | `organograma/visualizar-organograma.md` | 🟣 P2 | 🔄 A escrever |

**Visualização:** árvore líder → membros vinculados. Exportável e imprimível.

---

### Módulo 8 — Relatórios

| Requisito | Arquivo | Prioridade | Status |
|-----------|---------|------------|--------|
| Relatório de Células | `relatorios/relatorio-celulas.md` | 🟣 P2 | 🔄 A escrever |
| Relatório de Aniversariantes | `relatorios/relatorio-aniversariantes.md` | 🟣 P2 | 🔄 A escrever |

---

## Priorização — MVP

| Prioridade | Funcionalidade |
|------------|---------------|
| P1 | Cadastro de membros e líderes de célula |
| P1 | Vínculo membro → líder de célula |
| P1 | Listagem com filtro dinâmico |
| P1 | Dashboard com cards e gráfico de crescimento |
| P1 | Importação de base via CSV |
| P2 | Organograma hierárquico |
| P2 | Exportação de listagem em PDF e Excel |
| P2 | Relatório de células |
| P2 | Relatório de aniversariantes |
| P2 | Modal de redistribuição ao inativar líder |
| Futuro | Auto-cadastro de membros via link externo |
| Futuro | Acesso do líder de célula à sua célula |
| Futuro | Configuração de parâmetros da instituição via interface |

---

## Premissas Técnicas

- Arquitetura multi-tenant desde o backend, mesmo que MVP opere com tenant único
- Sistema de permissões (roles) extensível desde a primeira versão
- Exclusão permanente de dados não é permitida — apenas inativação
- Importação CSV aplica as mesmas regras de validação do cadastro manual
- Stack tecnológica a ser definida pelo tech lead

---

## Convenções de Status

| Status | Significado |
|--------|-------------|
| 🔄 A escrever | Requisito identificado, ainda não documentado |
| ✏️ Em andamento | Em elaboração na branch de especificação |
| ✅ Aprovado | Aprovado em `spec-approved` |
| 📦 Publicado | Documentado na `main` (entregue em produção) |

---

## Histórico de Alterações

| Data | Card | Autor | Descrição |
|------|------|-------|-----------|
| 29/04/2026 | — | Thiago Oliveira | Criação inicial do EAP com base no escopo v1.1 |

---

<div align="center">
  <sub><strong>🔒 Documento Confidencial</strong> • Uso Interno</sub>
</div>
