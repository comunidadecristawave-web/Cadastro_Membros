const { test, expect, abrirApp } = require('../support/fixtures');

// Seed: 23 membros ativos visíveis (5 líderes + 4 discípulos + 14 "Santos");
// inativo e referência externa não contam.
const TOTAL_ATIVOS = 23;
const TOTAL_SANTOS = 14;

async function definirItensPorPagina(page, n) {
  await page.locator('select', { has: page.locator('option[value="100"]') }).first().selectOption(String(n));
}

const paginacao = page => page.locator('#membros-paginacao');
const busca = page => page.getByPlaceholder('Buscar por nome ou WhatsApp...');

test.describe('Paginação da lista de membros — desktop', () => {
  test('controles depois da tabela, navegação e atualização pela busca', async ({ page }) => {
    await abrirApp(page, 'admin-membros');
    await expect(page.locator('#membros-total')).toHaveText(String(TOTAL_ATIVOS));
    // 50 por página (padrão) → 1 página → sem controles
    await expect(paginacao(page)).toBeEmpty();

    await definirItensPorPagina(page, 10);
    await expect(paginacao(page)).toContainText('Página 1 de 3');
    await expect(page.locator('#membros-table-body tr')).toHaveCount(10);
    await expect(page.locator('#membros-count')).toHaveText('10');
    await expect(paginacao(page).getByRole('button', { name: 'Anterior' })).toBeDisabled();

    // Paginação fica abaixo da tabela
    const tabela = await page.locator('.desktop-table-container').boundingBox();
    const pag = await paginacao(page).boundingBox();
    expect(pag.y).toBeGreaterThanOrEqual(tabela.y + tabela.height - 1);

    await paginacao(page).getByRole('button', { name: 'Próxima' }).click();
    await expect(paginacao(page)).toContainText('Página 2 de 3');
    await paginacao(page).getByRole('button', { name: 'Próxima' }).click();
    await expect(paginacao(page)).toContainText('Página 3 de 3');
    await expect(paginacao(page).getByRole('button', { name: 'Próxima' })).toBeDisabled();
    await expect(page.locator('#membros-count')).toHaveText(String(TOTAL_ATIVOS - 20));

    // Busca que reduz para 2 páginas: volta à página 1 e mostra "de 2"
    await busca(page).fill('santos');
    await expect(paginacao(page)).toContainText('Página 1 de 2');
    await expect(page.locator('#membros-total')).toHaveText(String(TOTAL_SANTOS));

    // Busca que reduz para 1 página: controles somem
    await busca(page).fill('jose');
    await expect(page.locator('#membros-total')).toHaveText('1');
    await expect(paginacao(page)).toBeEmpty();
    await expect(page.getByText(/Página \d+ de \d+/)).toHaveCount(0);

    // Limpar devolve a paginação completa
    await busca(page).fill('');
    await expect(paginacao(page)).toContainText('Página 1 de 3');
    await expect(page.locator('#membros-total')).toHaveText(String(TOTAL_ATIVOS));
  });

  test('filtro do drawer também atualiza a paginação e o total', async ({ page }) => {
    await abrirApp(page, 'admin-membros');
    await definirItensPorPagina(page, 10);
    await expect(paginacao(page)).toContainText('Página 1 de 3');

    await page.getByRole('button', { name: 'Filtros' }).click();
    const drawer = page.locator('.filtros-drawer.open');
    await drawer.locator('select').nth(3).selectOption('FEMININO'); // Gênero
    // Femininas ativas: Ana, Juliana, Conceição, Fernanda + 7 "Santos" = 11
    await expect(page.locator('#membros-total')).toHaveText('11');
    await expect(paginacao(page)).toContainText('Página 1 de 2');
  });
});

test.describe('Paginação da lista de membros — mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('controles ficam abaixo da lista mobile e refletem a busca', async ({ page }) => {
    await abrirApp(page, 'admin-membros');
    const lista = page.locator('#membros-mobile-list');
    await expect(lista).toBeVisible();
    await expect(page.locator('.desktop-table-container')).toBeHidden();

    await definirItensPorPagina(page, 10);
    await expect(paginacao(page)).toContainText('Página 1 de 3');
    await expect(lista.locator('> .card')).toHaveCount(10);

    // Ordem no DOM: lista mobile vem antes da paginação
    const depois = await page.evaluate(() => {
      const l = document.getElementById('membros-mobile-list');
      const p = document.getElementById('membros-paginacao');
      return !!(l.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(depois).toBe(true);

    // Visualmente abaixo do último card
    const boxLista = await lista.boundingBox();
    const boxPag = await paginacao(page).boundingBox();
    expect(boxPag.y).toBeGreaterThanOrEqual(boxLista.y + boxLista.height - 1);

    await paginacao(page).getByRole('button', { name: 'Próxima' }).click();
    await expect(paginacao(page)).toContainText('Página 2 de 3');

    await busca(page).fill('conceicao');
    await expect(page.locator('#membros-total')).toHaveText('1');
    await expect(lista.locator('> .card')).toHaveCount(1);
    await expect(paginacao(page)).toBeEmpty();
  });
});
