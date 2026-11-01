/* ============================================
   WAVE CÉLULAS — Mapa das células (bloco do painel)
   MapLibre GL JS (carregado sob demanda, só no painel) + estilos do OpenFreeMap.
   Posições vêm da tabela `geocodificacao_enderecos` (pré-carga por script) e, para
   endereço novo/alterado, do Nominatim em segundo plano, sem nenhum indicador.

   - Singleton: o elemento do mapa sobrevive ao renderCurrentPage (Realtime/sync) —
     cada onMount do painel só o reanexa no slot, faz resize e o diff dos pinos.
   - Nunca escreve em `pessoas`: a única escrita é o upsert em geocodificacao_enderecos.
   - Detalhe da célula num cartão logo abaixo do mapa (não popup: no celular o popup
     ficava cortado e atrás da bottom nav), montado com createElement/textContent.
   - Enquadra os pinos da cidade/filtro (fitBounds) enquanto o usuário não mexeu no mapa.
   ============================================ */

window.WaveMapaCelulas = {

  LIB_JS: 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  LIB_CSS: 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  SRI_JS: 'sha384-SYKAG6cglRMN0RVvhNeBY0r3FYKNOJtznwA0v7B5Vp9tr31xAHsZC0DqkQ/pZDmj',
  SRI_CSS: 'sha384-MinO0mNliZ3vwppuPOUnGa+iq619pfMhLVUXfC4LHwSCvF9H+6P/KO4Q7qBOYV5V',
  ESTILO_CLARO: 'https://tiles.openfreemap.org/styles/positron',
  ESTILO_ESCURO: 'https://tiles.openfreemap.org/styles/dark',
  ZOOM_CIDADE: 13,
  ZOOM_MAX_ENQUADRE: 14,    // com 1 pino só, ainda mostra o bairro em volta
  TIMEOUT_CARGA_MS: 15000,
  TIMEOUT_NOMINATIM_MS: 10000,
  ESPERA_NOVA_TENTATIVA_MS: 30000,
  CHAVE_ULTIMA_CHAMADA: 'wave_nominatim_ultima',

  MSG_FALHA: 'Não foi possível carregar o mapa agora. O restante do painel funciona normalmente.',
  MSG_SEM_WEBGL: 'Este navegador não conseguiu exibir o mapa.',

  // Estado do singleton
  _wrap: null,
  _mapaEl: null,
  _erroEl: null,
  _avisoEl: null,
  _map: null,
  _markers: new Map(),       // id do pino → { marker, el, cel, offset, assinatura }
  _detalheEl: null,          // cartão da célula selecionada (irmão do slot do mapa)
  _balaoId: null,
  _usuarioMoveu: false,      // arrastou/deu zoom: para de reenquadrar sozinho
  _assinaturaEnquadre: '',
  _observerTema: null,
  _estiloAtual: null,
  _estiloCarregado: false,
  _timerEstilo: null,
  _timerAviso: null,
  _cargaLib: null,
  _criandoMapa: false,
  _semWebGL: false,
  _falhaLibEm: 0,
  _geracao: 0,
  _aoAbrirFicha: null,

  // Dados
  _celulas: [],
  _cidadeAtual: null,        // cidade normalizada
  _finalidadeAtual: 'todas', // 'todas' | 'Evangelística' | 'Liderança'
  _cachePromise: null,
  _tabelaOk: false,
  _gravacaoOk: true,
  _resolvido: new Map(),     // chave → {lat,lng} | null (sem localização)
  _pendentes: new Map(),     // chave → Promise (dedupe)
  _nominatimParado: false,
  _filaLocal: Promise.resolve(),
  _ultimaChamadaMem: 0,
  _atualizacaoAgendada: false,

  /* ───────────── API usada pelo painel ───────────── */

  /** Estado síncrono para o render() do painel: cidades do seletor, cidade atual e contador. */
  estadoBloco() {
    this._celulas = this._coletarCelulas();
    const cidades = this._listarCidades(this._celulas);
    if (!this._cidadeAtual || !cidades.some(c => c.valor === this._cidadeAtual)) {
      this._cidadeAtual = cidades.some(c => c.valor === 'mandaguari')
        ? 'mandaguari'
        : (cidades[0] ? cidades[0].valor : 'mandaguari');
    }
    return {
      cidades,
      cidadeAtual: this._cidadeAtual,
      finalidadeAtual: this._finalidadeAtual,
      semLocalizacao: this._contarSemLocalizacao()
    };
  },

  /** Reanexa (ou cria) o mapa no slot do painel. Chamado no onMount — também nos renders de fundo. */
  montar(area, opcoes = {}) {
    if (!area) return;
    this._aoAbrirFicha = opcoes.aoAbrirFicha || null;
    this._garantirElemento();
    if (this._wrap.parentNode !== area) area.appendChild(this._wrap);
    if (this._map) {
      try { this._map.resize(); } catch (e) {}
    }
    this._sincronizar();
    this._garantirMapa();
    this._aplicarEstadoErro();
    // A cidade atual sumiu dos dados (ex.: única célula da cidade foi apagada) e o estado
    // voltou para o padrão: recentraliza uma vez.
    if (this._map && this._cidadeCentralizada && this._cidadeCentralizada !== this._cidadeAtual) {
      if (!this._enquadrar(true)) this._centralizarCidade(this._cidadeAtual);
    }
    // Render de fundo recriou o bloco: o cartão aberto volta para baixo do novo slot
    if (this._balaoId) {
      if (this._markers.has(this._balaoId)) this._abrirBalao(this._balaoId, { rolar: false });
      else this.fecharBalao();
    }
  },

  _cidadeCentralizada: null,

  trocarCidade(valor) {
    if (!valor || valor === this._cidadeAtual) return;
    this._cidadeAtual = valor;
    this._usuarioMoveu = false;
    this.fecharBalao();
    this._esconderAviso();
    this._atualizarPinos();
    this._atualizarContador();
    // Com pinos, enquadra os pinos; sem nenhum (ainda), vai para o centro da cidade
    if (!this._enquadrar(true)) this._centralizarCidade(valor);
  },

  // Filtro por finalidade: só troca pinos/contador e o estado dos chips (sem re-render do painel)
  trocarFinalidade(valor) {
    if (!['todas', 'Evangelística', 'Liderança'].includes(valor) || valor === this._finalidadeAtual) return;
    this._finalidadeAtual = valor;
    document.querySelectorAll('.mapa-celulas-filtro .chip').forEach(el => {
      const ativo = el.dataset.finalidade === valor;
      el.classList.toggle('active', ativo);
      el.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    });
    this.fecharBalao();
    this._atualizarPinos();
    this._atualizarContador();
  },

  fecharBalao(opcoes = {}) {
    const id = this._balaoId;
    if (this._detalheEl) this._detalheEl.remove();
    this._detalheEl = null;
    this._balaoId = null;
    const m = id && this._markers.get(id);
    if (m) {
      m.el.classList.remove('ativo');
      m.el.setAttribute('aria-expanded', 'false');
      if (opcoes.focarPino) { try { m.el.focus(); } catch (e) {} }
    }
  },

  /** Logout: desmonta tudo (o próximo painel recria do zero). */
  destruir() {
    this._geracao++;
    this.fecharBalao();
    this._markers.forEach(m => { try { m.marker.remove(); } catch (e) {} });
    this._markers.clear();
    if (this._observerTema) { this._observerTema.disconnect(); this._observerTema = null; }
    if (this._timerEstilo) { clearTimeout(this._timerEstilo); this._timerEstilo = null; }
    if (this._timerAviso) { clearTimeout(this._timerAviso); this._timerAviso = null; }
    if (this._map) { try { this._map.remove(); } catch (e) {} }
    if (this._wrap && this._wrap.parentNode) this._wrap.parentNode.removeChild(this._wrap);
    this._map = null;
    this._wrap = this._mapaEl = this._erroEl = this._avisoEl = null;
    this._estiloAtual = null;
    this._estiloCarregado = false;
    this._criandoMapa = false;
    this._celulas = [];
    this._cidadeAtual = null;
    this._finalidadeAtual = 'todas';
    this._usuarioMoveu = false;
    this._assinaturaEnquadre = '';
    this._cidadeCentralizada = null;
    this._cachePromise = null;
    this._cacheLido = false;
    this._tabelaOk = false;
    this._gravacaoOk = true;
    this._resolvido.clear();
    this._pendentes.clear();
    this._nominatimParado = false;
  },

  /* ───────────── Células e cidades ───────────── */

  _coletarCelulas() {
    const G = window.WaveGeocodificacao;
    const pagina = window.WavePages && window.WavePages['admin-lideres'];
    if (!G || !pagina || typeof pagina.getAllCelulasFlat !== 'function') return [];
    const vistos = new Set();
    return pagina.getAllCelulasFlat().map((c, idx) => {
      const end = G.enderecoDaCelula(c.celulaObj || null, c.liderObj || {});
      let id = String(c.id || `cel-${idx}`);
      if (vistos.has(id)) id = `${id}#${idx}`;
      vistos.add(id);
      return {
        id,
        liderId: c.liderId,
        celulaId: c.celulaId || null, // id real da célula (o "Abrir ficha" rola até ela)
        liderNome: c.liderNome || '',
        sexo: c.liderSexo === 'FEMININO' ? 'FEMININO' : 'MASCULINO',
        finalidade: c.finalidade === 'Liderança' ? 'Liderança' : 'Evangelística',
        diaSemana: c.diaSemana || '',
        horario: c.horario || '',
        faixa: (window.WaveData && WaveData.formatFaixaEtaria) ? WaveData.formatFaixaEtaria(c.faixaEtaria) : '',
        bairro: end.bairro,
        cidadeRaw: end.cidade,
        cidade: G.normalizarCidade(end.cidade),
        chave: G.chaveEndereco(end),
        end
      };
    });
  },

  // Cidades normalizadas (caixa/acento/espaço/alias não criam cidade nova); rótulo = grafia mais frequente
  _listarCidades(celulas) {
    const grupos = new Map();
    celulas.forEach(c => {
      if (!grupos.has(c.cidade)) grupos.set(c.cidade, new Map());
      const grafias = grupos.get(c.cidade);
      const g = (c.cidadeRaw || '').replace(/\s+/g, ' ').trim();
      grafias.set(g, (grafias.get(g) || 0) + 1);
    });
    const lista = [];
    grupos.forEach((grafias, valor) => {
      let rotulo = '';
      let max = -1;
      grafias.forEach((n, g) => { if (n > max) { max = n; rotulo = g; } });
      let total = 0;
      grafias.forEach(n => { total += n; });
      lista.push({ valor, rotulo: rotulo || window.WaveGeocodificacao.rotuloCidade(valor), total });
    });
    // Mandaguari primeiro (padrão); depois as cidades com mais células
    const peso = c => (c.valor === 'mandaguari' ? 1 : 0);
    return lista.sort((a, b) => peso(b) - peso(a) || b.total - a.total || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
  },

  // Células da cidade atual que passam no filtro de finalidade (pinos e contador)
  _celulasDaCidade() {
    const f = this._finalidadeAtual;
    return this._celulas.filter(c => c.cidade === this._cidadeAtual && (f === 'todas' || c.finalidade === f));
  },

  // Sem localização = sem endereço, ou resolvido como não encontrado/falha nesta sessão.
  // Pendentes (ainda geocodificando em segundo plano) não contam — entram em silêncio.
  _contarSemLocalizacao() {
    return this._celulasDaCidade().filter(c => !c.chave || (this._resolvido.has(c.chave) && !this._resolvido.get(c.chave))).length;
  },

  _textoContador(n) {
    if (!n) return '';
    return n === 1 ? '1 célula sem localização' : `${n} células sem localização`;
  },

  _atualizarContador() {
    const el = document.getElementById('mapa-celulas-contador');
    if (!el) return;
    const n = this._contarSemLocalizacao();
    el.textContent = this._textoContador(n);
    el.classList.toggle('vazio', !n);
  },

  /* ───────────── Cache (tabela) + geocodificação em segundo plano ───────────── */

  _sincronizar() {
    this._celulas = this._coletarCelulas();
    this._atualizarContador();
    if (!this._cachePromise) {
      const geracao = this._geracao;
      this._cachePromise = this._lerTabela().then(() => {
        if (geracao === this._geracao) this._sincronizar();
      });
      return;
    }
    if (!this._cacheLido) return;

    const porChave = new Map();
    this._celulas.forEach(c => { if (c.chave && !porChave.has(c.chave)) porChave.set(c.chave, c.end); });
    porChave.forEach((end, chave) => {
      if (!this._resolvido.has(chave) && !this._pendentes.has(chave)) this._geocodificarEmSegundoPlano(chave, end);
    });
    this._atualizarPinos();
  },

  _cacheLido: false,

  async _lerTabela() {
    const G = window.WaveGeocodificacao;
    let res = { ok: false, linhas: [] };
    try {
      if (window.WaveSupabase && WaveSupabase.fetchGeocodificacoes) res = await WaveSupabase.fetchGeocodificacoes();
    } catch (e) { res = { ok: false, linhas: [] }; }
    this._tabelaOk = !!res.ok;
    const agora = Date.now();
    (res.linhas || []).forEach(l => {
      if (!l || !l.endereco_chave || !G.linhaValida(l, agora)) return;
      this._resolvido.set(l.endereco_chave, l.encontrado ? { lat: Number(l.lat), lng: Number(l.lng) } : null);
    });
    this._cacheLido = true;
  },

  _geocodificarEmSegundoPlano(chave, end) {
    const G = window.WaveGeocodificacao;
    const geracao = this._geracao;
    const p = G.geocodificarEndereco(end, params => this._buscarNominatim(params, geracao))
      .then(res => {
        if (geracao !== this._geracao) return;
        this._resolvido.set(chave, res.encontrado ? { lat: res.lat, lng: res.lng } : null);
        this._gravar(G.linhaParaGravar(chave, res));
      })
      .catch(() => {
        // Falha/timeout/429: sem localização só nesta sessão; nada é gravado.
        if (geracao === this._geracao) this._resolvido.set(chave, null);
      })
      .then(() => { if (geracao === this._geracao) this._agendarAtualizacao(); });
    this._pendentes.set(chave, p);
    return p;
  },

  _agendarAtualizacao() {
    if (this._atualizacaoAgendada) return;
    this._atualizacaoAgendada = true;
    setTimeout(() => {
      this._atualizacaoAgendada = false;
      this._atualizarPinos();
      this._atualizarContador();
    }, 0);
  },

  _gravar(linha) {
    if (!this._tabelaOk || !this._gravacaoOk || !window.WaveSupabase || !WaveSupabase.upsertGeocodificacao) return;
    WaveSupabase.upsertGeocodificacao(linha).then(ok => { if (!ok) this._gravacaoOk = false; });
  },

  _lerUltimaChamada() {
    let t = this._ultimaChamadaMem;
    try { t = Math.max(t, Number(localStorage.getItem(this.CHAVE_ULTIMA_CHAMADA)) || 0); } catch (e) {}
    return t;
  },

  _marcarChamada() {
    this._ultimaChamadaMem = Date.now();
    try { localStorage.setItem(this.CHAVE_ULTIMA_CHAMADA, String(this._ultimaChamadaMem)); } catch (e) {}
  },

  // Fila serial (entre abas, via Web Locks) com ≥1,1 s entre requisições; para tudo em 429/403.
  _buscarNominatim(params, geracao) {
    const G = window.WaveGeocodificacao;
    const executar = async () => {
      if (geracao !== this._geracao) throw new Error('cancelado');
      if (this._nominatimParado) throw new Error('nominatim parado');
      const espera = this._lerUltimaChamada() + G.INTERVALO_NOMINATIM_MS - Date.now();
      if (espera > 0) await new Promise(r => setTimeout(r, Math.min(espera, G.INTERVALO_NOMINATIM_MS)));
      if (geracao !== this._geracao) throw new Error('cancelado');
      if (this._nominatimParado) throw new Error('nominatim parado');
      this._marcarChamada();
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, this.TIMEOUT_NOMINATIM_MS);
      try {
        const resp = await fetch(G.montarUrl(params), {
          headers: { Accept: 'application/json' },
          signal: ctrl ? ctrl.signal : undefined
        });
        if (G.statusBloqueio(resp.status)) {
          this._nominatimParado = true;
          throw new Error('Nominatim recusou (' + resp.status + ')');
        }
        if (!resp.ok) throw new Error('Nominatim HTTP ' + resp.status);
        return await resp.json();
      } finally {
        clearTimeout(timer);
      }
    };
    if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
      return navigator.locks.request('wave-nominatim', executar);
    }
    const p = this._filaLocal.then(executar, executar);
    this._filaLocal = p.catch(() => {});
    return p;
  },

  /* ───────────── Seletor de cidade / centro ───────────── */

  _centroConhecido(cidade) {
    const G = window.WaveGeocodificacao;
    if (cidade === 'mandaguari') return G.CENTRO_MANDAGUARI;
    const chave = G.chaveCidade(cidade);
    return this._resolvido.get(chave) || null;
  },

  async _centralizarCidade(cidade) {
    const G = window.WaveGeocodificacao;
    const geracao = this._geracao;
    this._cidadeCentralizada = cidade;
    let centro = this._centroConhecido(cidade);
    if (!centro && cidade !== 'mandaguari') {
      const chave = G.chaveCidade(cidade);
      if (this._cachePromise) { try { await this._cachePromise; } catch (e) {} }
      if (geracao !== this._geracao) return;
      if (!this._resolvido.has(chave)) {
        if (!this._pendentes.has(chave)) {
          const info = this._listarCidades(this._celulas).find(c => c.valor === cidade);
          const rotulo = info ? info.rotulo : cidade;
          const p = G.geocodificarCidade(rotulo, params => this._buscarNominatim(params, geracao))
            .then(res => {
              if (geracao !== this._geracao) return;
              this._resolvido.set(chave, res.encontrado ? { lat: res.lat, lng: res.lng } : null);
              this._gravar(G.linhaParaGravar(chave, res));
            })
            .catch(() => {});
          this._pendentes.set(chave, p);
        }
        await this._pendentes.get(chave);
        // falha de rede não fica em _resolvido: libera nova tentativa numa próxima troca
        if (!this._resolvido.has(chave)) this._pendentes.delete(chave);
      }
      if (geracao !== this._geracao) return;
      centro = this._resolvido.get(chave) || null;
    }
    if (this._cidadeAtual !== cidade) return; // trocou de novo enquanto buscava
    if (!centro) {
      const info = this._listarCidades(this._celulas).find(c => c.valor === cidade);
      this._mostrarAviso(`Não foi possível localizar ${info ? info.rotulo : 'esta cidade'} no mapa; ele continua na posição anterior.`);
      return;
    }
    // Pinos apareceram enquanto buscava o centro: o enquadre deles já posicionou o mapa
    if (this._map && !this._markers.size) {
      try { this._map.jumpTo({ center: [centro.lng, centro.lat], zoom: this.ZOOM_CIDADE }); } catch (e) {}
    }
  },

  /* ───────────── MapLibre ───────────── */

  _garantirElemento() {
    if (this._wrap) return;
    const wrap = document.createElement('div');
    wrap.className = 'mapa-celulas-mapa';
    const mapaEl = document.createElement('div');
    mapaEl.className = 'mapa-celulas-canvas';
    const erro = document.createElement('div');
    erro.className = 'mapa-celulas-erro';
    erro.setAttribute('role', 'status');
    erro.hidden = true;
    const aviso = document.createElement('div');
    aviso.className = 'mapa-celulas-aviso';
    aviso.setAttribute('role', 'status');
    aviso.hidden = true;
    wrap.appendChild(mapaEl);
    wrap.appendChild(aviso);
    wrap.appendChild(erro);
    this._wrap = wrap;
    this._mapaEl = mapaEl;
    this._erroEl = erro;
    this._avisoEl = aviso;
  },

  // Falha de carga ganha "Tentar de novo"; sem WebGL não (outra tentativa não muda nada)
  _mostrarErro(msg, { tentarDeNovo = false } = {}) {
    if (!this._erroEl) return;
    this._erroEl.textContent = '';
    const p = document.createElement('p');
    p.textContent = msg;
    this._erroEl.appendChild(p);
    if (tentarDeNovo) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-secondary mapa-celulas-erro-btn';
      btn.textContent = 'Tentar de novo';
      btn.addEventListener('click', () => this._tentarDeNovo());
      this._erroEl.appendChild(btn);
    }
    this._erroEl.hidden = false;
    this.fecharBalao();
    this._aplicarEstadoErro();
  },

  _esconderErro() {
    if (this._erroEl) this._erroEl.hidden = true;
    this._aplicarEstadoErro();
  },

  _tentarDeNovo() {
    if (this._map) {
      // Estilo/tiles não carregaram: recria o mapa do zero
      this._markers.forEach(m => { try { m.marker.remove(); } catch (e) {} });
      this._markers.clear();
      if (this._timerEstilo) { clearTimeout(this._timerEstilo); this._timerEstilo = null; }
      try { this._map.remove(); } catch (e) {}
      this._map = null;
      this._assinaturaEnquadre = '';
    }
    this._falhaLibEm = 0;
    this._esconderErro();
    this._garantirMapa();
  },

  // Com o mapa indisponível, filtro e seletor de cidade ficam desabilitados (não fariam nada)
  _aplicarEstadoErro() {
    const bloco = this._wrap && this._wrap.closest('.mapa-celulas-bloco');
    if (!bloco) return;
    const erro = !!(this._erroEl && !this._erroEl.hidden);
    bloco.classList.toggle('mapa-celulas-indisponivel', erro);
    bloco.querySelectorAll('.mapa-celulas-filtro .chip, .mapa-celulas-cidade').forEach(el => { el.disabled = erro; });
  },

  _mostrarAviso(msg) {
    if (!this._avisoEl) return;
    this._avisoEl.textContent = msg;
    this._avisoEl.hidden = false;
    if (this._timerAviso) clearTimeout(this._timerAviso);
    this._timerAviso = setTimeout(() => { this._timerAviso = null; this._esconderAviso(); }, 8000);
  },

  _esconderAviso() {
    if (this._avisoEl) this._avisoEl.hidden = true;
  },

  _urlEstilo() {
    const tema = window.WaveTheme ? WaveTheme.getTheme() : 'dark';
    return tema === 'light' ? this.ESTILO_CLARO : this.ESTILO_ESCURO;
  },

  // Carga memorizada; falha (CDN fora, SRI, 15 s) libera nova tentativa.
  _carregarLib() {
    if (window.maplibregl && window.maplibregl.Map) return Promise.resolve(window.maplibregl);
    if (this._cargaLib) return this._cargaLib;
    this._cargaLib = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-maplibre]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = this.LIB_CSS;
        link.integrity = this.SRI_CSS;
        link.crossOrigin = 'anonymous';
        link.setAttribute('data-maplibre', '');
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = this.LIB_JS;
      script.integrity = this.SRI_JS;
      script.crossOrigin = 'anonymous';
      script.async = true;
      let fim = false;
      const falhar = () => {
        if (fim) return;
        fim = true;
        clearTimeout(timer);
        script.remove();
        // CSS sai junto: a nova tentativa o adiciona de novo (senão a lib carregaria sem estilo)
        const link = document.querySelector('link[data-maplibre]');
        if (link) link.remove();
        reject(new Error('MapLibre indisponível'));
      };
      const timer = setTimeout(falhar, this.TIMEOUT_CARGA_MS);
      script.onload = () => {
        if (fim) return;
        fim = true;
        clearTimeout(timer);
        if (window.maplibregl && window.maplibregl.Map) resolve(window.maplibregl);
        else reject(new Error('MapLibre sem API'));
      };
      script.onerror = falhar;
      document.head.appendChild(script);
    }).catch(err => {
      this._cargaLib = null;
      throw err;
    });
    return this._cargaLib;
  },

  _garantirMapa() {
    if (this._map || this._criandoMapa || this._semWebGL) return;
    if (this._falhaLibEm && (Date.now() - this._falhaLibEm) < this.ESPERA_NOVA_TENTATIVA_MS) return;
    this._criandoMapa = true;
    const geracao = this._geracao;
    this._carregarLib().then(lib => {
      this._criandoMapa = false;
      if (geracao !== this._geracao || this._map) return;
      this._falhaLibEm = 0;
      this._criarMapa(lib);
    }).catch(() => {
      this._criandoMapa = false;
      if (geracao !== this._geracao) return;
      this._falhaLibEm = Date.now();
      this._mostrarErro(this.MSG_FALHA, { tentarDeNovo: true });
    });
  },

  _criarMapa(lib) {
    const centroConhecido = this._centroConhecido(this._cidadeAtual);
    const centro = centroConhecido || window.WaveGeocodificacao.CENTRO_MANDAGUARI;
    this._cidadeCentralizada = centroConhecido ? this._cidadeAtual : null;
    this._estiloAtual = this._urlEstilo();
    this._estiloCarregado = false;
    try {
      this._map = new lib.Map({
        container: this._mapaEl,
        style: this._estiloAtual,
        center: [centro.lng, centro.lat],
        zoom: this.ZOOM_CIDADE,
        cooperativeGestures: true,
        // Atribuição OpenFreeMap/OpenMapTiles/OpenStreetMap vem do próprio estilo;
        // sempre compacta (botão "i", recolhida no load) para não cobrir o mapa.
        attributionControl: { compact: true },
        locale: {
          'Map.Title': 'Mapa das células',
          'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + rolagem para dar zoom no mapa',
          'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + rolagem para dar zoom no mapa',
          'CooperativeGesturesHandler.MobileHelpText': 'Use dois dedos para mover o mapa',
          'NavigationControl.ZoomIn': 'Aproximar',
          'NavigationControl.ZoomOut': 'Afastar',
          'NavigationControl.ResetBearing': 'Apontar para o norte',
          'AttributionControl.ToggleAttribution': 'Créditos do mapa',
          'Popup.Close': 'Fechar'
        }
      });
    } catch (e) {
      // Sem WebGL: lembra para a sessão — renders seguintes não tentam de novo
      this._map = null;
      this._semWebGL = true;
      this._mostrarErro(this.MSG_SEM_WEBGL);
      return;
    }

    try { this._map.addControl(new lib.NavigationControl({ showCompass: false }), 'top-right'); } catch (e) {}
    try { this._map.addControl(this._controleVerTodas(), 'top-right'); } catch (e) {}
    // Erros de tile/estilo não viram console.error nem derrubam o painel
    this._map.on('error', () => {});
    // Gesto do usuário (originalEvent) para o reenquadre automático; fitBounds/jumpTo não contam
    const marcarMovido = (e) => { if (e && e.originalEvent) this._usuarioMoveu = true; };
    this._map.on('dragstart', marcarMovido);
    this._map.on('zoomstart', marcarMovido);
    this._map.on('moveend', () => this._atualizarFocaveis());
    this._timerEstilo = setTimeout(() => {
      this._timerEstilo = null;
      if (!this._estiloCarregado) this._mostrarErro(this.MSG_FALHA, { tentarDeNovo: true });
    }, this.TIMEOUT_CARGA_MS);
    this._map.once('load', () => {
      this._estiloCarregado = true;
      if (this._timerEstilo) { clearTimeout(this._timerEstilo); this._timerEstilo = null; }
      this._esconderErro();
      // No celular a atribuição compacta nasce aberta e cobre o mapa: começa recolhida (o "i" reabre)
      const attrib = this._mapaEl && this._mapaEl.querySelector('.maplibregl-ctrl-attrib.maplibregl-compact-show');
      if (attrib) {
        attrib.classList.remove('maplibregl-compact-show');
        attrib.removeAttribute('open');
      }
    });

    this._observarTema();
    this._atualizarPinos(); // já enquadra os pinos, se houver
    // Sem pinos e centro da cidade ainda desconhecido (ex.: trocou de cidade antes do mapa existir)
    if (!this._markers.size && !centroConhecido) this._centralizarCidade(this._cidadeAtual);
  },

  // Botão abaixo do zoom: volta a enquadrar todas as células depois que o usuário mexeu no mapa
  _controleVerTodas() {
    const self = this;
    return {
      onAdd() {
        const grupo = document.createElement('div');
        grupo.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mapa-celulas-ver-todas';
        btn.title = 'Ver todas as células';
        btn.setAttribute('aria-label', 'Ver todas as células');
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
        btn.addEventListener('click', () => {
          self._usuarioMoveu = false;
          self._enquadrar(true);
        });
        grupo.appendChild(btn);
        this._el = grupo;
        return grupo;
      },
      onRemove() { if (this._el) this._el.remove(); }
    };
  },

  _observarTema() {
    if (this._observerTema || typeof MutationObserver === 'undefined') return;
    this._observerTema = new MutationObserver(() => {
      if (!this._map) return;
      const url = this._urlEstilo();
      if (url === this._estiloAtual) return;
      this._estiloAtual = url;
      try { this._map.setStyle(url); } catch (e) {}
    });
    this._observerTema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  },

  /* ───────────── Pinos e balão ───────────── */

  _atualizarPinos() {
    const lib = window.maplibregl;
    if (!this._map || !lib) return;

    const visiveis = this._celulasDaCidade()
      .map(c => ({ cel: c, pos: c.chave ? this._resolvido.get(c.chave) : null }))
      .filter(x => x.pos);

    // Pinos no mesmo ponto: espalhados num círculo (offset em px) para não se esconderem
    const grupos = new Map();
    visiveis.forEach(x => {
      const k = `${x.pos.lat.toFixed(5)},${x.pos.lng.toFixed(5)}`;
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(x);
    });
    const desejados = new Map();
    // No celular o espalhamento é maior: a área de toque do pino tem 44px
    const celular = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    const raioBase = celular ? 20 : 12;
    grupos.forEach(lista => {
      lista.sort((a, b) => a.cel.id.localeCompare(b.cel.id));
      const n = lista.length;
      const raio = n <= 1 ? 0 : (n <= 6 ? raioBase : Math.round(raioBase * 1.5));
      lista.forEach((x, i) => {
        const ang = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
        const offset = n <= 1 ? [0, 0] : [Math.round(raio * Math.cos(ang)), Math.round(raio * Math.sin(ang))];
        desejados.set(x.cel.id, { ...x, offset });
      });
    });

    this._markers.forEach((m, id) => {
      if (desejados.has(id)) return;
      if (this._balaoId === id) this.fecharBalao();
      try { m.marker.remove(); } catch (e) {}
      this._markers.delete(id);
    });

    desejados.forEach((d, id) => {
      let m = this._markers.get(id);
      if (!m) {
        const el = document.createElement('div');
        el.className = 'mapa-celulas-pino';
        el.setAttribute('role', 'button');
        el.setAttribute('aria-expanded', 'false');
        el.tabIndex = 0;
        // Clique no pino aberto fecha o cartão; teclado leva o foco para o cartão
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (this._balaoId === id) this.fecharBalao();
          else this._abrirBalao(id);
        });
        el.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this._abrirBalao(id, { focar: true }); }
          else if (ev.key === 'Escape' && this._balaoId) { ev.preventDefault(); this.fecharBalao({ focarPino: true }); }
        });
        let marker;
        try {
          marker = new lib.Marker({ element: el, anchor: 'center' })
            .setLngLat([d.pos.lng, d.pos.lat])
            .addTo(this._map);
        } catch (e) { return; }
        m = { marker, el, assinatura: '' };
        this._markers.set(id, m);
      }
      m.cel = d.cel;
      m.offset = d.offset;
      m.el.dataset.sexo = d.cel.sexo;
      m.el.setAttribute('aria-label', this._rotuloPino(d.cel));
      const assinatura = `${d.pos.lat}|${d.pos.lng}|${d.offset.join(',')}`;
      if (m.assinatura !== assinatura) {
        m.assinatura = assinatura;
        m.el.dataset.lat = String(d.pos.lat);
        m.el.dataset.lng = String(d.pos.lng);
        m.el.dataset.deslocamento = d.offset.join(',');
        try {
          m.marker.setLngLat([d.pos.lng, d.pos.lat]);
          m.marker.setOffset(d.offset);
        } catch (e) {}
        if (this._balaoId === id) this.fecharBalao();
      }
    });

    this._enquadrar(false);
    this._atualizarFocaveis();
  },

  _rotuloPino(c) {
    const quando = [c.diaSemana, c.horario].filter(Boolean).join(' às ');
    return `Célula ${c.finalidade} de ${c.liderNome}${quando ? `, ${quando}` : ''}`;
  },

  /**
   * Enquadra os pinos visíveis. Sem `forcar`, só age quando o conjunto de pinos mudou
   * (cidade, filtro, pino novo) e o usuário ainda não arrastou/deu zoom — renders de
   * fundo com os mesmos pinos não mexem no mapa. Devolve false se não há pinos.
   */
  _enquadrar(forcar) {
    if (!this._map || !this._markers.size) return false;
    const pts = [];
    this._markers.forEach(m => { const ll = m.marker.getLngLat(); if (ll) pts.push(ll); });
    if (!pts.length) return false;
    const assinatura = `${this._cidadeAtual}|${pts.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).sort().join(';')}`;
    if (!forcar && (this._usuarioMoveu || assinatura === this._assinaturaEnquadre)) return true;
    this._assinaturaEnquadre = assinatura;
    this._cidadeCentralizada = this._cidadeAtual;
    if (typeof this._map.fitBounds !== 'function') return true;
    const lats = pts.map(p => p.lat);
    const lngs = pts.map(p => p.lng);
    try {
      this._map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        // folga maior à direita: os controles de zoom ficam ali
        { padding: { top: 48, bottom: 48, left: 48, right: 72 }, maxZoom: this.ZOOM_MAX_ENQUADRE, duration: 0 }
      );
    } catch (e) {}
    return true;
  },

  // Pinos fora da área visível saem da ordem de Tab (senão o foco some "dentro" do mapa)
  _atualizarFocaveis() {
    if (!this._map || typeof this._map.getBounds !== 'function') return;
    let limites;
    try { limites = this._map.getBounds(); } catch (e) { return; }
    if (!limites || typeof limites.contains !== 'function') return;
    this._markers.forEach(m => {
      let dentro = true;
      try { dentro = limites.contains(m.marker.getLngLat()); } catch (e) {}
      m.el.tabIndex = dentro ? 0 : -1;
    });
  },

  // Cartão da célula logo abaixo do slot do mapa: nunca é cortado pelo mapa nem fica atrás da bottom nav
  _abrirBalao(id, opcoes = {}) {
    const m = this._markers.get(id);
    const area = this._wrap && this._wrap.parentNode;
    if (!m || !area) return;
    if (this._balaoId && this._balaoId !== id) this.fecharBalao();
    if (this._detalheEl) this._detalheEl.remove();
    const c = m.cel;

    const box = document.createElement('div');
    box.className = 'mapa-celulas-balao';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', `Célula de ${c.liderNome}`);

    const topo = document.createElement('div');
    topo.className = 'mapa-celulas-balao-topo';
    const ponto = document.createElement('span');
    ponto.className = 'mapa-celulas-ponto';
    ponto.dataset.sexo = c.sexo;
    ponto.setAttribute('aria-hidden', 'true');
    const nome = document.createElement('strong');
    nome.className = 'mapa-celulas-balao-nome';
    nome.textContent = c.liderNome;
    const fechar = document.createElement('button');
    fechar.type = 'button';
    fechar.className = 'mapa-celulas-balao-fechar';
    fechar.setAttribute('aria-label', 'Fechar');
    fechar.textContent = '×';
    fechar.addEventListener('click', () => this.fecharBalao({ focarPino: true }));
    topo.appendChild(ponto);
    topo.appendChild(nome);
    topo.appendChild(fechar);
    box.appendChild(topo);

    const dados = document.createElement('dl');
    dados.className = 'mapa-celulas-balao-dados';
    const linha = (rotulo, valor) => {
      if (!valor) return;
      const dt = document.createElement('dt');
      dt.textContent = rotulo;
      const dd = document.createElement('dd');
      dd.textContent = valor;
      dados.appendChild(dt);
      dados.appendChild(dd);
    };
    linha('Tipo', c.finalidade);
    linha('Quando', [c.diaSemana, c.horario].filter(Boolean).join(' · '));
    linha('Faixa etária', c.faixa);
    linha('Bairro', c.bairro);
    box.appendChild(dados);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary mapa-celulas-balao-btn';
    btn.textContent = 'Abrir ficha';
    btn.addEventListener('click', () => {
      if (typeof this._aoAbrirFicha === 'function') this._aoAbrirFicha(c.liderId, c.celulaId);
    });
    box.appendChild(btn);

    box.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); this.fecharBalao({ focarPino: true }); }
    });

    area.insertAdjacentElement('afterend', box);
    this._detalheEl = box;
    this._balaoId = id;
    m.el.classList.add('ativo');
    m.el.setAttribute('aria-expanded', 'true');
    if (opcoes.focar) { try { btn.focus({ preventScroll: true }); } catch (e) {} }
    if (opcoes.rolar !== false) {
      try { box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
    }
  }
};
