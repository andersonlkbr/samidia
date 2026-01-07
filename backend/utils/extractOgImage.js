const fetch = require("node-fetch");
const cheerio = require("cheerio");

async function extractOgImage(url) {
  try {
    const res = await fetch(url, {
      timeout: 8000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const ogImage =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="og:image"]').attr("content");

    if (ogImage && ogImage.startsWith("http")) {
      return ogImage;
    }

    return null;
  } catch (err) {
    console.error("Erro ao extrair og:image:", err.message);
    return null;
  }
}

module.exports = extractOgImage;
