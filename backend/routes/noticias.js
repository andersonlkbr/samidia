const express = require('express');
const router = express.Router();
const Parser = require('rss-parser');
const extractOgImage = require("../utils/extractOgImage");

const parser = new Parser();

/* ==========================
   NOTÍCIAS VIA RSS (G1 CEARÁ)
========================== */
router.get("/api/noticias/:tvId", async (req, res) => {
  try {
    const noticias = [];

    for (const item of feed.items.slice(0, 5)) {
      let imagem = null;

      // 1️⃣ tenta extrair imagem real da matéria
      if (item.link) {
        imagem = await extractOgImage(item.link);
      }

      // 2️⃣ fallback seguro
      if (!imagem) {
        imagem = "https://samidia.onrender.com/img/logo-g1.jpg";
      }

      noticias.push({
        titulo: item.title,
        resumo: item.contentSnippet || item.content || "",
        link: item.link,
        imagem
      });
    }

    res.json(noticias);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});
