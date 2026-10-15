const { test, expect, abrirApp } = require('../support/fixtures');
const { NOMES } = require('../support/seed');

test.describe('Células & Líderes', () => {
  test('não há botão "Colunas"; CSV e PDF estão presentes', async ({ page }) => {
    await abrirApp(page, 'admin-lideres');
    await expect(page.getByRole('heading', { name: 'Células & Líderes' })).toBeVisible();

    await expect(page.getByRole('button', { name: /Colunas/ })).toHaveCount(0);
    await expect(page.locator('#page-content')).not.toContainText('Colunas');

    await expect(page.getByRole('button', { name: 'CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PDF' })).toBeVisible();
  });

  test('CSV exporta as células (download + toast de sucesso)', async ({ page }) => {
    await abrirApp(page, 'admin-lideres');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV' }).click();
    const arq = await download;
    expect(arq.suggestedFilename()).toMatch(/^celulas_wave_\d{4}-\d{2}-\d{2}\.csv$/);
    await expect(page.locator('.toast-notification.success')).toContainText('Relatório de Células exportado');
  });

  test('referência externa não aparece como célula', async ({ page }) => {
    await abrirApp(page, 'admin-lideres');
    await expect(page.locator('#lideres-desktop-grid')).toContainText(NOMES.carlos);
    await expect(page.locator('#lideres-desktop-grid')).not.toContainText('Silvano');
  });
});
