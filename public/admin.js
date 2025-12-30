const tvSelect = document.getElementById('tvSelect');
const listaMidias = document.getElementById('listaMidias');
const listaTVs = document.getElementById('listaTVs');

let tvAtual = null;
const baseURL = window.location.origin;

/* ===============================
   TV
================================ */
async function criarTV() {
  if (!tvNome.value || !tvCidade.value || !tvEstado.value) {
    alert('Preencha nome, cidade e estado');
    return;
  }

  await fetch('/api/tv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: tvNome.value,
      cidade: tvCidade.value,
      estado: tvEstado.value
    })
  });

  tvNome.value = '';
  tvCidade.value = '';
  tvEstado.value = '';

  carregarTVs();
}

async function carregarTVs() {
  const res = await fetch('/api/tv');
  const tvs = await res.json();

  listaTVs.innerHTML = '';
  tvSelect.innerHTML = '';

  const agora = Date.now();

  tvs.forEach(tv => {
    const online =
      tv.ultimo_ping && agora - tv.ultimo_ping < 60000;

    const status = online ? '🟢 ONLINE' : '🔴 OFFLINE';
    const link = `${baseURL}/player.html?tv=${tv.id}`;

    const div = document.createElement('div');
    div.className = 'tv-item';
    div.innerHTML = `
      <b>${tv.nome}</b> — ${tv.cidade}/${tv.estado}<br>
      ${status}
      <div class="link">${link}</div>
      <button onclick="window.open('${link}', '_blank')">▶ Abrir Player</button>
      <button onclick="copiar('${link}')">📋 Copiar Link</button>
    `;
    listaTVs.appendChild(div);

    const opt = document.createElement('option');
    opt.value = tv.id;
    opt.textContent = `${tv.nome} (${tv.cidade}/${tv.estado})`;
    tvSelect.appendChild(opt);
  });

  tvAtual = tvSelect.value;
  carregarMidias();
}

tvSelect.onchange = () => {
  tvAtual = tvSelect.value;
  carregarMidias();
};

/* ===============================
   MÍDIAS
================================ */
async function enviarMidia() {
  if (!tvAtual) return alert('Selecione uma TV');
  if (!arquivo.files[0]) return alert('Selecione um arquivo');

  const dias = Array.from(
    document.querySelectorAll('.dia:checked')
  ).map(d => d.value).join(',');

  const form = new FormData();
  form.append('arquivo', arquivo.files[0]);
  form.append('duracao', duracao.value);
  form.append('regiao', regiao.value);
  form.append('hora_inicio', horaInicio.value);
  form.append('hora_fim', horaFim.value);
  form.append('dias', dias);
  form.append(
    'tipo',
    arquivo.files[0].type.startsWith('video') ? 'video' : 'imagem'
  );

  await fetch(`/api/midia/${tvAtual}`, {
    method: 'POST',
    body: form
  });

  carregarMidias();
}

async function carregarMidias() {
  listaMidias.innerHTML = '';

  const res = await fetch(`/api/midia/${tvAtual}`);
  const midias = await res.json();

  midias.forEach((m, i) => {
    const div = document.createElement('div');
    div.className = 'midia' + (m.ativo ? '' : ' inativa');

    div.innerHTML = `
      <div>
        <b>${i + 1}. ${m.tipo.toUpperCase()}</b>
        <div class="info">
          Região: ${m.regiao} |
          Duração: ${m.duracao}s<br>
          Horário: ${m.hora_inicio || '--'} → ${m.hora_fim || '--'} |
          Dias: ${m.dias || 'Todos'}
        </div>
      </div>

      <div class="acoes">
        <button onclick="mover('${m.id}', ${m.ordem - 1})">⬆</button>
        <button onclick="mover('${m.id}', ${m.ordem + 1})">⬇</button>
        <button onclick="toggle('${m.id}')">
          ${m.ativo ? 'Desativar' : 'Ativar'}
        </button>
        <button onclick="excluir('${m.id}')">🗑</button>
      </div>
    `;
    listaMidias.appendChild(div);
  });
}

/* ===============================
   AÇÕES
================================ */
async function mover(id, ordem) {
  await fetch(`/api/midia/ordem/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ordem })
  });
  carregarMidias();
}

async function toggle(id) {
  await fetch(`/api/midia/toggle/${id}`, { method: 'PUT' });
  carregarMidias();
}

async function excluir(id) {
  if (!confirm('Excluir mídia?')) return;
  await fetch(`/api/midia/${id}`, { method: 'DELETE' });
  carregarMidias();
}

async function salvarTema() {
  if (!tvAtual) return alert('Selecione uma TV');

  await fetch(`/api/tv/${tvAtual}/tema`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tema_cor: temaCor.value,
      tema_texto: temaTexto.value,
      logo: temaLogo.value
    })
  });

  alert('Tema salvo!');
}


/* ===============================
   UTILS
================================ */
function copiar(texto) {
  navigator.clipboard.writeText(texto);
  alert('Link copiado!');
}

/* ===============================
   INIT
================================ */
carregarTVs();
