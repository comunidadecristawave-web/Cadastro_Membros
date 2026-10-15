/* ============================================
   WAVE CÉLULAS — Controller Principal & Router SPA
   (V1: Foco Exclusivo em Administrador com Gestor de Tema Dark/Light)
   ============================================ */

window.WaveTheme = {
  init() {
    const saved = localStorage.getItem('wave_theme') || 'dark';
    this.setTheme(saved);
  },

  getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wave_theme', theme);
    this.updateToggles();
  },

  toggle() {
    const current = this.getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  },

  updateToggles() {
    const current = this.getTheme();
    const isDark = current === 'dark';
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" style="width:16px;height:16px;"></i>`;
      btn.title = isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro';
    });
    if (window.lucide) lucide.createIcons();
  }
};

// Inicialização imediata de tema para evitar flashes
WaveTheme.init();

window.WaveApp = {
  _currentPage: 'login',
  _pageParam: null,
  _history: [],
  PUBLIC_PAGES: ['login', 'cadastro-publico'],

  init() {
    WaveTheme.init();

    const hash = window.location.hash.slice(1);
    if (hash) {
      const parts = hash.split('/');
      this._currentPage = parts[0] || 'login';
      this._pageParam = parts[1] || null;
    } else {
      this._currentPage = WaveAuth.isAuthenticated() ? 'admin' : 'login';
    }

    if (!WaveAuth.isAuthenticated() && !WaveApp.PUBLIC_PAGES.includes(this._currentPage)) {
      this._currentPage = 'login';
      window.location.hash = 'login';
    }

    this.renderCurrentPage();
    this.updateNav();

    // Realtime/autosync só depois que o client do Supabase existe — no F5 com sessão
    // salva o /api/config costuma responder depois do DOMContentLoaded.
    if (window.supabaseInitPromise) {
      window.supabaseInitPromise.then(() => {
        if (WaveAuth.isAuthenticated()) {
          this.iniciarRealtimeMembros();
          this.iniciarAutoSync();
        }
      });
    }

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1);
      const parts = hash.split('/');
      this._currentPage = parts[0] || 'login';
      this._pageParam = parts[1] || null;

      if (!WaveAuth.isAuthenticated() && !WaveApp.PUBLIC_PAGES.includes(this._currentPage)) {
        this._currentPage = 'login';
        window.location.hash = 'login';
      }

      this.renderCurrentPage();
      this.updateNav();
    });

    // Fechar menu do usuário ao clicar fora
    document.addEventListener('click', (e) => {
      const container = document.querySelector('.admin-user-menu-container');
      if (container && !container.contains(e.target)) {
        this.closeUserMenu();
      }
    });
  },

  navigate(page, param = null) {
    this._history.push({ page: this._currentPage, param: this._pageParam });
    this._currentPage = page;
    this._pageParam = param;

    const hash = param ? `${page}/${param}` : page;
    if (window.location.hash === `#${hash}`) {
      this.renderCurrentPage();
      this.updateNav();
    } else {
      window.location.hash = hash;
    }
  },

  goBack() {
    if (this._history.length > 0) {
      const prev = this._history.pop();
      this._currentPage = prev.page;
      this._pageParam = prev.param;
      const hash = prev.param ? `${prev.page}/${prev.param}` : prev.page;
      window.location.hash = hash;
    } else {
      this.navigate('admin');
    }
  },

  // Rede de segurança contra dados/fotos desatualizados na tela: o Realtime cobre
  // a maioria dos casos, mas uma aba que ficou em segundo plano por um tempo pode
  // perder a conexão do websocket sem avisar. Isso resincroniza sozinho sempre que
  // a aba volta a ficar visível, e periodicamente como reforço — sem interromper
  // quem estiver com um formulário/modal aberto no meio de uma edição. O throttle
  // de _autoSyncIntervaloMinimo evita re-renderizar a tela inteira (perdendo scroll,
  // fechando menus abertos etc.) toda vez que a pessoa só troca de aba e volta rápido.
  _formularioAberto() {
    return !!(
      document.querySelector('.modal-overlay.open form') ||
      document.querySelector('#cadastro-publico-form') ||
      this._currentPage === 'cadastro-publico'
    );
  },

  _ultimoAutoSync: 0,
  _autoSyncIntervaloMinimo: 90 * 1000,

  // Sync que ficou devendo porque o Realtime reconectou com formulário aberto
  // (não troca `membros` sob um formulário) — roda no próximo _autoSyncSeNecessario,
  // sem esperar o throttle.
  _syncPendente: false,

  _autoSyncSeNecessario() {
    const agora = Date.now();
    if (
      document.visibilityState === 'visible' &&
      WaveAuth.isAuthenticated() &&
      !this._formularioAberto() &&
      (this._syncPendente || (agora - this._ultimoAutoSync) >= this._autoSyncIntervaloMinimo)
    ) {
      this._syncPendente = false;
      this._ultimoAutoSync = agora;
      WaveData.syncSupabase();
    }
  },

  // Aba voltou ao foco: se o canal do Realtime caiu, reinscreve já (a sync vem ao
  // confirmar SUBSCRIBED, cobrindo os eventos perdidos); senão, sync com throttle.
  _aoVoltarFoco() {
    if (document.visibilityState !== 'visible' || !WaveAuth.isAuthenticated()) return;
    if (this._realtimeCaido()) {
      if (this._realtimeTimerReconexao) {
        clearTimeout(this._realtimeTimerReconexao);
        this._realtimeTimerReconexao = null;
      }
      this._realtimeHouveQueda = true;
      this._reinscreverRealtime();
    } else {
      this._autoSyncSeNecessario();
    }
  },

  iniciarAutoSync() {
    if (this._autoSyncAtivo) return;
    this._autoSyncAtivo = true;

    document.addEventListener('visibilitychange', () => this._aoVoltarFoco());
    setInterval(() => this._autoSyncSeNecessario(), 5 * 60 * 1000);
  },

  // Atualiza a lista de membros em tempo real (via Supabase Realtime) sempre que
  // alguém preenche o cadastro público ou algo muda na tabela `pessoas` — sem
  // precisar dar F5. Requer Realtime habilitado pra tabela `pessoas` no Supabase
  // (Database > Replication no painel) — se não estiver habilitado, o canal
  // conecta normalmente mas nenhum evento chega, e o app segue funcionando como
  // antes (só sem o "instantâneo").
  //
  // Estabilidade: eventos são agrupados por id numa janela curta (_LOTE_REALTIME_MS)
  // e aplicados juntos, com no máximo 1 redesenho por lote — e só se alguma linha
  // mudou de verdade. Quedas do canal são recuperadas com reinscrição e espera
  // crescente; cada canal tem uma "geração" para ignorar callbacks de canais velhos.
  _realtimeChannel: null,
  _realtimeStatus: null,
  _realtimeGeracao: 0,
  _realtimeParado: true,
  _realtimeTentativas: 0,
  _realtimeTimerReconexao: null,
  _realtimeReinscrevendo: false,
  _realtimeHouveQueda: false,
  _REALTIME_ESPERA_MAX_MS: 30 * 1000,
  _filaRealtime: {},
  _timerLoteRealtime: null,
  _LOTE_REALTIME_MS: 300,
  _LOTE_REALTIME_MAX_IDS: 50,         // ids por busca `in.(…)` (limite de URL em importações grandes)
  _loteRealtimeEmAndamento: false,
  _idsExcluidosRealtime: new Set(),
  _realtimeTimerEstavel: null,        // zera o backoff só após o canal ficar estável
  _REALTIME_ESTAVEL_MS: 30 * 1000,
  _SYNC_RECONEXAO_MIN_MS: 10 * 1000,  // canal "piscando" não dispara sync a cada reconexão
  _realtimeRemocao: null,             // removeChannel em andamento (logout) — aguardar antes de recriar

  iniciarRealtimeMembros() {
    this._realtimeParado = false;
    if (this._realtimeChannel || this._realtimeReinscrevendo || !window.supabaseClient) return;
    if (this._realtimeRemocao) {
      // logout→login rápido: o canal antigo de mesmo tópico ainda está saindo
      this._reinscreverRealtime();
      return;
    }
    this._criarCanalRealtime();
  },

  _limparTimerEstavel() {
    if (this._realtimeTimerEstavel) {
      clearTimeout(this._realtimeTimerEstavel);
      this._realtimeTimerEstavel = null;
    }
  },

  _criarCanalRealtime() {
    const geracao = ++this._realtimeGeracao;
    this._realtimeStatus = null;
    this._realtimeChannel = window.supabaseClient
      .channel('pessoas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pessoas' }, (payload) => {
        if (geracao === this._realtimeGeracao && !this._realtimeParado) this._receberEventoRealtime(payload);
      })
      .subscribe((status) => this._aoStatusRealtime(status, geracao));
  },

  _realtimeCaido() {
    if (this._realtimeParado || !window.supabaseClient || this._realtimeReinscrevendo) return false;
    if (!this._realtimeChannel) return true;
    return ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(this._realtimeStatus);
  },

  // Status do canal (callback do subscribe). `geracao` omitida = canal atual.
  _aoStatusRealtime(status, geracao = this._realtimeGeracao) {
    if (geracao !== this._realtimeGeracao || this._realtimeParado) return;
    this._realtimeStatus = status;

    if (status === 'SUBSCRIBED') {
      if (this._realtimeTimerReconexao) {
        clearTimeout(this._realtimeTimerReconexao);
        this._realtimeTimerReconexao = null;
      }
      // Só zera a espera crescente se o canal ficar de pé por um tempo — um canal que
      // conecta e cai em seguida continua com o backoff alto.
      this._limparTimerEstavel();
      this._realtimeTimerEstavel = setTimeout(() => {
        this._realtimeTimerEstavel = null;
        this._realtimeTentativas = 0;
      }, this._REALTIME_ESTAVEL_MS);
      if (this._realtimeHouveQueda) {
        // Eventos podem ter se perdido durante a queda: 1 sync para alinhar
        // (no máximo a cada _SYNC_RECONEXAO_MIN_MS; senão fica pendente).
        this._realtimeHouveQueda = false;
        const agora = Date.now();
        if (!this._formularioAberto() && (agora - this._ultimoAutoSync) >= this._SYNC_RECONEXAO_MIN_MS) {
          this._ultimoAutoSync = agora;
          WaveData.syncSupabase();
        } else {
          this._syncPendente = true;
        }
      }
      return;
    }

    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      this._limparTimerEstavel();
      this._realtimeHouveQueda = true;
      this._agendarReconexaoRealtime();
    }
  },

  _agendarReconexaoRealtime() {
    if (this._realtimeTimerReconexao || this._realtimeParado) return;
    const espera = Math.min(1000 * Math.pow(2, this._realtimeTentativas), this._REALTIME_ESPERA_MAX_MS);
    this._realtimeTentativas++;
    this._realtimeTimerReconexao = setTimeout(() => {
      this._realtimeTimerReconexao = null;
      this._reinscreverRealtime();
    }, espera);
  },

  async _reinscreverRealtime() {
    if (this._realtimeParado || this._realtimeReinscrevendo || !window.supabaseClient) return;
    this._realtimeReinscrevendo = true;
    try {
      const antigo = this._realtimeChannel;
      // Invalida callbacks do canal antigo (inclusive o CLOSED gerado pelo removeChannel)
      this._realtimeGeracao++;
      this._realtimeChannel = null;
      this._realtimeStatus = null;
      if (antigo) {
        // realtime-js reaproveita canal de mesmo tópico: precisa sair antes de recriar
        try { await window.supabaseClient.removeChannel(antigo); } catch (e) {}
      }
      if (this._realtimeRemocao) await this._realtimeRemocao;
    } finally {
      this._realtimeReinscrevendo = false;
    }
    if (this._realtimeParado || this._realtimeChannel || !window.supabaseClient) return;
    this._criarCanalRealtime();
  },

  // Recebe um evento do Realtime. O payload é só um SINAL ("algo mudou no id X"):
  // nunca é usado como dado — o payload.new às vezes vem incompleto (ex: sem
  // foto_url) e já apagou fotos válidas em memória. A linha é rebuscada no lote.
  _receberEventoRealtime(payload) {
    if (!payload) return;
    const id = (payload.new && payload.new.id) || (payload.old && payload.old.id);
    if (!id) return;
    // DELETE sobrescreve um UPDATE/INSERT pendente do mesmo id (nunca rebusca id deletado)
    this._filaRealtime[id] = payload.eventType === 'DELETE' ? 'DELETE' : 'UPSERT';
    this._agendarLoteRealtime();
  },

  _agendarLoteRealtime() {
    // Lotes são serializados: com um lote em andamento, os eventos novos esperam na
    // fila e são processados quando ele terminar (busca antiga nunca sobrescreve nova).
    if (this._timerLoteRealtime || this._loteRealtimeEmAndamento) return;
    this._timerLoteRealtime = setTimeout(() => {
      this._timerLoteRealtime = null;
      this._processarLoteRealtime();
    }, this._LOTE_REALTIME_MS);
  },

  async _processarLoteRealtime() {
    if (this._loteRealtimeEmAndamento) return;
    this._loteRealtimeEmAndamento = true;
    try {
      await this._aplicarLoteRealtime();
    } finally {
      this._loteRealtimeEmAndamento = false;
      if (!this._realtimeParado && Object.keys(this._filaRealtime).length > 0) this._agendarLoteRealtime();
    }
  },

  async _aplicarLoteRealtime() {
    const fila = this._filaRealtime;
    this._filaRealtime = {};
    const ids = Object.keys(fila);
    if (ids.length === 0) return;

    const geracao = this._realtimeGeracao;
    const idsExcluir = ids.filter(id => fila[id] === 'DELETE');
    const idsBuscar = ids.filter(id => fila[id] !== 'DELETE');

    let linhas = [];
    let falhou = false;
    if (idsBuscar.length > 0) {
      if (!window.supabaseClient) {
        falhou = true;
      } else {
        for (let i = 0; i < idsBuscar.length; i += this._LOTE_REALTIME_MAX_IDS) {
          const parte = idsBuscar.slice(i, i + this._LOTE_REALTIME_MAX_IDS);
          try {
            const { data, error } = await window.supabaseClient
              .from('pessoas')
              .select('*')
              .in('id', parte);
            if (error) throw error;
            linhas = linhas.concat(data || []);
          } catch (e) {
            console.warn('[Realtime] Falha ao buscar linhas após mudança:', e);
            falhou = true;
          }
        }
      }
    }

    // Logout (ou troca de canal) durante a busca: não mexe em memória nem na tela
    if (this._realtimeParado) return;
    if (geracao !== this._realtimeGeracao) {
      this._syncPendente = true;
      return;
    }
    // Atualização perdida: o próximo _autoSyncSeNecessario recupera com sync completo
    if (falhou) this._syncPendente = true;

    idsExcluir.forEach(id => this._idsExcluidosRealtime.add(id));
    let houveMudanca = false;
    const novos = [];

    for (const id of idsExcluir) {
      delete WaveData._linhasCruas[id];
      const antes = WaveData.membros.length;
      WaveData.membros = WaveData.membros.filter(m => m.id !== id);
      if (WaveData.membros.length !== antes) houveMudanca = true;
    }

    for (const linha of linhas) {
      // Excluído enquanto a busca estava em andamento: não ressuscitar
      if (!linha || !linha.id || this._idsExcluidosRealtime.has(linha.id)) continue;
      const crua = JSON.stringify(linha);
      if (WaveData._linhasCruas[linha.id] === crua) continue; // nada mudou de verdade
      WaveData._linhasCruas[linha.id] = crua;

      const membro = WaveData._parsePessoaFromDB(linha);
      const existente = WaveData.membros.find(m => m.id === membro.id);
      if (existente) {
        // Muta o objeto existente em vez de trocar a referência: se uma ficha ou
        // formulário de edição já estava aberto segurando esse objeto (ex:
        // this._membroDetalhes), ele continua enxergando os dados atualizados em vez
        // de sobrescrever o banco com dados antigos ao salvar depois.
        Object.assign(existente, membro);
      } else {
        WaveData.membros.push(membro);
        novos.push(membro);
      }
      houveMudanca = true;
    }

    if (!houveMudanca) return;

    WaveData.recalcularEstatisticas();
    // Evita atropelar formulários abertos (modal do admin ou cadastro público):
    // os dados já estão em memória, só a tela não é redesenhada.
    if (!this._formularioAberto()) {
      // Referência externa fica oculta em todo o app — inclusive no toast
      novos.filter(m => !m.referenciaExterna)
        .forEach(m => this.showToast(`🆕 Novo cadastro: ${m.nome}`, 'success'));
      this.renderCurrentPage(true);
    } else if (this._currentPage === 'cadastro-publico' && window.WavePages && window.WavePages['cadastro-publico']) {
      // Atualiza apenas a lista de líderes sem resetar os campos do formulário
      window.WavePages['cadastro-publico'].atualizarListaLideres();
    }
  },

  pararRealtimeMembros() {
    this._realtimeParado = true;
    this._realtimeGeracao++;
    if (this._realtimeTimerReconexao) {
      clearTimeout(this._realtimeTimerReconexao);
      this._realtimeTimerReconexao = null;
    }
    if (this._timerLoteRealtime) {
      clearTimeout(this._timerLoteRealtime);
      this._timerLoteRealtime = null;
    }
    this._limparTimerEstavel();
    this._filaRealtime = {};
    this._idsExcluidosRealtime.clear();
    if (this._realtimeChannel && window.supabaseClient) {
      // Guarda a remoção: um login logo em seguida espera ela terminar antes de
      // recriar o canal (realtime-js reaproveita canal de mesmo tópico).
      let remocao;
      try {
        remocao = Promise.resolve(window.supabaseClient.removeChannel(this._realtimeChannel)).catch(() => {});
      } catch (e) {
        remocao = Promise.resolve();
      }
      this._realtimeRemocao = remocao;
      remocao.then(() => {
        if (this._realtimeRemocao === remocao) this._realtimeRemocao = null;
      });
    }
    this._realtimeChannel = null;
    this._realtimeStatus = null;
    this._realtimeTentativas = 0;
    this._realtimeHouveQueda = false;
  },

  // preservarPosicao=true é pra re-renders disparados por dados chegando por trás
  // (sync automático, Realtime) — mantém rolagem e o campo focado como estavam,
  // em vez do salto pro topo que faz sentido só numa navegação de verdade.
  renderCurrentPage(preservarPosicao = false) {
    const container = document.getElementById('page-content');
    if (!container) return;
    // Boas-vindas não mostra dados de membros: redesenho de fundo só reiniciaria a
    // barra de progresso e os timers de redirecionamento.
    if (preservarPosicao && this._currentPage === 'boas-vindas') return;

    let scrollContainerSalvo = 0, scrollJanelaSalvo = 0, seletorFoco = null, selStart = null, selEnd = null;
    if (preservarPosicao) {
      scrollContainerSalvo = container.scrollTop;
      scrollJanelaSalvo = window.scrollY;
      const ativo = document.activeElement;
      if (ativo && ativo.id && container.contains(ativo)) {
        seletorFoco = '#' + CSS.escape(ativo.id);
        if (typeof ativo.selectionStart === 'number') {
          selStart = ativo.selectionStart;
          selEnd = ativo.selectionEnd;
        }
      }
    }

    let html = '';
    const page = WavePages[this._currentPage];

    if (page) {
      html = page.render(this._pageParam);
    } else {
      html = `
        <div class="card empty-state" style="padding:var(--space-4xl);">
          <i data-lucide="alert-circle" style="width:48px;height:48px;color:var(--text-tertiary);"></i>
          <h3 style="margin-top:var(--space-md);color:var(--text-primary);">Página não encontrada</h3>
          <p style="color:var(--text-secondary);margin-top:var(--space-xs);margin-bottom:var(--space-lg);">A rota informada não existe ou foi descontinuada na v1.</p>
          <button class="btn btn-primary" onclick="WaveApp.navigate('admin')">Voltar ao Painel</button>
        </div>
      `;
    }

    // Redesenho de fundo (sync/Realtime) entra sem animação de entrada — senão a
    // tela "pisca" a cada atualização. Navegação normal mantém as animações.
    container.classList.toggle('sem-animacao', !!preservarPosicao);
    container.innerHTML = html;

    if (window.lucide) {
      lucide.createIcons();
    }

    if (preservarPosicao) {
      container.scrollTop = scrollContainerSalvo;
      window.scrollTo(0, scrollJanelaSalvo);
      if (seletorFoco) {
        const elFoco = container.querySelector(seletorFoco);
        if (elFoco) {
          elFoco.focus({ preventScroll: true });
          if (selStart !== null && typeof elFoco.setSelectionRange === 'function') {
            try { elFoco.setSelectionRange(selStart, selEnd); } catch (e) {}
          }
        }
      }
    } else {
      container.scrollTop = 0;
      window.scrollTo(0, 0);
    }

    if (page && page.onMount) {
      page.onMount();
    }

    this.updateNav();
  },

  updateNav() {
    const isLogin = this._currentPage === 'login';
    const isWelcome = this._currentPage === 'boas-vindas';
    const isCadastroPublico = this._currentPage === 'cadastro-publico';
    const isCleanLayout = isLogin || isWelcome || isCadastroPublico;
    const adminNav = document.getElementById('admin-nav');
    const adminTopNavbar = document.getElementById('admin-top-navbar');
    const mobileHeader = document.getElementById('mobile-header');

    const appEl = document.querySelector('.app');
    if (appEl) {
      appEl.classList.toggle('is-login', isLogin);
      appEl.classList.toggle('is-welcome', isWelcome);
      appEl.classList.toggle('admin-mode', !isCleanLayout);
    }

    if (isCleanLayout) {
      if (adminNav) adminNav.style.display = 'none';
      if (adminTopNavbar) adminTopNavbar.style.display = 'none';
      if (mobileHeader) mobileHeader.style.display = 'none';
      return;
    }

    // Exibição responsiva de navegação para Admin
    const isPerfil = this._currentPage === 'perfil-usuario';
    if (adminTopNavbar) adminTopNavbar.style.display = window.innerWidth > 768 ? 'block' : 'none';
    if (adminNav) adminNav.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    if (mobileHeader) mobileHeader.style.display = (window.innerWidth <= 768 && !isPerfil) ? 'flex' : 'none';

    // Atualiza dados do usuário logado no cabeçalho
    const user = WaveAuth.getUser() || WaveData.currentUser;
    if (user) {
      const headerName = document.getElementById('header-user-name');
      const headerRole = document.getElementById('header-user-role');
      const dropName = document.getElementById('dropdown-user-name');
      const dropEmail = document.getElementById('dropdown-user-email');
      const headerImg = document.getElementById('header-avatar-img');
      const mobileHeaderImg = document.getElementById('mobile-header-avatar-img');

      if (headerName) headerName.textContent = user.nome ? user.nome.split(' ')[0] : 'Administrador';
      if (headerRole) headerRole.textContent = 'ADMIN';
      if (dropName) dropName.textContent = user.nome || 'Administrador Wave';
      if (dropEmail) dropEmail.textContent = user.email || '';
      const defaultAvatar = (window.WaveAuth && window.WaveAuth.DEFAULT_AVATAR) ? window.WaveAuth.DEFAULT_AVATAR : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%2327272a' rx='40'/%3E%3Ccircle cx='40' cy='31' r='13' fill='%23a1a1aa'/%3E%3Cpath d='M19 67c0-11.6 9.4-21 21-21s21 9.4 21 21z' fill='%23a1a1aa'/%3E%3C/svg%3E";
      const fotoSrc = (user && user.foto) ? user.foto : defaultAvatar;
      if (headerImg) headerImg.src = fotoSrc;
      if (mobileHeaderImg) mobileHeaderImg.src = fotoSrc;
    }

    if (window.WaveTheme) {
      WaveTheme.updateToggles();
    }

    document.querySelectorAll('#admin-nav .nav-item').forEach(item => {
      const page = item.getAttribute('data-page');
      item.classList.toggle('active', page === this._currentPage);
    });

    document.querySelectorAll('.admin-nav-link').forEach(item => {
      const page = item.getAttribute('data-page');
      item.classList.toggle('active', page === this._currentPage);
    });
  },

  toggleUserMenu(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('admin-user-dropdown');
    const pill = document.getElementById('admin-user-pill');
    const user = WaveAuth.getUser() || (window.WaveData && window.WaveData.currentUser);
    if (user) {
      const dropName = document.getElementById('dropdown-user-name');
      const dropEmail = document.getElementById('dropdown-user-email');
      if (dropName) dropName.textContent = user.nome || 'Administrador Wave';
      if (dropEmail) dropEmail.textContent = user.email || '';
    }
    if (dropdown) dropdown.classList.toggle('open');
    if (pill) pill.classList.toggle('open');
  },

  closeUserMenu() {
    const dropdown = document.getElementById('admin-user-dropdown');
    const pill = document.getElementById('admin-user-pill');
    if (dropdown) dropdown.classList.remove('open');
    if (pill) pill.classList.remove('open');
  },

  // Amplia a foto de um avatar (ex: selfie do formulário público) em tela cheia,
  // pra identificação visual rápida no dia a dia — chamado a partir de qualquer
  // avatar que tenha foto (ver WaveData.avatarConteudo).
  verFotoGrande(fotoUrl, nome = '') {
    if (!fotoUrl) return;
    this.fecharFotoGrande();

    const overlay = document.createElement('div');
    overlay.id = 'wave-foto-grande-overlay';
    overlay.className = 'wave-foto-overlay';
    overlay.innerHTML = `
      <div class="wave-foto-card" onclick="event.stopPropagation()">
        <button type="button" class="wave-foto-close" onclick="WaveApp.fecharFotoGrande()" aria-label="Fechar">
          <i data-lucide="x" style="width:20px;height:20px;"></i>
        </button>
        <img src="${fotoUrl}" alt="${this.escapeHTML(nome)}">
        ${nome ? `<div class="wave-foto-nome">${this.escapeHTML(nome)}</div>` : ''}
      </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons();
    requestAnimationFrame(() => overlay.classList.add('open'));

    overlay.addEventListener('click', () => this.fecharFotoGrande());
    this._fotoGrandeKeyHandler = (e) => {
      if (e.key === 'Escape') this.fecharFotoGrande();
    };
    document.addEventListener('keydown', this._fotoGrandeKeyHandler);
  },

  fecharFotoGrande() {
    const overlay = document.getElementById('wave-foto-grande-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    if (this._fotoGrandeKeyHandler) {
      document.removeEventListener('keydown', this._fotoGrandeKeyHandler);
      this._fotoGrandeKeyHandler = null;
    }
    setTimeout(() => overlay.remove(), 200);
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // 4 tipos com cor e ícone próprios; tipo desconhecido cai em 'success'
    const icones = { success: 'check-circle', info: 'info', warning: 'alert-triangle', danger: 'alert-circle' };
    if (!icones[type]) type = 'success';
    const persistente = type === 'danger'; // erro fica até o usuário fechar

    // Pilha de no máximo 3: remove o(s) mais antigo(s) antes de entrar o novo
    const ativos = container.querySelectorAll('.toast-notification:not(.saindo)');
    for (let i = 0; i <= ativos.length - 3; i++) ativos[i].remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.setAttribute('role', persistente ? 'alert' : 'status');
    toast.innerHTML = `
      <i data-lucide="${icones[type]}" class="toast-icon"></i>
      <span class="toast-msg">${this.escapeHTML(message)}</span>
      ${persistente ? '<button type="button" class="toast-close" aria-label="Fechar"><i data-lucide="x" style="width:16px;height:16px;"></i></button>' : ''}
    `;

    const fechar = () => {
      if (toast.classList.contains('saindo')) return;
      toast.classList.add('saindo');
      toast.style.transition = 'all 0.3s var(--ease-out)';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    };

    const btnFechar = toast.querySelector('.toast-close');
    if (btnFechar) btnFechar.addEventListener('click', fechar);

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    if (!persistente) setTimeout(fechar, 4000);
  },

  // BUG-07: Sanitização estrita contra XSS
  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // BUG-07: Neutralização de CSV Formula Injection (RFC 4180 + Segurança OWASP)
  sanitizeCSVCell(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();
    // Neutraliza fórmulas perigosas (=, +, -, @, \t, \r)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  },

  dialog({
    title = 'Atenção',
    message = '',
    type = 'warning', // 'warning', 'danger', 'info', 'success'
    confirmText = 'OK',
    cancelText = null, // se fornecido, exibe botão de cancelar e retorna booleano
    danger = false
  } = {}) {
    return new Promise((resolve) => {
      // Remove qualquer dialog anterior se existir
      const existing = document.getElementById('wave-global-dialog');
      if (existing) existing.remove();

      let iconName = 'alert-triangle';
      if (type === 'danger') iconName = 'alert-circle';
      else if (type === 'success') iconName = 'check-circle';
      else if (type === 'info') iconName = 'info';

      const isDangerAction = danger || type === 'danger';

      const overlay = document.createElement('div');
      overlay.id = 'wave-global-dialog';
      overlay.className = 'wave-dialog-overlay';
      overlay.innerHTML = `
        <div class="wave-dialog-card animate-in" onclick="event.stopPropagation()">
          <div class="wave-dialog-icon ${type}">
            <i data-lucide="${iconName}" style="width:26px;height:26px;"></i>
          </div>
          <div class="wave-dialog-body">
            <h3 class="wave-dialog-title">${title}</h3>
            <p class="wave-dialog-message">${message}</p>
          </div>
          <div class="wave-dialog-actions ${cancelText ? 'dual' : 'single'}">
            ${cancelText ? `
              <button type="button" class="btn btn-secondary wave-dialog-btn" id="wave-dialog-cancel-btn">
                ${cancelText}
              </button>
            ` : ''}
            <button type="button" class="btn ${isDangerAction ? 'wave-dialog-btn-danger' : 'btn-primary'} wave-dialog-btn" id="wave-dialog-confirm-btn">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      if (window.lucide) lucide.createIcons();

      // Forçar reflow para ativar transição CSS
      requestAnimationFrame(() => {
        overlay.classList.add('open');
      });

      const close = (result) => {
        overlay.classList.remove('open');
        document.removeEventListener('keydown', handleKey);
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 220);
      };

      const handleKey = (e) => {
        if (e.key === 'Escape') {
          close(cancelText ? false : true);
        } else if (e.key === 'Enter') {
          close(true);
        }
      };

      document.addEventListener('keydown', handleKey);

      overlay.addEventListener('click', () => {
        close(cancelText ? false : true);
      });

      const confirmBtn = overlay.querySelector('#wave-dialog-confirm-btn');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => close(true));
        confirmBtn.focus();
      }

      const cancelBtn = overlay.querySelector('#wave-dialog-cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => close(false));
      }
    });
  },

  alert(message, title = 'Atenção', type = 'warning') {
    return this.dialog({
      title,
      message,
      type,
      confirmText: 'Entendi'
    });
  },

  confirm(message, title = 'Confirmação', { confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning', danger = false } = {}) {
    return this.dialog({
      title,
      message,
      type,
      confirmText,
      cancelText,
      danger: danger || type === 'danger'
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  WaveApp.init();
  window.addEventListener('resize', () => WaveApp.updateNav());
});
