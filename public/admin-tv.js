const params = new URLSearchParams(window.location.search);
const tvId = params.get('tv');

if (!tvId) {
  alert('TV não informada');
  throw new Error('TV não informada');
}

const form = document.getElementById('formUpload');
const status = document.getElementById('status');
const tbody = document.getElementById('playlist');
const salvarBtn = document.getElementById('salvar');

/**
 * UPLOAD
 */
form.addEventListener('submit', async e => {
  e.preventDefault();

  const file = document.getElementById('arquivo').files[0];
  if (!file) return;

  const fd = new FormData();
  fd.append('arquivo', file);

  status.textContent = 'Enviando...';

  const res = await fetch(`/api/midia/${tvId}`, {
    method: 'POST',
    body: fd
  });

  status.textContent = res.ok ? 'Upload OK' : 'Erro no upload';
  carregarPlaylist();
});

/**
 * CARREGAR PLAYLIST
 */
async function carregarPlaylist() {
  tbody.innerHTML = '';

  const res = await fetch(`/api/midia/${tvId}`);
  const itens = await res.json();

  itens.forEach(item => {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id;

    tr.innerHTML = `
      <td>${item.tipo}</td>
      <td>${item.url}</td>
      <td>
        <input type="number" value="${item.ordem || 0}">
      </td>
      <td>
        ${item.tipo === 'imagem'
          ? `<input type="number" value="${item.duracao || 10}">`
          : '-'}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/**
 * SALVAR PLAYLIST
 */
salvarBtn.addEventListener('click', async () => {
  const itens = [];

  tbody.querySelectorAll('tr').forEach(tr => {
    const inputs = tr.querySelectorAll('input');

    itens.push({
      id: tr.dataset.id,
      ordem: Number(inputs[0].value),
      duracao: inputs[1] ? Number(inputs[1].value) : null
    });
  });

  const res = await fetch(`/api/playlist/${tvId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itens })
  });

  alert(res.ok ? 'Playlist salva' : 'Erro ao salvar');
});

carregarPlaylist();
