const express = require('express');
const router = express.Router();
const db = require('../database');

/* ==========================
   PLAYLIST DA TV
========================== */
router.get('/:tvId', (req, res) => {
  const { tvId } = req.params;

  db.all(
    `
    SELECT
      tipo,
      url,
      duracao,
      titulo,
      resumo
    FROM midias
    WHERE tv_id = ?
      AND ativo = 1
    ORDER BY ordem ASC
    `,
    [tvId],
    (err, midias) => {
      if (err) {
        console.error('Erro playlist:', err);
        return res.status(500).json([]);
      }

      /* ==========================
         FILTRO CRÍTICO (ANTI-REGRESSÃO)
      ========================== */
      const midiasValidas = midias.filter(m => {
        // ❌ ignora mídia antiga/local
        if (!m.url) return false;
        if (m.url.startsWith('/uploads')) return false;

        // ✅ aceita apenas R2 (URL pública)
        if (!m.url.startsWith('https://')) return false;

        return true;
      });

      /* ==========================
         SE NÃO TEM MÍDIA, NÃO QUEBRA
      ========================== */
      if (!midiasValidas.length) {
        return res.json([]);
      }

      /* ==========================
         BUSCAR NOTÍCIAS (RSS / CACHE)
         ⚠️ NÃO MEXEMOS NISSO
      ========================== */
      db.all(
        `
        SELECT
          titulo,
          resumo
        FROM noticias
        ORDER BY id DESC
        LIMIT 10
        `,
        [],
        (err2, noticias) => {
          if (err2) {
            console.error('Erro notícias:', err2);
            noticias = [];
          }

          const playlistFinal = [];
          let contador = 0;
          let indiceNoticia = 0;

          midiasValidas.forEach(midia => {
            playlistFinal.push(midia);
            contador++;

            // 🔁 NOTÍCIA A CADA 2 ANÚNCIOS (COMO ERA ANTES)
            if (
              contador % 2 === 0 &&
              noticias.length > 0
            ) {
              const noticia = noticias[indiceNoticia % noticias.length];

              playlistFinal.push({
                tipo: 'noticia',
                titulo: noticia.titulo,
                resumo: noticia.resumo,
                duracao: 10
              });

              indiceNoticia++;
            }
          });

          res.json(playlistFinal);
        }
      );
    }
  );
});

module.exports = router;
