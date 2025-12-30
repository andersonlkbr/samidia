const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const agora = Date.now();
  const LIMITE_ONLINE = 60 * 1000;

  const resultado = {};

  db.get('SELECT COUNT(*) as total FROM tvs', [], (e, r) => {
    resultado.totalTVs = r.total;

    db.all('SELECT ultimo_ping FROM tvs', [], (e2, tvs) => {
      resultado.online = tvs.filter(
        t => t.ultimo_ping && agora - t.ultimo_ping < LIMITE_ONLINE
      ).length;

      resultado.offline = resultado.totalTVs - resultado.online;

      db.get(
        'SELECT COUNT(*) as total FROM midias WHERE ativo = 1',
        [],
        (e3, m) => {
          resultado.midiasAtivas = m.total;

          db.get(
            'SELECT COUNT(*) as total FROM relatorios',
            [],
            (e4, r2) => {
              resultado.exibicoes = r2.total;

              db.get(
                'SELECT MAX(inicio) as ultima FROM relatorios',
                [],
                (e5, r3) => {
                  resultado.ultimaAtividade = r3.ultima || null;
                  res.json(resultado);
                }
              );
            }
          );
        }
      );
    });
  });
});

module.exports = router;
