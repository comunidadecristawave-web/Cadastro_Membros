const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const base = require('@playwright/test');
const { test, expect, abrirApp } = require('../support/fixtures');
const { NOMES, IDS, buildSeed } = require('../support/seed');
const G = require('../../versao-nova/js/geocodificacao.js');

/* Bloco "Mapa das células" do painel (plan-mapa-celulas). Uma verificação por linha da
   I/O Matrix + critérios de aceite. MapLibre é o stub de support/maplibre-stub.js (sem WebGL);
   Nominatim é o stub do fixture (mock.nominatim). Endereços 100% fictícios. */

const TABELA = 'geocodificacao_enderecos';
const LIDERES = ['paulo', 'carlos', 'sergio', 'ana', 'juliana'];
const ESPERA_GEO = { timeout: 15000 };
const CENTRO = `${G.CENTRO_MANDAGUARI.lat},${G.CENTRO_MANDAGUARI.lng}`;

const pinos = page => page.locator('.mapa-celulas-area .mapa-celulas-pino');
const contador = page => page.locator('#mapa-celulas-contador');
const canvas = page => page.locator('.mapa-celulas-canvas');

/**
 * Deixa só os líderes pedidos como líderes ativos, cada um com seu endereço e N células
 * residenciais (ou células com endereço próprio via `outros`). Os demais viram não líderes.
 */
function definirCelulas(mock, defs) {
  LIDERES.forEach(chave => {
    const p = mock.db.pessoas.find(x => x.id === IDS[chave]);
    const def = defs[chave];
    if (!def) {
      p.e_lider = false;
      p.celulas_json = '[]';
      return;
    }
    p.e_lider = true;
    p.rua = def.rua ?? '';
    p.numero = def.numero ?? '';
    p.bairro = def.bairro ?? '';
    p.cidade = def.cidade ?? 'Mandaguari';
    const celulas = [];
    const n = def.celulas ?? 1;
    const nLid = def.lideranca ?? 0;
    for (let i = 0; i < n + nLid; i++) {
      celulas.push({
        id: `cel-${chave}-${i + 1}`, finalidade: i < n ? 'Evangelística' : 'Liderança', faixaEtaria: ['Adulto'],
        diaSemana: 'Quarta', horario: '20:00', tipoEndereco: 'residencial',
        rua: '', numero: '', bairro: '', cidade: 'Mandaguari', complemento: ''
      });
    }
    (def.outros || []).forEach((end, i) => {
      celulas.push({
        id: `cel-${chave}-outro-${i + 1}`, finalidade: 'Evangelística', faixaEtaria: ['Jovem Adulto'],
        diaSemana: 'Sexta', horario: '19:30', tipoEndereco: 'outro',
        rua: end.rua || '', numero: end.numero || '', bairro: end.bairro || '', cidade: end.cidade || '', complemento: ''
      });
    });
    p.celulas_json = JSON.stringify(celulas);
  });
}

function gravarNaTabela(mock, end, lat, lng) {
  if (!mock.db[TABELA]) mock.db[TABELA] = [];
  mock.db[TABELA].push({ endereco_chave: G.chaveEndereco(end), lat, lng, encontrado: true, atualizado_em: new Date().toISOString() });
}

function resultado(lat, lng, extra = {}) {
  return [{ lat: String(lat), lon: String(lng), addresstype: 'building', category: 'building', address: { city: 'Mandaguari' }, ...extra }];
}

const END = {
  a: { rua: 'Rua das Hortênsias Fictícias', numero: '120', bairro: 'Jardim Ficção', cidade: 'Mandaguari' },
  b: { rua: 'Avenida Imaginária', numero: '45', bairro: 'Vila Inventada', cidade: 'Mandaguari' },
  c: { rua: 'Rua Faz de Conta', numero: '9', bairro: 'Parque Teste', cidade: 'Mandaguari' }
};

async function abrirPainel(page) {
  await abrirApp(page, 'admin');
  await expect(page.locator('.mapa-celulas-bloco')).toBeVisible();
}

// Linha "Escrita isolada" da matriz + LGPD, conferida ao fim de TODO teste desta suíte:
// nenhuma escrita fora da tabela nova e nada de nome/telefone do seed no Nominatim ou na tabela.
async function conferirEscritaIsolada({ mock }) {
  expect(mock.writes.filter(w => w.table !== TABELA), 'nenhuma escrita fora de geocodificacao_enderecos').toEqual([]);
  const enviado = JSON.stringify([mock.consultasNominatim.map(decodeURIComponent), mock.writes]);
  const seed = buildSeed().pessoas;
  for (const p of seed) {
    expect(enviado.includes(p.nome), 'nome do cadastro não pode ir ao Nominatim nem à tabela').toBe(false);
    expect(enviado.includes(p.whatsapp), 'telefone não pode ir ao Nominatim nem à tabela').toBe(false);
  }
}

test.describe('Mapa das células — I/O Matrix', () => {
  test.afterEach(conferirEscritaIsolada);
  test('Normal: 3 células (2 masc., 1 fem.) com 3 pinos nas cores da legenda, centrado em Mandaguari', async ({ page, mock }) => {
    definirCelulas(mock, { paulo: END.a, carlos: END.b, ana: END.c });
    gravarNaTabela(mock, END.a, -23.541, -51.672);
    gravarNaTabela(mock, END.b, -23.552, -51.665);
    gravarNaTabela(mock, END.c, -23.546, -51.680);
    await abrirPainel(page);

    await expect(pinos(page)).toHaveCount(3);
    await expect(pinos(page).and(page.locator('[data-sexo="MASCULINO"]'))).toHaveCount(2);
    await expect(pinos(page).and(page.locator('[data-sexo="FEMININO"]'))).toHaveCount(1);
    await expect(canvas(page)).toHaveAttribute('data-centro', CENTRO);

    const cor = sel => page.locator(sel).first().evaluate(el => getComputedStyle(el).backgroundColor);
    expect(await cor('.mapa-celulas-pino[data-sexo="MASCULINO"]')).toBe(await cor('.mapa-celulas-ponto[data-sexo="MASCULINO"]'));
    expect(await cor('.mapa-celulas-pino[data-sexo="FEMININO"]')).toBe(await cor('.mapa-celulas-ponto[data-sexo="FEMININO"]'));
    expect(await cor('.mapa-celulas-ponto[data-sexo="MASCULINO"]')).not.toBe(await cor('.mapa-celulas-ponto[data-sexo="FEMININO"]'));
    await expect(contador(page)).toHaveText('');
  });

  test('Já gravado: pino na posição da tabela e nenhuma requisição ao Nominatim', async ({ page, mock }) => {
    definirCelulas(mock, { sergio: END.a });
    gravarNaTabela(mock, END.a, -23.5401, -51.6602);
    await abrirPainel(page);
    const pino = pinos(page);
    await expect(pino).toHaveCount(1);
    await expect(pino).toHaveAttribute('data-lat', '-23.5401');
    await expect(pino).toHaveAttribute('data-lng', '-51.6602');
    await page.waitForTimeout(1500);
    expect(mock.consultasNominatim).toEqual([]);
    expect(mock.leituras(TABELA)).toHaveLength(1); // leitura única da tabela inteira
    expect(mock.writes).toEqual([]);
  });

  test('Novo: geocodifica em segundo plano, sem indicador, faz upsert e o pino aparece', async ({ page, mock }) => {
    definirCelulas(mock, { sergio: END.a });
    mock.nominatim = () => resultado(-23.5433, -51.6655);
    await abrirPainel(page);
    await expect(page.locator('.mapa-celulas-bloco')).not.toContainText(/localizando|carregando/i);
    await expect(pinos(page)).toHaveCount(1, ESPERA_GEO);
    await expect(pinos(page)).toHaveAttribute('data-lat', '-23.5433');

    await expect.poll(() => mock.escritas(TABELA, 'POST').length).toBe(1);
    const w = mock.escritas(TABELA, 'POST')[0];
    expect(w.query.on_conflict).toBe('endereco_chave');
    expect(w.body[0]).toMatchObject({ endereco_chave: G.chaveEndereco(END.a), lat: -23.5433, lng: -51.6655, encontrado: true });
    expect(typeof w.body[0].atualizado_em).toBe('string');
    expect(mock.db[TABELA]).toHaveLength(1);

    // Requisição levou só endereço (rua, número, cidade, UF), limitada à cidade
    const q = new URL(mock.consultasNominatim[0]).searchParams;
    expect(q.get('street')).toBe('120 Rua das Hortênsias Fictícias');
    expect(q.get('city')).toBe('Mandaguari');
    expect(q.get('state')).toBe('Paraná');
    expect(q.get('countrycodes')).toBe('br');
    expect(q.get('bounded')).toBe('1');
    expect(q.get('viewbox')).toBeTruthy();
  });

  test('Novo com tabela ausente: pino aparece, nada é gravado e sem toast', async ({ page, mock }) => {
    definirCelulas(mock, { sergio: END.a });
    mock.falhar({ method: 'GET', table: TABELA, status: 404, body: { code: 'PGRST205', message: 'Could not find the table' } });
    mock.nominatim = () => resultado(-23.5433, -51.6655);
    await abrirPainel(page);
    await expect(pinos(page)).toHaveCount(1, ESPERA_GEO);
    await page.waitForTimeout(500);
    expect(mock.escritas(TABELA)).toEqual([]);
    expect(await page.locator('.toast-notification').count()).toBe(0);
  });

  test('Novo com gravação falhando: pino aparece e sem toast', async ({ page, mock }) => {
    definirCelulas(mock, { sergio: END.a, ana: END.b });
    mock.falhar({ method: 'POST', table: TABELA, status: 500 });
    mock.nominatim = (p) => (p.get('street') || '').includes('Imaginária') ? resultado(-23.55, -51.66) : resultado(-23.54, -51.67);
    await abrirPainel(page);
    await expect(pinos(page)).toHaveCount(2, ESPERA_GEO);
    expect(await page.locator('.toast-notification').count()).toBe(0);
    // parou de tentar após a 1ª falha (a falha simulada não entra em mock.writes)
    expect(mock.requests.filter(r => r.method === 'POST' && r.table === TABELA)).toHaveLength(1);
  });

  test('Pós-pré-carga: tudo gravado → todos os pinos de uma vez e nenhuma consulta ao Nominatim', async ({ page, mock }) => {
    const ends = {
      paulo: END.a, carlos: END.b, ana: END.c,
      sergio: { rua: 'Rua Sem Fim Fictícia', numero: '1', bairro: 'Centro', cidade: 'Mandaguari' },
      juliana: { rua: 'Rua do Exemplo', numero: '77', bairro: 'Centro', cidade: 'Mandaguari' }
    };
    definirCelulas(mock, {
      paulo: { ...ends.paulo, celulas: 2 }, carlos: { ...ends.carlos, celulas: 2 }, ana: { ...ends.ana, celulas: 2 },
      sergio: ends.sergio, juliana: ends.juliana
    });
    Object.values(ends).forEach((e, i) => gravarNaTabela(mock, e, -23.54 - i * 0.003, -51.67 + i * 0.002));
    await abrirPainel(page);
    await expect(pinos(page)).toHaveCount(8);
    await page.waitForTimeout(1500);
    expect(mock.consultasNominatim).toEqual([]);
    expect(mock.writes).toEqual([]);
  });

  test('Alias: "jandaia" conta como Jandaia do Sul no seletor e na busca', async ({ page, mock }) => {
    definirCelulas(mock, {
      paulo: END.a,
      carlos: { rua: 'Rua Norte Fictícia', numero: '10', bairro: 'Centro', cidade: 'Jandaia do Sul' },
      ana: { rua: 'Rua Sul Fictícia', numero: '20', bairro: 'Centro', cidade: 'jandaia' }
    });
    gravarNaTabela(mock, END.a, -23.54, -51.67);
    mock.nominatim = (p) => {
      if (p.get('street')) return resultado(-23.60, -51.64, { address: { town: 'Jandaia do Sul' } });
      if (p.get('city') && !p.get('street')) return [{ lat: '-23.6031', lon: '-51.6434', addresstype: 'town', address: { town: 'Jandaia do Sul' } }];
      return [];
    };
    await abrirPainel(page);
    const seletor = page.locator('#mapa-celulas-cidade');
    await expect(seletor.locator('option')).toHaveText(['Mandaguari', 'Jandaia do Sul']);
    await expect(seletor).toHaveValue('mandaguari');

    await expect.poll(() => mock.consultasNominatim.length, ESPERA_GEO).toBeGreaterThanOrEqual(2);
    const cidades = mock.consultasNominatim.map(u => new URL(u).searchParams.get('city'));
    expect(cidades.every(c => c === 'Jandaia do Sul')).toBe(true);
    expect(mock.consultasNominatim.every(u => !new URL(u).searchParams.get('viewbox'))).toBe(true);

    await seletor.selectOption('jandaia do sul');
    await expect(pinos(page)).toHaveCount(2, ESPERA_GEO);
    await expect(canvas(page)).toHaveAttribute('data-centro', '-23.6031,-51.6434', ESPERA_GEO);
  });

  test('Endereço mudou: chave nova → geocodifica e grava de novo, pino muda de lugar', async ({ page, mock }) => {
    definirCelulas(mock, { sergio: END.a });
    gravarNaTabela(mock, END.a, -23.5401, -51.6602);
    mock.nominatim = () => resultado(-23.5555, -51.6777);
    await abrirPainel(page);
    await expect(pinos(page)).toHaveAttribute('data-lat', '-23.5401');

    const p = mock.db.pessoas.find(x => x.id === IDS.sergio);
    p.rua = 'Rua Nova Fictícia';
    p.numero = '300';
    await page.evaluate((id) => WaveApp._receberEventoRealtime({ eventType: 'UPDATE', new: { id }, old: { id } }), IDS.sergio);
    await expect(pinos(page)).toHaveAttribute('data-lat', '-23.5555', ESPERA_GEO);
    await expect.poll(() => mock.escritas(TABELA, 'POST').length).toBe(1);
    expect(mock.escritas(TABELA, 'POST')[0].body[0].endereco_chave)
      .toBe(G.chaveEndereco({ rua: 'Rua Nova Fictícia', numero: '300', bairro: END.a.bairro, cidade: 'Mandaguari' }));
  });

  test('Fallback rua: número não encontrado, rua sim → pino normal na rua', async ({ page, mock }) => {
    definirCelulas(mock, { ana: END.b });
    mock.nominatim = (p) => {
      const s = p.get('street') || '';
      if (/^\d/.test(s)) return [];
      if (s) return resultado(-23.5512, -51.6699, { addresstype: 'road', category: 'highway' });
      return [];
    };
    await abrirPainel(page);
    await expect(pinos(page)).toHaveCount(1, ESPERA_GEO);
    await expect(pinos(page)).toHaveAttribute('data-lat', '-23.5512');
    await expect(pinos(page)).not.toHaveClass(/aproximad/);
    expect(mock.consultasNominatim).toHaveLength(2);
    await expect(contador(page)).toHaveText('');
  });

  test('Fallback bairro: rua não encontrada, bairro sim → pino normal no bairro', async ({ page, mock }) => {
    definirCelulas(mock, { ana: END.b });
    mock.nominatim = (p) => p.get('q') ? resultado(-23.5488, -51.6611, { addresstype: 'suburb' }) : [];
    await abrirPainel(page);
    await expect(pinos(page)).toHaveCount(1, ESPERA_GEO);
    await expect(pinos(page)).toHaveAttribute('data-lng', '-51.6611');
    expect(mock.consultasNominatim).toHaveLength(3);
    expect(new URL(mock.consultasNominatim[2]).searchParams.get('q')).toBe('Vila Inventada, Mandaguari, Paraná');
  });

  test('Sem posição: endereço vazio e nada encontrado (resultado = cidade inteira é rejeitado) → contador', async ({ page, mock }) => {
    definirCelulas(mock, {
      carlos: { rua: '', numero: '', bairro: '', cidade: 'Mandaguari' },
      ana: END.c,
      sergio: END.a
    });
    gravarNaTabela(mock, END.a, -23.54, -51.67);
    // Para END.c o Nominatim só devolve a própria cidade (pino falso no centro) → rejeitado
    mock.nominatim = () => [{ lat: '-23.5478', lon: '-51.6708', addresstype: 'city', address: { city: 'Mandaguari' } }];
    await abrirPainel(page);
    await expect(contador(page)).toHaveText('2 células sem localização', ESPERA_GEO);
    await expect(pinos(page)).toHaveCount(1);
    await expect.poll(() => mock.escritas(TABELA, 'POST').length).toBe(1);
    expect(mock.escritas(TABELA, 'POST')[0].body[0]).toMatchObject({ endereco_chave: G.chaveEndereco(END.c), encontrado: false, lat: null, lng: null });
    expect(mock.consultasNominatim).toHaveLength(3); // só grava "não encontrado" depois das 3 respostas
  });

  test('"Não encontrado" gravado há menos de 30 dias não consulta; mais antigo tenta de novo', async ({ page, mock }) => {
    definirCelulas(mock, { ana: END.c, sergio: END.a });
    mock.db[TABELA] = [
      { endereco_chave: G.chaveEndereco(END.c), lat: null, lng: null, encontrado: false, atualizado_em: new Date(Date.now() - 5 * 86400000).toISOString() },
      { endereco_chave: G.chaveEndereco(END.a), lat: null, lng: null, encontrado: false, atualizado_em: new Date(Date.now() - 31 * 86400000).toISOString() }
    ];
    mock.nominatim = () => resultado(-23.5444, -51.6644);
    await abrirPainel(page);
    await expect(pinos(page)).toHaveCount(1, ESPERA_GEO);
    await expect(contador(page)).toHaveText('1 célula sem localização');
    expect(mock.consultasNominatim.every(u => new URL(u).searchParams.get('street').includes('Hortênsias'))).toBe(true);
    await expect.poll(() => mock.escritas(TABELA, 'POST').length).toBe(1);
    expect(mock.db[TABELA].find(l => l.endereco_chave === G.chaveEndereco(END.a))).toMatchObject({ encontrado: true, lat: -23.5444 });
  });

  test('Mesmo ponto: 2 células no mesmo endereço → 2 pinos levemente deslocados', async ({ page, mock }) => {
    definirCelulas(mock, { paulo: { ...END.a, celulas: 2 } });
    gravarNaTabela(mock, END.a, -23.54, -51.67);
    await abrirPainel(page);
    await expect(pinos(page)).toHaveCount(2);
    const desl = await pinos(page).evaluateAll(els => els.map(e => e.dataset.deslocamento));
    expect(desl[0]).not.toBe(desl[1]);
    expect(desl).not.toContain('0,0');
  });

  test('Filtro de tipo: Todas / Evangelísticas / Liderança troca pinos e contador sem recriar o mapa', async ({ page, mock }) => {
    // paulo: 1 evangelística + 1 liderança; ana: 1 evangelística; carlos: 1 liderança sem endereço
    definirCelulas(mock, { paulo: { ...END.a, lideranca: 1 }, ana: END.b, carlos: { rua: '', bairro: '', celulas: 0, lideranca: 1 } });
    gravarNaTabela(mock, END.a, -23.54, -51.67);
    gravarNaTabela(mock, END.b, -23.55, -51.66);
    await abrirPainel(page);

    const chip = nome => page.locator('.mapa-celulas-filtro').getByRole('button', { name: nome, exact: true });
    await expect(chip('Todas')).toHaveAttribute('aria-pressed', 'true');
    await expect(pinos(page)).toHaveCount(3);
    await expect(contador(page)).toHaveText('1 célula sem localização');

    await chip('Evangelísticas').click();
    await expect(chip('Evangelísticas')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip('Todas')).toHaveAttribute('aria-pressed', 'false');
    await expect(pinos(page)).toHaveCount(2);
    await expect(contador(page)).toHaveText('');

    await chip('Liderança').click();
    await expect(pinos(page)).toHaveCount(1);
    await expect(contador(page)).toHaveText('1 célula sem localização');
    await pinos(page).first().click();
    await expect(page.locator('.mapa-celulas-balao')).toContainText('Liderança');

    // Render de fundo (Realtime) mantém o filtro escolhido e o mesmo mapa
    await page.evaluate((id) => WaveApp._receberEventoRealtime({ eventType: 'UPDATE', new: { id }, old: { id } }), IDS.jose);
    await page.waitForTimeout(200);
    await expect(chip('Liderança')).toHaveAttribute('aria-pressed', 'true');
    await expect(pinos(page)).toHaveCount(1);
    expect(await page.evaluate(() => window.__mapasCriados)).toBe(1);

    await chip('Todas').click();
    await expect(pinos(page)).toHaveCount(3);
  });

  test('Clique: balão com líder, dia, horário, faixa etária e bairro + "Abrir ficha"', async ({ page, mock }) => {
    definirCelulas(mock, { ana: END.b });
    gravarNaTabela(mock, END.b, -23.55, -51.66);
    await abrirPainel(page);
    await pinos(page).first().click();
    const balao = page.locator('.mapa-celulas-balao');
    await expect(balao).toBeVisible();
    await expect(balao.locator('.mapa-celulas-balao-nome')).toHaveText(NOMES.ana);
    await expect(balao).toContainText('Quarta');
    await expect(balao).toContainText('20:00');
    await expect(balao).toContainText('Adulto');
    await expect(balao).toContainText('Vila Inventada');
    await expect(balao.getByRole('button', { name: 'Abrir ficha' })).toBeVisible();
  });

  test('Balão não interpreta HTML vindo do cadastro', async ({ page, mock }) => {
    definirCelulas(mock, { ana: { ...END.b, bairro: '<img src=x onerror="window.__xss=1">' } });
    gravarNaTabela(mock, { ...END.b, bairro: '<img src=x onerror="window.__xss=1">' }, -23.55, -51.66);
    await abrirPainel(page);
    await pinos(page).first().click();
    await expect(page.locator('.mapa-celulas-balao')).toContainText('<img src=x');
    expect(await page.locator('.mapa-celulas-balao img').count()).toBe(0);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });

  test('Abrir ficha: vai para Células com a ficha daquele líder aberta', async ({ page, mock }) => {
    definirCelulas(mock, { paulo: END.a, ana: END.b });
    gravarNaTabela(mock, END.a, -23.54, -51.67);
    gravarNaTabela(mock, END.b, -23.55, -51.66);
    await abrirPainel(page);
    await pinos(page).and(page.locator('[data-sexo="FEMININO"]')).click();
    await page.locator('.mapa-celulas-balao').getByRole('button', { name: 'Abrir ficha' }).click();
    await expect(page).toHaveURL(/#admin-lideres$/);
    const ficha = page.locator('.modal-overlay.open');
    await expect(ficha.locator('.sheet-title')).toHaveText('Ficha da Célula');
    await expect(ficha.locator('.ficha-hero-name')).toContainText(NOMES.ana);
    await expect(page.locator('.mapa-celulas-balao')).toHaveCount(0);
  });

  test('Realtime: mapa não é recriado, não perde centro/zoom e a rolagem não pula', async ({ page, mock }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    definirCelulas(mock, { paulo: END.a, ana: END.b });
    gravarNaTabela(mock, END.a, -23.54, -51.67);
    gravarNaTabela(mock, END.b, -23.55, -51.66);
    await abrirPainel(page);
    await expect(pinos(page)).toHaveCount(2);

    await page.evaluate(() => {
      window.__wrapAntes = document.querySelector('.mapa-celulas-mapa');
      WaveMapaCelulas._map.jumpTo({ center: [-51.60, -23.50], zoom: 15 }); // usuário moveu o mapa
    });
    await page.locator('.mapa-celulas-area').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 40));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const antes = await page.evaluate(() => window.scrollY);

    mock.db.pessoas.find(p => p.id === IDS.jose).bairro = 'Bairro Alterado Fictício';
    await page.evaluate((id) => WaveApp._receberEventoRealtime({ eventType: 'UPDATE', new: { id }, old: { id } }), IDS.jose);
    await page.waitForFunction((id) => WaveData.getMembroById(id).bairro === 'Bairro Alterado Fictício', IDS.jose);
    await page.waitForTimeout(200);

    const depois = await page.evaluate(() => ({
      scroll: window.scrollY,
      mapas: window.__mapasCriados,
      mesmoElemento: document.querySelector('.mapa-celulas-mapa') === window.__wrapAntes,
      centro: document.querySelector('.mapa-celulas-canvas').dataset.centro,
      zoom: document.querySelector('.mapa-celulas-canvas').dataset.zoom
    }));
    expect(depois.scroll).toBe(antes);
    expect(depois.mapas).toBe(1);
    expect(depois.mesmoElemento).toBe(true);
    expect(depois.centro).toBe('-23.5,-51.6');
    expect(depois.zoom).toBe('15');
    await expect(pinos(page)).toHaveCount(2);
  });

  test('Nominatim falha: célula conta como sem localização e "não encontrado" não é gravado', async ({ page, mock }) => {
    definirCelulas(mock, { ana: END.b });
    mock.nominatim = () => ({ status: 500, body: { error: 'falha simulada' } });
    await abrirPainel(page);
    await expect(contador(page)).toHaveText('1 célula sem localização', ESPERA_GEO);
    await page.waitForTimeout(300);
    expect(mock.escritas(TABELA)).toEqual([]);
    expect(await page.locator('.toast-notification').count()).toBe(0);
  });

  test('Nominatim 429: para a fila inteira (sem novas requisições) e nada é gravado', async ({ page, mock }) => {
    definirCelulas(mock, { ana: END.b, paulo: END.a, carlos: END.c });
    mock.nominatim = () => ({ status: 429, body: {} });
    await abrirPainel(page);
    await expect(contador(page)).toHaveText('3 células sem localização', ESPERA_GEO);
    expect(mock.consultasNominatim).toHaveLength(1);
    expect(mock.escritas(TABELA)).toEqual([]);
  });

  test('Uma cidade só: seletor escondido', async ({ page, mock }) => {
    definirCelulas(mock, { paulo: END.a, ana: END.b });
    await abrirPainel(page);
    await expect(page.locator('#mapa-celulas-cidade')).toHaveCount(0);
  });

  test('Várias cidades: Mandaguari selecionada; trocar recentraliza e mostra só as da outra', async ({ page, mock }) => {
    const outra = { rua: 'Rua Distante Fictícia', numero: '5', bairro: 'Centro', cidade: 'Apucarana' };
    definirCelulas(mock, { paulo: END.a, ana: END.b, carlos: outra });
    gravarNaTabela(mock, END.a, -23.54, -51.67);
    gravarNaTabela(mock, END.b, -23.55, -51.66);
    gravarNaTabela(mock, outra, -23.551, -51.461);
    mock.nominatim = (p) => p.get('city') === 'Apucarana' && !p.get('street')
      ? [{ lat: '-23.5508', lon: '-51.4608', addresstype: 'city', address: { city: 'Apucarana' } }]
      : [];
    await abrirPainel(page);
    const seletor = page.locator('#mapa-celulas-cidade');
    await expect(seletor.locator('option')).toHaveText(['Mandaguari', 'Apucarana']);
    await expect(seletor).toHaveValue('mandaguari');
    await expect(pinos(page)).toHaveCount(2);

    await seletor.selectOption('apucarana');
    await expect(pinos(page)).toHaveCount(1);
    await expect(pinos(page)).toHaveAttribute('data-lat', '-23.551');
    await expect(canvas(page)).toHaveAttribute('data-centro', '-23.5508,-51.4608', ESPERA_GEO);
    await expect.poll(() => mock.escritas(TABELA, 'POST').length).toBe(1);
    expect(mock.escritas(TABELA, 'POST')[0].body[0]).toMatchObject({ endereco_chave: 'v1|cidade|apucarana', encontrado: true });

    await seletor.selectOption('mandaguari');
    await expect(pinos(page)).toHaveCount(2);
    await expect(canvas(page)).toHaveAttribute('data-centro', CENTRO);
  });

  test('Várias cidades: cidade não encontrada mantém o centro anterior e informa', async ({ page, mock }) => {
    const outra = { rua: 'Rua Distante Fictícia', numero: '5', bairro: 'Centro', cidade: 'Cidade Inexistente' };
    definirCelulas(mock, { paulo: END.a, carlos: outra });
    gravarNaTabela(mock, END.a, -23.54, -51.67);
    gravarNaTabela(mock, outra, -23.70, -51.80);
    await abrirPainel(page);
    await page.locator('#mapa-celulas-cidade').selectOption('cidade inexistente');
    await expect(page.locator('.mapa-celulas-aviso')).toContainText('Não foi possível localizar Cidade Inexistente', ESPERA_GEO);
    await expect(canvas(page)).toHaveAttribute('data-centro', CENTRO);
    await expect(pinos(page)).toHaveCount(1);
  });

  test('Grafia: "Mandaguari", "mandaguari " e "Mandaguarí" são uma cidade só', async ({ page, mock }) => {
    definirCelulas(mock, {
      paulo: { ...END.a, cidade: 'Mandaguari' },
      ana: { ...END.b, cidade: 'mandaguari ' },
      carlos: { ...END.c, cidade: 'Mandaguarí' }
    });
    await abrirPainel(page);
    await expect(page.locator('#mapa-celulas-cidade')).toHaveCount(0);
    expect(G.chaveEndereco({ ...END.a, cidade: 'Mandaguarí ' })).toBe(G.chaveEndereco({ ...END.a, cidade: 'mandaguari' }));
  });
});

test.describe('Mapa das células — falhas de carga', () => {
  test.afterEach(conferirEscritaIsolada);
  test.use({ maplibreStub: false });

  test('CDN do MapLibre fora do ar: mensagem amigável no bloco, resto do painel normal', async ({ page, context }) => {
    await context.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/maplibre-gl@/, r => r.abort('failed'));
    await abrirPainel(page);
    await expect(page.locator('.mapa-celulas-erro')).toBeVisible();
    await expect(page.locator('.mapa-celulas-erro')).toContainText('Não foi possível carregar o mapa');
    await expect(page.locator('.aniv-bloco')).toBeVisible();
    await expect(page.locator('.cards-stat-grid .card-stat-box')).toHaveCount(3);
  });

  test('Arquivo do CDN adulterado (não casa com o SRI) não executa: mensagem amigável', async ({ page, mock }) => {
    // Registra os atributos do <link> do CSS quando ele entra (ele sai após a falha)
    await page.addInitScript(() => {
      new MutationObserver(() => {
        const l = document.querySelector('link[data-maplibre]');
        if (l && !window.__linkMapLibre) window.__linkMapLibre = { integrity: l.integrity, crossorigin: l.getAttribute('crossorigin') };
      }).observe(document, { childList: true, subtree: true });
    });
    await abrirPainel(page); // rota padrão do fixture serve o stub, que não casa com o hash
    await expect(page.locator('.mapa-celulas-erro')).toBeVisible();
    expect(await page.evaluate(() => typeof window.maplibregl)).toBe('undefined');
    expect(mock.requisicoesMapa.some(u => u.endsWith('maplibre-gl.js'))).toBe(true);
    const script = page.locator('script[src$="maplibre-gl.js"]');
    expect(await script.count()).toBe(0); // removido após a falha (nova tentativa depois)
    // CSS também sai após a falha, para a nova tentativa adicioná-lo de novo
    expect(await page.locator('link[data-maplibre]').count()).toBe(0);
    const link = await page.evaluate(() => window.__linkMapLibre);
    expect(link.integrity).toMatch(/^sha384-/);
    expect(link.crossorigin).toBe('anonymous');
  });
});

test.describe('Mapa das células — outras páginas não carregam o mapa', () => {
  test.afterEach(conferirEscritaIsolada);
  test.use({ maplibreStub: false, sessaoAdmin: false });

  test('formulário público: zero requisições de mapa', async ({ page, mock }) => {
    await page.goto('/#cadastro-publico');
    await page.waitForFunction(() => window.WaveData && WaveData.membros.length > 0);
    await page.waitForTimeout(1200);
    expect(mock.requisicoesMapa).toEqual([]);
    expect(mock.consultasNominatim).toEqual([]);
    expect(mock.leituras(TABELA)).toEqual([]);
    expect(await page.locator('link[data-maplibre]').count()).toBe(0);
  });
});

test.describe('Mapa das células — critérios de aceite', () => {
  test.afterEach(conferirEscritaIsolada);
  test('Membros (outra página logada): zero requisições de mapa', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    await page.waitForTimeout(1200);
    expect(mock.consultasNominatim).toEqual([]);
    expect(mock.leituras(TABELA)).toEqual([]);
    expect(await page.evaluate(() => window.__mapasCriados)).toBe(0);
  });

  test('painel com o seed e o stub padrão não escreve nada (testes de zero escritas não dependem de tempo)', async ({ page, mock }) => {
    await abrirPainel(page);
    await expect.poll(() => mock.consultasNominatim.length).toBeGreaterThan(0);
    await page.waitForTimeout(3000);
    expect(mock.writes).toEqual([]);
  });

  test('sem WebGL: mensagem fica e renders seguintes não tentam criar o mapa de novo', async ({ page, mock }) => {
    await page.addInitScript(() => {
      window.__tentativasMapa = 0;
      window.maplibregl.Map = function () { window.__tentativasMapa++; throw new Error('WebGL indisponível'); };
    });
    await abrirPainel(page);
    await expect(page.locator('.mapa-celulas-erro')).toContainText('não conseguiu exibir o mapa');
    await page.evaluate(() => { WaveApp.renderCurrentPage(true); WaveApp.renderCurrentPage(true); });
    await expect(page.locator('.mapa-celulas-erro')).toBeVisible();
    expect(await page.evaluate(() => window.__tentativasMapa)).toBe(1);
  });

  test('troca de tema: estilo claro/escuro sem perder os pinos', async ({ page, mock }) => {
    definirCelulas(mock, { paulo: END.a, ana: END.b });
    gravarNaTabela(mock, END.a, -23.54, -51.67);
    gravarNaTabela(mock, END.b, -23.55, -51.66);
    await abrirPainel(page);
    await expect(pinos(page)).toHaveCount(2);
    await page.evaluate(() => WaveTheme.setTheme('dark'));
    await expect(canvas(page)).toHaveAttribute('data-estilo', 'https://tiles.openfreemap.org/styles/dark');
    await page.evaluate(() => WaveTheme.setTheme('light'));
    await expect(canvas(page)).toHaveAttribute('data-estilo', 'https://tiles.openfreemap.org/styles/positron');
    await expect(pinos(page)).toHaveCount(2);
    expect(await page.evaluate(() => window.__mapasCriados)).toBe(1);
  });

  for (const largura of [1280, 375]) {
    test(`abaixo dos aniversariantes em ${largura}px, legível nos dois temas, com legenda`, async ({ page, mock }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      definirCelulas(mock, { paulo: END.a, ana: END.b });
      gravarNaTabela(mock, END.a, -23.54, -51.67);
      gravarNaTabela(mock, END.b, -23.55, -51.66);
      await abrirPainel(page);

      const aniv = await page.locator('.aniv-bloco').boundingBox();
      const bloco = await page.locator('.mapa-celulas-bloco').boundingBox();
      expect(bloco.y).toBeGreaterThanOrEqual(aniv.y + aniv.height - 1);
      const area = await page.locator('.mapa-celulas-area').boundingBox();
      expect(Math.round(area.height)).toBe(largura <= 768 ? 280 : 360);
      await expect(page.locator('.mapa-celulas-legenda')).toContainText('Masculina');
      await expect(page.locator('.mapa-celulas-legenda')).toContainText('Feminina');

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);

      for (const tema of ['dark', 'light']) {
        await page.evaluate(t => WaveTheme.setTheme(t), tema);
        const cores = await page.locator('.mapa-celulas-titulo').evaluate(el => ({
          texto: getComputedStyle(el).color,
          fundo: getComputedStyle(el.closest('.mapa-celulas-bloco')).backgroundColor
        }));
        expect(cores.texto, `título legível no tema ${tema}`).not.toBe(cores.fundo);
        if (process.env.SCREENSHOT_DIR) {
          await page.locator('.mapa-celulas-bloco').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/mapa-${largura}-${tema}.png`, fullPage: true });
        }
      }
    });
  }
});

/* ───────────── Pré-carga (script Node) contra um Supabase/Nominatim falsos locais ───────────── */

function servidorFalso({ nominatim }) {
  const estado = {
    pessoas: buildSeed().pessoas,
    tabela: [],
    escritas: [],
    leiturasPessoas: [],
    consultas: []
  };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let corpo = '';
    req.on('data', d => { corpo += d; });
    req.on('end', () => {
      const json = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(obj === undefined ? '' : JSON.stringify(obj)); };
      if (url.pathname === '/rest/v1/pessoas' && req.method === 'GET') {
        estado.leiturasPessoas.push(url.searchParams.get('select'));
        const cols = (url.searchParams.get('select') || '').split(',');
        return json(200, estado.pessoas.map(p => Object.fromEntries(cols.map(c => [c, p[c]]))));
      }
      if (url.pathname === `/rest/v1/${TABELA}` && req.method === 'GET') return json(200, estado.tabela);
      if (url.pathname.startsWith('/rest/v1/')) {
        const tabela = url.pathname.split('/').pop();
        estado.escritas.push({ method: req.method, tabela, query: url.search, prefer: req.headers.prefer, body: corpo });
        if (tabela === TABELA && req.method === 'POST') {
          JSON.parse(corpo).forEach(l => {
            const i = estado.tabela.findIndex(x => x.endereco_chave === l.endereco_chave);
            if (i >= 0) estado.tabela[i] = l; else estado.tabela.push(l);
          });
          return json(201);
        }
        return json(405, {});
      }
      if (url.pathname === '/nominatim/search') {
        estado.consultas.push({ params: url.searchParams, ua: req.headers['user-agent'] });
        const r = nominatim(url.searchParams);
        if (r && r.status) return json(r.status, {});
        return json(200, r || []);
      }
      return json(404, {});
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, estado, porta: server.address().port })));
}

function rodarScript(porta, extra = []) {
  const script = path.join(__dirname, '..', '..', 'versao-nova', 'scripts', 'geocodificar-enderecos.js');
  return new Promise(resolve => {
    const p = spawn(process.execPath, [script, ...extra], {
      env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${porta}`, SUPABASE_ANON_KEY: 'chave-ficticia', NOMINATIM_URL: `http://127.0.0.1:${porta}/nominatim/search` }
    });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('close', code => resolve({ code, out }));
  });
}

function prepararSeedScript(estado) {
  // 3 endereços únicos entre os líderes visíveis; o líder com referência externa não entra
  const ends = {
    'pes-paulo': END.a, 'pes-carlos': END.b, 'pes-sergio': END.b, 'pes-ana': END.c,
    'pes-juliana': { rua: '', numero: '', bairro: '', cidade: 'Mandaguari' },
    'pes-silvano': { rua: 'Rua Externa Fictícia', numero: '1', bairro: 'Fora', cidade: 'Mandaguari' }
  };
  estado.pessoas.forEach(p => { if (ends[p.id]) Object.assign(p, ends[p.id]); });
}

base.test.describe('Pré-carga (scripts/geocodificar-enderecos.js)', () => {
  base.test('tabela vazia: grava todos os endereços atuais e imprime só contagens; 2ª execução pula tudo', async () => {
    const { server, estado, porta } = await servidorFalso({
      nominatim: p => (p.get('street') || '').includes('Faz de Conta') ? [] : resultado(-23.54, -51.67)
    });
    try {
      prepararSeedScript(estado);
      const r1 = await rodarScript(porta);
      base.expect(r1.code, r1.out).toBe(0);
      base.expect(r1.out).toContain('3 de 3 endereços encontrados');
      base.expect(estado.tabela).toHaveLength(3);
      base.expect(estado.escritas.every(w => w.tabela === TABELA && w.method === 'POST')).toBe(true);
      base.expect(estado.escritas.every(w => /resolution=merge-duplicates/.test(w.prefer) && /on_conflict=endereco_chave/.test(w.query))).toBe(true);
      base.expect(estado.leiturasPessoas[0]).not.toMatch(/nome|whatsapp|email|foto/);
      base.expect(estado.consultas.every(c => /WaveCelulas/.test(c.ua))).toBe(true);
      // Nada de nome, telefone ou endereço na saída
      for (const p of estado.pessoas) {
        base.expect(r1.out.includes(p.nome)).toBe(false);
        base.expect(r1.out.includes(p.whatsapp)).toBe(false);
      }
      for (const e of Object.values(END)) base.expect(r1.out.includes(e.rua)).toBe(false);
      base.expect(r1.out.includes('Externa')).toBe(false);
      base.expect(estado.consultas.some(c => (c.params.get('street') || '').includes('Externa'))).toBe(false);

      const consultasAntes = estado.consultas.length;
      const r2 = await rodarScript(porta);
      base.expect(r2.code, r2.out).toBe(0);
      base.expect(r2.out).toContain('A consultar agora: 0');
      base.expect(estado.consultas.length).toBe(consultasAntes);
    } finally {
      server.close();
    }
  });

  base.test('Nominatim 429: para, informa e pode ser rodado de novo; --dry-run não grava', async () => {
    let bloquear = true;
    const { server, estado, porta } = await servidorFalso({ nominatim: () => (bloquear ? { status: 429 } : resultado(-23.54, -51.67)) });
    try {
      prepararSeedScript(estado);
      const r1 = await rodarScript(porta);
      base.expect(r1.code).toBe(2);
      base.expect(r1.out).toContain('Interrompido');
      base.expect(estado.consultas).toHaveLength(1);
      base.expect(estado.tabela).toHaveLength(0);

      bloquear = false;
      const r2 = await rodarScript(porta, ['--dry-run']);
      base.expect(r2.code, r2.out).toBe(0);
      base.expect(r2.out).toContain('3 de 3 endereços encontrados');
      base.expect(estado.escritas).toEqual([]);
    } finally {
      server.close();
    }
  });
});
