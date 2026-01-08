const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const db = require("../database");
const { uploadToR2, deleteFromR2 } = require("../utils/uploadR2");

const upload = multer({ storage: multer.memoryStorage() });

/* =========================
   LISTAR MÍDIAS DA TV
========================= */
router.get("/:tvId", (req, res) => {
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
        console.error("Erro listar mídias:", err);
        return res.status(500).json({ erro: "Erro ao listar mídias" });
      }
      res.json(rows);
    }
  );
});

/* =========================
   UPLOAD DE MÍDIA
========================= */
router.post("/:tvId", upload.single("arquivo"), async (req, res) => {
  try {
    const { tvId } = req.params;
    const { duracao, regiao } = req.body;

    if (!req.file) {
      return res.status(400).json({ erro: "Arquivo não enviado" });
    }

    const url = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const tipo = req.file.mimetype.startsWith("video") ? "video" : "imagem";

    db.run(
      `
      INSERT INTO midias (tv_id, tipo, url, duracao, regiao, ativo)
      VALUES (?, ?, ?, ?, ?, 1)
      `,
      [tvId, tipo, url, duracao || 10, regiao || "Todas"],
      function (err) {
        if (err) {
          console.error("Erro salvar mídia:", err);
          return res.status(500).json({ erro: "Erro ao salvar mídia" });
        }
        res.json({ sucesso: true });
      }
    );
  } catch (err) {
    console.error("Erro upload mídia:", err);
    res.status(500).json({ erro: "Erro no upload da mídia" });
  }
});

/* =========================
   ATIVAR / DESATIVAR
========================= */
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;

  db.run(
    `UPDATE midias SET ativo = ? WHERE id = ?`,
    [ativo ? 1 : 0, id],
    err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ erro: "Erro ao atualizar mídia" });
      }
      res.json({ sucesso: true });
    }
  );
});

/* =========================
   EXCLUIR MÍDIA
========================= */
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT url FROM midias WHERE id = ?`,
    [id],
    async (err, row) => {
      if (row?.url) {
  try {
    await deleteFromR2(row.url);
  } catch (e) {
    console.warn("⚠️ Falha ao deletar do R2:", e.message);
  }
}

      db.run(
        `DELETE FROM midias WHERE id = ?`,
        [id],
        err2 => {
          if (err2) {
            console.error(err2);
            return res.status(500).json({ erro: "Erro ao excluir mídia" });
          }
          res.json({ sucesso: true });
        }
      );
    }
  );
});

module.exports = router;
