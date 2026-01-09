const tvSelect = document.getElementById('tvSelect');
const resumoDiv = document.getElementById('resumo');
const relatorioMidiasBody = document.getElementById('relatorioMidias');

let tvAtual = null;

/* ===============================
   UTIL: FORMATAR TEMPO (seg -> texto)
================================ */
function formatarTempo(segundos) {
  if (!segundos) return "0s";
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.round(segundos % 60);

  let resultado = [];
  if (h > 0) resultado.push(`${h}h`);
  if (m > 0) resultado.push(`${m}m`);
  if (s > 0 || resultado.length === 0) resultado.push(`${s}s`);
  
  return resultado.join(' ');
}

/* ===============================
   TVs
================================ */
async function carregarTVs() {
  try {
    const res = await fetch('/api/tv');
    const tvs = await res.json();

    tvSelect.innerHTML = '<option value="">Selecione uma TV...</option>';

    tvs.forEach(tv => {
      const opt = document.createElement('option');
      opt.value = tv.id;
      opt.textContent = `${tv.nome} — ${tv.cidade}`;
      tvSelect.appendChild(opt);
    });

    // Se já tinha selecionado antes (reload), mantém
    if (tvAtual) tvSelect.value = tvAtual;
    
  } catch (err) {
    console.error("Erro ao carregar TVs:", err);
    tvSelect.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

// Ao mudar a TV, carrega tudo automaticamente
tvSelect.onchange = () => {
  tvAtual = tvSelect.value;
  if (tvAtual) {
    carregarDadosGerais();
  } else {
    limparTela();
  }
};

function limparTela() {
  resumoDiv.innerHTML = '<div class="card kpi empty"><p>Selecione uma TV.</p></div>';
  relatorioMidiasBody.innerHTML = `<tr><td colspan="4" class="empty-row"><i class="ph ph-chart-line-up"></i>Selecione uma TV acima.</td></tr>`;
}

/* ===============================
   CARREGAR DADOS GERAIS
================================ */
async function carregarDadosGerais() {
  if (!tvAtual) return;
  
  // Feedback visual de carregamento
  resumoDiv.innerHTML = '<p style="color:#aaa">Carregando indicadores...</p>';
  relatorioMidiasBody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:20px">Carregando dados...</td></tr>';

  await Promise.all([carregarResumo(), carregarMidias()]);
}

/* ===============================
   RESUMO (KPIs)
================================ */
async function carregarResumo() {
  try {
    const res = await fetch(`/api/relatorio/${tvAtual}`);
    const dados = await res.json();

    resumoDiv.innerHTML = '';

    if (!dados.length) {
      resumoDiv.innerHTML = '<div class="card kpi"><p>Sem dados de exibição para esta TV.</p></div>';
      return;
    }

    dados.forEach(r => {
      // Define ícone e cor baseado no tipo
      const icon = r.tipo === 'imagem' ? 'ph-image' : 'ph-film-strip';
      const cssClass = r.tipo === 'video' ? 'video' : '';

      const card = document.createElement('div');
      card.className = `card kpi ${cssClass}`;
      
      card.innerHTML = `
        <div class="kpi-icon"><i class="ph ${icon}"></i></div>
        <div class="kpi-label">Total ${r.tipo}s</div>
        <div class="kpi-value">${r.exibicoes} <span style="font-size:14px; opacity:0.5; font-weight:400">exibições</span></div>
        <div class="kpi-sub"><i class="ph ph-clock"></i> Tempo total: ${formatarTempo(r.tempo_total)}</div>
      `;
      resumoDiv.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    resumoDiv.innerHTML = '<p>Erro ao carregar resumo.</p>';
  }
}

/* ===============================
   DETALHE POR MÍDIA (TABELA)
================================ */
async function carregarMidias() {
  try {
    const res = await fetch(`/api/relatorio/${tvAtual}/midias`);
    const dados = await res.json();

    relatorioMidiasBody.innerHTML = '';

    if (!dados.length) {
      relatorioMidiasBody.innerHTML = `<tr><td colspan="4" class="empty-row">Nenhuma mídia registrada no relatório.</td></tr>`;
      return;
    }

    dados.forEach(m => {
      const tr = document.createElement('tr');
      
      // Ícone do tipo
      const tipoIcon = m.tipo === 'imagem' ? 'ph-image' : 'ph-film-strip';
      const tipoClass = m.tipo === 'imagem' ? 'imagem' : 'video';
      
      // Nome do arquivo (tenta pegar do URL ou usa genérico)
      let nomeArquivo = "Arquivo sem nome";
      try {
          const urlObj = new URL(m.url);
          // Pega o final da URL e remove números aleatórios se tiver
          nomeArquivo = urlObj.pathname.split('/').pop().substring(0, 30) + "...";
      } catch (e) {
          nomeArquivo = m.url;
      }

      tr.innerHTML = `
        <td>
          <span class="type-badge ${tipoClass}">
            <i class="ph ${tipoIcon}"></i> ${m.tipo}
          </span>
        </td>
        <td>
          <a href="${m.url}" target="_blank" class="file-link" title="${m.url}">
            ${nomeArquivo} <i class="ph ph-arrow-square-out"></i>
          </a>
        </td>
        <td class="text-center">
          <strong>${m.exibicoes}</strong>
        </td>
        <td class="text-right">
          ${formatarTempo(m.tempo_total)}
        </td>
      `;
      relatorioMidiasBody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    relatorioMidiasBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:red">Erro ao carregar detalhes.</td></tr>`;
  }
}

/* ===============================
   INIT
================================ */
carregarTVs();