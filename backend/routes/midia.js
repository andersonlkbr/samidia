const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const uploadR2 = require('../utils/uploadR2');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ==========================
   LISTAR MÍDIAS DA TV
========================== */
router.get('/:tvId', (req, res) => {
  const { tvId } = req.params;

  db.all(
    `
    SELECT *
    FROM midias
    WHERE tv_id = ?
    ORDER BY ordem ASC
    `,
    [tvId],
    (err, rows) => {
      if (err) {
        console.error('Erro listar mídias:', err);
        return res.status(500).json({ erro: 'Erro ao listar mídias' });
      }
      res.json(rows);
    }
  );
});

/* ==========================
   UPLOAD DE MÍDIA (R2)
========================== */
router.post('/:tvId', upload.single('arquivo'), async (req, res) => {
  try {
    const { tvId } = req.params;
    const { duracao, regiao } = req.body;

    if (!req.file) {
      return res.status(400).json({ erro: 'Arquivo não enviado' });
    }

    const tipo = req.file.mimetype.startsWith('video')
      ? 'video'
      : 'imagem';

    // Upload para R2
    const url = await uploadR2(req.file);

    const id = uuidv4();

    db.run(
      `
      INSERT INTO midias
        (id, tv_id, tipo, url, duracao, regiao, ativo, ordem)
      VALUES (?, ?, ?, ?, ?, ?, 1,
        (SELECT IFNULL(MAX(ordem), 0) + 1 FROM midias WHERE tv_id = ?)
      )
      `,
      [id, tvId, tipo, url, duracao || 10, regiao || 'BR', tvId],
      err => {
        if (err) {
          console.error('Erro salvar mídia:', err);
          return res.status(500).json({ erro: 'Erro ao salvar mídia' });
        }
        res.json({ ok: true });
      }
    );
  } catch (e) {
    console.error('Erro upload mídia:', e);
    res.status(500).json({ erro: 'Falha no upload' });
  }
});

/* ==========================
   ATIVAR / DESATIVAR
========================== */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;

  db.run(
    'UPDATE midias SET ativo = ? WHERE id = ?',
    [ativo ? 1 : 0, id],
    err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ erro: 'Erro ao atualizar mídia' });
      }
      res.json({ ok: true });
    }
  );
});

/* ==========================
   EXCLUIR MÍDIA
========================== */
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM midias WHERE id = ?',
    [id],
    err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ erro: 'Erro ao excluir mídia' });
      }
      res.json({ ok: true });
    }
  );
});

/* ==========================
   ORDENAR MÍDIAS
========================== */
router.put('/ordenar', (req, res) => {
  const { ids } = req.body;

  const stmt = db.prepare(
    'UPDATE midias SET ordem = ? WHERE id = ?'
  );

  ids.forEach((id, index) => {
    stmt.run(index + 1, id);
  });

  stmt.finalize();
  res.json({ ok: true });
});

module.exports = router;
