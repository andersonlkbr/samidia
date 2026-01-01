const express = require("express");
const router = express.Router();
const multer = require("multer");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2");
const db = require("../db");
const path = require("path");

// upload em memória (NUNCA local)
const upload = multer({ storage: multer.memoryStorage() });

router.post("/:tvId", upload.single("arquivo"), async (req, res) => {
  try {
    const { tvId } = req.params;
    const { duracao, tipo } = req.body;

    if (!req.file) {
      return res.status(400).json({ erro: "Arquivo não enviado" });
    }

    const ext = path.extname(req.file.originalname);
    const nomeArquivo = `midias/${Date.now()}-${Math.random()}${ext}`;

    // envia para o R2
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: nomeArquivo,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    const url = `${process.env.R2_PUBLIC_URL}/${nomeArquivo}`;

    // salva no banco SOMENTE a URL
    db.run(
      `
      INSERT INTO midias (tv_id, tipo, url, duracao, ativo)
      VALUES (?, ?, ?, ?, 1)
      `,
      [tvId, tipo, url, duracao || 10],
      function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ erro: "Erro ao salvar mídia" });
        }

        res.json({
          sucesso: true,
          id: this.lastID,
          url,
        });
      }
    );
  } catch (err) {
    console.error("Erro upload R2:", err);
    res.status(500).json({ erro: "Erro no upload da mídia" });
  }
});

module.exports = router;
