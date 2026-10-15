const { test, expect, abrirApp } = require('../support/fixtures');
const { USUARIO_ADMIN, IDS } = require('../support/seed');

/* Bugs REAIS do app encontrados pela suíte, fora do escopo de correcoes-ux-admin.
   Ficam como test.fail(): passam a "falhar" (e avisar) quando forem corrigidos. */

// Colunas que o app lê/grava em `pessoas` (data.js: _parsePessoaFromDB/addMembro/updateMembro).
const COLUNAS_PESSOAS = new Set([
  'id', 'nome', 'foto_url', 'whatsapp', 'data_nascimento', 'data_ingresso', 'tipo_ingresso', 'sexo',
  'rua', 'numero', 'complemento', 'bairro', 'cidade', 'status', 'lider', 'discipulador_id', 'e_lider',
  'celulas_json', 'referencia_externa', 'consentimento_aceito', 'consentimento_aceito_em', 'criado_em'
]);

// MOSTRAR_ACHADOS=1 desliga o test.fail() para ver a falha real de cada achado.
const marcarBugConhecido = () => { if (!process.env.MOSTRAR_ACHADOS) test.fail(); };

test.describe('Achados pré-existentes (bugs do app)', () => {
  // "abrir a lista não grava no banco" e "Realtime ativo após F5" foram corrigidos e
  // migraram para tests/realtime-estavel.spec.js.

  test('salvar perfil vinculado a uma pessoa não deveria gravar colunas inexistentes em pessoas', async ({ page, mock, context }) => {
    // BUG (perfil-usuario.js salvarPerfil): com pessoa_id, faz PATCH em `pessoas` com
    // nome_completo/email/telefone — colunas que não existem nessa tabela. No PostgREST real
    // isso devolve 400 (PGRST204) e o erro é ignorado: o nome nunca sincroniza com a pessoa.
    marcarBugConhecido();
    mock.db.usuarios[0].pessoa_id = IDS.jose;
    await context.addInitScript((u) => {
      const s = JSON.parse(sessionStorage.getItem('wave_auth_session'));
      s.user.pessoaId = u;
      sessionStorage.setItem('wave_auth_session', JSON.stringify(s));
    }, IDS.jose);

    await abrirApp(page, 'perfil-usuario');
    await page.locator('#input-perfil-nome').fill(`${USUARIO_ADMIN.nome} Silva`);
    await page.locator('#btn-salvar-perfil').click();
    await expect(page.getByText('Alterações salvas.', { exact: true })).toBeVisible();

    const patchesPessoa = mock.escritas('pessoas', 'PATCH').filter(w => w.query.id === `eq.${IDS.jose}`);
    expect(patchesPessoa.length).toBeGreaterThan(0);
    for (const w of patchesPessoa) {
      const desconhecidas = Object.keys(w.body).filter(k => !COLUNAS_PESSOAS.has(k));
      expect(desconhecidas, 'colunas inexistentes em pessoas').toEqual([]);
    }
  });
});
