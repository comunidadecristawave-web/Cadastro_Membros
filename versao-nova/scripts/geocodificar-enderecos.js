#!/usr/bin/env node
/* Pré-carga da geocodificação dos endereços das células (mapa do painel).

   Rodar UMA vez antes da subida do mapa, DEPOIS do SQL
   versao-nova/requisitos/sql/2026-10-geocodificacao-enderecos.sql:

     SUPABASE_URL=... SUPABASE_ANON_KEY=... node versao-nova/scripts/geocodificar-enderecos.js
     node versao-nova/scripts/geocodificar-enderecos.js --config https://<site>/api/config
     ... --dry-run   (consulta o Nominatim, mas não grava nada)

   - Só LÊ `pessoas` (apenas colunas de endereço/status/celulas_json — sem nome/telefone)
     e só ESCREVE em `geocodificacao_enderecos` (upsert por endereco_chave).
   - Mesma regra de endereço e de chave do app (js/geocodificacao.js).
   - Pula chaves já gravadas ("não encontrado" é tentado de novo após 30 dias).
   - Nominatim: 1 requisição a cada 1,1 s; para em 429/403 ou erro (pode rodar de novo:
     o que já foi gravado é pulado).
   - Imprime só contagens — nunca nome nem endereço.
   Node ≥ 18, sem dependências. */

'use strict';

const path = require('path');
const G = require(path.join(__dirname, '..', 'js', 'geocodificacao.js'));

const USER_AGENT = 'WaveCelulas-PreCargaMapa/1.0 (portal de membros da Comunidade Crista Wave; geocodificacao unica dos enderecos das celulas)';
const NOMINATIM = process.env.NOMINATIM_URL || G.URL_NOMINATIM;
const TIMEOUT_MS = 15000;

function args() {
  const a = process.argv.slice(2);
  const out = { dryRun: a.includes('--dry-run'), config: null };
  const i = a.indexOf('--config');
  if (i >= 0) out.config = a[i + 1] || null;
  return out;
}

const dormir = ms => new Promise(r => setTimeout(r, ms));

async function comTimeout(url, opcoes = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opcoes, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function credenciais(opts) {
  let url = process.env.SUPABASE_URL || '';
  let key = process.env.SUPABASE_ANON_KEY || '';
  if (opts.config) {
    const r = await comTimeout(opts.config);
    if (!r.ok) throw new Error(`--config respondeu HTTP ${r.status}`);
    const cfg = await r.json();
    url = cfg.supabaseUrl || url;
    key = cfg.supabaseAnonKey || key;
  }
  if (!url || !key) throw new Error('Informe SUPABASE_URL e SUPABASE_ANON_KEY (env) ou --config <url do /api/config>.');
  return { url: url.replace(/\/+$/, ''), key };
}

function cabecalhos(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json', ...extra };
}

async function lerPessoas({ url, key }) {
  const colunas = 'status,e_lider,referencia_externa,rua,numero,bairro,cidade,celulas_json';
  const r = await comTimeout(`${url}/rest/v1/pessoas?select=${colunas}`, { headers: cabecalhos(key) });
  if (!r.ok) throw new Error(`leitura de pessoas: HTTP ${r.status}`);
  return r.json();
}

async function lerTabela({ url, key }) {
  const r = await comTimeout(`${url}/rest/v1/geocodificacao_enderecos?select=endereco_chave,lat,lng,encontrado,atualizado_em`, { headers: cabecalhos(key) });
  if (!r.ok) {
    throw new Error(`a tabela geocodificacao_enderecos não pôde ser lida (HTTP ${r.status}). Rode antes o SQL 2026-10-geocodificacao-enderecos.sql.`);
  }
  return r.json();
}

async function gravar({ url, key }, linha) {
  const r = await comTimeout(`${url}/rest/v1/geocodificacao_enderecos?on_conflict=endereco_chave`, {
    method: 'POST',
    headers: cabecalhos(key, { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify([linha])
  });
  if (!r.ok) throw new Error(`gravação: HTTP ${r.status}`);
}

/** Mesma regra do app: líderes ativos e visíveis; célula 'outro' usa o próprio endereço, senão o do líder. */
function enderecosDasCelulas(pessoas) {
  const lista = [];
  for (const p of pessoas) {
    if (p.e_lider !== true || (p.status || 'ATIVO') !== 'ATIVO' || p.referencia_externa === true) continue;
    let celulas = [];
    try {
      celulas = typeof p.celulas_json === 'string' ? JSON.parse(p.celulas_json || '[]') : (p.celulas_json || []);
    } catch (e) { celulas = []; }
    if (!Array.isArray(celulas) || celulas.length === 0) celulas = [null]; // célula padrão (residencial)
    for (const c of celulas) lista.push(G.enderecoDaCelula(c, p));
  }
  return lista;
}

async function main() {
  const opts = args();
  const cred = await credenciais(opts);
  const pessoas = await lerPessoas(cred);
  const tabela = await lerTabela(cred);

  const agora = Date.now();
  const gravadas = new Map();
  for (const l of tabela) if (G.linhaValida(l, agora)) gravadas.set(l.endereco_chave, l);

  const enderecos = enderecosDasCelulas(pessoas);
  const porChave = new Map();
  let semEndereco = 0;
  const cidades = new Map();
  for (const e of enderecos) {
    const chave = G.chaveEndereco(e);
    if (!chave) { semEndereco++; continue; }
    if (!porChave.has(chave)) porChave.set(chave, e);
    const cn = G.normalizarCidade(e.cidade);
    if (cn !== 'mandaguari' && !cidades.has(cn)) cidades.set(cn, G.rotuloCidade(e.cidade));
  }

  // Centro das outras cidades (seletor do mapa) entra junto, na mesma tabela
  const tarefas = [];
  for (const [chave, end] of porChave) tarefas.push({ chave, tipo: 'endereco', end });
  for (const [cn, rotulo] of cidades) tarefas.push({ chave: G.chaveCidade(cn), tipo: 'cidade', rotulo });

  const pendentes = tarefas.filter(t => !gravadas.has(t.chave));
  console.log(`Células: ${enderecos.length} (${semEndereco} sem endereço). Endereços únicos: ${porChave.size}. Cidades extras: ${cidades.size}.`);
  console.log(`Já gravados: ${tarefas.length - pendentes.length}. A consultar agora: ${pendentes.length}.${opts.dryRun ? ' (--dry-run: nada será gravado)' : ''}`);

  let ultima = 0;
  const buscar = async (params) => {
    const espera = ultima + G.INTERVALO_NOMINATIM_MS - Date.now();
    if (espera > 0) await dormir(espera);
    ultima = Date.now();
    const r = await comTimeout(G.montarUrl(params, NOMINATIM), { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', 'Accept-Language': 'pt-BR' } });
    if (G.statusBloqueio(r.status)) {
      const err = new Error(`Nominatim recusou (HTTP ${r.status})`);
      err.parar = true;
      throw err;
    }
    if (!r.ok) throw new Error(`Nominatim HTTP ${r.status}`);
    return r.json();
  };

  let feitos = 0;
  let interrompido = null;
  const resultados = new Map();
  for (const t of pendentes) {
    let res;
    try {
      res = t.tipo === 'cidade' ? await G.geocodificarCidade(t.rotulo, buscar) : await G.geocodificarEndereco(t.end, buscar);
    } catch (e) {
      interrompido = e.message;
      break;
    }
    resultados.set(t.chave, res);
    if (!opts.dryRun) {
      try {
        await gravar(cred, G.linhaParaGravar(t.chave, res));
      } catch (e) {
        interrompido = e.message;
        break;
      }
    }
    feitos++;
    if (feitos % 10 === 0) console.log(`... ${feitos} de ${pendentes.length} consultados`);
  }

  let encontrados = 0;
  for (const [chave] of porChave) {
    const g = gravadas.get(chave);
    const r = resultados.get(chave);
    if ((r && r.encontrado) || (!r && g && g.encontrado)) encontrados++;
  }
  console.log(`${encontrados} de ${porChave.size} endereços encontrados.`);
  if (interrompido) {
    console.error(`Interrompido: ${interrompido}. Rode de novo mais tarde — o que já foi gravado é pulado.`);
    process.exitCode = 2;
  }
}

main().catch(e => {
  console.error(`Erro: ${e.message}`);
  process.exitCode = 1;
});
