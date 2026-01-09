const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const db = require("../database");
const { uploadToR2, deleteFromR2 } = require("../utils/uploadR2");

const upload = multer({ storage: multer.memoryStorage() });

/* =========================
   LISTAR MÍDIAS DA TV
========================= */
router.get("/:tvId", (req, res) => {
  const { tvId } = req.params;

  // IMPORTANTE: Adicionei "ORDER BY ordem ASC" para respeitar a ordenação
  db.all(
    `SELECT * FROM midias WHERE tv_id = ? ORDER BY ordem ASC`,
    [tvId],
    (err, rows) => {
      if (err) {
        console.error("Erro listar mídias:", err);
        return res.status(500).json([]);
      }
      res.json(rows || []);
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

    if (!req.file) return res.status(400).json({ erro: "Arquivo não enviado" });

    const id = uuidv4();
    const tipo = req.file.mimetype.startsWith("video") ? "video" : "imagem";

    const url = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Definimos uma ordem padrão alta para ir pro final da fila, ou 0
    const ordem = Date.now(); 

    db.run(
      `
      INSERT INTO midias (id, tv_id, tipo, url, duracao, regiao, ativo, ordem)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `,
      [id, tvId, tipo, url, duracao || 10, regiao || "Todas", ordem],
      err => {
        if (err) {
          // Se der erro de coluna 'ordem' não existente, o usuário precisa criar a coluna
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
      if (err) return res.status(500).json({ erro: "Erro ao atualizar" });
      res.json({ sucesso: true });
    }
  );
});

/* =========================
   EXCLUIR MÍDIA
========================= */
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.get(`SELECT url FROM midias WHERE id = ?`, [id], async (err, row) => {
      if (err) return res.status(500).json({ erro: "Erro buscar mídia" });

      const url = row?.url;
      if (url) {
        try { await deleteFromR2(url); } 
        catch (r2Error) { console.error("Erro R2 ignorado:", r2Error); }
      }

      db.run(`DELETE FROM midias WHERE id = ?`, [id], err2 => {
          if (err2) return res.status(500).json({ erro: "Erro ao excluir" });
          res.json({ sucesso: true });
        }
      );
    }
  );
});

/* =========================
   ORDENAR MÍDIAS (NOVO!)
========================= */
router.put("/ordenar", (req, res) => {
  const { ids } = req.body; // Array de IDs na nova ordem

  if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ erro: "Dados inválidos" });
  }

  // Usa transação para atualizar a ordem de todos
  db.serialize(() => {
      const stmt = db.prepare("UPDATE midias SET ordem = ? WHERE id = ?");
      
      ids.forEach((id, index) => {
          stmt.run(index, id); // Index 0 = ordem 0, Index 1 = ordem 1...
      });

      stmt.finalize((err) => {
          if (err) {
              console.error("Erro ao ordenar:", err);
              return res.status(500).json({ erro: "Erro ao salvar ordem" });
          }
          res.json({ sucesso: true });
      });
  });
});

module.exports = router;