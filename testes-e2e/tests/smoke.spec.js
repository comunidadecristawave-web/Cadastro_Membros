const { test, expect, abrirApp } = require('../support/fixtures');

// Rotas vivas: páginas cujos <script> estão em versao-nova/index.html.
const ROTAS = [
  { rota: 'admin', texto: null },
  { rota: 'admin-membros', texto: 'Membros' },
  { rota: 'admin-lideres', texto: 'Células & Líderes' },
  { rota: 'admin-usuarios', texto: null },
  { rota: 'importacao', texto: 'CSV' },
  { rota: 'perfil-usuario', texto: 'Informações pessoais' },
  { rota: 'boas-vindas', texto: null },
  { rota: 'login', texto: 'Entrar na Conta' },
  { rota: 'cadastro-publico', texto: null }
];

test.describe('Smoke: todas as rotas renderizam sem erros', () => {
  for (const { rota, texto } of ROTAS) {
    test(`rota #${rota} renderiza sem erros de console`, async ({ page, mock }) => {
      await abrirApp(page, rota);
      await page.waitForTimeout(800); // deixa onMount/assíncronos terminarem

      const conteudo = page.locator('#page-content');
      await expect(conteudo).not.toBeEmpty();
      await expect(conteudo).not.toContainText('Página não encontrada');
      if (texto) await expect(conteudo).toContainText(texto);
      await expect(page.locator('body')).not.toContainText('Dia do Encontro');
      await expect(page.locator('body')).not.toContainText('Erro no Banco');

      expect(page.pageErrors, 'pageerror').toEqual([]);
      expect(page.consoleErrors, 'console.error').toEqual([]);
      expect(mock.inesperadas, 'chamadas a rotas não simuladas do Supabase').toEqual([]);
    });
  }
});
