const express = require('express');
const router = express.Router();
const db = require('../database');
const fetchNoticias = require('./noticias-helper'); // helper que já existia

router.get('/:tv', async (req, res) => {
  const { tv } = req.params;

  try {
    // 1️⃣ Buscar anúncios (SEM titulo/resumo)
    const midias = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT
          id,
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

    // 2️⃣ Filtrar apenas URLs válidas (R2)
    const anuncios = midias.filter(m =>
      m.url && m.url.startsWith('https://')
    );

    // 3️⃣ Buscar notícias
    let noticias = [];
    try {
      noticias = await fetchNoticias(tv);
    } catch (e) {
      noticias = [];
    }

    // 4️⃣ Montar playlist intercalada
    const playlist = [];
    let contador = 0;

    anuncios.forEach(anuncio => {
      playlist.push({
        tipo: anuncio.tipo,
        url: anuncio.url,
        duracao: anuncio.duracao || 10
      });

      contador++;

      // a cada 2 anúncios entra 1 notícia
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

    // 5️⃣ Fallback absoluto (nunca tela preta)
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
