let tvAtual = null;

/* ==========================
   ELEMENTOS
========================== */
const listaTVs = document.getElementById('listaTVs');
const selectTVMidia = document.getElementById('tvMidiaSelect');
const listaMidias = document.getElementById('listaMidias');

const arquivoInput = document.getElementById('arquivo');
const duracaoInput = document.getElementById('duracao');
const regiaoSelect = document.getElementById('regiao');

/* ==========================
   CARREGAR TVs
========================== */
async function carregarTVs() {
  const res = await fetch('/api/tv');
  const tvs = await res.json();

  // Lista visual
  listaTVs.innerHTML = '';

  // Select de mídia
  selectTVMidia.innerHTML = '<option value="">Selecione uma TV</option>';

  tvs.forEach(tv => {
    // Lista
    const li = document.createElement('li');
    li.textContent = `${tv.nome} (${tv.cidade}/${tv.estado})`;
    listaTVs.appendChild(li);

    // Select
    const opt = document.createElement('option');
    opt.value = tv.id;
    opt.textContent = tv.nome;
    selectTVMidia.appendChild(opt);
  });
}

/* ==========================
   SELECIONAR TV (MIDIA)
========================== */
selectTVMidia.addEventListener('change', async () => {
  tvAtual = selectTVMidia.value;
  await carregarMidias();
});

/* ==========================
   CARREGAR MÍDIAS
========================== */
async function carregarMidias() {
  if (!tvAtual) {
    listaMidias.innerHTML = '';
    return;
  }

  const res = await fetch(`/api/midia/${tvAtual}`);
  const midias = await res.json();

  listaMidias.innerHTML = '';

  midias.forEach(m => {
    const div = document.createElement('div');
    div.className = 'midia-item';

    div.innerHTML = `
      <strong>${m.tipo.toUpperCase()}</strong><br>
      Duração: ${m.duracao || '-'}s<br>
      Região: ${m.regiao || 'Todas'}<br>
      <button onclick="excluirMidia('${m.id}')">Excluir</button>
    `;

    listaMidias.appendChild(div);
  });
}

/* ==========================
   ENVIAR MÍDIA
========================== */
async function enviarMidia() {
  if (!tvAtual) {
    alert('Selecione uma TV');
    return;
  }

  if (!arquivoInput.files.length) {
    alert('Selecione um arquivo');
    return;
  }

  const form = new FormData();
  form.append('arquivo', arquivoInput.files[0]);
  form.append('duracao', duracaoInput.value);
  form.append('regiao', regiaoSelect.value);

  const res = await fetch(`/api/midia/${tvAtual}`, {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    alert('Erro ao enviar mídia');
    return;
  }

  arquivoInput.value = '';
  duracaoInput.value = '';

  await carregarMidias();
}

/* ==========================
   EXCLUIR MÍDIA
========================== */
async function excluirMidia(id) {
  if (!confirm('Excluir mídia?')) return;

  await fetch(`/api/midia/${id}`, { method: 'DELETE' });
  await carregarMidias();
}

/* ==========================
   START
========================== */
carregarTVs();
