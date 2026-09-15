const express = require("express");
const router = express.Router();
const db = require("../database");

/* =========================
   PLAYLIST PARA O PLAYER
   Busca mídias ativas via campanhas vinculadas à TV
   + mídias legadas vinculadas diretamente por tv_id
   Retorna também configurações de frequência da TV
========================= */
router.get("/:tv", async (req, res) => {
  const { tv } = req.params;

  try {
    // 1️⃣ Buscar mídias via campanhas vinculadas à TV
    const midiasCampanha = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT m.id, m.tipo, m.url, m.duracao,
                m.data_inicio, m.data_fim, m.hora_inicio, m.hora_fim, m.dias_semana
         FROM midias m
         INNER JOIN campanha_tvs ct ON m.campanha_id = ct.campanha_id
         INNER JOIN campanhas c ON c.id = m.campanha_id
         WHERE ct.tv_id = ?
           AND m.ativo = 1
           AND c.ativo = 1
         ORDER BY m.ordem ASC`,
        [tv],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // 2️⃣ Buscar mídias legadas (vinculadas diretamente por tv_id)
    const midiasLegado = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, tipo, url, duracao,
                data_inicio, data_fim, hora_inicio, hora_fim, dias_semana
         FROM midias
         WHERE tv_id = ?
           AND ativo = 1
           AND (campanha_id IS NULL OR campanha_id = '')
         ORDER BY ordem ASC`,
        [tv],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // 3️⃣ Combinar e eliminar duplicatas por ID
    const todasMidias = [...midiasCampanha, ...midiasLegado];
    const idsVistos = new Set();
    const midiasUnicas = todasMidias.filter(m => {
      if (idsVistos.has(m.id)) return false;
      idsVistos.add(m.id);
      return true;
    });

    // 4️⃣ Filtrar por agendamento (data, hora, dia da semana)
    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaAtual = agora.toTimeString().slice(0, 5); // HH:MM
    const diaSemana = agora.getDay().toString(); // 0=Dom, 1=Seg, ..., 6=Sáb

    const midiasFiltradas = midiasUnicas.filter(m => {
      // Filtro de data
      if (m.data_inicio && m.data_inicio > hoje) return false;
      if (m.data_fim && m.data_fim < hoje) return false;

      // Filtro de hora
      if (m.hora_inicio && m.hora_fim) {
        if (horaAtual < m.hora_inicio || horaAtual > m.hora_fim) return false;
      }

      // Filtro de dia da semana
      if (m.dias_semana) {
        const diasPermitidos = m.dias_semana.split(',').map(d => d.trim());
        if (!diasPermitidos.includes(diaSemana)) return false;
      }

      return true;
    });

    // 5️⃣ Formatar para o player
    const playlist = midiasFiltradas
      .filter(a => a.url && (a.tipo === "imagem" || a.tipo === "video"))
      .map(a => ({
        id: a.id,
        tipo: a.tipo,
        url: a.url,
        duracao: a.duracao || (a.tipo === "video" ? 20 : 8)
      }));

    if (!playlist.length) {
      playlist.push({
        id: "fallback",
        tipo: "imagem",
        url: "/img/fallback.jpg",
        duracao: 10
      });
    }

    // 6️⃣ Buscar configurações da TV
    const config = await new Promise((resolve, reject) => {
      db.get(
        `SELECT noticias_frequencia, clima_frequencia, noticias_duracao, clima_duracao
         FROM tvs WHERE id = ?`,
        [tv],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || {
            noticias_frequencia: 2,
            clima_frequencia: 4,
            noticias_duracao: 10,
            clima_duracao: 9
          });
        }
      );
    });

    // 7️⃣ Resposta com playlist + config
    res.json({
      playlist,
      config
    });

  } catch (err) {
    console.error("Erro playlist:", err);
    res.json({ playlist: [], config: {} });
  }
});

module.exports = router;