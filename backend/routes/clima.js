const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

// SUA API KEY FIXA
const API_KEY = "eb1ed5eca10766b5becb02b69d67e5e4";

const BASE_URL = "https://api.openweathermap.org/data/2.5";

router.get("/:tvId", async (req, res) => {
  try {
    // Por enquanto cidade fixa (próximo passo: por TV)
    const cidade = "Fortaleza";

    /* =========================
       CLIMA ATUAL
    ========================= */
    const atualRes = await fetch(
      `${BASE_URL}/weather?q=${cidade}&appid=${API_KEY}&units=metric&lang=pt_br`
    );
    const atual = await atualRes.json();

    /* =========================
       PREVISÃO (3 DIAS)
    ========================= */
    const prevRes = await fetch(
      `${BASE_URL}/forecast?q=${cidade}&appid=${API_KEY}&units=metric&lang=pt_br`
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
        return {
          dia: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : "Depois",
          min: Math.round(Math.min(...temps)),
          max: Math.round(Math.max(...temps)),
          descricao: dias[data][0].weather[0].description
        };
      });

    /* =========================
       RESPOSTA FINAL
    ========================= */
    res.json({
      cidade: atual.name,
      temperatura: Math.round(atual.main.temp),
      descricao: atual.weather[0].description,
      previsao
    });
  } catch (err) {
    console.error("Erro clima:", err);
    res.status(500).json({});
  }
});

module.exports = router;

