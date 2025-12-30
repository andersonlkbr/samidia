const express = require('express');
const db = require('../db');

const router = express.Router();

/* TV envia ping */
router.post('/:tvId', (req, res) => {
  const { tvId } = req.params;

  db.run(
    'UPDATE tvs SET ultimo_ping = ? WHERE id = ?',
    [Date.now(), tvId],
    () => res.json({ ok: true })
  );
});

module.exports = router;
