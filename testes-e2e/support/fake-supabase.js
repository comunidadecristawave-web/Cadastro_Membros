/* Fake em memória do PostgREST do Supabase (host fictício https://supabase.mock.test).
   Implementa só o que o app usa: GET com filtros eq/neq/in/is + order + select,
   .single() (Accept vnd.pgrst.object+json → 406 PGRST116 sem linha), POST (insert),
   PATCH (update) e DELETE, com CORS. Todas as escritas ficam em `writes`. */

const MOCK_HOST = 'supabase.mock.test';
const MOCK_URL = `https://${MOCK_HOST}`;
const MOCK_KEY = 'chave-anon-ficticia-somente-para-testes';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS,HEAD',
  'access-control-allow-headers': '*',
  'access-control-expose-headers': 'content-range, content-profile',
  'access-control-max-age': '600'
};

const IGNORADOS = new Set(['select', 'order', 'limit', 'offset', 'columns', 'on_conflict']);

function parseFiltros(searchParams) {
  const filtros = [];
  for (const [col, raw] of searchParams.entries()) {
    if (IGNORADOS.has(col)) continue;
    const ponto = raw.indexOf('.');
    filtros.push({ col, op: raw.slice(0, ponto), val: raw.slice(ponto + 1) });
  }
  return filtros;
}

function casa(row, { col, op, val }) {
  const v = row[col];
  const s = v === null || v === undefined ? 'null' : String(v);
  switch (op) {
    case 'eq': return s === val;
    case 'neq': return s !== val;
    case 'is': return val === 'null' ? (v === null || v === undefined) : s === val;
    case 'in': {
      const itens = val.replace(/^\(|\)$/g, '').split(',').map(x => x.replace(/^"|"$/g, ''));
      return itens.includes(s);
    }
    default:
      throw new Error(`[fake-supabase] operador não suportado: ${op}`);
  }
}

class FakeSupabase {
  constructor(db) {
    this.db = db;               // { pessoas: [...], usuarios: [...] } — mutável pelo teste antes do goto
    this.writes = [];           // [{ method, table, query, body }]
    this.requests = [];         // todas as requisições REST recebidas
    this.inesperadas = [];      // caminhos fora de /rest/v1 (auth, storage...)
    this.violacoes = [];        // hosts fora da allowlist (guarda global)
    this._falhas = [];          // [{ method, table, status, body, abort }]
    this._atrasos = [];         // [{ method, table, ms }]
    this._seq = 0;
  }

  /** Faz requisições casando method/table falharem (status+body ou abort de rede). */
  falhar({ method, table, status = 500, body = { code: 'XX000', message: 'falha simulada' }, abort = false }) {
    this._falhas.push({ method, table, status, body, abort });
  }

  atrasar({ method, table, ms }) {
    this._atrasos.push({ method, table, ms });
  }

  escritas(table, method) {
    return this.writes.filter(w => (!table || w.table === table) && (!method || w.method === method));
  }

  leituras(table) {
    return this.requests.filter(r => r.method === 'GET' && r.table === table);
  }

  _json(route, status, corpo, extra = {}) {
    return route.fulfill({
      status,
      headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', ...extra },
      body: corpo === undefined ? '' : JSON.stringify(corpo)
    });
  }

  async handle(route) {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS, body: '' });
    }

    const m = url.pathname.match(/^\/rest\/v1\/([^/]+)$/);
    if (!m) {
      this.inesperadas.push(`${method} ${url.pathname}`);
      return this._json(route, 404, { message: 'rota não simulada', path: url.pathname });
    }

    const table = m[1];
    const headers = req.headers();
    const accept = headers['accept'] || '';
    const prefer = headers['prefer'] || '';
    const query = Object.fromEntries(url.searchParams.entries());
    let body = null;
    try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch (e) { body = req.postData(); }

    this.requests.push({ method, table, query, body, at: Date.now() });

    const atraso = this._atrasos.find(a => a.method === method && a.table === table);
    if (atraso) await new Promise(r => setTimeout(r, atraso.ms));

    const falha = this._falhas.find(f => f.method === method && f.table === table);
    if (falha) {
      if (falha.abort) return route.abort('failed');
      return this._json(route, falha.status, falha.body);
    }

    if (!this.db[table]) this.db[table] = [];
    const tabela = this.db[table];
    const filtros = parseFiltros(url.searchParams);
    const filtrar = rows => rows.filter(r => filtros.every(f => casa(r, f)));
    const querObjeto = accept.includes('application/vnd.pgrst.object+json');
    const representacao = prefer.includes('return=representation');
    const clone = o => JSON.parse(JSON.stringify(o));

    const responderLinhas = (status, linhas) => {
      if (querObjeto) {
        if (linhas.length !== 1) {
          return this._json(route, 406, {
            code: 'PGRST116',
            details: `The result contains ${linhas.length} rows`,
            hint: null,
            message: 'JSON object requested, multiple (or no) rows returned'
          });
        }
        return this._json(route, status, clone(linhas[0]));
      }
      return this._json(route, status, clone(linhas), { 'content-range': `0-${Math.max(linhas.length - 1, 0)}/*` });
    };

    if (method === 'GET' || method === 'HEAD') {
      let linhas = filtrar(tabela);
      if (query.order) {
        const [col, dir] = query.order.split(',')[0].split('.');
        linhas = [...linhas].sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * (dir === 'desc' ? -1 : 1));
      }
      return responderLinhas(200, linhas);
    }

    if (method === 'POST') {
      const itens = Array.isArray(body) ? body : [body];
      this.writes.push({ method, table, query, body: clone(body) });
      const inseridas = itens.map(item => {
        const linha = { ...clone(item) };
        if (!linha.id) linha.id = `${table}-novo-${++this._seq}`;
        if (!linha.criado_em) linha.criado_em = new Date().toISOString();
        tabela.push(linha);
        return linha;
      });
      if (!representacao) return route.fulfill({ status: 201, headers: CORS, body: '' });
      return responderLinhas(201, inseridas);
    }

    if (method === 'PATCH') {
      this.writes.push({ method, table, query, body: clone(body) });
      const alvo = filtrar(tabela);
      alvo.forEach(r => Object.assign(r, clone(body)));
      if (!representacao) return route.fulfill({ status: 204, headers: CORS, body: '' });
      return responderLinhas(200, alvo);
    }

    if (method === 'DELETE') {
      this.writes.push({ method, table, query, body: null });
      const alvo = filtrar(tabela);
      this.db[table] = tabela.filter(r => !alvo.includes(r));
      if (!representacao) return route.fulfill({ status: 204, headers: CORS, body: '' });
      return responderLinhas(200, alvo);
    }

    return this._json(route, 405, { message: `método não simulado: ${method}` });
  }
}

module.exports = { FakeSupabase, MOCK_HOST, MOCK_URL, MOCK_KEY };
