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
   LISTAR MÍDIAS
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
        return res.status(500).json({ erro: 'Erro no banco' });
      }

      res.json({ midias: rows || [] });
    }
  );
});

/* ==========================
   UPLOAD (R2)
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

module.exports = router;
