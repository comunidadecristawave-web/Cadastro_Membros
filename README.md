# Plataforma de Gestão de Membros

Repositório de documentação de requisitos funcionais e técnicos da **Plataforma de Gestão de Membros** — sistema web para cadastro, gestão e acompanhamento de membros de igrejas, com arquitetura multi-tenant escalável.

---

## Sobre o Produto

Sistema que oferece visibilidade clara sobre membros, seus dados e vínculos hierárquicos (membro → líder de célula), facilitando gestão e tomada de decisão pela liderança.

**Fase 1 (MVP):** foco em uma única instituição para validação do modelo.

---

## Módulos do Sistema

| Módulo | Prioridade | Descrição |
|--------|------------|-----------|
| **Autenticação** | 🟢 MVP | Login, sessão e controle de acesso |
| **Cadastro de Membros** | 🟢 MVP | CRUD de membros com vínculo a líderes de célula |
| **Gestão de Células** | 🟢 MVP | Células, líderes e redistribuição de membros |
| **Importação CSV** | 🟢 MVP | Onboarding de base existente via CSV |
| **Dashboard** | 🟢 MVP | Métricas, cards e gráfico de crescimento |
| **Listagem e Exportação** | 🟢/🟣 | Filtros dinâmicos e exportação PDF/Excel |
| **Organograma** | 🟣 P2 | Árvore hierárquica líder → membros |
| **Relatórios** | 🟣 P2 | Células e aniversariantes |

---

## Estrutura do Repositório

```
Cadastro_Membros/
├── README.md                    ← Este arquivo
│
├── requisitos/                  ← Documentação de requisitos
│   ├── README.md                ← EAP com escopo completo e priorização
│   └── funcionais/              ← Requisitos por módulo
│       ├── autenticacao/
│       ├── membros/
│       ├── celulas/
│       ├── importacao/
│       ├── dashboard/
│       ├── organograma/
│       └── relatorios/
│
└── Documentação/                ← Padrões, templates e ferramentas
    ├── thiago-spec-kit/         ← Guias de padrão e convenções
    ├── templates/               ← Templates de requisitos
    ├── agents/                  ← Agentes de IA para automação
    ├── escopo_projeto           ← Escopo executivo do produto
    └── word-exporter/           ← Exportação para Word (.docx)
```

---

## Links Rápidos

- [EAP e Escopo Completo](./requisitos/README.md)
- [Padrões de Documentação](./Documentação/thiago-spec-kit/GUIDELINES.md)
- [Templates de Requisitos](./Documentação/templates/requisitos/)
- [Agentes de IA](./Documentação/agents/README.md)

---

<div align="center">
  <sub><strong>🔒 Documento Confidencial</strong> • Uso Interno</sub>
</div>
