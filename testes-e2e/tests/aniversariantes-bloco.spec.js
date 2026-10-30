const { test, expect, abrirApp } = require('../support/fixtures');
const { IDS, NOMES } = require('../support/seed');

/* Bloco "Próximos aniversariantes" do painel (plan-aniversariantes-bloco).
   Relógio fixo por teste; datas de nascimento 100% fictícias. */

const FORA_DA_JANELA = '1990-06-15'; // longe de qualquer "hoje" usado aqui

/** Joga todo mundo para fora da janela e aplica os nascimentos pedidos ({ id: 'AAAA-MM-DD' }). */
function definirNascimentos(mock, mapa) {
  mock.db.pessoas.forEach(p => { p.data_nascimento = FORA_DA_JANELA; });
  Object.entries(mapa).forEach(([id, data]) => {
    const p = mock.db.pessoas.find(x => x.id === id);
    p.data_nascimento = data;
  });
}

async function abrirPainelEm(page, isoHoje) {
  await page.clock.setFixedTime(new Date(isoHoje));
  await abrirApp(page, 'admin');
  await expect(page.locator('.aniv-bloco')).toBeVisible();
}

const nomesTiles = page => page.locator('.aniv-bloco .aniv-tile .aniv-nome');
const tile = (page, nome) => page.locator('.aniv-bloco .aniv-tile').filter({ has: page.locator('.aniv-nome', { hasText: nome }) });

test.describe('Painel — bloco Próximos aniversariantes', () => {
  test('lista normal: só os próximos 30 dias, em ordem de data', async ({ page, mock }) => {
    definirNascimentos(mock, {
      [IDS.jose]: '1990-12-10',       // fora (>30 dias)
      [IDS.fernanda]: '1988-11-15',
      [IDS.marcos]: '1995-10-30',     // hoje
      [IDS.conceicao]: '1990-11-03'
    });
    await abrirPainelEm(page, '2026-10-30T12:00:00-03:00');
    await expect(nomesTiles(page)).toHaveText([NOMES.marcos, NOMES.conceicao, NOMES.fernanda]);
    await expect(tile(page, NOMES.marcos).locator('.aniv-selo')).toContainText('30');
    await expect(tile(page, NOMES.marcos).locator('.aniv-selo-mes')).toHaveText('OUT');
    await expect(tile(page, NOMES.conceicao).locator('.aniv-selo-dia')).toHaveText('03');
    await expect(tile(page, NOMES.conceicao).locator('.aniv-selo-mes')).toHaveText('NOV');
  });

  test('virada de ano: 05/01 aparece em 20/12', async ({ page, mock }) => {
    definirNascimentos(mock, { [IDS.marcos]: '1993-01-05' });
    await abrirPainelEm(page, '2026-12-20T12:00:00-03:00');
    await expect(nomesTiles(page)).toHaveText([NOMES.marcos]);
    await expect(tile(page, NOMES.marcos).locator('.aniv-selo-dia')).toHaveText('05');
    await expect(tile(page, NOMES.marcos).locator('.aniv-selo-mes')).toHaveText('JAN');
  });

  test('mais de 8: bloco mostra 8, "Ver todos" lista os 11', async ({ page, mock }) => {
    const ids = ['pes-f01', 'pes-f02', 'pes-f03', 'pes-f04', 'pes-f05', 'pes-f06',
      'pes-f07', 'pes-f08', 'pes-f09', 'pes-f10', 'pes-f11'];
    const mapa = {};
    ids.forEach((id, i) => { mapa[id] = `1991-11-${String(i + 1).padStart(2, '0')}`; });
    definirNascimentos(mock, mapa);
    await abrirPainelEm(page, '2026-10-30T12:00:00-03:00');
    await expect(page.locator('.aniv-bloco .aniv-tile')).toHaveCount(8);

    await page.locator('.aniv-ver-todos').click();
    const modal = page.locator('.modal-overlay.open');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.sheet-title')).toContainText('Próximos aniversariantes (30 dias)');
    await expect(modal.locator('.aniversariante-item')).toHaveCount(11);
    await expect(modal.locator('select.input-field')).toBeVisible(); // modelos de mensagem
  });

  test('29/02 em ano não bissexto conta em 28/02', async ({ page, mock }) => {
    definirNascimentos(mock, { [IDS.marcos]: '2000-02-29' });
    await abrirPainelEm(page, '2027-02-20T12:00:00-03:00');
    await expect(nomesTiles(page)).toHaveText([NOMES.marcos]);
    await expect(tile(page, NOMES.marcos).locator('.aniv-selo-dia')).toHaveText('28');
    await expect(tile(page, NOMES.marcos).locator('.aniv-selo-mes')).toHaveText('FEV');
  });

  test('vazio: mensagem amigável e sem "Ver todos"', async ({ page, mock }) => {
    definirNascimentos(mock, {});
    await abrirPainelEm(page, '2026-10-30T12:00:00-03:00');
    await expect(page.locator('.aniv-bloco .aniv-vazio')).toBeVisible();
    await expect(page.locator('.aniv-bloco .aniv-tile')).toHaveCount(0);
    await expect(page.locator('.aniv-ver-todos')).toHaveCount(0);
  });

  test('inativo, referência externa e sem data não aparecem', async ({ page, mock }) => {
    definirNascimentos(mock, {
      [IDS.roberto]: '1990-11-01',   // INATIVO
      [IDS.silvano]: '1990-11-02',   // referência externa
      [IDS.fernanda]: '1990-11-04'
    });
    mock.db.pessoas.find(p => p.id === IDS.marcos).data_nascimento = null; // sem data
    await abrirPainelEm(page, '2026-10-30T12:00:00-03:00');
    await expect(nomesTiles(page)).toHaveText([NOMES.fernanda]);
  });

  test('sem WhatsApp: tile sem botão', async ({ page, mock }) => {
    definirNascimentos(mock, { [IDS.marcos]: '1990-11-01', [IDS.fernanda]: '1990-11-02' });
    mock.db.pessoas.find(p => p.id === IDS.marcos).whatsapp = null;
    await abrirPainelEm(page, '2026-10-30T12:00:00-03:00');
    await expect(tile(page, NOMES.marcos).locator('.aniv-whats')).toHaveCount(0);
    const botao = tile(page, NOMES.fernanda).locator('.aniv-whats');
    await expect(botao).toHaveCount(1);
    await expect(botao).toHaveAttribute('aria-label', `Enviar parabéns para ${NOMES.fernanda} no WhatsApp`);
  });

  test('mensagem usa a idade que vai completar e o modelo selecionado', async ({ page, mock }) => {
    definirNascimentos(mock, { [IDS.conceicao]: '1990-11-03' }); // 35 hoje, completa 36
    await abrirPainelEm(page, '2026-10-30T12:00:00-03:00');
    const botao = tile(page, NOMES.conceicao).locator('.aniv-whats');
    const href = await botao.getAttribute('href');
    expect(href.startsWith('https://wa.me/44982223344?text=')).toBe(true);
    const texto = decodeURIComponent(href.split('?text=')[1]);
    expect(texto).toContain('36 anos');
    expect(texto).toContain('Paz do Senhor'); // modelo padrão (espiritual)

    // Troca o modelo no modal: o botão do bloco passa a usar o novo modelo
    await page.locator('.aniv-ver-todos').click();
    await page.locator('.modal-overlay.open select.input-field').selectOption('formal');
    const texto2 = decodeURIComponent((await tile(page, NOMES.conceicao).locator('.aniv-whats').getAttribute('href')).split('?text=')[1]);
    expect(texto2).toContain('Prezado(a) Maria');

    // Clique abre wa.me (popup interceptado — não sai para a rede)
    await page.locator('.modal-overlay.open .sheet-close').click();
    await page.context().route('https://wa.me/**', r => r.fulfill({ status: 200, body: 'ok' }));
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      tile(page, NOMES.conceicao).locator('.aniv-whats').click()
    ]);
    expect(popup.url()).toContain('wa.me/44982223344');
    await popup.close();
  });

  test('totalizadores: 3 cards, sem "Aniversários do Mês"', async ({ page, mock }) => {
    definirNascimentos(mock, {});
    await abrirPainelEm(page, '2026-10-30T12:00:00-03:00');
    await expect(page.locator('.cards-stat-grid .card-stat-box')).toHaveCount(3);
    await expect(page.locator('.cards-stat-grid')).not.toContainText('Aniversários do Mês');
  });
});

test.describe('Painel — posição e temas do bloco', () => {
  for (const largura of [1280, 375]) {
    test(`abaixo dos totalizadores em ${largura}px, temas claro e escuro`, async ({ page, mock }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      definirNascimentos(mock, {
        [IDS.jose]: '1990-11-01', [IDS.marcos]: '1990-11-02', [IDS.conceicao]: '1990-11-03',
        [IDS.fernanda]: '1990-11-04', [IDS.ana]: '1990-11-05'
      });
      await abrirPainelEm(page, '2026-10-30T12:00:00-03:00');

      const grid = await page.locator('.cards-stat-grid').boundingBox();
      const bloco = await page.locator('.aniv-bloco').boundingBox();
      expect(bloco.y).toBeGreaterThanOrEqual(grid.y + grid.height - 1);

      // Sem rolagem horizontal
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);

      for (const tema of ['dark', 'light']) {
        await page.evaluate(t => WaveTheme.setTheme(t), tema);
        const cores = await page.locator('.aniv-tile .aniv-nome').first().evaluate(el => {
          const fundo = getComputedStyle(el.closest('.aniv-bloco')).backgroundColor;
          return { texto: getComputedStyle(el).color, fundo };
        });
        expect(cores.texto, `nome legível no tema ${tema}`).not.toBe(cores.fundo);
        if (process.env.SCREENSHOT_DIR) {
          await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/aniv-${largura}-${tema}.png`, fullPage: true });
        }
      }
    });
  }
});
