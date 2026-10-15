const { test, expect, abrirApp } = require('../support/fixtures');
const { IDS, NOMES, FOTO_FICTICIA } = require('../support/seed');

test.describe('Integridade de gravação (updateMembro / addMembro)', () => {
  test('editar só o nome preserva consentimento LGPD, foto e demais colunas', async ({ page, mock }) => {
    const original = JSON.parse(JSON.stringify(mock.db.pessoas.find(p => p.id === IDS.jose)));
    await abrirApp(page, 'admin-membros');

    const linha = page.locator('#membros-table-body tr', { hasText: 'José Antônio' });
    await linha.getByTitle('Editar Discípulo').click();

    const form = page.locator('#member-main-form');
    await expect(form).toBeVisible();
    await expect(page.locator('#form-membro-nome')).toHaveValue(NOMES.jose);
    await page.locator('#form-membro-nome').fill('José Antônio Ferreira Neto');
    await form.getByRole('button', { name: 'Salvar Alterações' }).click();

    await expect(page.locator('.toast-notification.success')).toContainText('atualizados com sucesso');

    const patches = mock.escritas('pessoas', 'PATCH').filter(w => w.query.id === `eq.${IDS.jose}`);
    expect(patches).toHaveLength(1);
    const body = patches[0].body;

    // Única mudança esperada
    expect(body.nome).toBe('José Antônio Ferreira Neto');

    // Nada pode voltar ao default (bug histórico que apagou consentimentos LGPD)
    expect(body.consentimento_aceito).toBe(true);
    expect(body.consentimento_aceito_em).toBe(original.consentimento_aceito_em);
    expect(body.foto_url).toBe(FOTO_FICTICIA);

    const colunasPreservadas = [
      'whatsapp', 'data_nascimento', 'data_ingresso', 'tipo_ingresso', 'sexo', 'rua', 'numero',
      'complemento', 'bairro', 'cidade', 'status', 'e_lider', 'lider', 'discipulador_id', 'celulas_json'
    ];
    for (const col of colunasPreservadas) {
      expect(body[col], `coluna ${col} deve manter o valor original`).toEqual(original[col]);
    }
  });

  test('"Novo Membro" envia o insert com os campos esperados', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    await page.getByRole('button', { name: 'Novo Membro' }).click();

    const form = page.locator('#member-main-form');
    await expect(page.getByRole('heading', { name: 'Novo Cadastro de Membro' })).toBeVisible();

    await form.locator('[name="nome"]').fill('Lúcia Helena Barbosa');
    await form.locator('[name="whatsapp"]').fill('44988887777');
    await expect(form.locator('[name="whatsapp"]')).toHaveValue('(44) 98888-7777');
    await form.locator('[name="dataNascimento"]').fill('1995-11-03');
    await form.locator('[name="dataIngresso"]').fill('2026-10-01');
    await form.locator('[name="tipoIngresso"]').selectOption('Batismo');
    await form.locator('[name="sexo"]').selectOption('FEMININO');
    await form.locator('[name="lider"]').selectOption({ label: NOMES.ana });
    await form.locator('[name="bairro"]').fill('Vila Fictícia');

    await form.getByRole('button', { name: 'Cadastrar Discípulo' }).click();
    await expect(page.locator('.toast-notification.success')).toContainText('Lúcia Helena Barbosa cadastrado com sucesso');

    const posts = mock.escritas('pessoas', 'POST');
    expect(posts).toHaveLength(1);
    expect(Array.isArray(posts[0].body)).toBe(true);
    // data.js addMembro → payload
    expect(posts[0].body[0]).toEqual({
      nome: 'Lúcia Helena Barbosa',
      whatsapp: '(44) 98888-7777',
      data_nascimento: '1995-11-03',
      data_ingresso: '2026-10-01',
      tipo_ingresso: 'Batismo',
      sexo: 'FEMININO',
      rua: null,
      numero: null,
      complemento: null,
      bairro: 'Vila Fictícia',
      cidade: 'Mandaguari',
      status: 'ATIVO',
      e_lider: false,
      lider: NOMES.ana,
      discipulador_id: IDS.ana,
      celulas_json: '[]',
      foto_url: null,
      consentimento_aceito: false,
      consentimento_aceito_em: null
    });

    // Aparece na lista
    await expect(page.locator('#membros-table-body')).toContainText('Lúcia Helena Barbosa');
  });
});
