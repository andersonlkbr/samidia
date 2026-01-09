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
  selectTVMidia.innerHTML = '<option value="">Selecione uma TV</option>';

  const agora = Date.now();

  tvs.forEach(tv => {
    const online =
      tv.ultimo_ping &&
      agora - tv.ultimo_ping < 60000;

    const card = document.createElement('div');
    card.className = 'card tv';

    card.innerHTML = `
      <strong>${tv.nome}</strong><br>
      ${tv.cidade}/${tv.estado}<br>
      <span style="color:${online ? '#22c55e' : '#ef4444'}">
        ${online ? 'ONLINE' : 'OFFLINE'}
      </span><br><br>
      <a href="/player.html?tv=${tv.id}" target="_blank">Abrir TV</a>
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
   MÍDIAS (DRAG & DROP)
========================== */
async function carregarMidias() {
  if (!tvAtual) return;

  const res = await fetch(`/api/midia/${tvAtual}`);
  const data = await res.json();

  // ✅ COMPATÍVEL COM RESPOSTA ANTIGA E NOVA
  midiasAtuais = Array.isArray(data)
    ? data
    : data.midias || [];

  listaMidias.innerHTML = '';

  midiasAtuais.forEach(m => {
    const card = document.createElement('div');
    card.className = 'card media';
    card.draggable = true;
    card.dataset.id = m.id;

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.innerHTML =
      m.tipo === 'imagem'
        ? `<img src="${m.url}" />`
        : '🎥 Vídeo';

    const info = document.createElement('div');
    info.className = 'media-info';
    info.innerHTML = `
      <strong>${m.tipo.toUpperCase()}</strong>
      <div class="badges">
        <span class="badge">${m.duracao}s</span>
        <span class="badge">${m.regiao || 'Todas'}</span>
        <span class="badge ${m.ativo ? 'active' : 'inactive'}">
          ${m.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = `
      <button onclick="toggleMidia('${m.id}', ${m.ativo})">
        ${m.ativo ? 'Desativar' : 'Ativar'}
      </button>
      <button onclick="excluirMidia('${m.id}')">Excluir</button>
    `;

    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(actions);

    adicionarDragEventos(card);
    listaMidias.appendChild(card);
  });
}

/* ==========================
   DRAG LOGIC
========================== */
let dragEl = null;

function adicionarDragEventos(el) {
  el.addEventListener('dragstart', () => {
    dragEl = el;
    el.classList.add('dragging');
  });

  el.addEventListener('dragend', async () => {
    el.classList.remove('dragging');
    await salvarOrdem();
  });

  el.addEventListener('dragover', e => {
    e.preventDefault();
    el.classList.add('over');
  });

  el.addEventListener('dragleave', () => {
    el.classList.remove('over');
  });

  el.addEventListener('drop', e => {
    e.preventDefault();
    el.classList.remove('over');

    if (dragEl && dragEl !== el) {
      const els = [...listaMidias.children];
      const dragIndex = els.indexOf(dragEl);
      const dropIndex = els.indexOf(el);

      if (dragIndex < dropIndex) {
        listaMidias.insertBefore(dragEl, el.nextSibling);
      } else {
        listaMidias.insertBefore(dragEl, el);
      }
    }
  });
}

/* ==========================
   SALVAR ORDEM
========================== */
async function salvarOrdem() {
  const ids = [...listaMidias.children].map(
    el => el.dataset.id
  );

  await fetch('/api/midia/ordenar', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
}

/* ==========================
   AÇÕES
========================== */
async function toggleMidia(id, ativo) {
  await fetch(`/api/midia/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ativo: !ativo })
  });
  await carregarMidias();
}

async function excluirMidia(id) {
  if (!confirm('Excluir mídia?')) return;

  // 1. Acha o botão para mudar o texto (Visual)
  const btn = document.querySelector(`button[onclick="excluirMidia('${id}')"]`);
  const textoOriginal = btn.innerText;
  btn.innerText = "Excluindo...";
  btn.disabled = true; // Evita clique duplo

  try {
    const res = await fetch(`/api/midia/${id}`, { method: 'DELETE' });
    
    // Se der erro no servidor (ex: R2 fora do ar), avisa o usuário
    if (!res.ok) {
        alert("Erro ao excluir. Verifique o console.");
        console.error(await res.json());
    }
  } catch (error) {
    alert("Erro de conexão.");
  }

  // 2. Recarrega a lista
  await carregarMidias();
}

/* ==========================
   UPLOAD
========================== */
async function enviarMidia() {
  if (!tvAtual || !arquivoInput.files.length) return;

  const form = new FormData();
  form.append('arquivo', arquivoInput.files[0]);
  form.append('duracao', duracaoInput.value);
  form.append('regiao', regiaoSelect.value);

  await fetch(`/api/midia/${tvAtual}`, {
    method: 'POST',
    body: form
  });

  arquivoInput.value = '';
  await carregarMidias();
}

/* ==========================
   INIT
========================== */
carregarTVs();
