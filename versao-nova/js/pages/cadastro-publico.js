/* ============================================
   WAVE CÉLULAS — Formulário Público de Autocadastro
   (Sem login. Link compartilhado com a igreja para
   manter o cadastro de membros sempre atualizado.)
   ============================================ */

window.WavePages = window.WavePages || {};

WavePages['cadastro-publico'] = {

  _enviando: false,
  _enviado: false,
  _erroFoto: '',
  _fotoBase64: null,
  _celula: {
    faixaEtaria: ['Adulto'],
    diaSemana: 'Quinta',
    horario: '20:00',
    tipoEndereco: 'residencial',
    rua: '',
    numero: '',
    bairro: '',
    cidade: 'Mandaguari',
    complemento: ''
  },

  render() {
    if (this._enviado) {
      return `
        <div class="login-container animate-in">
          <div class="login-brand">
            <img src="imagens/Logo-Wave-Vertical.png" alt="Comunidade Wave" style="height:100px;width:auto;object-fit:contain;margin-bottom:var(--space-sm);filter:drop-shadow(0 0 24px rgba(255,255,255,0.18));">
          </div>
          <div class="card login-card" style="text-align:center;">
            <div style="width:64px;height:64px;border-radius:50%;background:var(--success-muted);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-lg);">
              <i data-lucide="check" style="width:32px;height:32px;color:var(--success);"></i>
            </div>
            <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:var(--space-sm);">Cadastro realizado com sucesso!</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;">Obrigado por atualizar seus dados! 🎉</p>
          </div>
        </div>
      `;
    }

    return `
      <style>
        /* Campos abaixo de 16px disparam zoom automático no iOS Safari ao focar,
           deixando a tela "quebrada" até a pessoa dar zoom out manualmente. */
        .cadastro-publico-page input,
        .cadastro-publico-page select,
        .cadastro-publico-page textarea {
          font-size: 16px !important;
        }
        @media (max-width: 480px) {
          .cadastro-publico-page.login-container {
            max-width: 100% !important;
            padding-left: var(--space-md) !important;
            padding-right: var(--space-md) !important;
          }
          .cadastro-publico-page .login-card {
            padding: var(--space-lg) var(--space-md) !important;
          }
          .cadastro-publico-page select {
            text-overflow: ellipsis;
          }
        }
      </style>
      <div class="login-container cadastro-publico-page animate-in" style="max-width:480px;padding-top:var(--space-xl);padding-bottom:var(--space-2xl);">

        <div class="login-brand">
          <img src="imagens/Logo-Wave-Vertical.png" alt="Comunidade Wave" style="height:90px;width:auto;object-fit:contain;margin-bottom:var(--space-sm);filter:drop-shadow(0 0 24px rgba(255,255,255,0.18));">
          <p class="login-subtitle">Cadastro de Membro</p>
        </div>

        <div class="card login-card">
          <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:4px;text-align:center;">Preencha seus dados</h2>
          <p style="font-size:0.8rem;color:var(--text-tertiary);text-align:center;margin-bottom:var(--space-lg);">Leva menos de 2 minutos. Todos os campos com * são obrigatórios.</p>

          <div id="cadastro-publico-erro"></div>

          <form id="cadastro-publico-form" onsubmit="WavePages['cadastro-publico'].enviarCadastro(event)">
            <div style="display:flex;flex-direction:column;gap:var(--space-md);">

              <div class="input-group">
                <label class="input-label">Nome Completo *</label>
                <input class="input-field" type="text" name="nome" placeholder="Ex: Maria Clara Souza" oninput="WavePages['cadastro-publico'].atualizarListaLideres()" required>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);">
                <div class="input-group">
                  <label class="input-label">WhatsApp *</label>
                  <input class="input-field" type="text" name="whatsapp" placeholder="(44) 99999-9999" oninput="WavePages['cadastro-publico'].maskPhone(this)" required>
                </div>
                <div class="input-group">
                  <label class="input-label">Data Nasc. *</label>
                  <input class="input-field" type="date" name="dataNascimento" min="1900-01-01" max="2099-12-31" oninput="WavePages['cadastro-publico'].validarMaxAnoData(this)" required>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);">
                <div class="input-group">
                  <label class="input-label">Sexo *</label>
                  <select class="input-field" name="sexo" id="cp-sexo" onchange="WavePages['cadastro-publico'].atualizarListaLideres()" required>
                    <option value="" selected disabled>Selecione</option>
                    <option value="FEMININO">Feminino</option>
                    <option value="MASCULINO">Masculino</option>
                  </select>
                </div>
                <div class="input-group">
                  <label class="input-label">Tipo Ingresso *</label>
                  <select class="input-field" name="tipoIngresso" required>
                    <option value="" selected disabled>Selecione</option>
                    <option value="Recepção">Recepção</option>
                    <option value="Batismo">Batismo</option>
                  </select>
                </div>
              </div>

              <!-- Endereço Residencial -->
              <div style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);margin-top:4px;padding-top:8px;border-top:1px solid var(--border-subtle);">
                ENDEREÇO RESIDENCIAL
              </div>

              <div style="display:grid;grid-template-columns:3fr 1fr;gap:var(--space-md);">
                <div class="input-group">
                  <label class="input-label">Rua / Logradouro *</label>
                  <input class="input-field" type="text" name="rua" placeholder="Ex: Av. Amazonas" required>
                </div>
                <div class="input-group">
                  <label class="input-label">Nº *</label>
                  <input class="input-field" type="text" name="numero" placeholder="123" required>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);">
                <div class="input-group">
                  <label class="input-label">Bairro *</label>
                  <input class="input-field" type="text" name="bairro" placeholder="Ex: Centro" required>
                </div>
                <div class="input-group">
                  <label class="input-label">Cidade *</label>
                  <input class="input-field" type="text" name="cidade" value="Mandaguari" required>
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">Complemento</label>
                <input class="input-field" type="text" name="complemento" placeholder="Ex: Apto 12">
              </div>

              <!-- Selfie -->
              <div style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);margin-top:4px;padding-top:8px;border-top:1px solid var(--border-subtle);">
                SUA FOTO
              </div>
              <div style="display:flex;align-items:center;gap:var(--space-md);">
                <div id="cp-foto-preview" style="width:64px;height:64px;border-radius:50%;background:var(--bg-elevated);border:2px solid var(--border-medium);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
                  <i data-lucide="camera" style="width:24px;height:24px;color:var(--text-tertiary);"></i>
                </div>
                <div style="flex:1;">
                  <button type="button" class="btn btn-secondary" onclick="WavePages['cadastro-publico'].confirmarEAbrirCamera()" style="display:inline-flex;cursor:pointer;">
                    <i data-lucide="camera" style="width:16px;height:16px;"></i> Tirar Selfie *
                  </button>
                  <input type="file" id="cp-foto-input" accept="image/*" capture="user" style="display:none;" onchange="WavePages['cadastro-publico'].handleFotoChange(event)">
                  <div style="font-size:0.7rem;color:var(--text-tertiary);margin-top:4px;">Abre a câmera do celular. Rosto visível.</div>
                  <div id="cp-foto-erro" style="font-size:0.75rem;color:var(--danger);margin-top:4px;">${this._erroFoto || ''}</div>
                </div>
              </div>

              <!-- Vínculo & Liderança -->
              <div style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);margin-top:4px;padding-top:8px;border-top:1px solid var(--border-subtle);">
                VÍNCULO & LIDERANÇA
              </div>

              <div class="input-group">
                <label class="input-label">Líder Responsável * (Discipulado por)</label>
                <select class="input-field" name="lider" id="cp-lider-select" required>
                  <option value="" selected disabled>Selecione o sexo primeiro</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label">Você é Líder de Célula? *</label>
                <select class="input-field" name="eLider" id="cp-e-lider-select" onchange="WavePages['cadastro-publico'].toggleBlocoLider(this.value)" required>
                  <option value="false" selected>Não (Apenas Discípulo)</option>
                  <option value="true">Sim (Líder de Célula)</option>
                </select>
              </div>

              <div id="cp-celula-bloco" style="display:none;flex-direction:column;gap:var(--space-md);background:var(--bg-elevated);padding:var(--space-md);border-radius:var(--radius-lg);border:1px solid var(--border-medium);">
                <span style="font-size:0.8rem;color:var(--warning);font-weight:700;">👑 Sua Célula (Evangelística)</span>

                <div class="input-group">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <label class="input-label" style="margin-bottom:0;">Faixa Etária *</label>
                  </div>
                  <div id="cp-faixas" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);">
                  <div class="input-group">
                    <label class="input-label">Dia da Célula *</label>
                    <select class="input-field" id="cp-celula-dia" onchange="WavePages['cadastro-publico']._celula.diaSemana = this.value">
                      <option value="Segunda">Segunda-feira</option>
                      <option value="Terça">Terça-feira</option>
                      <option value="Quarta">Quarta-feira</option>
                      <option value="Quinta" selected>Quinta-feira</option>
                      <option value="Sexta">Sexta-feira</option>
                      <option value="Sábado">Sábado</option>
                      <option value="Domingo">Domingo</option>
                    </select>
                  </div>
                  <div class="input-group">
                    <label class="input-label">Horário * (HH:mm)</label>
                    <input class="input-field" type="text" id="cp-celula-horario" value="20:00" oninput="WavePages['cadastro-publico'].maskTime(this)" placeholder="20:00" maxlength="5">
                  </div>
                </div>

                <div class="input-group">
                  <label class="input-label">Local da Célula *</label>
                  <select class="input-field" onchange="WavePages['cadastro-publico'].toggleTipoEndereco(this.value)">
                    <option value="residencial" selected>Usar meu endereço residencial</option>
                    <option value="outro">Outro endereço</option>
                  </select>
                </div>

                <div id="cp-celula-outro-end" style="display:none;flex-direction:column;gap:var(--space-sm);padding:8px;background:var(--bg-card);border-radius:var(--radius-sm);">
                  <div style="display:grid;grid-template-columns:3fr 1fr;gap:var(--space-sm);">
                    <input class="input-field" type="text" placeholder="Rua da Célula" oninput="WavePages['cadastro-publico']._celula.rua = this.value">
                    <input class="input-field" type="text" placeholder="Nº" oninput="WavePages['cadastro-publico']._celula.numero = this.value">
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm);">
                    <input class="input-field" type="text" placeholder="Bairro" oninput="WavePages['cadastro-publico']._celula.bairro = this.value">
                    <input class="input-field" type="text" placeholder="Cidade" value="Mandaguari" oninput="WavePages['cadastro-publico']._celula.cidade = this.value">
                  </div>
                  <input class="input-field" type="text" placeholder="Complemento" oninput="WavePages['cadastro-publico']._celula.complemento = this.value">
                </div>
              </div>

              <!-- Consentimento -->
              <div style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);margin-top:4px;padding-top:8px;border-top:1px solid var(--border-subtle);">
                AUTORIZAÇÃO DE USO DE DADOS E IMAGEM
              </div>
              <div style="font-size:0.75rem;color:var(--text-tertiary);background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:var(--space-md);line-height:1.5;">
                Ao marcar a opção abaixo, autorizo a Comunidade Cristã Wave a armazenar meus dados pessoais (nome, contato, endereço, data de nascimento) e minha foto neste formulário, para fins de identificação, organização pastoral e comunicação interna da igreja, em conformidade com a Lei Geral de Proteção de Dados (LGPD). Meus dados não serão compartilhados com terceiros para fins comerciais. Posso solicitar a atualização ou remoção dos meus dados a qualquer momento, falando com a secretaria.
              </div>
              <div style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;" onclick="document.getElementById('cp-consentimento').click()">
                <input type="checkbox" id="cp-consentimento" name="consentimento" style="width:16px;height:16px;margin-top:2px;accent-color:var(--white);cursor:pointer;flex-shrink:0;" onclick="event.stopPropagation()" required>
                <label for="cp-consentimento" style="font-size:0.82rem;color:var(--text-secondary);cursor:pointer;user-select:none;">Li e autorizo o uso dos meus dados e da minha imagem, conforme descrito acima. *</label>
              </div>

              <button type="submit" id="cp-btn-submit" class="btn btn-primary-lg" style="margin-top:var(--space-sm);cursor:pointer;">
                <i data-lucide="check" style="width:18px;height:18px;"></i> Enviar Cadastro
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  onMount() {
    this.atualizarListaLideres();
    this.renderFaixas();
  },

  // Lista de líderes filtrada por sexo (mesma regra do admin) e excluindo a própria pessoa,
  // caso ela já seja um líder cadastrado preenchendo o formulário pra atualizar seus dados.
  atualizarListaLideres() {
    const select = document.getElementById('cp-lider-select');
    if (!select) return;

    const sexoInput = document.getElementById('cp-sexo');
    const sexo = sexoInput ? sexoInput.value : '';
    const nomeInput = document.querySelector('#cadastro-publico-form [name="nome"]');
    const nomeAtual = nomeInput ? nomeInput.value : '';
    const valorAnterior = select.value;

    if (!sexo) {
      select.innerHTML = `<option value="" selected disabled>Selecione o sexo primeiro</option>`;
      return;
    }

    const nomeNormalizado = WaveData.normalizarNomeAproximado(nomeAtual);
    const lideres = WaveData.getLideresPorSexo(sexo)
      .filter(l => !nomeNormalizado || WaveData.normalizarNomeAproximado(l.nome) !== nomeNormalizado)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (lideres.length === 0) {
      select.innerHTML = `<option value="" selected disabled>Nenhum líder ativo encontrado para este sexo</option>`;
      return;
    }

    let html = `<option value="" disabled selected>Selecione o Líder Responsável</option>`;
    lideres.forEach(l => { html += `<option value="${l.nome}">${l.nome}</option>`; });
    select.innerHTML = html;

    if (valorAnterior && lideres.some(l => l.nome === valorAnterior)) {
      select.value = valorAnterior;
    }
  },

  toggleBlocoLider(val) {
    const el = document.getElementById('cp-celula-bloco');
    if (el) el.style.display = val === 'true' ? 'flex' : 'none';
  },

  toggleTipoEndereco(val) {
    this._celula.tipoEndereco = val;
    const el = document.getElementById('cp-celula-outro-end');
    if (el) el.style.display = val === 'outro' ? 'flex' : 'none';
  },

  async confirmarEAbrirCamera() {
    const ok = await WaveApp.confirm(
      '• Rosto de frente e bem visível<br>• Ambiente iluminado, sem contraluz<br>• Sem óculos escuros, boné ou máscara',
      'Antes de tirar sua foto',
      { confirmText: 'Tirar Foto', cancelText: 'Cancelar', type: 'info' }
    );
    if (ok) {
      const input = document.getElementById('cp-foto-input');
      if (input) input.click();
    }
  },

  renderFaixas() {
    const container = document.getElementById('cp-faixas');
    if (!container) return;
    const opcoes = ['Kids', 'Teens', 'Adolescente', 'Jovem Adulto', 'Adulto'];
    container.innerHTML = opcoes.map(faixa => {
      const isSel = this._celula.faixaEtaria.includes(faixa);
      return `
        <button type="button"
          onclick="WavePages['cadastro-publico'].toggleFaixaEtaria('${faixa}')"
          class="btn btn-sm ${isSel ? 'btn-primary' : 'btn-secondary'}"
          style="font-size:0.75rem;padding:4px 10px;border-radius:var(--radius-full);border:1px solid ${isSel ? 'var(--white)' : 'var(--border-subtle)'};cursor:pointer;">
          ${isSel ? '✓ ' : ''}${faixa}
        </button>
      `;
    }).join('');
    if (window.lucide) lucide.createIcons();
  },

  toggleFaixaEtaria(faixa) {
    const faixas = this._celula.faixaEtaria;
    if (faixas.includes(faixa)) {
      if (faixas.length > 1) this._celula.faixaEtaria = faixas.filter(f => f !== faixa);
      else { WaveApp.showToast('Selecione ao menos 1 faixa etária.', 'danger'); return; }
    } else {
      faixas.push(faixa);
    }
    this.renderFaixas();
  },

  maskPhone(input) {
    if (!input) return;
    let v = input.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length === 0) { input.value = ''; return; }
    if (v.length > 10) input.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    else if (v.length > 6) input.value = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    else if (v.length > 2) input.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    else input.value = `(${v}`;
  },

  maskTime(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 4) v = v.slice(0, 4);
    if (v.length >= 3) {
      let hh = parseInt(v.slice(0, 2), 10);
      if (hh > 23) hh = 23;
      input.value = `${String(hh).padStart(2, '0')}:${v.slice(2)}`;
    } else {
      input.value = v;
    }
    this._celula.horario = input.value;
  },

  validarMaxAnoData(input) {
    if (!input || !input.value) return;
    const parts = input.value.split('-');
    if (parts.length === 3 && parts[0].length > 4) {
      input.value = `${parts[0].slice(0, 4)}-${parts[1]}-${parts[2]}`;
    }
  },

  handleFotoChange(e) {
    const file = e.target.files && e.target.files[0];
    const erroEl = document.getElementById('cp-foto-erro');
    this._erroFoto = '';
    if (erroEl) erroEl.textContent = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this._erroFoto = 'Selecione um arquivo de imagem (JPG ou PNG).';
      if (erroEl) erroEl.textContent = this._erroFoto;
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this._erroFoto = 'A imagem deve ter no máximo 5 MB.';
      if (erroEl) erroEl.textContent = this._erroFoto;
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxLado = 800;
        let { width, height } = img;
        if (width > height && width > maxLado) { height = Math.round(height * (maxLado / width)); width = maxLado; }
        else if (height > maxLado) { width = Math.round(width * (maxLado / height)); height = maxLado; }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        this._fotoBase64 = canvas.toDataURL('image/jpeg', 0.7);

        const preview = document.getElementById('cp-foto-preview');
        if (preview) preview.innerHTML = `<img src="${this._fotoBase64}" style="width:100%;height:100%;object-fit:cover;">`;
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  },

  async enviarCadastro(event) {
    event.preventDefault();
    if (this._enviando) return;
    this._enviando = true;

    const form = event.target;
    const submitBtn = document.getElementById('cp-btn-submit');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    const erroContainer = document.getElementById('cadastro-publico-erro');
    if (erroContainer) erroContainer.innerHTML = '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
      submitBtn.innerHTML = `<span>Enviando...</span>`;
    }

    const mostrarErro = (msg) => {
      if (erroContainer) {
        erroContainer.innerHTML = `
          <div class="alert-card danger" style="margin-bottom:var(--space-md);padding:var(--space-md);">
            <div class="alert-reason" style="color:var(--danger);display:flex;align-items:center;gap:6px;">
              <i data-lucide="alert-circle" style="width:16px;height:16px;flex-shrink:0;"></i>
              <span>${msg}</span>
            </div>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        erroContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    try {
      const data = new FormData(form);
      const nome = (data.get('nome') || '').trim();
      const whatsapp = data.get('whatsapp');
      const dataNascimento = data.get('dataNascimento');
      const tipoIngresso = data.get('tipoIngresso');
      const sexo = data.get('sexo');
      const rua = data.get('rua');
      const numero = data.get('numero');
      const bairro = data.get('bairro');
      const cidade = data.get('cidade') || 'Mandaguari';
      const complemento = data.get('complemento');
      const lider = data.get('lider');
      const eLider = data.get('eLider') === 'true';
      const consentimento = data.get('consentimento') === 'on';

      if (!lider || lider === '—' || lider.trim() === '') {
        mostrarErro('Selecione seu Líder Responsável para continuar.');
        return;
      }

      if (!this._fotoBase64) {
        mostrarErro('Envie uma foto sua para continuar.');
        return;
      }

      if (!consentimento) {
        mostrarErro('Você precisa autorizar o uso dos seus dados e imagem para continuar.');
        return;
      }

      const validacaoSexo = WaveData.validarMesmoSexo(sexo, lider);
      if (!validacaoSexo.ok) {
        mostrarErro(validacaoSexo.message);
        return;
      }

      if (eLider) {
        const validacaoLideranca = WaveData.validarLideradoVirarLider(lider);
        if (!validacaoLideranca.ok) {
          mostrarErro(`Para você virar líder, ${lider} precisa ter uma célula de Liderança cadastrada primeiro. Fale com ${lider} ou com a secretaria antes de reenviar este formulário.`);
          return;
        }
      }

      // Duplicata (nome aproximado OU mesmo WhatsApp, + data de nascimento exata): atualiza
      // o cadastro existente em vez de criar um novo, sobrescrevendo com os dados do formulário.
      const duplicado = WaveData.encontrarDuplicadoAproximado(nome, dataNascimento, whatsapp);

      const payload = {
        nome,
        whatsapp,
        dataNascimento,
        tipoIngresso,
        sexo,
        rua,
        numero,
        bairro,
        cidade,
        complemento,
        lider,
        eLider,
        celulas: eLider ? [{
          id: 'cel-' + Date.now(),
          finalidade: 'Evangelística',
          faixaEtaria: this._celula.faixaEtaria,
          diaSemana: this._celula.diaSemana,
          horario: this._celula.horario,
          tipoEndereco: this._celula.tipoEndereco,
          rua: this._celula.tipoEndereco === 'outro' ? this._celula.rua : '',
          numero: this._celula.tipoEndereco === 'outro' ? this._celula.numero : '',
          bairro: this._celula.tipoEndereco === 'outro' ? this._celula.bairro : '',
          cidade: this._celula.tipoEndereco === 'outro' ? this._celula.cidade : cidade,
          complemento: this._celula.tipoEndereco === 'outro' ? this._celula.complemento : ''
        }] : [],
        foto: this._fotoBase64,
        consentimentoAceito: true,
        consentimentoAceitoEm: new Date().toISOString(),
        status: 'ATIVO'
      };

      let res;
      if (duplicado) {
        res = await WaveData.updateMembro(duplicado.id, payload);
      } else {
        res = await WaveData.addMembro({ ...payload, dataIngresso: new Date().toISOString().split('T')[0] });
      }

      if (!res.ok) {
        mostrarErro(`Não foi possível concluir seu cadastro: ${res.message}. Tente novamente ou procure a secretaria.`);
        return;
      }

      this._enviado = true;
      WaveApp.renderCurrentPage();
    } finally {
      this._enviando = false;
      if (submitBtn && !this._enviado) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  }
};
