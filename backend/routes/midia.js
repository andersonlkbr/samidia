const express = require('express');
const multer = require('multer');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../db');

const router = express.Router();

/* ==========================
   R2 CLIENT
========================== */
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  }
});

/* ==========================
   MULTER (MEMORY)
========================== */
const upload = multer({
  storage: multer.memoryStorage()
});

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
    ORDER BY ordem ASC, created_at ASC
    `,
    [tvId],
    (err, rows) => {
      if (err) {
        console.error('Erro listar mídias:', err);
        return res.status(500).json({ erro: 'Erro no banco' });
      }

      res.json({ midias: rows || [] });
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

    const ext = path.extname(req.file.originalname).toLowerCase();
    const tipo = ['.mp4', '.webm'].includes(ext) ? 'video' : 'imagem';

    const nomeArquivo = `midias/${Date.now()}-${Math.random()}${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: nomeArquivo,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      })
    );

    const url = `${process.env.R2_PUBLIC_URL}/${nomeArquivo}`;

    db.run(
      `
      INSERT INTO midias (tv_id, tipo, url, duracao, regiao, ativo)
      VALUES (?, ?, ?, ?, ?, 1)
      `,
      [tvId, tipo, url, duracao || 10, regiao || null],
      function (err) {
        if (err) {
          console.error('Erro salvar mídia:', err);
          return res.status(500).json({ erro: 'Erro ao salvar mídia' });
        }

        res.json({ ok: true, id: this.lastID, url });
      }
    );
  } catch (err) {
    console.error('Erro upload mídia:', err);
    res.status(500).json({ erro: 'Erro no upload' });
  }
});

/* ==========================
   ATIVAR / DESATIVAR
========================== */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;

  db.run(
    `UPDATE midias SET ativo = ? WHERE id = ?`,
    [ativo ? 1 : 0, id],
    err => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao atualizar' });
      }
      res.json({ ok: true });
    }
  );
});

/* ==========================
   EXCLUIR
========================== */
router.delete('/:id', (req, res) => {
  db.run(
    `DELETE FROM midias WHERE id = ?`,
    [req.params.id],
    err => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao excluir' });
      }
      res.json({ ok: true });
    }
  );
});

/* ==========================
   ORDENAR
========================== */
router.put('/ordenar', (req, res) => {
  const { ids } = req.body;

  const stmt = db.prepare(
    `UPDATE midias SET ordem = ? WHERE id = ?`
  );

  ids.forEach((id, index) => {
    stmt.run(index, id);
  });

  stmt.finalize();

  res.json({ ok: true });
});

module.exports = router;
