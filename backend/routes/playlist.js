const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * ATUALIZAR PLAYLIST (ORDEM E DURAÇÃO)
 * POST /api/playlist/:tvId
 */
router.post('/:tvId', (req, res) => {
  const { tvId } = req.params;
  const { itens } = req.body;

  if (!Array.isArray(itens)) {
    return res.status(400).json({ erro: 'Itens inválidos' });
  }

  const stmt = db.prepare(
    'UPDATE playlist SET ordem = ?, duracao = ? WHERE id = ? AND tv_id = ?'
  );

  db.serialize(() => {
    itens.forEach(item => {
      stmt.run(
        item.ordem,
        item.duracao,
        item.id,
        tvId
      );
    });

    stmt.finalize(err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ erro: 'Erro ao salvar playlist' });
      }
      res.json({ sucesso: true });
    });
  });
});

module.exports = router;
