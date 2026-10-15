const { test, expect, dialogo } = require('../support/fixtures');
const { USUARIO_ADMIN } = require('../support/seed');

test.use({ sessaoAdmin: false });

const MSG_CREDENCIAIS = 'E-mail ou senha incorretos.';
const MSG_CONEXAO = 'Erro ao conectar ao banco de dados. Verifique sua conexão e tente novamente.';

async function abrirLogin(page) {
  await page.goto('/#login');
  await expect(page.getByRole('heading', { name: 'Entrar na Conta' })).toBeVisible();
}

async function entrar(page, email, senha) {
  await page.locator('#login-email').fill(email);
  await page.locator('#login-senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
}

const erro = page => page.locator('#login-error-container');

test.describe('Login', () => {
  test('login válido pelo formulário entra no sistema', async ({ page, mock }) => {
    await abrirLogin(page);
    await entrar(page, USUARIO_ADMIN.email, USUARIO_ADMIN.senha_hash);
    await expect(page).toHaveURL(/#boas-vindas/);
    const consulta = mock.leituras('usuarios')[0];
    expect(consulta.query).toMatchObject({ email: `eq.${USUARIO_ADMIN.email}`, ativo: 'eq.true' });
    const sessao = await page.evaluate(() => JSON.parse(sessionStorage.getItem('wave_auth_session')));
    expect(sessao.user.email).toBe(USUARIO_ADMIN.email);
  });

  test('e-mail inexistente e senha errada mostram a MESMA mensagem', async ({ page }) => {
    await abrirLogin(page);
    await entrar(page, 'ninguem@wave.test', 'QualquerSenha1!');
    await expect(erro(page)).toContainText(MSG_CREDENCIAIS);
    const textoInexistente = (await erro(page).innerText()).trim();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Entrar na Conta' })).toBeVisible();
    await expect(erro(page)).not.toContainText(MSG_CREDENCIAIS);
    await entrar(page, USUARIO_ADMIN.email, 'SenhaErrada!9');
    await expect(erro(page)).toContainText(MSG_CREDENCIAIS);
    const textoSenhaErrada = (await erro(page).innerText()).trim();

    expect(textoInexistente).toBe(MSG_CREDENCIAIS);
    expect(textoSenhaErrada).toBe(textoInexistente);
    await expect(page.locator('body')).not.toContainText('Usuário não encontrado');
    await expect(page).toHaveURL(/#login/);
  });

  test('erro 500 do servidor mostra mensagem de conexão (não "senha incorreta")', async ({ page, mock }) => {
    mock.falhar({ method: 'GET', table: 'usuarios', status: 500, body: { code: 'XX000', message: 'falha interna simulada' } });
    await abrirLogin(page);
    await entrar(page, USUARIO_ADMIN.email, USUARIO_ADMIN.senha_hash);
    await expect(erro(page)).toContainText(MSG_CONEXAO);
    await expect(erro(page)).not.toContainText(MSG_CREDENCIAIS);
  });

  test('falha de rede mostra mensagem de conexão', async ({ page, mock }) => {
    mock.falhar({ method: 'GET', table: 'usuarios', abort: true });
    await abrirLogin(page);
    await entrar(page, USUARIO_ADMIN.email, USUARIO_ADMIN.senha_hash);
    await expect(erro(page)).toContainText(MSG_CONEXAO);
    await expect(erro(page)).not.toContainText(MSG_CREDENCIAIS);
  });

  test('"Esqueci minha senha" abre orientação e NÃO envia o formulário', async ({ page, mock }) => {
    await abrirLogin(page);
    await page.locator('#login-email').fill(USUARIO_ADMIN.email);
    await page.locator('#login-senha').fill(USUARIO_ADMIN.senha_hash);

    const botao = page.getByRole('button', { name: 'Esqueci minha senha' });
    await expect(botao).toHaveAttribute('type', 'button');
    await botao.click();

    await expect(dialogo(page)).toContainText('Fale com o administrador do sistema para redefinir sua senha.');
    await page.waitForTimeout(500);
    expect(mock.requests.filter(r => r.table === 'usuarios')).toEqual([]);
    await expect(page).toHaveURL(/#login/);
    await expect(page.locator('#login-email')).toHaveValue(USUARIO_ADMIN.email);

    await dialogo(page).getByRole('button', { name: 'Entendi' }).click();
    await expect(dialogo(page)).toHaveCount(0);
    expect(mock.requests.filter(r => r.table === 'usuarios')).toEqual([]);
  });
});
