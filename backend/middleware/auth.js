const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'samidia-secret-key-trocar-em-producao';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/* =========================
   MIDDLEWARE: Autenticar JWT
   Verifica token no header Authorization: Bearer <token>
   Injeta req.usuario com os dados do usuário
========================= */
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Buscar usuário no banco para garantir que ainda existe e está ativo
    db.get(
      'SELECT id, empresa_id, nome, email, role, ativo FROM usuarios WHERE id = ?',
      [decoded.id],
      (err, usuario) => {
        if (err) {
          console.error('Erro ao verificar usuário:', err);
          return res.status(500).json({ erro: 'Erro interno de autenticação' });
        }

        if (!usuario || !usuario.ativo) {
          return res.status(401).json({ erro: 'Usuário inativo ou não encontrado' });
        }

        req.usuario = usuario;
        next();
      }
    );
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token expirado' });
    }
    return res.status(401).json({ erro: 'Token inválido' });
  }
}

/* =========================
   MIDDLEWARE: Apenas Roles específicas
   Uso: apenasRole('super_admin', 'admin')
========================= */
function apenasRole(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    if (!roles.includes(req.usuario.role)) {
      return res.status(403).json({ erro: 'Sem permissão para esta ação' });
    }

    next();
  };
}

/* =========================
   HELPER: Gerar Token JWT
========================= */
function gerarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      empresa_id: usuario.empresa_id,
      role: usuario.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/* =========================
   HELPER: Filtrar por empresa
   Super admin vê tudo; outros veem apenas da sua empresa
========================= */
function getEmpresaId(req) {
  if (req.usuario.role === 'super_admin') {
    // Super admin pode filtrar por qualquer empresa via query param
    return req.query.empresa_id || null;
  }
  // Outros sempre filtram pela sua empresa
  return req.usuario.empresa_id;
}

module.exports = {
  autenticar,
  apenasRole,
  gerarToken,
  getEmpresaId,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
