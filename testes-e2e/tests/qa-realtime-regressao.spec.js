const { test, expect, abrirApp } = require('../support/fixtures');
const { IDS, NOMES, USUARIO_ADMIN, FOTO_FICTICIA } = require('../support/seed');

/* QA exploratório (feature/realtime-estavel): regressões de produção que os testes do
   implementador não cobrem. Websocket do Realtime é mudo na suíte: eventos entram por
   WaveApp._receberEventoRealtime e status por WaveApp._aoStatusRealtime. Dados 100% fictícios. */

const ESPERA_LOTE_MS = 900;
const leiturasCompletas = mock => mock.leituras('pessoas').filter(r => !r.query.id).length;
const buscasEmLote = mock => mock.leituras('pessoas').filter(r => r.query.id && r.query.id.startsWith('in.'));
const linhaDb = (mock, id) => mock.db.pessoas.find(p => p.id === id);
const toast = (page, texto) => page.locator('#toast-container .toast-notification', { hasText: texto });

function evento(tipo, id) {
  return tipo === 'DELETE'
    ? { eventType: 'DELETE', new: {}, old: { id } }
    : { eventType: tipo, new: { id }, old: tipo === 'UPDATE' ? { id } : {} };
}
async function enviarEventos(page, eventos) {
  await page.evaluate((evs) => { evs.forEach(e => WaveApp._receberEventoRealtime(e)); }, eventos);
}
async function espiarRenders(page) {
  await page.waitForTimeout(400);
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

function novaPessoa(id, nome, extra = {}) {
  return {
    id, nome, foto_url: null, whatsapp: '(44) 90000-9999', data_nascimento: '1999-01-01',
    data_ingresso: '2026-10-01', tipo_ingresso: 'Recepção', sexo: 'MASCULINO', rua: 'Rua Fictícia',
    numero: '1', complemento: null, bairro: 'Centro', cidade: 'Mandaguari', status: 'ATIVO',
    lider: NOMES.carlos, discipulador_id: IDS.carlos, e_lider: false, celulas_json: '[]',
    referencia_externa: false, consentimento_aceito: false, consentimento_aceito_em: null,
    criado_em: '2026-10-15T12:00:00.000Z', ...extra
  };
}

test.describe('QA (a) ficha aberta + UPDATE do mesmo membro', () => {
  test('ficha continua aberta, mostra o valor novo, sem replay de animação e mesma referência', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    await espiarRenders(page);
    await page.evaluate((id) => WavePages['admin-membros'].abrirDetalhes(id), IDS.jose);
    const sheet = page.locator('.modal-overlay.open .modal-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Jardim Esperança');

    linhaDb(mock, IDS.jose).bairro = 'Bairro QA Atualizado';
    await enviarEventos(page, [evento('UPDATE', IDS.jose)]);
    await expect(sheet).toContainText('Bairro QA Atualizado');
    await expect(sheet).toBeVisible();
    expect(await sheet.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    expect(await page.evaluate((id) =>
      WavePages['admin-membros']._membroDetalhes === WaveData.getMembroById(id), IDS.jose)).toBe(true);
    // foto não some (payload incompleto nunca é usado como dado)
    expect(await page.evaluate((id) => WaveData.getMembroById(id).foto, IDS.jose)).toBe(FOTO_FICTICIA);
    expect(mock.writes).toEqual([]);
  });

  test('ficha aberta + sync completo (auto-sync/reconexão) continua mostrando o valor atual', async ({ page, mock }) => {
    // Corrigido: syncSupabase trocava WaveData.membros por objetos novos e a ficha aberta
    // (_membroDetalhes) ficava com o objeto antigo; agora o sync mescla por id (Object.assign).
    await abrirApp(page, 'admin-membros');
    await page.evaluate((id) => WavePages['admin-membros'].abrirDetalhes(id), IDS.jose);
    const sheet = page.locator('.modal-overlay.open .modal-sheet');
    await expect(sheet).toBeVisible();

    linhaDb(mock, IDS.jose).bairro = 'Bairro Via Sync';
    await page.evaluate(() => { WaveApp._ultimoAutoSync = 0; WaveApp._autoSyncSeNecessario(); });
    await expect(page.locator('#membros-table-body')).toContainText('Bairro Via Sync');
    await expect(sheet).toContainText('Bairro Via Sync', { timeout: 2000 });
  });
});

test.describe('QA (b) formulário de edição aberto + UPDATE do mesmo membro', () => {
  test('campos digitados não resetam e o PATCH leva as edições sem reverter foto/consentimento', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    const linha = page.locator('#membros-table-body tr', { hasText: 'José Antônio' });
    await linha.getByTitle('Editar Discípulo').click();
    const form = page.locator('#member-main-form');
    await expect(form).toBeVisible();
    await page.locator('#form-membro-nome').fill('José Nome Editado QA');
    await form.locator('[name="bairro"]').fill('Bairro Digitado QA');

    // Outro admin altera foto e revoga/renova consentimento do MESMO membro
    const outro = linhaDb(mock, IDS.jose);
    outro.foto_url = 'data:image/png;base64,QUFB';
    outro.consentimento_aceito_em = '2026-10-15T10:00:00.000Z';
    outro.whatsapp = '(44) 91111-0000';
    await enviarEventos(page, [evento('UPDATE', IDS.jose)]);
    await page.waitForTimeout(ESPERA_LOTE_MS);

    await expect(page.locator('#form-membro-nome')).toHaveValue('José Nome Editado QA');
    await expect(form.locator('[name="bairro"]')).toHaveValue('Bairro Digitado QA');
    expect(mock.writes).toEqual([]);

    await form.getByRole('button', { name: 'Salvar Alterações' }).click();
    await expect(page.locator('.toast-notification.success')).toContainText('atualizados com sucesso');

    const patches = mock.escritas('pessoas', 'PATCH').filter(w => w.query.id === `eq.${IDS.jose}`);
    expect(patches).toHaveLength(1);
    const body = patches[0].body;
    expect(body.nome).toBe('José Nome Editado QA');
    expect(body.bairro).toBe('Bairro Digitado QA');
    expect(body.foto_url, 'foto do outro admin não pode ser revertida').toBe('data:image/png;base64,QUFB');
    expect(body.consentimento_aceito).toBe(true);
    expect(body.consentimento_aceito_em).toBe('2026-10-15T10:00:00.000Z');
    expect(body.lider).toBe(NOMES.carlos);
    expect(body.discipulador_id).toBe(IDS.carlos);
    // whatsapp estava no formulário (valor pré-carregado): last-write-wins do form é o esperado
  });
});

test.describe('QA (c) INSERT no dashboard', () => {
  test('contadores atualizam e aparece 1 toast "Novo cadastro"', async ({ page, mock }) => {
    await abrirApp(page, 'admin');
    await espiarRenders(page);
    const valor = () => page.locator('.card-stat-box.membros .card-stat-box-value').innerText();
    const antes = Number(await valor());

    mock.db.pessoas.push(novaPessoa('pes-qa-novo', 'Otávio Novo Fictício'));
    await enviarEventos(page, [evento('INSERT', 'pes-qa-novo'), evento('UPDATE', 'pes-qa-novo')]);
    await expect.poll(valor).toBe(String(antes + 1));
    await expect(toast(page, 'Novo cadastro')).toHaveCount(1);
    await expect(toast(page, 'Otávio Novo Fictício')).toHaveCount(1);
    expect(await renders(page)).toBe(1);
    expect(mock.writes).toEqual([]);
  });

  test('INSERT de referência externa não altera contadores nem expõe o nome em toast', async ({ page, mock }) => {
    // Corrigido: o toast "Novo cadastro" agora ignora referencia_externa.
    await abrirApp(page, 'admin');
    const valor = () => page.locator('.card-stat-box.membros .card-stat-box-value').innerText();
    const antes = await valor();
    mock.db.pessoas.push(novaPessoa('pes-qa-ext', 'Pastor Externo Fictício', { referencia_externa: true, e_lider: true }));
    await enviarEventos(page, [evento('INSERT', 'pes-qa-ext')]);
    await page.waitForFunction(() => !!WaveData.getMembroById('pes-qa-ext'));
    await page.waitForTimeout(300);
    expect(await valor()).toBe(antes);
    // contagem imediata: toHaveCount(0) re-tentaria até o toast de sucesso sumir sozinho (~4 s)
    expect(await toast(page, 'Pastor Externo Fictício').count()).toBe(0);
  });
});

test.describe('QA (d) /cadastro público sem sessão', () => {
  test.use({ sessaoAdmin: false });

  test('dropdown de líderes populado após carregar (config lento), sem referência externa e zero escritas', async ({ page, mock }) => {
    mock.atrasoConfigMs = 600;
    await page.goto('/#cadastro-publico');
    await page.waitForFunction(() => window.WaveData && WaveData.membros.length > 0);
    await page.locator('#cp-sexo').selectOption('MASCULINO');
    const opcoes = page.locator('#cp-lider-select option');
    await expect(opcoes.filter({ hasText: NOMES.paulo })).toHaveCount(1);
    await expect(opcoes.filter({ hasText: NOMES.carlos })).toHaveCount(1);
    await expect(opcoes.filter({ hasText: NOMES.silvano })).toHaveCount(0);
    await expect(opcoes.filter({ hasText: NOMES.ana })).toHaveCount(0); // regra de gênero
    await page.waitForTimeout(1200);
    expect(mock.writes).toEqual([]);
    expect(leiturasCompletas(mock)).toBe(1);
    expect(await page.evaluate(() => !!WaveApp._realtimeChannel)).toBe(false);
  });
});

test.describe('QA (e) login → logout → login', () => {
  test.use({ sessaoAdmin: false });

  test('Realtime/autosync iniciam 1 vez, logout limpa tudo e novo login funciona', async ({ page, mock }) => {
    await page.goto('/#login');
    await expect(page.getByRole('heading', { name: 'Entrar na Conta' })).toBeVisible();
    await page.waitForFunction(() => !!window.supabaseClient);
    await page.evaluate(() => {
      window.__canais = 0;
      const orig = window.supabaseClient.channel.bind(window.supabaseClient);
      window.supabaseClient.channel = (...a) => { window.__canais++; return orig(...a); };
      window.__listenersVis = 0;
      const add = document.addEventListener.bind(document);
      document.addEventListener = (tipo, ...r) => { if (tipo === 'visibilitychange') window.__listenersVis++; return add(tipo, ...r); };
    });

    const entrar = async () => {
      await page.locator('#login-email').fill(USUARIO_ADMIN.email);
      await page.locator('#login-senha').fill(USUARIO_ADMIN.senha_hash);
      await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
      await expect(page).toHaveURL(/#boas-vindas/);
    };

    await entrar();
    await page.waitForTimeout(500);
    let st = await page.evaluate(() => ({
      canais: window.__canais, vis: window.__listenersVis, canal: !!WaveApp._realtimeChannel,
      parado: WaveApp._realtimeParado, autosync: WaveApp._autoSyncAtivo
    }));
    expect(st).toEqual({ canais: 1, vis: 1, canal: true, parado: false, autosync: true });

    await page.evaluate(() => WaveAuth.logout());
    await expect(page).toHaveURL(/#login/);
    await page.waitForTimeout(300);
    const pos = await page.evaluate(() => ({
      canal: WaveApp._realtimeChannel, lote: WaveApp._timerLoteRealtime,
      reconexao: WaveApp._realtimeTimerReconexao, parado: WaveApp._realtimeParado,
      canaisNoClient: window.supabaseClient.getChannels().length
    }));
    expect(pos).toEqual({ canal: null, lote: null, reconexao: null, parado: true, canaisNoClient: 0 });

    // Status tardios após logout são ignorados (eventos são filtrados no callback do canal
    // por geração/_realtimeParado — chamar _receberEventoRealtime direto contorna essa guarda)
    const leiturasAntes = mock.requests.filter(r => r.table === 'pessoas').length;
    await page.evaluate(() => {
      WaveApp._aoStatusRealtime('CLOSED');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(ESPERA_LOTE_MS);
    expect(await page.evaluate(() => [WaveApp._timerLoteRealtime, WaveApp._realtimeTimerReconexao])).toEqual([null, null]);
    expect(mock.requests.filter(r => r.table === 'pessoas').length - leiturasAntes).toBe(0);

    await expect(page.getByRole('heading', { name: 'Entrar na Conta' })).toBeVisible();
    await entrar();
    await page.waitForTimeout(500);
    st = await page.evaluate(() => ({
      canais: window.__canais, vis: window.__listenersVis, canal: !!WaveApp._realtimeChannel,
      parado: WaveApp._realtimeParado, canaisNoClient: window.supabaseClient.getChannels().length
    }));
    expect(st).toEqual({ canais: 2, vis: 1, canal: true, parado: false, canaisNoClient: 1 });
    expect(mock.writes).toEqual([]);
  });
});

test.describe('QA (f) CLOSED → reconexão → SUBSCRIBED', () => {
  test('timer real reinscreve e SUBSCRIBED dispara exatamente 1 sync completo', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    await page.waitForFunction(() => !!WaveApp._realtimeChannel);
    await page.waitForTimeout(400);
    const leiturasAntes = leiturasCompletas(mock);
    const canalAntigo = await page.evaluateHandle(() => WaveApp._realtimeChannel);

    await page.evaluate(() => WaveApp._aoStatusRealtime('CLOSED'));
    // espera de 1 s do backoff, depois canal novo
    await page.waitForFunction((antigo) => !!WaveApp._realtimeChannel && WaveApp._realtimeChannel !== antigo, canalAntigo, { timeout: 4000 });
    expect(await page.evaluate(() => WaveApp._realtimeTimerReconexao)).toBeNull();
    expect(await page.evaluate(() => window.supabaseClient.getChannels().length)).toBe(1);

    await page.evaluate(() => WaveApp._aoStatusRealtime('SUBSCRIBED'));
    await page.evaluate(() => WaveApp._aoStatusRealtime('SUBSCRIBED')); // SUBSCRIBED repetido não re-sincroniza
    await expect.poll(() => leiturasCompletas(mock)).toBe(leiturasAntes + 1);
    await page.waitForTimeout(1500);
    expect(leiturasCompletas(mock)).toBe(leiturasAntes + 1);
    expect(await page.evaluate(() => WaveApp._realtimeTimerReconexao)).toBeNull();
    expect(mock.writes).toEqual([]);
  });

  test('com formulário aberto o sync fica devendo e roda no próximo _autoSyncSeNecessario após fechar', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    await page.waitForFunction(() => !!WaveApp._realtimeChannel);
    const linha = page.locator('#membros-table-body tr', { hasText: 'José Antônio' });
    await linha.getByTitle('Editar Discípulo').click();
    await expect(page.locator('#member-main-form')).toBeVisible();
    await page.locator('#form-membro-nome').fill('Digitando QA');
    const leiturasAntes = leiturasCompletas(mock);

    await page.evaluate(() => WaveApp._aoStatusRealtime('CLOSED'));
    await page.waitForFunction(() => !!WaveApp._realtimeChannel && WaveApp._realtimeStatus === null && !WaveApp._realtimeTimerReconexao, null, { timeout: 4000 });
    await page.evaluate(() => WaveApp._aoStatusRealtime('SUBSCRIBED'));
    await page.waitForTimeout(500);
    expect(leiturasCompletas(mock)).toBe(leiturasAntes);
    await expect(page.locator('#form-membro-nome')).toHaveValue('Digitando QA');

    // Com formulário ainda aberto, auto-sync não roda
    await page.evaluate(() => WaveApp._autoSyncSeNecessario());
    await page.waitForTimeout(300);
    expect(leiturasCompletas(mock)).toBe(leiturasAntes);

    await page.evaluate(() => WavePages['admin-membros'].fecharForm());
    await page.evaluate(() => { WaveApp._ultimoAutoSync = Date.now(); WaveApp._autoSyncSeNecessario(); });
    await expect.poll(() => leiturasCompletas(mock)).toBe(leiturasAntes + 1);
    expect(await page.evaluate(() => WaveApp._syncPendente)).toBe(false);
    expect(mock.writes).toEqual([]);
  });
});

test.describe('QA (g) rajada de 50 eventos', () => {
  test('1 redesenho e 1 busca em lote', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    await espiarRenders(page);
    const ids = mock.db.pessoas.map(p => p.id);
    mock.db.pessoas.forEach((p, i) => { p.complemento = `Compl QA ${i}`; });
    const eventos = [];
    for (let i = 0; i < 50; i++) eventos.push(evento(i % 3 === 0 ? 'INSERT' : 'UPDATE', ids[i % ids.length]));
    await enviarEventos(page, eventos);
    await page.waitForTimeout(ESPERA_LOTE_MS + 300);

    expect(buscasEmLote(mock)).toHaveLength(1);
    expect(mock.leituras('pessoas').filter(r => r.query.id && r.query.id.startsWith('eq.'))).toHaveLength(0);
    expect(await renders(page)).toBe(1);
    expect(await page.evaluate(() => WaveData.membros.length)).toBe(ids.length); // sem duplicar
    expect(await toast(page, 'Novo cadastro').count()).toBe(0); // ids já existentes (contagem imediata)
    expect(mock.writes).toEqual([]);
  });
});

test.describe('QA (h) visibilitychange com canal saudável', () => {
  test('no máximo 1 sync (throttle vencido) e sem reinscrição em 3 trocas de aba', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    await page.waitForFunction(() => !!WaveApp._realtimeChannel);
    await page.waitForTimeout(400);
    const leiturasAntes = leiturasCompletas(mock);
    const mudou = await page.evaluate(async () => {
      const canal = WaveApp._realtimeChannel;
      const ger = WaveApp._realtimeGeracao;
      WaveApp._aoStatusRealtime('SUBSCRIBED');
      WaveApp._ultimoAutoSync = 0; // throttle vencido
      for (let i = 0; i < 3; i++) document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(r => setTimeout(r, 200));
      return { canal: WaveApp._realtimeChannel !== canal, ger: WaveApp._realtimeGeracao !== ger };
    });
    expect(mudou).toEqual({ canal: false, ger: false });
    await expect.poll(() => leiturasCompletas(mock)).toBe(leiturasAntes + 1);
    await page.waitForTimeout(500);
    expect(leiturasCompletas(mock)).toBe(leiturasAntes + 1);
    expect(mock.writes).toEqual([]);
  });
});
