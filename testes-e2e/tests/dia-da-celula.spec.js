const { test, expect, abrirApp } = require('../support/fixtures');
const { NOMES } = require('../support/seed');

test.describe('Rótulo "Dia da Célula"', () => {
  test('edição de líder (células do formulário) usa "Dia da Célula"', async ({ page }) => {
    await abrirApp(page, 'admin-membros');
    const linha = page.locator('#membros-table-body tr', { hasText: NOMES.carlos });
    await linha.getByTitle('Editar Discípulo').click();

    const form = page.locator('#member-main-form');
    await expect(form).toBeVisible();
    // Carlos tem 2 células → 2 rótulos
    await expect(form.locator('label', { hasText: 'Dia da Célula' })).toHaveCount(2);
    await expect(form.locator('label', { hasText: 'Dia da Célula' }).first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Dia do Encontro');
  });

  test('reativação como líder usa "Dia da Célula"', async ({ page }) => {
    await abrirApp(page, 'admin-membros');
    await page.getByRole('button', { name: 'Filtros' }).click();
    const drawer = page.locator('.filtros-drawer.open');
    await drawer.locator('select').first().selectOption('INATIVO');
    await drawer.getByRole('button', { name: 'Aplicar' }).click();
    await page.locator('#membros-table-body tr', { hasText: NOMES.roberto }).getByTitle('Reativar Cadastro').click();

    const modal = page.locator('.modal-overlay.open', { hasText: 'Reativar Discípulo' });
    await modal.locator('#reativar-como-lider-select').selectOption('sim');
    await expect(modal.locator('label', { hasText: 'Dia da Célula' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Dia do Encontro');
  });

  test('filtro de Células & Líderes usa "Dia da Célula"', async ({ page }) => {
    await abrirApp(page, 'admin-lideres');
    await page.getByRole('button', { name: 'Filtros' }).click();
    await expect(page.locator('.filtros-drawer.open label', { hasText: 'Dia da Célula' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Dia do Encontro');
  });
});
