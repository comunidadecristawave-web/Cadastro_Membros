/* ============================================
   WAVE CÉLULAS — Regras de geocodificação dos endereços das células
   Uma regra só, usada pelo mapa do painel (js/mapa-celulas.js) E pelo script de
   pré-carga (scripts/geocodificar-enderecos.js). Sem DOM e sem rede: aqui só se
   monta chave, consultas e se valida a resposta do Nominatim.
   Ao Nominatim vai só endereço (rua, número, bairro, cidade, UF) — nunca nome/telefone.
   ============================================ */

(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (raiz) raiz.WaveGeocodificacao = api;
})(typeof window !== 'undefined' ? window : null, function () {

  const VERSAO_CHAVE = 'v1';
  const CIDADE_PADRAO = 'Mandaguari';
  const ESTADO_PADRAO = 'Paraná'; // o cadastro não tem UF
  const URL_NOMINATIM = 'https://nominatim.openstreetmap.org/search';
  const INTERVALO_NOMINATIM_MS = 1100;
  const REPETIR_NAO_ENCONTRADO_MS = 30 * 24 * 60 * 60 * 1000;

  // Centro da área urbana (posição do lugar "Mandaguari" no OSM/Nominatim, conferida em 01/11/2026)
  const CENTRO_MANDAGUARI = { lat: -23.5225, lng: -51.6788 };
  // viewbox = <lngMin,latMax,lngMax,latMin> (Nominatim) — limites do município com folga
  const VIEWBOX_MANDAGUARI = '-51.84,-23.32,-51.60,-23.66';

  // Grafias que são a mesma cidade (chave já normalizada → chave canônica)
  const ALIAS_CIDADE = { 'jandaia': 'jandaia do sul' };
  // Rótulo enviado ao Nominatim para uma cidade com alias
  const ROTULO_CIDADE = { 'jandaia do sul': 'Jandaia do Sul', 'mandaguari': 'Mandaguari' };

  // Abreviações expandidas na chave (r → rua, av → avenida...)
  const ABREVIACOES = {
    r: 'rua', av: 'avenida', avn: 'avenida', tv: 'travessa', trav: 'travessa',
    al: 'alameda', pca: 'praca', pc: 'praca', rod: 'rodovia', est: 'estrada',
    jd: 'jardim', vl: 'vila', pq: 'parque', res: 'residencial', conj: 'conjunto'
  };

  // Resultado que é a cidade/região inteira não serve como posição de célula
  const TIPOS_REJEITADOS = new Set(['city', 'town', 'municipality', 'county', 'state', 'state_district', 'region', 'country']);
  const TIPOS_DE_CIDADE = new Set(['city', 'town', 'municipality', 'village']);

  function textoLimpo(s) {
    return String(s === null || s === undefined ? '' : s).replace(/\s+/g, ' ').trim();
  }

  // NFD sem acento, minúsculas, pontuação vira espaço, espaços colapsados
  function normalizarTexto(s) {
    return textoLimpo(s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function expandirAbreviacoes(textoNormalizado) {
    if (!textoNormalizado) return '';
    return textoNormalizado.split(' ').map(p => ABREVIACOES[p] || p).join(' ');
  }

  function normalizarNumero(n) {
    return String(n === null || n === undefined ? '' : n).replace(/\D/g, '');
  }

  /** Cidade normalizada (com alias); vazia = Mandaguari. "Mandaguarí ", "mandaguari" → "mandaguari". */
  function normalizarCidade(cidade) {
    const n = normalizarTexto(cidade) || normalizarTexto(CIDADE_PADRAO);
    return ALIAS_CIDADE[n] || n;
  }

  /** Grafia da cidade enviada ao Nominatim (alias resolvido). */
  function rotuloCidade(cidade) {
    const norm = normalizarCidade(cidade);
    if (ROTULO_CIDADE[norm]) return ROTULO_CIDADE[norm];
    return textoLimpo(cidade) || CIDADE_PADRAO;
  }

  function ehMandaguari(cidade) {
    return normalizarCidade(cidade) === 'mandaguari';
  }

  /**
   * Endereço da célula pela mesma regra de getAllCelulasFlat (admin-lideres.js):
   * tipoEndereco 'outro' = endereço da própria célula; senão = endereço do líder.
   * Usa os campos CRUS (sem o 's/n'/'Centro' que enderecoFormatado injeta).
   */
  function enderecoDaCelula(celula, lider) {
    const usaCelula = !!(celula && celula.tipoEndereco === 'outro');
    const origem = usaCelula ? celula : (lider || {});
    return {
      rua: textoLimpo(origem.rua),
      numero: textoLimpo(origem.numero),
      bairro: textoLimpo(origem.bairro),
      cidade: textoLimpo(origem.cidade) || CIDADE_PADRAO
    };
  }

  /** Chave 'v1|rua|numero|bairro|cidade'; null quando não há rua nem bairro (sem como localizar). */
  function chaveEndereco(end) {
    if (!end) return null;
    const rua = expandirAbreviacoes(normalizarTexto(end.rua));
    const bairro = expandirAbreviacoes(normalizarTexto(end.bairro));
    if (!rua && !bairro) return null;
    const numero = rua ? normalizarNumero(end.numero) : '';
    return [VERSAO_CHAVE, rua, numero, bairro, normalizarCidade(end.cidade)].join('|');
  }

  function chaveCidade(cidade) {
    return [VERSAO_CHAVE, 'cidade', normalizarCidade(cidade)].join('|');
  }

  function paramsBase(cidade) {
    const p = { format: 'jsonv2', limit: '1', countrycodes: 'br', addressdetails: '1' };
    if (ehMandaguari(cidade)) {
      p.viewbox = VIEWBOX_MANDAGUARI;
      p.bounded = '1';
    }
    return p;
  }

  /**
   * Tentativas em ordem: rua+número → rua → bairro. Cada uma é { tipo, params }.
   * Só entram as que têm dado para consultar.
   */
  function consultasEndereco(end) {
    if (!end) return [];
    const rua = textoLimpo(end.rua);
    const numero = normalizarNumero(end.numero);
    const bairro = textoLimpo(end.bairro);
    const cidade = rotuloCidade(end.cidade);
    const tentativas = [];
    if (rua && numero) {
      tentativas.push({ tipo: 'numero', params: { ...paramsBase(end.cidade), street: `${numero} ${rua}`, city: cidade, state: ESTADO_PADRAO } });
    }
    if (rua) {
      tentativas.push({ tipo: 'rua', params: { ...paramsBase(end.cidade), street: rua, city: cidade, state: ESTADO_PADRAO } });
    }
    if (bairro) {
      tentativas.push({ tipo: 'bairro', params: { ...paramsBase(end.cidade), q: `${bairro}, ${cidade}, ${ESTADO_PADRAO}` } });
    }
    return tentativas;
  }

  /** Consulta do centro da cidade (seletor de cidade). */
  function consultaCidade(cidade) {
    return { tipo: 'cidade', params: { format: 'jsonv2', limit: '1', countrycodes: 'br', addressdetails: '1', city: rotuloCidade(cidade), state: ESTADO_PADRAO } };
  }

  function montarUrl(params, base) {
    const qs = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    return `${base || URL_NOMINATIM}?${qs}`;
  }

  function coordenadas(r) {
    if (!r) return null;
    const lat = Number(r.lat);
    const lng = Number(r.lon !== undefined ? r.lon : r.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  // Cidade do resultado (addressdetails). Sem esse dado, confia no filtro city= da consulta.
  function resultadoEhDaCidade(r, cidade) {
    const a = (r && r.address) || null;
    if (!a) return true;
    const candidatos = [a.city, a.town, a.village, a.municipality].filter(Boolean);
    if (candidatos.length === 0) return true;
    const alvo = normalizarCidade(cidade);
    return candidatos.some(c => normalizarCidade(c) === alvo);
  }

  /**
   * Valida a resposta (array do jsonv2) de uma tentativa. Devolve {lat,lng} ou null.
   * Rejeita resultado que seja a cidade/região inteira (pino falso no centro) e
   * resultado de outra cidade.
   */
  function validarResultado(resposta, tentativa, cidade) {
    const r = Array.isArray(resposta) ? resposta[0] : null;
    if (!r) return null;
    const pos = coordenadas(r);
    if (!pos) return null;
    const tipo = String(r.addresstype || r.type || '').toLowerCase();
    if (tentativa && tentativa.tipo === 'cidade') {
      // format=jsonv2 devolve `category` (não `class`)
      return TIPOS_DE_CIDADE.has(tipo) || r.category === 'boundary' || r.category === 'place' ? pos : null;
    }
    if (TIPOS_REJEITADOS.has(tipo)) return null;
    if (!resultadoEhDaCidade(r, cidade)) return null;
    return pos;
  }

  /**
   * Geocodifica um endereço pelas tentativas em ordem. `buscar(params)` faz a
   * requisição (fila/intervalo por conta de quem chama) e devolve o array do
   * Nominatim — ou lança erro (HTTP ≠ 200, timeout, 429/403).
   * Resultado: { encontrado: true, lat, lng } | { encontrado: false } (todas as
   * tentativas responderam 200 vazio/rejeitado). Erro de rede/HTTP propaga — não
   * vira "não encontrado".
   */
  async function geocodificarEndereco(end, buscar) {
    const tentativas = consultasEndereco(end);
    for (const t of tentativas) {
      const resposta = await buscar(t.params);
      const pos = validarResultado(resposta, t, end.cidade);
      if (pos) return { encontrado: true, lat: pos.lat, lng: pos.lng };
    }
    return { encontrado: false };
  }

  async function geocodificarCidade(cidade, buscar) {
    const t = consultaCidade(cidade);
    const resposta = await buscar(t.params);
    const pos = validarResultado(resposta, t, cidade);
    return pos ? { encontrado: true, lat: pos.lat, lng: pos.lng } : { encontrado: false };
  }

  /** Linha gravada da tabela ainda vale? (encontrado vale sempre; "não encontrado" expira em 30 dias) */
  function linhaValida(linha, agora) {
    if (!linha) return false;
    if (linha.encontrado) return coordenadas({ lat: linha.lat, lon: linha.lng }) !== null;
    const t = Date.parse(linha.atualizado_em || '');
    if (!Number.isFinite(t)) return false;
    return ((agora === undefined ? Date.now() : agora) - t) < REPETIR_NAO_ENCONTRADO_MS;
  }

  function linhaParaGravar(chave, resultado, agora) {
    return {
      endereco_chave: chave,
      lat: resultado.encontrado ? resultado.lat : null,
      lng: resultado.encontrado ? resultado.lng : null,
      encontrado: !!resultado.encontrado,
      atualizado_em: new Date(agora === undefined ? Date.now() : agora).toISOString()
    };
  }

  /** Status HTTP que mandam parar tudo (limite/bloqueio do Nominatim). */
  function statusBloqueio(status) {
    return status === 429 || status === 403;
  }

  return {
    VERSAO_CHAVE, CIDADE_PADRAO, ESTADO_PADRAO, URL_NOMINATIM, INTERVALO_NOMINATIM_MS,
    REPETIR_NAO_ENCONTRADO_MS, CENTRO_MANDAGUARI, VIEWBOX_MANDAGUARI,
    normalizarTexto, normalizarNumero, normalizarCidade, rotuloCidade, ehMandaguari,
    enderecoDaCelula, chaveEndereco, chaveCidade,
    consultasEndereco, consultaCidade, montarUrl, validarResultado,
    geocodificarEndereco, geocodificarCidade, linhaValida, linhaParaGravar, statusBloqueio
  };
});
