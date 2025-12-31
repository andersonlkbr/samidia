const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/:tvId', (req, res) => {
  db.all(
    `
    SELECT tipo, url, duracao
    FROM midias
    WHERE tv_id = ?
      AND ativo = 1
    ORDER BY ordem ASC
    `,
    [req.params.tvId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.json([]);
      }
      res.json(rows || []);
    }
  );
});

module.exports = router;
