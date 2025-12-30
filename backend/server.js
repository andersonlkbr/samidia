const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

/* ===============================
   MIDDLEWARES
================================ */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   ARQUIVOS ESTÁTICOS
================================ */
app.use(express.static(path.join(__dirname, '../public')));
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

/* ===============================
   ROTAS DA API
================================ */
app.use('/api/tv', require('./routes/tv'));
app.use('/api/midia', require('./routes/midia'));
app.use('/api/noticias', require('./routes/noticias'));
app.use('/api/clima', require('./routes/clima'));
app.use('/api/ping', require('./routes/ping'));
app.use('/api/empresa', require('./routes/empresa'));
app.use('/api/relatorio', require('./routes/relatorio'));
app.use('/api/dashboard', require('./routes/dashboard'));

   


/* ===============================
   FALLBACK (HTML)
================================ */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

/* ===============================
   START
================================ */
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
