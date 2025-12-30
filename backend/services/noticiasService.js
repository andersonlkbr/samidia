const axios = require('axios');

async function buscarNoticias() {
  const res = await axios.get(
    'https://gnews.io/api/v4/top-headlines',
    {
      params: {
        lang: 'pt',
        country: 'br',
        token: 'SUA_API_KEY'
      }
    }
  );
  return res.data.articles.slice(0, 5).map(n => n.title);
}

module.exports = buscarNoticias;
