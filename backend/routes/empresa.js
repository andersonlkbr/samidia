const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

/* LISTAR */
router.get('/', (req, res) => {
  db.all('SELECT * FROM empresas', [], (err, rows) => {
    res.json(rows || []);
  });
});

/* CRIAR */
router.post('/', (req, res) => {
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });

  const id = uuidv4();

  db.run(
    'INSERT INTO empresas (id, nome) VALUES (?, ?)',
    [id, nome],
    () => res.json({ id })
  );
});

module.exports = router;
