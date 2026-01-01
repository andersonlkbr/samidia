const express = require('express');
const router = express.Router();
const db = require('../database');
const Parser = require('rss-parser');

const parser = new Parser();

router.get('/:tv', async (req, res) => {
  const { tv } = req.params;

  try {
    /* ==========================
       1️⃣ BUSCAR ANÚNCIOS
    ========================== */
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

    /* ==========================
       2️⃣ BUSCAR NOTÍCIAS (RSS DIRETO)
    ========================== */
    let noticias = [];
    try {
      const feed = await parser.parseURL(
        'https://g1.globo.com/rss/g1/ce/ceara/'
      );

      noticias = feed.items.slice(0, 10).map(item => ({
        titulo: item.title,
        resumo: item.contentSnippet || '',
        imagem:
          item.enclosure?.url ||
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/G1_logo.svg/2560px-G1_logo.svg.png'
      }));
    } catch (e) {
      console.error('Erro RSS playlist:', e);
      noticias = [];
    }

    /* ==========================
       3️⃣ MONTAR PLAYLIST
       (2 anúncios → 1 notícia)
    ========================== */
    const playlist = [];
    let contador = 0;
    let idxNoticia = 0;

    anuncios.forEach(anuncio => {
      if (!anuncio.url) return;

      playlist.push({
        tipo: anuncio.tipo,
        url: anuncio.url,
        duracao: anuncio.duracao || 10
      });

      contador++;

      if (contador % 2 === 0 && noticias.length) {
        const noticia = noticias[idxNoticia % noticias.length];
        idxNoticia++;

        playlist.push({
          tipo: 'noticia',
          titulo: noticia.titulo,
          resumo: noticia.resumo,
          imagem: noticia.imagem,
          duracao: 12
        });
      }
    });

    /* ==========================
       4️⃣ FALLBACK
    ========================== */
    if (!playlist.length) {
      playlist.push({
        tipo: 'imagem',
        url: '/img/fallback.jpg',
        duracao: 10
      });
    }

    res.json(playlist);
  } catch (err) {
    console.error('Erro playlist:', err);
    res.json([]);
  }
});

module.exports = router;
