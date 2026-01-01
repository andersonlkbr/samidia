const express = require('express');
const router = express.Router();
const db = require('../database');

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
       2️⃣ BUSCAR NOTÍCIAS (API REAL)
    ========================== */
    let noticias = [];
    try {
      const resp = await fetch(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/noticias/${tv}`
      );
      noticias = await resp.json();
    } catch {
      noticias = [];
    }

    /* ==========================
       3️⃣ MONTAR PLAYLIST
       (2 anúncios → 1 notícia)
    ========================== */
    const playlist = [];
    let contador = 0;

    anuncios.forEach(anuncio => {
      if (!anuncio.url) return;

      playlist.push({
        tipo: anuncio.tipo,
        url: anuncio.url,
        duracao: anuncio.duracao || 10
      });

      contador++;

      if (contador % 2 === 0 && noticias.length) {
        const noticia = noticias.shift();

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
