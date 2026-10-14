<!-- bmad:context -->
<!-- Verified 2026-10-14 against f3ead2b. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Cadastro_Membros

Portal de cadastro de membros da Comunidade Cristã Wave. O app vivo é `versao-nova/`: SPA em JS puro (sem build, sem package.json) sobre Supabase, publicado no Netlify. Ordem de precedência dos requisitos: `versao-nova/requisitos/plano-revisao-implementacao-v1.3.md` > `requisitos/funcionais/` > `versao-nova/requisitos/especificacao_sistema_wave.md`; itens ❓ do plano não se implementam.

## Policy

- Nunca edite `Program.cs`, `CadastroMembros.Api.csproj`, `appsettings.json` nem `frontend/` — app antigo congelado; todo trabalho vai em `versao-nova/`.
- Nunca execute SQL no Supabase; escreva `versao-nova/requisitos/sql/YYYY-MM-<slug>.sql` idempotente (`if not exists`) e o PO roda manualmente no painel de produção.
- Nunca coloque dados reais de membros (nomes, telefones, fotos, e-mails) em commits, logs, seeds, testes ou exemplos — LGPD; use dados fictícios.
- Nunca commite nem faça push sem pedido explícito.
- Nunca rode `versao-nova/subir_github.bat` — faz `git push --force` para outro repositório.
- Branches nascem de `spec-approved`: `feature/<descricao>` para código; `spec|discovery|bug|hotfix|chore/<ID>-<descricao>` para o resto (`Documentação/thiago-spec-kit/GIT_WORKFLOW.md`).
- Commits: `<prefixo>: <titulo>` com prefixo `spec|feat|fix|docs|chore` (`feat` só para código), título em português, verbo no infinitivo, minúsculo, sem ponto, ≤50 caracteres.
- PRs para `spec-approved`; nunca commite direto em `main` ou `spec-approved`.

## Where things are

- Rotas: `versao-nova/js/app.js` (hash router; páginas públicas em `PUBLIC_PAGES`).
- Página nova: `versao-nova/js/pages/<nome>.js` registrando `WavePages['<nome>'] = { render, onMount }` e um `<script>` em `versao-nova/index.html` antes de `js/app.js` — sem a tag ela não carrega.
- Dados de `pessoas`: `versao-nova/js/data.js` (`WaveData`, store em memória + regras); `versao-nova/js/supabase.js` é só CRUD.
- Credenciais: `/api/config` → `versao-nova/netlify/functions/config.js` (env `SUPABASE_URL`, `SUPABASE_ANON_KEY`); local usa `versao-nova/config.local.js` (não versionado).

## Running and verifying

- Não há testes, lint nem CI; verifique abrindo o app (Live Server + `config.local.js`) e exercitando o fluxo alterado.

## Conventions that differ from defaults

- Coluna nova em `pessoas` entra em três lugares de `data.js`: `_parsePessoaFromDB`, payload de `addMembro` e de `updateMembro`.
- `celulas_json` é coluna `text` — sempre `JSON.stringify`.
- Listas de pessoas usam `WaveData.getMembrosVisiveis()`, nunca `WaveData.membros` direto — esconde quem tem `referencia_externa`.

## Known pitfalls

- `updateMembro` grava a linha inteira: campo ausente no parse volta ao default no banco (já apagou consentimentos LGPD).
- Nunca use o payload do Realtime como dado — pode vir sem `foto_url`; trate o evento como sinal, rebusque a linha por id e faça `Object.assign` no objeto existente (`app.js`).

<!-- /bmad:context -->
