const { test, expect, abrirApp } = require('../support/fixtures');
const { IDS, NOMES } = require('../support/seed');

/* Tempo real estável (plan-realtime-estavel.md) — um teste por linha da I/O Matrix.
   O websocket do Realtime é mudo na suíte: eventos entram por WaveApp._receberEventoRealtime
   e status do canal por WaveApp._aoStatusRealtime. Renders contados por espião em
   WaveApp.renderCurrentPage. */

const ESPERA_LOTE_MS = 900; // janela de agrupamento (300 ms) + busca no fake + folga

/** Instala um contador de chamadas em WaveApp.renderCurrentPage (depois do sync inicial). */
async function espiarRenders(page) {
  await page.waitForTimeout(400); // deixa o sync do carregamento terminar de redesenhar
  await page.evaluate(() => {
    window.__renders = [];
    const original = WaveApp.renderCurrentPage;
    WaveApp.renderCurrentPage = function (...args) {
      window.__renders.push(args[0] === true);
      return original.apply(this, args);
    };
  });
}

const renders = page => page.evaluate(() => window.__renders.length);

/** Leituras da lista completa de pessoas (sem filtro por id). */
const leiturasCompletas = mock => mock.leituras('pessoas').filter(r => !r.query.id).length;

function evento(tipo, id) {
  return tipo === 'DELETE'
    ? { eventType: 'DELETE', new: {}, old: { id } }
    : { eventType: tipo, new: { id }, old: tipo === 'UPDATE' ? { id } : {} };
}

async function enviarEventos(page, eventos) {
  await page.evaluate((evs) => { evs.forEach(e => WaveApp._receberEventoRealtime(e)); }, eventos);
}

const linhaDb = (mock, id) => mock.db.pessoas.find(p => p.id === id);

test.describe('Abrir o app', () => {
  test('com sessão: zero gravações e lista de pessoas buscada 1 vez', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    await page.waitForTimeout(1500);
    expect(mock.writes, 'carregar a página não deve escrever no banco').toEqual([]);
    expect(leiturasCompletas(mock)).toBe(1);
  });

  test('Realtime ativo após F5 com sessão salva e /api/config lento', async ({ page, mock }) => {
    mock.atrasoConfigMs = 500;
    await abrirApp(page, 'admin-membros');
    await page.waitForTimeout(1500);
    const estado = await page.evaluate(() => ({
      canal: !!WaveApp._realtimeChannel,
      parado: WaveApp._realtimeParado
    }));
    expect(estado).toEqual({ canal: true, parado: false });
    expect(mock.writes).toEqual([]);
    expect(leiturasCompletas(mock)).toBe(1);
  });
});

test.describe('Abrir o app sem sessão', () => {
  test.use({ sessaoAdmin: false });

  test('visitante: zero gravações e Realtime desligado', async ({ page, mock }) => {
    await abrirApp(page, 'login', { esperarMembros: false });
    await page.waitForTimeout(1500);
    expect(mock.writes).toEqual([]);
    expect(leiturasCompletas(mock)).toBe(1);
    expect(await page.evaluate(() => !!WaveApp._realtimeChannel)).toBe(false);
  });
});

test.describe('Eventos Realtime', () => {
  test.beforeEach(async ({ page }) => {
    await abrirApp(page, 'admin-membros');
    await espiarRenders(page);
  });

  test('rajada de 10 eventos com linhas alteradas: memória atualizada e 1 redesenho', async ({ page, mock }) => {
    const ids = ['pes-f01', 'pes-f02', 'pes-f03', 'pes-f04', 'pes-f05', 'pes-f06', 'pes-f07', 'pes-f08', 'pes-f09', 'pes-f10'];
    ids.forEach((id, i) => { linhaDb(mock, id).bairro = `Bairro Fictício ${i}`; });

    await enviarEventos(page, ids.map(id => evento('UPDATE', id)));
    await page.waitForTimeout(ESPERA_LOTE_MS);

    const bairros = await page.evaluate((lista) => lista.map(id => WaveData.getMembroById(id).bairro), ids);
    expect(bairros).toEqual(ids.map((_, i) => `Bairro Fictício ${i}`));
    expect(await renders(page)).toBe(1);
    // Uma única busca em lote (in.(…)) para os 10 ids
    const buscasPorId = mock.leituras('pessoas').filter(r => r.query.id && r.query.id.startsWith('in.'));
    expect(buscasPorId).toHaveLength(1);
    expect(mock.writes).toEqual([]);
  });

  test('evento sem mudança real na linha não redesenha', async ({ page, mock }) => {
    await enviarEventos(page, [evento('UPDATE', IDS.jose), evento('UPDATE', IDS.marcos)]);
    await page.waitForTimeout(ESPERA_LOTE_MS);
    expect(mock.leituras('pessoas').filter(r => r.query.id && r.query.id.startsWith('in.'))).toHaveLength(1);
    expect(await renders(page)).toBe(0);
  });

  test('mudança de nome por outro admin aparece sem animação de entrada e sem perder rolagem', async ({ page, mock }) => {
    await page.setViewportSize({ width: 1280, height: 420 });
    await page.evaluate(() => {
      window.scrollTo(0, 200);
      const c = document.getElementById('page-content');
      c.scrollTop = 200;
    });
    await page.waitForTimeout(600); // scroll-behavior pode ser suave
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const antes = await page.evaluate(() => ({
      janela: window.scrollY, container: document.getElementById('page-content').scrollTop
    }));

    linhaDb(mock, IDS.jose).nome = 'José Renomeado Ferreira';
    await enviarEventos(page, [evento('UPDATE', IDS.jose)]);
    await expect(page.locator('#membros-table-body')).toContainText('José Renomeado Ferreira');

    expect(await renders(page)).toBe(1);
    const depois = await page.evaluate(() => ({
      janela: window.scrollY, container: document.getElementById('page-content').scrollTop
    }));
    expect(depois).toEqual(antes);

    const animacoes = await page.evaluate(() => {
      const c = document.getElementById('page-content');
      return {
        classe: c.classList.contains('sem-animacao'),
        nomes: [...c.querySelectorAll('.animate-in, .animate-scale')].map(el => getComputedStyle(el).animationName)
      };
    });
    expect(animacoes.classe).toBe(true);
    for (const nome of animacoes.nomes) expect(nome).toBe('none');
    expect(mock.writes).toEqual([]);
  });

  test('ficha aberta continua sem animação após redesenho de fundo', async ({ page, mock }) => {
    await page.evaluate((id) => WavePages['admin-membros'].abrirDetalhes(id), IDS.jose);
    const sheet = page.locator('.modal-overlay.open .modal-sheet');
    await expect(sheet).toBeVisible();

    linhaDb(mock, IDS.jose).bairro = 'Bairro Fictício Novo';
    await enviarEventos(page, [evento('UPDATE', IDS.jose)]);
    await expect.poll(() => renders(page)).toBe(2); // abrirDetalhes + redesenho de fundo
    expect(await sheet.evaluate(el => getComputedStyle(el).animationName)).toBe('none');

    // Navegação normal volta a animar
    await page.evaluate(() => WaveApp.renderCurrentPage());
    expect(await page.locator('#page-content').evaluate(el => el.classList.contains('sem-animacao'))).toBe(false);
  });

  test('com formulário de edição aberto: memória atualizada, tela não redesenha', async ({ page, mock }) => {
    const linha = page.locator('#membros-table-body tr', { hasText: 'José Antônio' });
    await linha.getByTitle('Editar Discípulo').click();
    await expect(page.locator('#member-main-form')).toBeVisible();
    await page.locator('#form-membro-nome').fill('Nome Digitado Pelo Admin');
    const rendersAntes = await renders(page);

    linhaDb(mock, IDS.marcos).nome = 'Marcos Vinícius Prado Alterado';
    await enviarEventos(page, [evento('UPDATE', IDS.marcos)]);
    await page.waitForTimeout(ESPERA_LOTE_MS);

    expect(await page.evaluate((id) => WaveData.getMembroById(id).nome, IDS.marcos)).toBe('Marcos Vinícius Prado Alterado');
    expect(await renders(page)).toBe(rendersAntes);
    await expect(page.locator('#form-membro-nome')).toHaveValue('Nome Digitado Pelo Admin');
    expect(mock.writes).toEqual([]);
  });

  test('DELETE remove da memória, cancela UPDATE pendente do mesmo id e redesenha 1 vez', async ({ page, mock }) => {
    mock.db.pessoas = mock.db.pessoas.filter(p => p.id !== IDS.marcos);
    await enviarEventos(page, [evento('UPDATE', IDS.marcos), evento('DELETE', IDS.marcos)]);
    await page.waitForTimeout(ESPERA_LOTE_MS);

    expect(await page.evaluate((id) => !!WaveData.getMembroById(id), IDS.marcos)).toBe(false);
    expect(await renders(page)).toBe(1);
    const rebuscas = mock.leituras('pessoas').filter(r => r.query.id && r.query.id.includes(IDS.marcos));
    expect(rebuscas, 'nunca rebuscar id deletado').toHaveLength(0);
    await expect(page.locator('#membros-table-body')).not.toContainText(NOMES.marcos);
  });

  test('lote com mais de 50 ids é buscado em partes e tudo é aplicado', async ({ page, mock }) => {
    const base = linhaDb(mock, IDS.marcos);
    const novosIds = [];
    for (let i = 0; i < 45; i++) {
      const id = `pes-lote-${String(i).padStart(2, '0')}`;
      novosIds.push(id);
      mock.db.pessoas.push({ ...base, id, nome: `Pessoa Fictícia Lote ${i}` });
    }
    const existentes = mock.db.pessoas.filter(p => !novosIds.includes(p.id)).map(p => p.id);
    existentes.forEach(id => { linhaDb(mock, id).complemento = 'Compl Lote'; });

    const todos = [...novosIds, ...existentes];
    expect(todos.length).toBeGreaterThan(50);
    await enviarEventos(page, todos.map(id => evento(novosIds.includes(id) ? 'INSERT' : 'UPDATE', id)));
    await page.waitForTimeout(ESPERA_LOTE_MS + 300);

    const buscas = mock.leituras('pessoas').filter(r => r.query.id && r.query.id.startsWith('in.'));
    expect(buscas).toHaveLength(Math.ceil(todos.length / 50));
    const r = await page.evaluate(({ novos, exist }) => ({
      novos: novos.every(id => !!WaveData.getMembroById(id)),
      exist: exist.every(id => WaveData.getMembroById(id).complemento === 'Compl Lote')
    }), { novos: novosIds, exist: existentes });
    expect(r).toEqual({ novos: true, exist: true });
    expect(await renders(page)).toBe(1);
  });

  test('falha na busca do lote marca sync pendente', async ({ page, mock }) => {
    linhaDb(mock, IDS.jose).bairro = 'Bairro Que Falhou';
    mock.falhar({ method: 'GET', table: 'pessoas' });
    await enviarEventos(page, [evento('UPDATE', IDS.jose)]);
    await page.waitForTimeout(ESPERA_LOTE_MS);
    const r = await page.evaluate((id) => ({ pendente: WaveApp._syncPendente, bairro: WaveData.getMembroById(id).bairro }), IDS.jose);
    expect(r.pendente).toBe(true);
    expect(r.bairro).not.toBe('Bairro Que Falhou');
    expect(await renders(page)).toBe(0);
  });

  test('logout durante a busca do lote: sem mudança em memória, redesenho de fundo ou toast', async ({ page, mock }) => {
    mock.db.pessoas.push({ ...linhaDb(mock, IDS.marcos), id: 'pes-durante-logout', nome: 'Pessoa Fictícia Logout' });
    mock.atrasar({ method: 'GET', table: 'pessoas', ms: 800 });
    await enviarEventos(page, [evento('INSERT', 'pes-durante-logout')]);
    await page.waitForTimeout(450); // janela do lote passou, busca em andamento
    await page.evaluate(() => WaveAuth.logout());
    await page.waitForTimeout(1200);

    const r = await page.evaluate(() => ({
      membro: !!WaveData.getMembroById('pes-durante-logout'),
      rendersFundo: window.__renders.filter(Boolean).length
    }));
    expect(r).toEqual({ membro: false, rendersFundo: 0 });
    expect(await page.locator('#toast-container .toast-notification', { hasText: 'Novo cadastro' }).count()).toBe(0);
  });
});

test.describe('Canal Realtime', () => {
  test.beforeEach(async ({ page }) => {
    await abrirApp(page, 'admin-membros');
    await page.waitForFunction(() => !!WaveApp._realtimeChannel);
  });

  test('queda do canal: reinscreve com espera crescente até 30 s, sem laço rápido', async ({ page }) => {
    const resultado = await page.evaluate(() => {
      const esperas = [];
      const stOriginal = window.setTimeout;
      window.setTimeout = function (fn, ms, ...r) { esperas.push(ms); return stOriginal.call(window, fn, ms, ...r); };
      try {
        WaveApp._aoStatusRealtime('CHANNEL_ERROR');
        // Novos status de queda com timer pendente não agendam outra reinscrição
        WaveApp._aoStatusRealtime('TIMED_OUT');
        WaveApp._aoStatusRealtime('CLOSED');
        const timersAposRajada = esperas.length;
        // Simula sucessivas falhas da reinscrição
        for (let i = 0; i < 6; i++) {
          clearTimeout(WaveApp._realtimeTimerReconexao);
          WaveApp._realtimeTimerReconexao = null;
          WaveApp._aoStatusRealtime('TIMED_OUT');
        }
        return { timersAposRajada, esperas };
      } finally {
        window.setTimeout = stOriginal;
        clearTimeout(WaveApp._realtimeTimerReconexao);
        WaveApp._realtimeTimerReconexao = null;
      }
    });
    expect(resultado.timersAposRajada).toBe(1);
    expect(resultado.esperas).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  });

  test('reconexão: troca de canal, ignora callback do canal antigo e roda 1 sync ao SUBSCRIBED', async ({ page, mock }) => {
    const leiturasAntes = leiturasCompletas(mock);
    const r = await page.evaluate(async () => {
      const canalAntigo = WaveApp._realtimeChannel;
      const geracaoAntiga = WaveApp._realtimeGeracao;
      WaveApp._aoStatusRealtime('CHANNEL_ERROR');
      clearTimeout(WaveApp._realtimeTimerReconexao);
      WaveApp._realtimeTimerReconexao = null;
      await WaveApp._reinscreverRealtime();
      // CLOSED atrasado do canal antigo não pode disparar nova reinscrição
      WaveApp._aoStatusRealtime('CLOSED', geracaoAntiga);
      const timerAposCallbackAntigo = !!WaveApp._realtimeTimerReconexao;
      WaveApp._aoStatusRealtime('SUBSCRIBED');
      return {
        trocouCanal: !!WaveApp._realtimeChannel && WaveApp._realtimeChannel !== canalAntigo,
        timerAposCallbackAntigo,
        tentativas: WaveApp._realtimeTentativas,
        status: WaveApp._realtimeStatus
      };
    });
    // tentativas só zera depois de ~30 s estável (canal que "pisca" mantém o backoff)
    expect(r).toEqual({ trocouCanal: true, timerAposCallbackAntigo: false, tentativas: 1, status: 'SUBSCRIBED' });
    expect(await page.evaluate(() => !!WaveApp._realtimeTimerEstavel)).toBe(true);
    await expect.poll(() => leiturasCompletas(mock)).toBe(leiturasAntes + 1);
    await page.waitForTimeout(500);
    expect(leiturasCompletas(mock)).toBe(leiturasAntes + 1);
    expect(mock.writes).toEqual([]);
  });

  test('reconexão com formulário aberto: sync fica pendente e roda no próximo auto-sync', async ({ page, mock }) => {
    await page.getByRole('button', { name: 'Novo Membro' }).click();
    await expect(page.locator('#member-main-form')).toBeVisible();
    const leiturasAntes = leiturasCompletas(mock);

    await page.evaluate(() => {
      WaveApp._aoStatusRealtime('CHANNEL_ERROR');
      clearTimeout(WaveApp._realtimeTimerReconexao);
      WaveApp._realtimeTimerReconexao = null;
      WaveApp._aoStatusRealtime('SUBSCRIBED');
    });
    await page.waitForTimeout(500);
    expect(leiturasCompletas(mock)).toBe(leiturasAntes);
    expect(await page.evaluate(() => WaveApp._syncPendente)).toBe(true);

    // Fecha o formulário e o próximo auto-sync roda mesmo dentro do throttle
    await page.evaluate(() => {
      document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
      WaveApp._ultimoAutoSync = Date.now();
      WaveApp._autoSyncSeNecessario();
    });
    await expect.poll(() => leiturasCompletas(mock)).toBe(leiturasAntes + 1);
    expect(await page.evaluate(() => WaveApp._syncPendente)).toBe(false);
  });

  test('aba volta ao foco com canal caído: reconecta e sincroniza', async ({ page, mock }) => {
    const leiturasAntes = leiturasCompletas(mock);
    const r = await page.evaluate(async () => {
      const canalAntigo = WaveApp._realtimeChannel;
      WaveApp._aoStatusRealtime('TIMED_OUT'); // agenda reinscrição em 1 s
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(res => setTimeout(res, 100));
      return {
        timerCancelado: !WaveApp._realtimeTimerReconexao,
        trocouCanal: !!WaveApp._realtimeChannel && WaveApp._realtimeChannel !== canalAntigo
      };
    });
    expect(r).toEqual({ timerCancelado: true, trocouCanal: true });

    await page.evaluate(() => WaveApp._aoStatusRealtime('SUBSCRIBED'));
    await expect.poll(() => leiturasCompletas(mock)).toBe(leiturasAntes + 1);
  });

  test('aba volta ao foco com canal ativo: respeita o throttle do auto-sync', async ({ page, mock }) => {
    const leiturasAntes = leiturasCompletas(mock);
    const canalMudou = await page.evaluate(async () => {
      const canal = WaveApp._realtimeChannel;
      WaveApp._aoStatusRealtime('SUBSCRIBED');
      WaveApp._ultimoAutoSync = Date.now();
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(res => setTimeout(res, 100));
      return WaveApp._realtimeChannel !== canal;
    });
    expect(canalMudou).toBe(false);
    await page.waitForTimeout(400);
    expect(leiturasCompletas(mock)).toBe(leiturasAntes);
  });

  test('canal piscando (SUBSCRIBED/CLOSED repetido) não gera tempestade de sync', async ({ page, mock }) => {
    const leiturasAntes = leiturasCompletas(mock);
    const r = await page.evaluate(() => {
      for (let i = 0; i < 5; i++) {
        WaveApp._aoStatusRealtime('CLOSED');
        clearTimeout(WaveApp._realtimeTimerReconexao);
        WaveApp._realtimeTimerReconexao = null;
        WaveApp._aoStatusRealtime('SUBSCRIBED');
      }
      return { tentativas: WaveApp._realtimeTentativas, pendente: WaveApp._syncPendente };
    });
    // backoff não zera a cada SUBSCRIBED; só a 1ª reconexão sincroniza (as demais ficam pendentes)
    expect(r).toEqual({ tentativas: 5, pendente: true });
    await page.waitForTimeout(500);
    expect(leiturasCompletas(mock) - leiturasAntes).toBeLessThanOrEqual(1);
  });

  test('logout para o Realtime e limpa timers', async ({ page }) => {
    const r = await page.evaluate(() => {
      WaveApp._aoStatusRealtime('CHANNEL_ERROR');
      WaveApp._receberEventoRealtime({ eventType: 'UPDATE', new: { id: 'pes-jose' }, old: {} });
      WaveApp.pararRealtimeMembros();
      return {
        canal: WaveApp._realtimeChannel,
        timerReconexao: WaveApp._realtimeTimerReconexao,
        timerLote: WaveApp._timerLoteRealtime,
        parado: WaveApp._realtimeParado
      };
    });
    expect(r).toEqual({ canal: null, timerReconexao: null, timerLote: null, parado: true });
  });
});
