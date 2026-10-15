const { test, expect, abrirApp, dialogo } = require('../support/fixtures');
const { IDS, NOMES } = require('../support/seed');

// Discípulos ATIVOS de Carlos no seed (getDiscipulosByLider usa discipulador_id).
const DISCIPULOS_CARLOS = [IDS.jose, IDS.marcos, 'pes-f01', 'pes-f02', 'pes-f03'];

function idsDoFiltro(valor) {
  // PostgREST: id=in.(a,b,c) (lote) ou id=eq.x
  if (valor.startsWith('in.(')) return valor.slice(4, -1).split(',').map(s => s.replace(/^"|"$/g, ''));
  if (valor.startsWith('eq.')) return [valor.slice(3)];
  return [];
}

/** Escritas "de negócio" (ignora a migração de celulas_json que o sync dispara sozinho). */
function escritasDeLideranca(mock) {
  return mock.escritas('pessoas', 'PATCH').filter(w => w.body && ('lider' in w.body || 'status' in w.body || 'discipulador_id' in w.body));
}

async function abrirModalInativacao(page, nomeLider) {
  const linha = page.locator('#membros-table-body tr', { hasText: nomeLider });
  await linha.getByTitle('Inativar Cadastro').click();
  const modal = page.locator('.modal-overlay.open', { hasText: 'Redistribuição de Discípulos' });
  await expect(modal).toBeVisible();
  return modal;
}

test.describe('Redistribuição de discípulos ao inativar líder', () => {
  test('confirmar sem escolher líder bloqueia e não grava nada', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    const modal = await abrirModalInativacao(page, NOMES.carlos);

    // Todos os seletores individuais começam vazios ("— Selecione —")
    const selects = modal.locator('select.select-redistribuir-individual');
    await expect(selects).toHaveCount(DISCIPULOS_CARLOS.length);
    for (const s of await selects.all()) await expect(s).toHaveValue('');

    const antes = escritasDeLideranca(mock).length;
    await modal.getByRole('button', { name: 'Reatribuir & Inativar' }).click();

    await expect(dialogo(page)).toContainText('Seleção Incompleta');
    await expect(dialogo(page)).toContainText('selecione um líder de destino para todos');
    await page.waitForTimeout(500);
    expect(escritasDeLideranca(mock).length, 'nenhum PATCH de líder/status pode ser enviado').toBe(antes);

    // Pode tentar de novo: modal continua aberto
    await dialogo(page).getByRole('button', { name: 'Entendi' }).click();
    await expect(modal).toBeVisible();
  });

  test('"Definir para todos" grava todos os discípulos com o líder escolhido e depois inativa', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    const modal = await abrirModalInativacao(page, NOMES.carlos);

    const atalho = modal.locator('select').first();
    // Referência externa (Silvano) e o próprio líder inativado não podem ser opção
    await expect(atalho.locator('option')).toHaveText(['-- Escolha para preencher todos --', NOMES.paulo, NOMES.sergio]);

    await atalho.selectOption({ label: NOMES.paulo });
    for (const s of await modal.locator('select.select-redistribuir-individual').all()) {
      await expect(s).toHaveValue(NOMES.paulo);
    }

    await modal.getByRole('button', { name: 'Reatribuir & Inativar' }).click();
    await expect(page.locator('.toast-notification.success')).toContainText(`${NOMES.carlos} inativado com sucesso`);

    const escritas = escritasDeLideranca(mock);
    const redistrib = escritas.filter(w => 'lider' in w.body);
    const idsRedistribuidos = redistrib.flatMap(w => idsDoFiltro(w.query.id));
    expect(idsRedistribuidos.sort()).toEqual([...DISCIPULOS_CARLOS].sort());
    for (const w of redistrib) {
      // supabase.js updatePessoasLider: { lider: <nome>, discipulador_id: <id> }
      expect(w.body).toEqual({ lider: NOMES.paulo, discipulador_id: IDS.paulo });
    }

    const inativacao = escritas.find(w => w.query.id === `eq.${IDS.carlos}` && 'status' in w.body);
    expect(inativacao.body).toEqual({ status: 'INATIVO', e_lider: false, celulas_json: '[]' });
    expect(escritas.indexOf(inativacao)).toBeGreaterThan(escritas.indexOf(redistrib[redistrib.length - 1]));

    // Estado final do "banco" simulado
    for (const id of DISCIPULOS_CARLOS) {
      const row = mock.db.pessoas.find(p => p.id === id);
      expect(row.lider).toBe(NOMES.paulo);
      expect(row.discipulador_id).toBe(IDS.paulo);
    }
  });

  test('escolhas individuais e o atalho sobrevivem a um re-render (Realtime/auto-sync)', async ({ page, mock }) => {
    await abrirApp(page, 'admin-membros');
    let modal = await abrirModalInativacao(page, NOMES.carlos);

    await modal.locator(`select[data-discipulo-id="${IDS.jose}"]`).selectOption({ label: NOMES.paulo });
    await modal.locator(`select[data-discipulo-id="${IDS.marcos}"]`).selectOption({ label: NOMES.sergio });

    // Simula a chegada de um evento Realtime / auto-sync que redesenha a página inteira
    await page.evaluate(() => WaveApp.renderCurrentPage(true));

    modal = page.locator('.modal-overlay.open', { hasText: 'Redistribuição de Discípulos' });
    await expect(modal).toBeVisible();
    await expect(modal.locator(`select[data-discipulo-id="${IDS.jose}"]`)).toHaveValue(NOMES.paulo);
    await expect(modal.locator(`select[data-discipulo-id="${IDS.marcos}"]`)).toHaveValue(NOMES.sergio);
    await expect(modal.locator('select[data-discipulo-id="pes-f01"]')).toHaveValue('');

    // Atalho também persiste
    await modal.locator('select').first().selectOption({ label: NOMES.sergio });
    await page.evaluate(() => WaveApp.renderCurrentPage(true));
    modal = page.locator('.modal-overlay.open', { hasText: 'Redistribuição de Discípulos' });
    await expect(modal.locator('select').first()).toHaveValue(NOMES.sergio);
    for (const id of DISCIPULOS_CARLOS) {
      await expect(modal.locator(`select[data-discipulo-id="${id}"]`)).toHaveValue(NOMES.sergio);
    }

    // Ajuste individual depois do atalho, re-render e confirmação: payload por líder escolhido
    await modal.locator(`select[data-discipulo-id="${IDS.jose}"]`).selectOption({ label: NOMES.paulo });
    await page.evaluate(() => WaveApp.renderCurrentPage(true));
    modal = page.locator('.modal-overlay.open', { hasText: 'Redistribuição de Discípulos' });
    await modal.getByRole('button', { name: 'Reatribuir & Inativar' }).click();
    await expect(page.locator('.toast-notification.success')).toBeVisible();

    const redistrib = escritasDeLideranca(mock).filter(w => 'lider' in w.body);
    const paraPaulo = redistrib.filter(w => w.body.lider === NOMES.paulo).flatMap(w => idsDoFiltro(w.query.id));
    const paraSergio = redistrib.filter(w => w.body.lider === NOMES.sergio).flatMap(w => idsDoFiltro(w.query.id));
    expect(paraPaulo).toEqual([IDS.jose]);
    expect(paraSergio.sort()).toEqual(DISCIPULOS_CARLOS.filter(id => id !== IDS.jose).sort());
    redistrib.filter(w => w.body.lider === NOMES.paulo).forEach(w => expect(w.body.discipulador_id).toBe(IDS.paulo));
    redistrib.filter(w => w.body.lider === NOMES.sergio).forEach(w => expect(w.body.discipulador_id).toBe(IDS.sergio));
  });

  test('sem outro líder ativo do mesmo sexo: orienta e só oferece "Cancelar"', async ({ page, mock }) => {
    // Única outra líder feminina fica inativa → Ana não tem para quem passar as discípulas
    mock.db.pessoas.find(p => p.id === IDS.juliana).status = 'INATIVO';
    await abrirApp(page, 'admin-membros');

    const modal = await abrirModalInativacao(page, NOMES.ana);
    await expect(modal).toContainText('não há outro líder ativo feminino para recebê-los');
    await expect(modal).toContainText('torne outro discípulo líder');
    await expect(modal.getByRole('button', { name: 'Reatribuir & Inativar' })).toHaveCount(0);
    await expect(modal.locator('select')).toHaveCount(0);
    await expect(modal.getByRole('button', { name: 'Cancelar' })).toBeVisible();

    const antes = escritasDeLideranca(mock).length;
    await modal.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.locator('.modal-overlay.open', { hasText: 'Redistribuição de Discípulos' })).toHaveCount(0);
    expect(escritasDeLideranca(mock).length).toBe(antes);
    expect(mock.db.pessoas.find(p => p.id === IDS.ana).status).toBe('ATIVO');
  });
});
