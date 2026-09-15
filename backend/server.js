require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { autenticar, apenasRole } = require('./middleware/auth');

const app = express();

/* ==========================
   MIDDLEWARES
========================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ==========================
   ARQUIVOS ESTÁTICOS
========================== */
app.use(express.static(path.join(__dirname, '../public')));

/* ==========================
   ROTAS PÚBLICAS (sem autenticação)
   Player, pareamento e login não precisam de token
========================== */

// Autenticação
app.use('/api/auth', require('./routes/auth'));

// Player (consumido pelas TVs/media boxes)
app.use('/api/playlist', require('./routes/playlist'));
app.use('/api/ping', require('./routes/ping'));
app.use('/api/noticias', require('./routes/noticias'));
app.use('/api/clima', require('./routes/clima'));

// Pareamento de TV (usado pelo app Android)
// A rota POST /api/tv/parear é pública, mas as demais são protegidas
// Precisamos registrar a rota de pareamento antes do middleware

/* ==========================
   ROTAS PROTEGIDAS (requerem autenticação JWT)
========================== */

// Aplicar autenticação nas rotas /eu e /senha do auth
const authRouter = require('./routes/auth');
app.get('/api/auth/eu', autenticar, (req, res, next) => next());
app.put('/api/auth/senha', autenticar, (req, res, next) => next());

// Gestão de TVs
app.use('/api/tv', require('./routes/tv'));

// Gestão de campanhas
app.use('/api/campanha', autenticar, require('./routes/campanha'));

// Gestão de empresas (apenas admin e super_admin)
app.use('/api/empresa', autenticar, require('./routes/empresa'));

// Gestão de mídias
app.use('/api/midia', autenticar, require('./routes/midia'));

// Gestão de usuários (apenas admin e super_admin)
app.use('/api/usuario', autenticar, apenasRole('super_admin', 'admin'), require('./routes/usuario'));

// Métricas e relatórios
app.use('/api/relatorio', autenticar, require('./routes/relatorio'));
app.use('/api/dashboard', autenticar, require('./routes/dashboard'));

/* ==========================
   ROTAS PADRÃO
========================== */

// Servir o admin React (build em public/admin)
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// SPA catch-all: qualquer rota /admin/* retorna o index.html do React
app.get('/admin/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

// Página inicial redireciona para o admin
app.get('/', (req, res) => {
  res.redirect('/admin');
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
