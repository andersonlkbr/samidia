const express = require('express');
const db = require('../db');

const router = express.Router();

/* ===============================
   REGISTRAR EXIBIÇÃO
================================ */
router.post('/', (req, res) => {
  const { tv_id, midia_id, tipo, duracao } = req.body;

  if (!tv_id || !tipo) {
    return res.status(400).json({ erro: 'Dados incompletos' });
  }

  db.run(
    `
    INSERT INTO relatorios (tv_id, midia_id, tipo, inicio, duracao)
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      tv_id,
      midia_id || null,
      tipo,
      Date.now(),
      duracao || 0
    ],
    () => res.json({ ok: true })
  );
});

/* ===============================
   RESUMO POR TIPO (H)
================================ */
router.get('/:tvId', (req, res) => {
  db.all(
    `
    SELECT
      tipo,
      COUNT(*) as exibicoes,
      SUM(duracao) as tempo_total
    FROM relatorios
    WHERE tv_id = ?
    GROUP BY tipo
    `,
    [req.params.tvId],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json(rows || []);
    }
  );
});

/* ===============================
   DETALHE POR MÍDIA (H2)
================================ */
router.get('/:tvId/midias', (req, res) => {
  db.all(
    `
    SELECT
      m.id,
      m.tipo,
      m.url,
      COUNT(r.id) as exibicoes,
      SUM(r.duracao) as tempo_total
    FROM relatorios r
    JOIN midias m ON m.id = r.midia_id
    WHERE r.tv_id = ?
    GROUP BY m.id
    ORDER BY exibicoes DESC
    `,
    [req.params.tvId],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json(rows || []);
    }
  );
});

module.exports = router;
