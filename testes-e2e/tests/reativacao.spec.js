const { test, expect, abrirApp, dialogo } = require('../support/fixtures');
const { IDS, NOMES } = require('../support/seed');

async function abrirReativacao(page) {
  // Filtro "Apenas Inativos" pelo drawer de filtros
  await page.getByRole('button', { name: 'Filtros' }).click();
  const drawer = page.locator('.filtros-drawer.open');
  await drawer.locator('select').first().selectOption('INATIVO');
  await drawer.getByRole('button', { name: 'Aplicar' }).click();

  const linha = page.locator('#membros-table-body tr', { hasText: NOMES.roberto });
  await linha.getByTitle('Reativar Cadastro').click();
  const modal = page.locator('.modal-overlay.open', { hasText: 'Reativar Discípulo' });
  await expect(modal).toBeVisible();
  return modal;
}

function escritasReativacao(mock) {
  return mock.escritas('pessoas', 'PATCH').filter(w => w.query.id === `eq.${IDS.roberto}`);
}

test.describe('Reativação de discípulo', () => {
  test('confirmar sem escolher líder bloqueia pedindo o líder', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    const modal = await abrirReativacao(page);

    const select = modal.locator('#reativar-lider-responsavel-select');
    await expect(select).toHaveValue('');
    await expect(select.locator('option').first()).toHaveText('— Selecione —');

    await modal.getByRole('button', { name: 'Confirmar Reativação' }).click();
    await expect(dialogo(page)).toContainText('Líder Obrigatório');
    await page.waitForTimeout(400);
    expect(escritasReativacao(mock)).toEqual([]);
    expect(mock.db.pessoas.find(p => p.id === IDS.roberto).status).toBe('INATIVO');
  });

  test('com líder escolhido envia o PATCH correto', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    const modal = await abrirReativacao(page);

    // Só líderes ativos do mesmo sexo, sem a referência externa
    const opcoes = await modal.locator('#reativar-lider-responsavel-select option').allTextContents();
    expect(opcoes.map(s => s.trim())).toEqual(['— Selecione —', NOMES.paulo, NOMES.carlos, NOMES.sergio]);

    await modal.locator('#reativar-lider-responsavel-select').selectOption({ label: NOMES.paulo });
    await modal.getByRole('button', { name: 'Confirmar Reativação' }).click();
    await expect(page.locator('.toast-notification.success')).toContainText(`${NOMES.roberto} foi reativado(a)`);

    const escritas = escritasReativacao(mock);
    expect(escritas).toHaveLength(1);
    // data.js reativarMembro → payloadDB
    expect(escritas[0].body).toEqual({
      status: 'ATIVO',
      lider: NOMES.paulo,
      discipulador_id: IDS.paulo,
      e_lider: false,
      celulas_json: '[]'
    });
  });
});
