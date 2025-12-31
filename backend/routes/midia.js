const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../db');

const router = express.Router();

/* ==========================
   CLOUDFARE R2 CONFIG
========================== */
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  }
});

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* ==========================
   MULTER (MEMORY ONLY)
========================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

/* ==========================
   LISTAR MÍDIAS
========================== */
router.get('/:tv', (req, res) => {
  db.all(
    'SELECT * FROM midias WHERE tv_id = ? AND ativo = 1 ORDER BY ordem ASC',
    [req.params.tv],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json(rows || []);
    }
  );
});

/* ==========================
   UPLOAD → R2
========================== */
router.post('/:tv', upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Arquivo não enviado' });
    }

    const ext = path.extname(req.file.originalname);
    const nomeArquivo = crypto.randomBytes(16).toString('hex') + ext;

    const comando = new PutObjectCommand({
      Bucket: BUCKET,
      Key: nomeArquivo,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    });

    await s3.send(comando);

    const url = `${PUBLIC_URL}/${nomeArquivo}`;
    const tipo = req.file.mimetype.startsWith('video') ? 'video' : 'imagem';

    db.run(
      `
      INSERT INTO midias (id, tv_id, tipo, url, duracao, ativo, ordem)
      VALUES (?, ?, ?, ?, ?, 1, 999)
      `,
      [
        crypto.randomUUID(),
        req.params.tv,
        tipo,
        url,
        tipo === 'imagem' ? 10 : null
      ],
      () => res.json({ ok: true, url })
    );

  } catch (e) {
    console.error('ERRO R2 UPLOAD:', e);
    res.status(500).json({
      erro: 'Falha no upload',
      detalhe: e.message
    });
  }
});

/* ==========================
   EXCLUIR (SOFT DELETE)
========================== */
router.delete('/:id', (req, res) => {
  db.run(
    'UPDATE midias SET ativo = 0 WHERE id = ?',
    [req.params.id],
    () => res.json({ ok: true })
  );
});

module.exports = router;
