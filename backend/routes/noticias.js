const express = require('express');
const axios = require('axios');
const Parser = require('rss-parser');

const router = express.Router();
const parser = new Parser();

const RSS_URL = 'https://g1.globo.com/rss/g1/ce/ceara';

router.get('/', async (req, res) => {
  try {
    const response = await axios.get(RSS_URL, {
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    let xml = response.data;

    // 🔥 CORREÇÃO CRÍTICA: remove lixo antes do <rss
    const rssIndex = xml.indexOf('<rss');
    if (rssIndex === -1) {
      throw new Error('RSS inválido');
    }

    xml = xml.slice(rssIndex);

    const feed = await parser.parseString(xml);

    const noticias = feed.items.slice(0, 6).map(item => ({
      titulo: item.title || '',
      resumo:
        item.contentSnippet ||
        item.content ||
        '',
    }));

    res.json(noticias);
  } catch (err) {
    console.error('Erro RSS:', err.message);
    res.json([]); // nunca quebra o player
  }
});

module.exports = router;
