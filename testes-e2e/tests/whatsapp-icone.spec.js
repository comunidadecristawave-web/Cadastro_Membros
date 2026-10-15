const { test, expect, abrirApp } = require('../support/fixtures');
const { IDS } = require('../support/seed');

/* Todo link de WhatsApp (wa.me) visível deve ter o ícone do WhatsApp ANTES do texto,
   para deixar claro que é um botão que abre a conversa. */

async function conferirLinksWhatsApp(page, contexto) {
  const links = page.locator('a[href^="https://wa.me/"]:visible');
  const total = await links.count();
  expect(total, `${contexto}: deveria haver ao menos 1 link de WhatsApp`).toBeGreaterThan(0);
  for (let i = 0; i < total; i++) {
    const link = links.nth(i);
    const icone = link.locator('svg.icone-whatsapp');
    await expect(icone, `${contexto}: link ${i} sem ícone`).toHaveCount(1);
    const primeiroFilho = await link.evaluate(a => a.firstElementChild && a.firstElementChild.classList.contains('icone-whatsapp'));
    expect(primeiroFilho, `${contexto}: ícone deve vir antes do texto`).toBe(true);
  }
  if (process.env.SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/whatsapp-${contexto}.png` });
  }
}

test.describe('Ícone do WhatsApp antes do número', () => {
  test('ficha do membro', async ({ page }) => {
    await abrirApp(page, 'admin-membros');
    await page.evaluate((id) => WavePages['admin-membros'].abrirDetalhes(id), IDS.jose);
    await expect(page.locator('.modal-overlay.open .modal-sheet')).toBeVisible();
    await conferirLinksWhatsApp(page, 'ficha-membro');
  });

  test('ficha da célula (líder e discípulos)', async ({ page }) => {
    await abrirApp(page, 'admin-lideres');
    await page.evaluate((id) => WavePages['admin-lideres'].abrirFichaLider(id), IDS.carlos);
    await expect(page.locator('.modal-overlay.open .modal-sheet')).toBeVisible();
    await conferirLinksWhatsApp(page, 'ficha-celula');
  });

  test('aniversariantes do mês', async ({ page, mock }) => {
    // Garante um aniversariante no mês corrente (dado fictício)
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    mock.db.pessoas.find(p => p.id === IDS.jose).data_nascimento = `1990-${mes}-15`;
    await abrirApp(page, 'admin');
    await page.evaluate(() => WavePages.admin.abrirAniversariantesModal());
    await expect(page.locator('.modal-overlay.open')).toBeVisible();
    await conferirLinksWhatsApp(page, 'aniversariantes');
  });
});
