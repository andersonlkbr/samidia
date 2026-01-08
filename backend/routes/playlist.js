const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/:tv", async (req, res) => {
  const { tv } = req.params;

  try {
    const anuncios = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT
          tipo,
          url,
          duracao
        FROM midias
        WHERE tv_id = ?
          AND ativo = 1
        ORDER BY ordem ASC
        `,
        [tv],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    const playlist = anuncios
      .filter(a => a.url && (a.tipo === "imagem" || a.tipo === "video"))
      .map(a => ({
        tipo: a.tipo,
        url: a.url,
        duracao: a.duracao || (a.tipo === "video" ? 20 : 8)
      }));

    if (!playlist.length) {
      playlist.push({
        tipo: "imagem",
        url: "/img/fallback.jpg",
        duracao: 10
      });
    }

    res.json(playlist);
  } catch (err) {
    console.error("Erro playlist:", err);
    res.json([]);
  }
});

module.exports = router;