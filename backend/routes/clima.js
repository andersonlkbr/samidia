const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

const API_KEY = "eb1ed5eca10766b5becb02b69d67e5e4";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// CACHE EM MEMÓRIA
const cacheClima = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

router.get("/:tvId", async (req, res) => {
  const cidade = "Porteiras"; // próximo passo: por TV
  const agora = Date.now();

  // 1️⃣ Se cache válido → retorna direto
  if (
    cacheClima[cidade] &&
    agora - cacheClima[cidade].timestamp < CACHE_TTL
  ) {
    return res.json(cacheClima[cidade].data);
  }

  try {
    /* =========================
       CLIMA ATUAL
    ========================= */
    const atualRes = await fetch(
      `${BASE_URL}/weather?q=${cidade},BR&appid=${API_KEY}&units=metric&lang=pt_br`
    );
    const atual = await atualRes.json();

    /* =========================
       PREVISÃO (3 DIAS)
    ========================= */
    const prevRes = await fetch(
      `${BASE_URL}/forecast?q=${cidade},BR&appid=${API_KEY}&units=metric&lang=pt_br`
    );
    const prev = await prevRes.json();

    const dias = {};
    prev.list.forEach(item => {
      const data = item.dt_txt.split(" ")[0];
      if (!dias[data]) dias[data] = [];
      dias[data].push(item);
    });

    const previsao = Object.keys(dias)
      .slice(0, 3)
      .map((data, i) => {
        const temps = dias[data].map(d => d.main.temp);
        const clima = dias[data][0].weather[0];

        return {
          dia: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : "Depois",
          min: Math.round(Math.min(...temps)),
          max: Math.round(Math.max(...temps)),
          descricao: clima.description,
          condicao: clima.main,
          icone: clima.icon
        };
      });

    const respostaFinal = {
      cidade: atual.name,
      estado: "CE",
      pais: atual.sys.country,
      temperatura: Math.round(atual.main.temp),
      descricao: atual.weather[0].description,
      condicao: atual.weather[0].main,
      icone: atual.weather[0].icon,
      previsao
    };

    // 2️⃣ Salva no cache
    cacheClima[cidade] = {
      data: respostaFinal,
      timestamp: agora
    };

    res.json(respostaFinal);

  } catch (err) {
    console.error("Erro clima:", err);

    // 3️⃣ Se falhar → devolve último cache
    if (cacheClima[cidade]) {
      return res.json(cacheClima[cidade].data);
    }

    res.status(500).json({});
  }
});

module.exports = router;