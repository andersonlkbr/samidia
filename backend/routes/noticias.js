const express = require("express");
const Router = express.Router();

const Parser = require("rss-parser");
const parser = new Parser();

const extractOgImage = require("../utils/extractOgImage");

const FEED_G1_CE = "https://g1.globo.com/rss/g1/ce/ceara/";

Router.get("/:tvId", async (req, res) => {
  try {
    const feed = await parser.parseURL(FEED_G1_CE);

    const noticias = [];

    for (const item of feed.items.slice(0, 5)) {
      let imagem = null;

      if (item.link) {
        imagem = await extractOgImage(item.link);
      }

      if (!imagem) {
        imagem = "https://samidia.onrender.com/fallback.jpg";
      }

      noticias.push({
        titulo: item.title,
        resumo: item.contentSnippet || "",
        link: item.link,
        imagem
      });
    }

    res.json(noticias);
  } catch (err) {
    console.error("Erro RSS:", err);
    res.status(500).json([]);
  }
});

module.exports = Router;
