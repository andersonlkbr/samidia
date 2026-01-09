let tvAtual = null;
let midiasAtuais = [];

const tvCards = document.getElementById('tvCards');
const listaMidias = document.getElementById('listaMidias');
const selectTVMidia = document.getElementById('tvMidiaSelect');

const arquivoInput = document.getElementById('arquivo');
const duracaoInput = document.getElementById('duracao');
const regiaoSelect = document.getElementById('regiao');

/* ==========================
   TVs
========================== */
async function carregarTVs() {
  const res = await fetch('/api/tv');
  const tvs = await res.json();

  tvCards.innerHTML = '';
  selectTVMidia.innerHTML = '<option value="">Selecione uma TV...</option>';

  const agora = Date.now();

  tvs.forEach(tv => {
    const online = tv.ultimo_ping && agora - tv.ultimo_ping < 60000;

    const card = document.createElement('div');
    card.className = 'card tv';

    // Ícone de status (bola verde/vermelha)
    const statusColor = online ? 'var(--success)' : 'var(--danger)';
    const statusText = online ? 'ONLINE' : 'OFFLINE';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start">
         <i class="ph-fill ph-television" style="font-size:24px; color:var(--accent)"></i>
         <span style="font-size:10px; font-weight:bold; color:${statusColor}; border:1px solid ${statusColor}; padding:2px 6px; border-radius:4px">${statusText}</span>
      </div>
      <div style="margin-top:15px">
        <strong>${tv.nome}</strong>
        <span style="font-size:13px; color:var(--text-secondary)">${tv.cidade} / ${tv.estado}</span>
      </div>
      <a href="/player.html?tv=${tv.id}" target="_blank">
        <i class="ph ph-arrow-square-out"></i> Abrir Player
      </a>
    `;

    tvCards.appendChild(card);

    const opt = document.createElement('option');
    opt.value = tv.id;
    opt.textContent = tv.nome;
    selectTVMidia.appendChild(opt);
  });
}

selectTVMidia.onchange = async () => {
  tvAtual = selectTVMidia.value;
  await carregarMidias();
};

/* ==========================
   MÍDIAS
========================== */
async function carregarMidias() {
  if (!tvAtual) {
      listaMidias.innerHTML = `
        <div class="empty-state">
          <i class="ph ph-selection-plus"></i>
          <p>Selecione uma TV acima para gerenciar o conteúdo.</p>
        </div>`;
      return;
  }

  const res = await fetch(`/api/midia/${tvAtual}`);
  const data = await res.json();

  midiasAtuais = Array.isArray(data) ? data : data.midias || [];

  listaMidias.innerHTML = '';

  if (midiasAtuais.length === 0) {
      listaMidias.innerHTML = `
        <div class="empty-state">
          <i class="ph ph-image-broken"></i>
          <p>Nenhuma mídia cadastrada nesta TV.</p>
        </div>`;
      return;
  }

  midiasAtuais.forEach(m => {
    const card = document.createElement('div');
    card.className = 'card media';
    card.draggable = true;
    card.dataset.id = m.id;

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    
    // Preview visual
    if (m.tipo === 'imagem') {
        thumb.innerHTML = `<img src="${m.url}" onerror="this.src='/img/fallback.jpg'"/>`;
    } else {
        thumb.innerHTML = `<i class="ph ph-film-strip thumb-icon"></i>`;
    }

    const info = document.createElement('div');
    info.className = 'media-info';
    
    const iconTipo = m.tipo === 'imagem' ? 'ph-image' : 'ph-film-strip';

    info.innerHTML = `
      <strong><i class="ph ${iconTipo}"></i> ${m.tipo.toUpperCase()}</strong>
      <div class="badges">
        <span class="badge"><i class="ph ph-clock"></i> ${m.duracao}s</span>
        <span class="badge"><i class="ph ph-map-pin"></i> ${m.regiao || 'Todas'}</span>
        <span class="badge ${m.ativo ? 'active' : 'inactive'}">
          ${m.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'actions';
    
    // Botões com ícones
    actions.innerHTML = `
      <button onclick="toggleMidia('${m.id}', ${m.ativo})">
        <i class="ph ${m.ativo ? 'ph-eye-slash' : 'ph-eye'}"></i>
        ${m.ativo ? 'Ocultar' : 'Exibir'}
      </button>
      <button onclick="excluirMidia('${m.id}')" class="btn-delete">
        <i class="ph ph-trash"></i> Excluir
      </button>
    `;

    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(actions);

    adicionarDragEventos(card);
    listaMidias.appendChild(card);
  });
}

// ... (O RESTANTE DAS FUNÇÕES DE DRAG, EXCLUIR E UPLOAD CONTINUA IGUAL) ...
// ... Apenas copie e cole o resto do seu admin.js antigo aqui para baixo ...

/* ==========================
   DRAG LOGIC (Mantenha igual)
========================== */
let dragEl = null;

function adicionarDragEventos(el) {
  el.addEventListener('dragstart', () => { dragEl = el; el.classList.add('dragging'); });
  el.addEventListener('dragend', async () => { el.classList.remove('dragging'); await salvarOrdem(); });
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); });
  el.addEventListener('dragleave', () => { el.classList.remove('over'); });
  el.addEventListener('drop', e => {
    e.preventDefault(); el.classList.remove('over');
    if (dragEl && dragEl !== el) {
      const els = [...listaMidias.children];
      const dragIndex = els.indexOf(dragEl);
      const dropIndex = els.indexOf(el);
      if (dragIndex < dropIndex) listaMidias.insertBefore(dragEl, el.nextSibling);
      else listaMidias.insertBefore(dragEl, el);
    }
  });
}

async function salvarOrdem() {
  const ids = [...listaMidias.children].map(el => el.dataset.id);
  await fetch('/api/midia/ordenar', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
}

async function toggleMidia(id, ativo) {
  await fetch(`/api/midia/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: !ativo }) });
  await carregarMidias();
}

async function excluirMidia(id) {
  if (!confirm('Excluir mídia?')) return;
  const btn = document.querySelector(`button[onclick="excluirMidia('${id}')"]`);
  if(btn) { btn.innerHTML = '<i class="ph ph-spinner-gap"></i> ...'; btn.disabled = true; } // Ícone de loading
  
  try {
    const res = await fetch(`/api/midia/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert("Erro ao excluir."); console.error(await res.json()); }
  } catch (error) { alert("Erro de conexão."); }
  await carregarMidias();
}

async function enviarMidia() {
  if (!tvAtual || !arquivoInput.files.length) return;
  
  // Feedback Visual no botão enviar
  const btnEnviar = document.querySelector('.btn-primary');
  const textoOriginal = btnEnviar.innerHTML;
  btnEnviar.innerHTML = '<i class="ph ph-spinner-gap"></i> Enviando...';
  btnEnviar.disabled = true;

  const form = new FormData();
  form.append('arquivo', arquivoInput.files[0]);
  form.append('duracao', duracaoInput.value);
  form.append('regiao', regiaoSelect.value);

  await fetch(`/api/midia/${tvAtual}`, { method: 'POST', body: form });

  arquivoInput.value = '';
  await carregarMidias();
  
  // Restaura botão
  btnEnviar.innerHTML = textoOriginal;
  btnEnviar.disabled = false;
}

// Init
carregarTVs();