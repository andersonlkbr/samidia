const express = require('express');
const Parser = require('rss-parser');
const db = require('../db');

const router = express.Router();
const parser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (IndoorTV)'
  }
});

const FALLBACK_IMAGE = '/news-fallback.jpg';

const NOTICIAS_FIXAS = [
  {
    titulo: 'Acompanhe as principais notícias do Ceará',
    resumo: 'Informações atualizadas da região para você.',
  },
  {
    titulo: 'Fique por dentro das novidades do dia',
    resumo: 'Notícias importantes e atualizações recentes.',
  }
];

const cache = {};
const CACHE_TIME = 10 * 60 * 1000;

function rssPorEstado(estado) {
  if (!estado) return null;
  if (estado.toLowerCase() === 'ce') {
    return 'https://g1.globo.com/rss/g1/ce/';
  }
  return `https://g1.globo.com/rss/g1/${estado.toLowerCase()}/`;
}

function extrairImagem(item) {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item['media:content']?.url) return item['media:content'].url;
  return FALLBACK_IMAGE;
}

function gerarResumo(texto) {
  if (!texto) return '';
  return texto.replace(/<[^>]*>?/gm, '').slice(0, 140) + '...';
}

router.get('/:tvId', (req, res) => {
  const { tvId } = req.params;

  db.get(
    'SELECT cidade, estado FROM tvs WHERE id = ?',
    [tvId],
    async (err, tv) => {
      if (err || !tv) return res.json([]);

      const key = `${tv.estado}-${tv.cidade}`;
      const now = Date.now();

      if (cache[key] && now - cache[key].time < CACHE_TIME) {
        return res.json(cache[key].data);
      }

      let noticias = [];

      try {
        const feed = await parser.parseURL(rssPorEstado(tv.estado));

        noticias = feed.items.slice(0, 5).map(item => ({
          tipo: 'noticia',
          titulo: item.title,
          resumo: gerarResumo(item.contentSnippet || item.content),
          imagem: extrairImagem(item),
          duracao: 12
        }));
      } catch {}

      if (!noticias.length) {
        noticias = NOTICIAS_FIXAS.map(n => ({
          tipo: 'noticia',
          titulo: n.titulo,
          resumo: n.resumo,
          imagem: FALLBACK_IMAGE,
          duracao: 10
        }));
      }

      cache[key] = { time: now, data: noticias };
      res.json(noticias);
    }
  );
});

module.exports = router;
