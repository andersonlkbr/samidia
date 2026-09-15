const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const db = require('../database');
const { gerarToken } = require('../middleware/auth');

const SALT_ROUNDS = 10;

/* =========================
   POST /login — Autenticação
========================= */
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
  }

  try {
    const usuario = await new Promise((resolve, reject) => {
      db.get(
        `SELECT u.*, e.nome as empresa_nome
         FROM usuarios u
         LEFT JOIN empresas e ON u.empresa_id = e.id
         WHERE u.email = ?`,
        [email.toLowerCase().trim()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!usuario) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    if (!usuario.ativo) {
      return res.status(401).json({ erro: 'Conta desativada. Contate o administrador.' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    const token = gerarToken(usuario);

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        empresa_id: usuario.empresa_id,
        empresa_nome: usuario.empresa_nome
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno no login' });
  }
});

/* =========================
   GET /eu — Dados do usuário logado
   (precisa do middleware autenticar)
========================= */
router.get('/eu', (req, res) => {
  // req.usuario já foi injetado pelo middleware autenticar
  if (!req.usuario) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }

  db.get(
    `SELECT u.id, u.nome, u.email, u.role, u.empresa_id, u.criado_em,
            e.nome as empresa_nome
     FROM usuarios u
     LEFT JOIN empresas e ON u.empresa_id = e.id
     WHERE u.id = ?`,
    [req.usuario.id],
    (err, row) => {
      if (err) return res.status(500).json({ erro: 'Erro ao buscar dados' });
      if (!row) return res.status(404).json({ erro: 'Usuário não encontrado' });
      res.json(row);
    }
  );
});

/* =========================
   PUT /senha — Alterar senha própria
   (precisa do middleware autenticar)
========================= */
router.put('/senha', async (req, res) => {
  if (!req.usuario) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }

  const { senha_atual, nova_senha } = req.body;

  if (!senha_atual || !nova_senha) {
    return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias' });
  }

  if (nova_senha.length < 6) {
    return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres' });
  }

  try {
    // Buscar hash atual
    const usuario = await new Promise((resolve, reject) => {
      db.get('SELECT senha_hash FROM usuarios WHERE id = ?', [req.usuario.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const senhaValida = await bcrypt.compare(senha_atual, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Senha atual incorreta' });
    }

    const novoHash = await bcrypt.hash(nova_senha, SALT_ROUNDS);

    db.run(
      'UPDATE usuarios SET senha_hash = ? WHERE id = ?',
      [novoHash, req.usuario.id],
      err => {
        if (err) return res.status(500).json({ erro: 'Erro ao alterar senha' });
        res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso' });
      }
    );
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
