# Testes E2E — Portal Wave (`versao-nova/`)

Suíte Playwright que abre o SPA real de `versao-nova/` no Chromium e exercita os fluxos do admin.
**O Supabase é 100% simulado em memória** — nenhuma requisição chega ao banco de produção.

## Instalar (uma vez)

```bash
cd testes-e2e
npm install
npx playwright install chromium
```

## Rodar

```bash
npx playwright test                 # suíte completa (sobe o servidor estático sozinho)
npx playwright test tests/busca.spec.js
npx playwright test --headed        # vendo o navegador
npx playwright show-report          # relatório HTML da última execução
```

`MOSTRAR_ACHADOS=1 npx playwright test achados` desliga o `test.fail()` dos bugs conhecidos para
ver a falha real de cada um.

## Como o Supabase é simulado (e por que nada vai para produção)

- `servidor-estatico.js` publica `../versao-nova` em `http://127.0.0.1:4173` (Node puro, sem
  dependências). Ele **recusa** `config.local.js` (que pode ter credenciais reais), `/api/*` e
  `/.netlify/*`.
- `support/fixtures.js` instala uma **guarda de rede** em cada teste: toda requisição do navegador
  passa por ela.
  - `/api/config` e `config.local.js` devolvem uma URL falsa (`https://supabase.mock.test`) e uma
    chave falsa.
  - `https://supabase.mock.test/rest/v1/*` é respondido por `support/fake-supabase.js`
    (PostgREST em memória: GET com `eq/neq/in/is`, `order`, `.single()` → 406 `PGRST116` sem linha,
    POST, PATCH, DELETE, CORS). Toda escrita fica em `mock.writes` para os testes conferirem payloads.
  - O websocket do Realtime para o host falso fica mudo; qualquer outro websocket é fechado.
  - Qualquer host fora da allowlist (`localhost`, `127.0.0.1`, `supabase.mock.test`,
    `cdn.jsdelivr.net`, `unpkg.com`, `fonts.googleapis.com`, `fonts.gstatic.com`) — e qualquer host
    com `supabase.co` — é **abortado e faz o teste falhar**. `tests/guarda-rede.spec.js` prova isso.
- As CDNs (supabase-js, lucide) carregam da internet; sem rede, a suíte não roda.

## Dados

`support/seed.js` tem só dados **fictícios** (LGPD): nomes, telefones e e-mails inventados,
incluindo acentos (José, Conceição), uma pessoa com `referencia_externa`, líderes dos dois sexos,
líder com discípulos, consentimento LGPD preenchido e 23 membros ativos para paginação.
Nunca coloque dados reais aqui.

## Estrutura

| Arquivo | Cobre |
|---|---|
| `tests/redistribuicao.spec.js` | Inativar líder com discípulos (#1) |
| `tests/reativacao.spec.js` | Reativação exige líder (#1) |
| `tests/integridade-update.spec.js` | `updateMembro` não reverte colunas; payload do `addMembro` |
| `tests/busca.spec.js` | Busca sem acento, por WhatsApp, referência externa oculta (#5) |
| `tests/paginacao.spec.js` | Paginação desktop e 375px (#4) |
| `tests/toasts.spec.js` | 4 tipos, erro persistente, pilha de 3 (#6) |
| `tests/login.spec.js` | Mensagem única, erro de conexão, "Esqueci minha senha" (#9) |
| `tests/perfil.spec.js` | Textos do perfil (#8) |
| `tests/celulas-lideres.spec.js` | Sem "Colunas"; CSV/PDF (#2) |
| `tests/dia-da-celula.spec.js` | Rótulo "Dia da Célula" (#11) |
| `tests/smoke.spec.js` | Todas as rotas vivas sem erro de console |
| `tests/guarda-rede.spec.js` | Autoteste da guarda de rede |
| `tests/achados-preexistentes.spec.js` | Bugs reais fora do escopo, marcados `test.fail()` |
