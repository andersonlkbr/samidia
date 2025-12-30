const express = require('express');
const axios = require('axios');
const db = require('../db');

const router = express.Router();

// ⚠️ COLOQUE SUA API KEY REAL AQUI
const API_KEY = 'eb1ed5eca10766b5becb02b69d67e5e4';

router.get('/:tvId', (req, res) => {
  const { tvId } = req.params;

  db.get(
    'SELECT cidade, estado FROM tvs WHERE id = ?',
    [tvId],
    async (err, tv) => {
      if (err) {
        console.error('Erro DB:', err);
        return res.status(500).json({ erro: 'Erro no banco' });
      }

      if (!tv) {
        return res.status(404).json({ erro: 'TV não encontrada' });
      }

      try {
        const resposta = await axios.get(
          'https://api.openweathermap.org/data/2.5/weather',
          {
            params: {
              q: `${tv.cidade},BR`,
              units: 'metric',
              lang: 'pt_br',
              appid: API_KEY
            }
          }
        );

        const clima = resposta.data;

        res.json({
          cidade: tv.cidade,
          temperatura: Math.round(clima.main.temp),
          descricao: clima.weather[0].description
        });
      } catch (error) {
        console.error('Erro OpenWeather:', error.response?.data || error.message);
        res.status(500).json({ erro: 'Erro ao buscar clima' });
      }
    }
  );
});

module.exports = router;
