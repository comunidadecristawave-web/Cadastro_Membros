const { test, expect, abrirApp } = require('../support/fixtures');
const { USUARIO_ADMIN } = require('../support/seed');

test.describe('Perfil do usuário', () => {
  test('salvar mostra "Salvando..." e depois "Alterações salvas." sem a palavra "banco"', async ({ page, mock }) => {
    // Atrasa a gravação para conseguir observar o estado intermediário
    mock.atrasar({ method: 'PATCH', table: 'usuarios', ms: 1500 });
    await abrirApp(page, 'perfil-usuario');

    await page.locator('#input-perfil-nome').fill('Admin Teste Fictício Silva');
    const botao = page.locator('#btn-salvar-perfil');
    await botao.click();

    await expect(botao).toContainText('Salvando...');
    await expect(botao).toBeDisabled();
    await expect(page.locator('#page-content')).not.toContainText(/banco/i);

    const sucesso = page.getByText('Alterações salvas.', { exact: true });
    await expect(sucesso).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast-notification.success')).toContainText('Perfil atualizado.');

    // Confirmação verde (sem classe de aviso) e nenhum texto técnico
    const card = page.locator('.alert-card', { hasText: 'Alterações salvas.' });
    await expect(card).not.toHaveClass(/\bwarning\b/);
    await expect(page.locator('#page-content')).not.toContainText(/banco/i);
    await expect(page.locator('#toast-container')).not.toContainText(/banco/i);

    const patches = mock.escritas('usuarios', 'PATCH');
    expect(patches).toHaveLength(1);
    expect(patches[0].query.id).toBe(`eq.${USUARIO_ADMIN.id}`);
    expect(patches[0].body).toEqual({
      nome: 'Admin Teste Fictício Silva',
      email: USUARIO_ADMIN.email,
      whatsapp: USUARIO_ADMIN.whatsapp,
      telefone: USUARIO_ADMIN.whatsapp
    });
  });
});
