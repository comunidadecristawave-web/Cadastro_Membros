const { test, expect, abrirApp } = require('../support/fixtures');

const cards = page => page.locator('.cards-stat-grid .card-stat-box');

test.describe('Painel — totalizadores no mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('ficam em lista, um por linha, com ícone à esquerda e valor à direita', async ({ page }) => {
    await abrirApp(page, 'admin');
    await expect(cards(page)).toHaveCount(4);

    const caixas = [];
    for (let i = 0; i < 4; i++) caixas.push(await cards(page).nth(i).boundingBox());

    // Um por linha: mesma coluna, largura cheia, cada um abaixo do anterior
    for (let i = 1; i < 4; i++) {
      expect(Math.abs(caixas[i].x - caixas[0].x)).toBeLessThan(2);
      expect(caixas[i].y).toBeGreaterThan(caixas[i - 1].y + caixas[i - 1].height - 1);
    }
    expect(caixas[0].width).toBeGreaterThan(300);

    // Dentro da linha: ícone → título → valor
    const primeiro = cards(page).first();
    const icone = await primeiro.locator('.card-stat-box-icon').boundingBox();
    const titulo = await primeiro.locator('.card-stat-box-title').boundingBox();
    const valor = await primeiro.locator('.card-stat-box-value').boundingBox();
    expect(icone.x).toBeLessThan(titulo.x);
    expect(titulo.x + titulo.width).toBeLessThanOrEqual(valor.x);
    expect(Math.abs((titulo.y + titulo.height / 2) - (valor.y + valor.height / 2))).toBeLessThan(8);

    if (process.env.SCREENSHOT_DIR) {
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/painel-mobile.png` });
    }
  });
});

test.describe('Painel — totalizadores no desktop', () => {
  test('continuam lado a lado', async ({ page }) => {
    await abrirApp(page, 'admin');
    const a = await cards(page).nth(0).boundingBox();
    const b = await cards(page).nth(1).boundingBox();
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(b.x).toBeGreaterThan(a.x + a.width - 1);
  });
});
