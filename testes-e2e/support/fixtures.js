/* Fixtures compartilhadas:
   - `mock`: FakeSupabase novo por teste, com massa fictícia (support/seed.js).
   - `context`: instala a GUARDA DE REDE (toda requisição passa por aqui) + sessão opcional.
   - `page`: coleta pageerror/console.error e falha o teste se houver violação de rede. */
const base = require('@playwright/test');
const { FakeSupabase, MOCK_HOST, MOCK_URL, MOCK_KEY } = require('./fake-supabase');
const { buildSeed, sessaoAdmin } = require('./seed');

const { expect } = base;

// Hosts que podem receber requisições reais (estáticos locais e CDNs públicas de libs/fontes).
const ALLOWLIST = new Set([
  'localhost', '127.0.0.1',
  MOCK_HOST,
  'cdn.jsdelivr.net', 'unpkg.com',
  'fonts.googleapis.com', 'fonts.gstatic.com'
]);

const CONFIG_JS = `window.SUPABASE_URL = ${JSON.stringify(MOCK_URL)}; window.SUPABASE_ANON_KEY = ${JSON.stringify(MOCK_KEY)};`;

async function instalarGuarda(context, mock) {
  await context.route('**/*', async (route) => {
    const req = route.request();
    const urlStr = req.url();
    if (urlStr.startsWith('data:') || urlStr.startsWith('blob:')) return route.continue();

    let url;
    try { url = new URL(urlStr); } catch (e) {
      mock.violacoes.push(urlStr);
      return route.abort('blockedbyclient');
    }
    const host = url.hostname;

    // Qualquer coisa que pareça Supabase real é violação, sempre.
    if (host.includes('supabase.co') || host.includes('supabase.in') || !ALLOWLIST.has(host)) {
      mock.violacoes.push(`${req.method()} ${urlStr}`);
      return route.abort('blockedbyclient');
    }

    if (host === MOCK_HOST) return mock.handle(route);

    if (host === 'localhost' || host === '127.0.0.1') {
      if (url.pathname === '/api/config' || url.pathname === '/.netlify/functions/config') {
        // Permite simular uma Netlify Function lenta (cold start)
        if (mock.atrasoConfigMs) await new Promise(r => setTimeout(r, mock.atrasoConfigMs));
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ supabaseUrl: MOCK_URL, supabaseAnonKey: MOCK_KEY })
        });
      }
      if (url.pathname.endsWith('/config.local.js')) {
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: CONFIG_JS });
      }
    }
    return route.continue();
  });

  // Realtime (websocket): host simulado fica "mudo" (nunca conecta em servidor real);
  // qualquer outro websocket é violação e é fechado.
  await context.routeWebSocket(/.*/, (ws) => {
    let host = '';
    try { host = new URL(ws.url()).hostname; } catch (e) {}
    if (host === MOCK_HOST) {
      ws.onMessage(() => {});
      return;
    }
    mock.violacoes.push(`WS ${ws.url()}`);
    ws.close({ code: 1008, reason: 'bloqueado pela guarda de testes' });
  });
}

const test = base.test.extend({
  sessaoAdmin: [true, { option: true }],

  mock: async ({}, use) => {
    const mock = new FakeSupabase(buildSeed());
    await use(mock);
  },

  context: async ({ context, mock, sessaoAdmin: comSessao }, use) => {
    await instalarGuarda(context, mock);
    if (comSessao) {
      await context.addInitScript((sessao) => {
        try { window.sessionStorage.setItem('wave_auth_session', JSON.stringify(sessao)); } catch (e) {}
      }, sessaoAdmin());
    }
    await use(context);
    expect(mock.violacoes, 'Nenhuma requisição pode sair para hosts fora da allowlist (ex.: Supabase real)').toEqual([]);
  },

  page: async ({ page }, use, testInfo) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', err => pageErrors.push(String(err && err.stack || err)));
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.pageErrors = pageErrors;
    page.consoleErrors = consoleErrors;
    await use(page);
    if (consoleErrors.length) {
      await testInfo.attach('console-errors.txt', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
    }
    expect(pageErrors, 'Nenhuma exceção JS não tratada (pageerror) durante o teste').toEqual([]);
  }
});

/** Abre uma rota do SPA e espera o primeiro sync do Supabase simulado terminar. */
async function abrirApp(page, rota, { esperarMembros = true } = {}) {
  await page.goto(`/#${rota}`);
  if (esperarMembros) {
    await page.waitForFunction(() => window.WaveData && window.WaveData.membros.length > 0
      && document.getElementById('page-content') && document.getElementById('page-content').children.length > 0);
  } else {
    await page.waitForFunction(() => !!window.WaveApp && !!document.getElementById('page-content')
      && document.getElementById('page-content').children.length > 0);
  }
}

/** Espera o diálogo global (WaveApp.alert/confirm) e devolve o locator do card. */
function dialogo(page) {
  return page.locator('#wave-global-dialog .wave-dialog-card');
}

module.exports = { test, expect, abrirApp, dialogo };
