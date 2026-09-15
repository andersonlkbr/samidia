const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const db = require("../database");
const { uploadToR2, deleteFromR2 } = require("../utils/uploadR2");

const upload = multer({ storage: multer.memoryStorage() });

/* =========================
   LISTAR MÍDIAS POR CAMPANHA
========================= */
router.get("/campanha/:campanhaId", (req, res) => {
  const { campanhaId } = req.params;

  db.all(
    `SELECT * FROM midias WHERE campanha_id = ? ORDER BY ordem ASC`,
    [campanhaId],
    (err, rows) => {
      if (err) {
        console.error("Erro listar mídias por campanha:", err);
        return res.status(500).json([]);
      }
      res.json(rows || []);
    }
  );
});

/* =========================
   LISTAR MÍDIAS POR TV (legado + compatibilidade)
========================= */
router.get("/tv/:tvId", (req, res) => {
  const { tvId } = req.params;

  db.all(
    `SELECT m.* FROM midias m
     LEFT JOIN campanha_tvs ct ON m.campanha_id = ct.campanha_id
     WHERE (ct.tv_id = ? OR m.tv_id = ?)
     ORDER BY m.ordem ASC`,
    [tvId, tvId],
    (err, rows) => {
      if (err) {
        console.error("Erro listar mídias por TV:", err);
        return res.status(500).json([]);
      }
      res.json(rows || []);
    }
  );
});

/* =========================
   UPLOAD DE MÍDIA (para uma campanha)
========================= */
router.post("/campanha/:campanhaId", upload.single("arquivo"), async (req, res) => {
  try {
    const { campanhaId } = req.params;
    const { duracao, regiao, data_inicio, data_fim, hora_inicio, hora_fim, dias_semana } = req.body;

    if (!req.file) return res.status(400).json({ erro: "Arquivo não enviado" });

    // Verificar se a campanha existe
    const campanha = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM campanhas WHERE id = ?`, [campanhaId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!campanha) return res.status(404).json({ erro: "Campanha não encontrada" });

    const id = uuidv4();
    const tipo = req.file.mimetype.startsWith("video") ? "video" : "imagem";

    const url = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const ordem = Date.now();

    db.run(
      `INSERT INTO midias (id, campanha_id, tipo, url, duracao, regiao, ativo, ordem, data_inicio, data_fim, hora_inicio, hora_fim, dias_semana)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
      [
        id, campanhaId, tipo, url,
        duracao || 10, regiao || "Todas", ordem,
        data_inicio || null, data_fim || null,
        hora_inicio || null, hora_fim || null,
        dias_semana || null
      ],
      err => {
        if (err) {
          console.error("Erro salvar mídia:", err);
          return res.status(500).json({ erro: "Erro ao salvar mídia" });
        }
        res.json({ sucesso: true, id, url, tipo });
      }
    );
  } catch (err) {
    console.error("Erro upload mídia:", err);
    res.status(500).json({ erro: "Erro no upload da mídia" });
  }
});

/* =========================
   UPLOAD LEGADO (por TV, mantido para compatibilidade)
========================= */
router.post("/tv/:tvId", upload.single("arquivo"), async (req, res) => {
  try {
    const { tvId } = req.params;
    const { duracao, regiao, data_inicio, data_fim, hora_inicio, hora_fim, dias_semana } = req.body;

    if (!req.file) return res.status(400).json({ erro: "Arquivo não enviado" });

    const id = uuidv4();
    const tipo = req.file.mimetype.startsWith("video") ? "video" : "imagem";

    const url = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const ordem = Date.now();

    db.run(
      `INSERT INTO midias (id, tv_id, tipo, url, duracao, regiao, ativo, ordem, data_inicio, data_fim, hora_inicio, hora_fim, dias_semana)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
      [
        id, tvId, tipo, url,
        duracao || 10, regiao || "Todas", ordem,
        data_inicio || null, data_fim || null,
        hora_inicio || null, hora_fim || null,
        dias_semana || null
      ],
      err => {
        if (err) {
          console.error("Erro salvar mídia:", err);
          return res.status(500).json({ erro: "Erro ao salvar mídia" });
        }
        res.json({ sucesso: true, id, url, tipo });
      }
    );
  } catch (err) {
    console.error("Erro upload mídia:", err);
    res.status(500).json({ erro: "Erro no upload da mídia" });
  }
});

/* =========================
   ORDENAR MÍDIAS
   ⚠️ Deve vir ANTES de /:id para não ser capturada como parâmetro
========================= */
router.put("/ordenar", (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ erro: "Dados inválidos" });
  }

  db.serialize(() => {
      const stmt = db.prepare("UPDATE midias SET ordem = ? WHERE id = ?");
      
      ids.forEach((id, index) => {
          stmt.run(index, id);
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

/* =========================
   ATUALIZAR MÍDIA (ativo, agendamento, etc)
========================= */
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { ativo, duracao, regiao, data_inicio, data_fim, hora_inicio, hora_fim, dias_semana } = req.body;

  // Montar campos dinâmicos para atualizar
  const campos = [];
  const valores = [];

  if (ativo !== undefined) { campos.push("ativo = ?"); valores.push(ativo ? 1 : 0); }
  if (duracao !== undefined) { campos.push("duracao = ?"); valores.push(duracao); }
  if (regiao !== undefined) { campos.push("regiao = ?"); valores.push(regiao); }
  if (data_inicio !== undefined) { campos.push("data_inicio = ?"); valores.push(data_inicio || null); }
  if (data_fim !== undefined) { campos.push("data_fim = ?"); valores.push(data_fim || null); }
  if (hora_inicio !== undefined) { campos.push("hora_inicio = ?"); valores.push(hora_inicio || null); }
  if (hora_fim !== undefined) { campos.push("hora_fim = ?"); valores.push(hora_fim || null); }
  if (dias_semana !== undefined) { campos.push("dias_semana = ?"); valores.push(dias_semana || null); }

  if (campos.length === 0) {
    return res.status(400).json({ erro: "Nenhum campo para atualizar" });
  }

  valores.push(id);

  db.run(
    `UPDATE midias SET ${campos.join(", ")} WHERE id = ?`,
    valores,
    err => {
      if (err) {
        console.error("Erro ao atualizar mídia:", err);
        return res.status(500).json({ erro: "Erro ao atualizar" });
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

module.exports = router;