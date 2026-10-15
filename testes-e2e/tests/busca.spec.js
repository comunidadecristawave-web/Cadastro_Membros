const { test, expect, abrirApp } = require('../support/fixtures');
const { NOMES } = require('../support/seed');

async function buscar(page, termo) {
  const campo = page.getByPlaceholder('Buscar por nome ou WhatsApp...');
  await campo.fill(termo);
}

function linhas(page) {
  return page.locator('#membros-table-body tr');
}

test.describe('Busca de membros', () => {
  test.beforeEach(async ({ page }) => {
    await abrirApp(page, 'admin-membros');
  });

  test('"jose" (sem acento) encontra José', async ({ page }) => {
    await buscar(page, 'jose');
    await expect(linhas(page)).toHaveCount(1);
    await expect(linhas(page).first()).toContainText('José Antônio Ferreira');
    await expect(page.locator('#membros-total')).toHaveText('1');
  });

  test('"conceicao" (sem acento e cedilha) encontra Conceição', async ({ page }) => {
    await buscar(page, 'conceicao');
    await expect(linhas(page)).toHaveCount(1);
    await expect(linhas(page).first()).toContainText('Maria da Conceição');
  });

  test('busca maiúscula/acentuada também funciona ("JOSÉ")', async ({ page }) => {
    await buscar(page, 'JOSÉ');
    await expect(linhas(page)).toHaveCount(1);
    await expect(linhas(page).first()).toContainText('José Antônio Ferreira');
  });

  test('dígitos do WhatsApp encontram o membro ("99876" e "(44) 99876")', async ({ page }) => {
    await buscar(page, '99876');
    await expect(linhas(page)).toHaveCount(1);
    await expect(linhas(page).first()).toContainText('José Antônio Ferreira');

    await buscar(page, '(44) 99876');
    await expect(linhas(page)).toHaveCount(1);
    await expect(linhas(page).first()).toContainText('José Antônio Ferreira');
  });

  test('termo sem dígitos não filtra por telefone', async ({ page }) => {
    // "lima" não é telefone; só casa por nome (Maria da Conceição Lima)
    await buscar(page, 'lima');
    await expect(linhas(page)).toHaveCount(1);
    await expect(linhas(page).first()).toContainText('Conceição');
  });

  test('pessoa com referência externa nunca aparece na lista nem na busca', async ({ page }) => {
    // Obs.: o NOME dela pode aparecer na coluna 'Líder Responsável' de quem ela discipula
    // (vínculo preservado por design em data.js) — o que não pode é ela ser uma LINHA da lista.
    const colunaNome = page.locator('#membros-table-body tr td:first-child');
    await expect(colunaNome.filter({ hasText: 'Silvano' })).toHaveCount(0);
    await expect(colunaNome.filter({ hasText: 'Paulo Henrique' })).toHaveCount(1);

    // Mesmo listando todos os status
    await page.getByRole('button', { name: 'Filtros' }).click();
    const drawer = page.locator('.filtros-drawer.open');
    await drawer.locator('select').first().selectOption('todos');
    await drawer.getByRole('button', { name: 'Aplicar' }).click();
    await expect(colunaNome.filter({ hasText: 'Silvano' })).toHaveCount(0);

    await buscar(page, 'silvano');
    await expect(linhas(page)).toHaveCount(1);
    await expect(linhas(page).first()).toContainText('Nenhum discípulo encontrado');
    await expect(page.locator('#membros-total')).toHaveText('0');

    // Telefone dela também não a revela
    await buscar(page, '97777-0001');
    await expect(linhas(page).first()).toContainText('Nenhum discípulo encontrado');
  });

  test('limpar a busca restaura a lista completa', async ({ page }) => {
    const total = await page.locator('#membros-total').textContent();
    await buscar(page, 'jose');
    await expect(page.locator('#membros-total')).toHaveText('1');
    await buscar(page, '');
    await expect(page.locator('#membros-total')).toHaveText(total);
    await expect(page.locator('#membros-table-body')).toContainText(NOMES.carlos);
  });
});
