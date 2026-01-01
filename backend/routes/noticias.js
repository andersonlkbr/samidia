const express = require('express');
const router = express.Router();
const Parser = require('rss-parser');

const parser = new Parser();

/* ==========================
   NOTÍCIAS VIA RSS (G1 CEARÁ)
========================== */
router.get('/:tv', async (req, res) => {
  try {
    const feed = await parser.parseURL(
      'https://g1.globo.com/rss/g1/ce/ceara/'
    );

    const noticias = feed.items.slice(0, 10).map(item => ({
      titulo: item.title,
      resumo: item.contentSnippet || '',
      imagem:
        item.enclosure?.url ||
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/G1_logo.svg/2560px-G1_logo.svg.png'
    }));

    res.json(noticias);
  } catch (err) {
    console.error('Erro RSS:', err);
    res.json([]);
  }
});

module.exports = router;
