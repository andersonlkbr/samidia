const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

const playlistRoutes = require('./routes/playlist');

/* ==========================
   MIDDLEWARES
========================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ==========================
   ARQUIVOS ESTÁTICOS
========================== */

// Frontend (admin, player, dashboard, etc)
app.use(express.static(path.join(__dirname, '../public')));

// Uploads de imagens e vídeos
const midiaRoutes = require("./routes/midia");
app.use("/api/midia", midiaRoutes);

/* ==========================
   ROTAS DA API
========================== */
app.use('/api/tv', require('./routes/tv'));
app.use('/api/noticias', require('./routes/noticias'));
app.use('/api/clima', require('./routes/clima'));
app.use('/api/ping', require('./routes/ping'));
app.use('/api/relatorio', require('./routes/relatorio'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/playlist', playlistRoutes);

/* ==========================
   ROTAS PADRÃO
========================== */

// Página inicial simples (opcional)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Fallback para erros de rota
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

/* ==========================
   START DO SERVIDOR
========================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SAmídia rodando na porta ${PORT}`);
});
