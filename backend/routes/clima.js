const express = require("express");
const router = express.Router();
const fetch = require("node-fetch"); // Certifique-se de ter instalado: npm install node-fetch

const API_KEY = "eb1ed5eca10766b5becb02b69d67e5e4"; // Sua chave
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// CACHE EM MEMÓRIA
const cacheClima = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

router.get("/:tvId", async (req, res) => {
  const cidade = "Porteiras"; // FIXO (Ideal: buscar do banco pelo tvId)
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

    if (atual.cod !== 200) throw new Error("Erro API OpenWeather (Atual)");

    /* =========================
       PREVISÃO (3 DIAS)
    ========================= */
    const prevRes = await fetch(
      `${BASE_URL}/forecast?q=${cidade},BR&appid=${API_KEY}&units=metric&lang=pt_br`
    );
    const prev = await prevRes.json();

    let previsao = [];

    if (prev.cod === "200") {
        // Agrupa por dia (YYYY-MM-DD)
        const dias = {};
        prev.list.forEach(item => {
          const data = item.dt_txt.split(" ")[0];
          if (!dias[data]) dias[data] = [];
          dias[data].push(item);
        });

        // Pega os próximos 3 dias (pula o índice 0 se for o dia atual incompleto, mas sua lógica 'slice' tá ok)
        previsao = Object.keys(dias)
          .slice(1, 4) // Pega amanhã, depois e depois (pula hoje)
          .map((data) => {
            const temps = dias[data].map(d => d.main.temp);
            const climaInfo = dias[data][Math.floor(dias[data].length / 2)].weather[0]; // Pega o clima do meio do dia
            
            // Formatar dia da semana
            const dateObj = new Date(data);
            // Corrige fuso horário gambiarra ou usa dia da semana simples
            const diaSemana = dateObj.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase();

            return {
              dia: diaSemana,
              min: Math.round(Math.min(...temps)),
              max: Math.round(Math.max(...temps)),
              descricao: climaInfo.description,
              condicao: climaInfo.main, // Rain, Clouds, etc
              icone: climaInfo.icon
            };
          });
    }

    const respostaFinal = {
      cidade: atual.name,
      estado: "CE",
      pais: atual.sys.country,
      temperatura: Math.round(atual.main.temp),
      descricao: atual.weather[0].description,
      condicao: atual.weather[0].main,
      icone: atual.weather[0].icon,
      previsao: previsao // Array com os dias futuros
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