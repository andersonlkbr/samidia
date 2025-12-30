const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

/* ===============================
   HELPERS
================================ */
function normalizar(txt = '') {
  return txt
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function agoraValido(midia) {
  const agora = new Date();

  /* DIAS DA SEMANA */
  if (midia.dias) {
    const diaAtual = agora.getDay().toString(); // 0–6
    if (!midia.dias.split(',').includes(diaAtual)) {
      return false;
    }
  }

  /* HORÁRIO */
  if (midia.hora_inicio && midia.hora_fim) {
    const horaAtual =
      agora.getHours().toString().padStart(2, '0') +
      ':' +
      agora.getMinutes().toString().padStart(2, '0');

    if (
      horaAtual < midia.hora_inicio ||
      horaAtual > midia.hora_fim
    ) {
      return false;
    }
  }

  return true;
}

/* ===============================
   UPLOAD
================================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${Date.now()}-${Math.random()}.${ext}`);
  }
});
const upload = multer({ storage });

/* ===============================
   LISTAR MÍDIAS (REGIÃO + HORÁRIO)
================================ */
router.get('/:tvId', (req, res) => {
  const { tvId } = req.params;

  db.get(
    'SELECT cidade, estado FROM tvs WHERE id = ?',
    [tvId],
    (err, tv) => {
      if (err || !tv) return res.json([]);

      const cidadeTV = normalizar(tv.cidade);
      const estadoTV = normalizar(tv.estado);

      db.all(
        `SELECT * FROM midias
         WHERE tv_id = ?
         AND ativo = 1
         ORDER BY ordem ASC`,
        [tvId],
        (err, midias) => {
          if (err) {
            return res.status(500).json({ erro: err.message });
          }

          const filtradas = midias.filter(m => {
            if (!agoraValido(m)) return false;

            const regiao = normalizar(m.regiao);
            if (regiao === 'BR') return true;
            if (regiao === estadoTV) return true;
            if (regiao === cidadeTV) return true;

            return false;
          });

          res.json(filtradas);
        }
      );
    }
  );
});

/* ===============================
   ADICIONAR MÍDIA
================================ */
router.post('/:tvId', upload.single('arquivo'), (req, res) => {
  const { tvId } = req.params;
  const {
    duracao,
    regiao,
    tipo,
    hora_inicio,
    hora_fim,
    dias
  } = req.body;

  if (!req.file) {
    return res.status(400).json({ erro: 'Arquivo não enviado' });
  }

  const id = uuidv4();
  const url = `/uploads/${req.file.filename}`;

  db.get(
    'SELECT MAX(ordem) as max FROM midias WHERE tv_id = ?',
    [tvId],
    (err, row) => {
      const ordem = (row?.max || 0) + 1;

      db.run(
        `INSERT INTO midias
         (id, tv_id, tipo, url, duracao, ordem, regiao, hora_inicio, hora_fim, dias, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          id,
          tvId,
          tipo,
          url,
          duracao || 10,
          ordem,
          normalizar(regiao || 'BR'),
          hora_inicio || null,
          hora_fim || null,
          dias || null
        ],
        () => res.json({ sucesso: true })
      );
    }
  );
});

/* ===============================
   TOGGLE
================================ */
router.put('/toggle/:id', (req, res) => {
  db.run(
    `UPDATE midias
     SET ativo = CASE ativo WHEN 1 THEN 0 ELSE 1 END
     WHERE id = ?`,
    [req.params.id],
    () => res.json({ sucesso: true })
  );
});

/* ===============================
   ORDEM
================================ */
router.put('/ordem/:id', (req, res) => {
  db.run(
    'UPDATE midias SET ordem = ? WHERE id = ?',
    [req.body.ordem, req.params.id],
    () => res.json({ sucesso: true })
  );
});

/* ===============================
   EXCLUIR
================================ */
router.delete('/:id', (req, res) => {
  db.run(
    'DELETE FROM midias WHERE id = ?',
    [req.params.id],
    () => res.json({ sucesso: true })
  );
});

module.exports = router;
