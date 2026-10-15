/* ============================================
   WAVE CÉLULAS — Reusable UI Components
   (v1 — Apenas componentes utilizados no fluxo Admin)
   ============================================ */

window.WaveComponents = {

  // Ícone oficial do WhatsApp (Lucide não tem ícones de marca). Usar antes do número
  // em todo link wa.me, para deixar claro que é um botão que abre a conversa.
  iconeWhatsApp(tamanho = 14) {
    return `<svg class="icone-whatsapp" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" style="flex-shrink:0;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
  },

  searchBar(placeholder = 'Buscar...', id = 'search-input') {
    return `
      <div class="search-bar">
        <i data-lucide="search" class="search-icon"></i>
        <input type="text" placeholder="${placeholder}" id="${id}">
      </div>
    `;
  },

  sectionHeader(icon, title, actionText = '', actionClick = '') {
    return `
      <div class="section-header">
        <h3 class="section-title">
          <i data-lucide="${icon}"></i> ${title}
        </h3>
        ${actionText ? `<span class="section-action" onclick="${actionClick}">${actionText}</span>` : ''}
      </div>
    `;
  },

  birthdayCard(membro) {
    const hoje = new Date();
    const nasc = WaveData.parseDataLocal(membro.dataNascimento);
    const diaNasc = nasc.getDate();
    const diaHoje = hoje.getDate();

    let dateLabel = '';
    if (diaNasc === diaHoje) dateLabel = 'Hoje 🎉';
    else if (diaNasc === diaHoje + 1) dateLabel = 'Amanhã';
    else {
      const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), diaNasc);
      dateLabel = dias[d.getDay()] + ', ' + diaNasc + '/' + (hoje.getMonth() + 1);
    }

    const nome = membro.nome.split(' ')[0];
    const whatsNum = (membro.whatsapp || '').replace(/\D/g, '');
    const msg = encodeURIComponent(`Fala ${nome}, parabéns! Que Deus te abençoe muito nesse novo ano de vida! Tamo junto na célula! 🙏🎂`);

    return `
      <div class="birthday-card animate-in">
        <div style="width:36px;height:36px;border-radius:var(--radius-full);background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;color:var(--white);flex-shrink:0;overflow:hidden;">
          ${WaveData.avatarConteudo(membro)}
        </div>
        <span class="birthday-name">${membro.nome}</span>
        <span class="birthday-date">${dateLabel}</span>
        ${whatsNum ? `
          <a href="https://wa.me/${whatsNum}?text=${msg}" target="_blank" class="btn btn-whatsapp" style="width:100%;margin-top:4px;">
            <i data-lucide="message-circle" style="width:14px;height:14px;"></i> Parabéns
          </a>
        ` : ''}
      </div>
    `;
  },

  hubCard(icon, title, subtitle, onclick) {
    return `
      <div class="hub-card" onclick="${onclick}">
        <div class="hub-icon white">
          <i data-lucide="${icon}" style="width:22px;height:22px;"></i>
        </div>
        <span class="hub-card-title">${title}</span>
        <span class="hub-card-sub">${subtitle}</span>
      </div>
    `;
  }
};
