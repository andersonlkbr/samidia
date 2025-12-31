const express = require('express');
const db = require('../db');
const router = express.Router();

/* ==========================
   LISTAR MÍDIAS DA TV
========================== */
router.get('/:tvId', (req, res) => {
  const { tvId } = req.params;

  db.all(
    'SELECT * FROM midias WHERE tv_id = ? ORDER BY ordem ASC',
    [tvId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.json([]); // ⚠️ IMPORTANTE
      }

      res.json(rows || []);
    }
  );
});

/* ==========================
   ATUALIZAR MÍDIA (C)
========================== */
router.put('/:id', (req, res) => {
  const {
    duracao,
    regiao,
    ativo,
    hora_inicio,
    hora_fim
  } = req.body;

  db.run(
    `
    UPDATE midias
    SET
      duracao = ?,
      regiao = ?,
      ativo = ?,
      hora_inicio = ?,
      hora_fim = ?
    WHERE id = ?
    `,
    [
      duracao,
      regiao || null,
      ativo ? 1 : 0,
      hora_inicio || null,
      hora_fim || null,
      req.params.id
    ],
    err => {
      if (err) return res.status(500).json(err);
      res.json({ ok: true });
    }
  );
});

/* ==========================
   EXCLUIR
========================== */
router.delete('/:id', (req, res) => {
  db.run(
    'DELETE FROM midias WHERE id = ?',
    [req.params.id],
    err => {
      if (err) return res.status(500).json(err);
      res.json({ ok: true });
    }
  );
});

/* ==========================
   SALVAR ORDEM (DRAG & DROP)
========================== */
router.put('/ordenar', (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ erro: 'Lista inválida' });
  }

  const stmt = db.prepare(
    'UPDATE midias SET ordem = ? WHERE id = ?'
  );

  ids.forEach((id, index) => {
    stmt.run(index, id);
  });

  stmt.finalize(() => {
    res.json({ ok: true });
  });
});

module.exports = router;