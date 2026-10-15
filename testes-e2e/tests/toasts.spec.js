const { test, expect, abrirApp } = require('../support/fixtures');

const TIPOS = {
  success: 'check-circle',
  info: 'info',
  warning: 'alert-triangle',
  danger: 'alert-circle'
};

const toast = (page, texto) => page.locator('#toast-container .toast-notification', { hasText: texto });

async function mostrar(page, msg, tipo) {
  await page.evaluate(([m, t]) => WaveApp.showToast(m, t), [msg, tipo]);
}

test.describe('Toasts', () => {
  test.beforeEach(async ({ page }) => {
    await abrirApp(page, 'admin');
  });

  for (const [tipo, icone] of Object.entries(TIPOS)) {
    test(`tipo "${tipo}" tem classe e ícone próprios`, async ({ page }) => {
      await mostrar(page, `Mensagem ${tipo}`, tipo);
      const t = toast(page, `Mensagem ${tipo}`);
      await expect(t).toBeVisible();
      await expect(t).toHaveClass(new RegExp(`\\btoast-notification ${tipo}\\b`));
      await expect(t.locator(`.toast-icon[data-lucide="${icone}"]`)).toHaveCount(1);
      await expect(t).toHaveAttribute('role', tipo === 'danger' ? 'alert' : 'status');
      await expect(t.getByRole('button', { name: 'Fechar' })).toHaveCount(tipo === 'danger' ? 1 : 0);
    });
  }

  test('tipo desconhecido cai em "success"', async ({ page }) => {
    await mostrar(page, 'Tipo estranho', 'qualquer-coisa');
    await expect(toast(page, 'Tipo estranho')).toHaveClass(/\bsuccess\b/);
  });

  test('erro (danger) persiste por mais de 5s e fecha no ×', async ({ page }) => {
    await mostrar(page, 'Falha persistente', 'danger');
    const t = toast(page, 'Falha persistente');
    await expect(t).toBeVisible();
    await page.waitForTimeout(5500);
    await expect(t).toBeVisible();
    await t.getByRole('button', { name: 'Fechar' }).click();
    await expect(t).toHaveCount(0);
  });

  test('aviso/info/sucesso somem sozinhos em ~4s', async ({ page }) => {
    await mostrar(page, 'Aviso some', 'warning');
    await mostrar(page, 'Info some', 'info');
    await mostrar(page, 'Sucesso some', 'success');
    await page.waitForTimeout(3000);
    await expect(toast(page, 'Aviso some')).toBeVisible();
    await page.waitForTimeout(1500); // ~4.5s: 4s + 0.3s de animação de saída
    await expect(toast(page, 'Aviso some')).toHaveCount(0, { timeout: 1000 });
    await expect(toast(page, 'Info some')).toHaveCount(0, { timeout: 1000 });
    await expect(toast(page, 'Sucesso some')).toHaveCount(0, { timeout: 1000 });
  });

  test('pilha: no 4º toast o mais antigo sai (máx. 3 visíveis)', async ({ page }) => {
    await mostrar(page, 'Toast 1', 'danger');
    await mostrar(page, 'Toast 2', 'danger');
    await mostrar(page, 'Toast 3', 'info');
    await mostrar(page, 'Toast 4', 'warning');
    await expect(page.locator('#toast-container .toast-notification')).toHaveCount(3);
    await expect(toast(page, 'Toast 1')).toHaveCount(0);
    for (const n of [2, 3, 4]) await expect(toast(page, `Toast ${n}`)).toBeVisible();
  });

  test('mensagem é escapada (sem injeção de HTML)', async ({ page }) => {
    await mostrar(page, '<img src=x onerror=alert(1)> texto', 'info');
    const t = toast(page, 'texto');
    await expect(t.locator('img')).toHaveCount(0);
    await expect(t.locator('.toast-msg')).toHaveText('<img src=x onerror=alert(1)> texto');
  });
});
