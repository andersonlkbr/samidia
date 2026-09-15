const express = require('express');
const db = require('../database');

const router = express.Router();

/* =========================
   DASHBOARD — Métricas gerais
   Aceita ?empresa_id= para filtrar por empresa
========================= */
router.get('/', async (req, res) => {
  const { empresa_id } = req.query;
  const agora = Date.now();
  const LIMITE_ONLINE = 60 * 1000;

  try {
    const filtroEmpresa = empresa_id ? 'WHERE empresa_id = ?' : '';
    const paramsEmpresa = empresa_id ? [empresa_id] : [];

    // Total de TVs
    const totalTVs = await queryGet(
      `SELECT COUNT(*) as total FROM tvs ${filtroEmpresa}`,
      paramsEmpresa
    );

    // TVs online/offline
    const tvsPing = await queryAll(
      `SELECT ultimo_ping FROM tvs ${filtroEmpresa}`,
      paramsEmpresa
    );
    const online = tvsPing.filter(
      t => t.ultimo_ping && agora - t.ultimo_ping < LIMITE_ONLINE
    ).length;

    // Mídias ativas
    let queryMidias = 'SELECT COUNT(*) as total FROM midias WHERE ativo = 1';
    let paramsMidias = [];
    if (empresa_id) {
      queryMidias = `SELECT COUNT(DISTINCT m.id) as total FROM midias m
        LEFT JOIN campanhas c ON m.campanha_id = c.id
        WHERE m.ativo = 1 AND (c.empresa_id = ? OR c.empresa_id IS NULL)`;
      paramsMidias = [empresa_id];
    }
    const midias = await queryGet(queryMidias, paramsMidias);

    // Total de campanhas
    const campanhas = await queryGet(
      `SELECT COUNT(*) as total FROM campanhas ${empresa_id ? 'WHERE empresa_id = ?' : ''}`,
      paramsEmpresa
    );

    // Total de exibições
    let queryExib = 'SELECT COUNT(*) as total FROM relatorios';
    let paramsExib = [];
    if (empresa_id) {
      queryExib = `SELECT COUNT(*) as total FROM relatorios r
        INNER JOIN tvs t ON r.tv_id = t.id
        WHERE t.empresa_id = ?`;
      paramsExib = [empresa_id];
    }
    const exibicoes = await queryGet(queryExib, paramsExib);

    // Última atividade
    let queryUltima = 'SELECT MAX(inicio) as ultima FROM relatorios';
    let paramsUltima = [];
    if (empresa_id) {
      queryUltima = `SELECT MAX(r.inicio) as ultima FROM relatorios r
        INNER JOIN tvs t ON r.tv_id = t.id
        WHERE t.empresa_id = ?`;
      paramsUltima = [empresa_id];
    }
    const ultimaAtiv = await queryGet(queryUltima, paramsUltima);

    // Total de empresas (apenas para super_admin)
    const totalEmpresas = await queryGet(
      'SELECT COUNT(*) as total FROM empresas', []
    );

    res.json({
      totalTVs: totalTVs.total,
      online,
      offline: totalTVs.total - online,
      midiasAtivas: midias.total,
      campanhasAtivas: campanhas.total,
      exibicoes: exibicoes.total,
      ultimaAtividade: ultimaAtiv.ultima || null,
      totalEmpresas: totalEmpresas.total
    });

  } catch (err) {
    console.error("Erro dashboard:", err);
    res.status(500).json({ erro: "Erro ao carregar dashboard" });
  }
});

/* =========================
   HELPERS
========================= */
function queryGet(sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || {});
    });
  });
}

function queryAll(sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = router;
