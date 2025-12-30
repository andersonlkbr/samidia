async function carregarDashboard() {
  const res = await fetch('/api/dashboard');
  const d = await res.json();

  totalTVs.textContent = d.totalTVs;
  online.textContent = d.online;
  offline.textContent = d.offline;
  midias.textContent = d.midiasAtivas;
  exibicoes.textContent = d.exibicoes;

  if (d.ultimaAtividade) {
    const data = new Date(d.ultimaAtividade);
    ultima.textContent =
      data.toLocaleDateString('pt-BR') +
      ' ' +
      data.toLocaleTimeString('pt-BR');
  } else {
    ultima.textContent = '--';
  }
}

carregarDashboard();
setInterval(carregarDashboard, 30000);
