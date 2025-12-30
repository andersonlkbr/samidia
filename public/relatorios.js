const tvSelect = document.getElementById('tvSelect');
const resumoDiv = document.getElementById('resumo');
const relatorioMidiasDiv = document.getElementById('relatorioMidias');

let tvAtual = null;

/* ===============================
   TVs
================================ */
async function carregarTVs() {
  const res = await fetch('/api/tv');
  const tvs = await res.json();

  tvSelect.innerHTML = '';

  tvs.forEach(tv => {
    const opt = document.createElement('option');
    opt.value = tv.id;
    opt.textContent = `${tv.nome} (${tv.cidade}/${tv.estado})`;
    tvSelect.appendChild(opt);
  });

  tvAtual = tvSelect.value;
}

tvSelect.onchange = () => {
  tvAtual = tvSelect.value;
};

/* ===============================
   RESUMO POR TIPO
================================ */
async function carregarResumo() {
  if (!tvAtual) return;

  const res = await fetch(`/api/relatorio/${tvAtual}`);
  const dados = await res.json();

  resumoDiv.innerHTML = '';

  if (!dados.length) {
    resumoDiv.innerHTML = '<i>Nenhum dado ainda</i>';
    return;
  }

  dados.forEach(r => {
    const d = document.createElement('div');
    d.className = 'linha';
    d.innerHTML = `
      <b>${r.tipo.toUpperCase()}</b><br>
      Exibições: ${r.exibicoes}<br>
      Tempo total: ${r.tempo_total || 0} s
    `;
    resumoDiv.appendChild(d);
  });
}

/* ===============================
   DETALHE POR MÍDIA
================================ */
async function carregarMidias() {
  if (!tvAtual) return;

  const res = await fetch(`/api/relatorio/${tvAtual}/midias`);
  const dados = await res.json();

  relatorioMidiasDiv.innerHTML = '';

  if (!dados.length) {
    relatorioMidiasDiv.innerHTML = '<i>Nenhum dado ainda</i>';
    return;
  }

  dados.forEach(m => {
    const d = document.createElement('div');
    d.className = 'linha';
    d.innerHTML = `
      <b>${m.tipo.toUpperCase()}</b><br>
      <span class="small">${m.url}</span><br>
      Exibições: ${m.exibicoes}<br>
      Tempo total: ${m.tempo_total || 0} s
    `;
    relatorioMidiasDiv.appendChild(d);
  });
}

/* ===============================
   INIT
================================ */
carregarTVs();
