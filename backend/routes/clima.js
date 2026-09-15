const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const db = require("../database");

const API_KEY = process.env.OPENWEATHER_API_KEY || "";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// CACHE EM MEMÓRIA
const cacheClima = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

router.get("/:tvId", async (req, res) => {
  const { tvId } = req.params;

  // Verifica se a API key está configurada
  if (!API_KEY) {
    console.error("⚠️ OPENWEATHER_API_KEY não configurada nas variáveis de ambiente");
    return res.status(500).json({ erro: "API de clima não configurada" });
  }

  try {
    // Busca a cidade da TV no banco de dados
    const tv = await new Promise((resolve, reject) => {
      db.get(`SELECT cidade, estado FROM tvs WHERE id = ?`, [tvId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const cidade = tv?.cidade || "Porteiras"; // Fallback se não encontrar
    const estado = tv?.estado || "CE";
    const agora = Date.now();

    // 1️⃣ Se cache válido → retorna direto
    if (
      cacheClima[cidade] &&
      agora - cacheClima[cidade].timestamp < CACHE_TTL
    ) {
      return res.json(cacheClima[cidade].data);
    }

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

        // Pega os próximos 3 dias (pula hoje)
        previsao = Object.keys(dias)
          .slice(1, 4)
          .map((data) => {
            const temps = dias[data].map(d => d.main.temp);
            const climaInfo = dias[data][Math.floor(dias[data].length / 2)].weather[0];
            
            const dateObj = new Date(data);
            const diaSemana = dateObj.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase();

            return {
              dia: diaSemana,
              min: Math.round(Math.min(...temps)),
              max: Math.round(Math.max(...temps)),
              descricao: climaInfo.description,
              condicao: climaInfo.main,
              icone: climaInfo.icon
            };
          });
    }

    const respostaFinal = {
      cidade: atual.name,
      estado: estado,
      pais: atual.sys.country,
      temperatura: Math.round(atual.main.temp),
      descricao: atual.weather[0].description,
      condicao: atual.weather[0].main,
      icone: atual.weather[0].icon,
      previsao: previsao
    };

    // 2️⃣ Salva no cache
    cacheClima[cidade] = {
      data: respostaFinal,
      timestamp: agora
    };

    res.json(respostaFinal);

  } catch (err) {
    console.error("Erro clima:", err);

    // 3️⃣ Se falhar → devolve último cache disponível
    const cacheKeys = Object.keys(cacheClima);
    if (cacheKeys.length > 0) {
      const ultimoCache = cacheClima[cacheKeys[cacheKeys.length - 1]];
      return res.json(ultimoCache.data);
    }

    res.status(500).json({});
  }
});

module.exports = router;