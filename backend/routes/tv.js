const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

/* LISTAR TVs */
router.get('/', (req, res) => {
  db.all('SELECT * FROM tvs', [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows || []);
  });
});

/* CRIAR TV */
router.post('/', (req, res) => {
  const { nome, cidade, estado } = req.body;

  if (!nome || !cidade || !estado) {
    return res.status(400).json({ erro: 'Dados incompletos' });
  }

  const id = uuidv4();

  db.run(
    `
    INSERT INTO tvs (id, nome, cidade, estado)
    VALUES (?, ?, ?, ?)
    `,
    [id, nome, cidade, estado],
    () => res.json({ id })
  );
});

/* ATUALIZAR TEMA */
router.put('/:id/tema', (req, res) => {
  const { tema_cor, tema_texto, logo } = req.body;

  db.run(
    `
    UPDATE tvs
    SET tema_cor = ?, tema_texto = ?, logo = ?
    WHERE id = ?
    `,
    [tema_cor, tema_texto, logo, req.params.id],
    () => res.json({ ok: true })
  );
});

/* PEGAR TEMA DA TV */
router.get('/:id/tema', (req, res) => {
  db.get(
    `
    SELECT tema_cor, tema_texto, logo
    FROM tvs
    WHERE id = ?
    `,
    [req.params.id],
    (err, row) => {
      if (err || !row) return res.json(null);
      res.json(row);
    }
  );
});

module.exports = router;
