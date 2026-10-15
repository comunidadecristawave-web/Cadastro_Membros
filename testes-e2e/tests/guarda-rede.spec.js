const { test, expect, abrirApp } = require('../support/fixtures');
const { MOCK_URL } = require('../support/fake-supabase');

// Prova de que a guarda funciona: uma chamada a um Supabase "real" é bloqueada e registrada.
test.describe('Guarda de rede (autoteste do ambiente)', () => {
  test('app usa só o Supabase simulado e requisição a *.supabase.co é bloqueada', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');

    const url = await page.evaluate(() => window.supabaseClient && window.supabaseClient.supabaseUrl);
    expect(url).toBe(MOCK_URL);
    expect(mock.leituras('pessoas').length).toBeGreaterThan(0);

    const resultado = await page.evaluate(async () => {
      try { await fetch('https://projeto-qualquer.supabase.co/rest/v1/pessoas'); return 'chegou'; }
      catch (e) { return 'bloqueado'; }
    });
    expect(resultado).toBe('bloqueado');
    expect(mock.violacoes).toHaveLength(1);
    expect(mock.violacoes[0]).toContain('supabase.co');

    // Limpa para a verificação automática do fixture (que falharia o teste) — aqui a violação era esperada.
    mock.violacoes.length = 0;
  });

  test('config.local.js real nunca é servido (servidor estático bloqueia)', async ({ request }) => {
    const res = await request.get('/config.local.js');
    expect(res.status()).toBe(404);
    const api = await request.get('/api/config');
    expect(api.status()).toBe(404);
  });
});
