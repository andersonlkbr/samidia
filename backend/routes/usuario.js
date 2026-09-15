const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const db = require('../database');
const { apenasRole } = require('../middleware/auth');

const SALT_ROUNDS = 10;

/* =========================
   GET / — Listar usuários
   Admin: vê apenas da sua empresa
   Super admin: vê todos (ou filtrar por ?empresa_id=)
========================= */
router.get('/', (req, res) => {
  const { empresa_id } = req.query;
  const usuario = req.usuario;

  let sql = `SELECT u.id, u.nome, u.email, u.role, u.empresa_id, u.ativo, u.criado_em,
                    e.nome as empresa_nome
             FROM usuarios u
             LEFT JOIN empresas e ON u.empresa_id = e.id`;
  let params = [];

  if (usuario.role === 'super_admin') {
    if (empresa_id) {
      sql += ' WHERE u.empresa_id = ?';
      params.push(empresa_id);
    }
  } else {
    // Admin e operador só veem da sua empresa
    sql += ' WHERE u.empresa_id = ?';
    params.push(usuario.empresa_id);
  }

  sql += ' ORDER BY u.criado_em DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro ao listar usuários:', err);
      return res.status(500).json({ erro: 'Erro ao listar usuários' });
    }
    res.json(rows || []);
  });
});

/* =========================
   POST / — Criar usuário
   Admin: cria operadores da sua empresa
   Super admin: cria qualquer role em qualquer empresa
========================= */
router.post('/', async (req, res) => {
  const { nome, email, senha, role, empresa_id } = req.body;
  const criador = req.usuario;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres' });
  }

  // Validar role
  const roleDesejada = role || 'operador';
  const rolesPermitidas = ['admin', 'operador'];

  if (criador.role !== 'super_admin') {
    // Admin só cria operadores da sua empresa
    if (!rolesPermitidas.includes(roleDesejada)) {
      return res.status(403).json({ erro: 'Sem permissão para criar este tipo de usuário' });
    }
  }

  // Definir empresa
  const empresaDoUsuario = criador.role === 'super_admin'
    ? (empresa_id || criador.empresa_id)
    : criador.empresa_id;

  try {
    // Verificar email duplicado
    const existente = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM usuarios WHERE email = ?', [email.toLowerCase().trim()], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existente) {
      return res.status(409).json({ erro: 'Este email já está cadastrado' });
    }

    const id = uuidv4();
    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    db.run(
      `INSERT INTO usuarios (id, empresa_id, nome, email, senha_hash, role, ativo, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, empresaDoUsuario, nome, email.toLowerCase().trim(), senhaHash, roleDesejada, Date.now()],
      err => {
        if (err) {
          console.error('Erro ao criar usuário:', err);
          return res.status(500).json({ erro: 'Erro ao criar usuário' });
        }
        res.status(201).json({
          id,
          nome,
          email: email.toLowerCase().trim(),
          role: roleDesejada,
          empresa_id: empresaDoUsuario
        });
      }
    );
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

/* =========================
   PUT /:id — Editar usuário
========================= */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, email, role, ativo } = req.body;
  const editor = req.usuario;

  const campos = [];
  const valores = [];

  if (nome !== undefined) { campos.push('nome = ?'); valores.push(nome); }
  if (email !== undefined) { campos.push('email = ?'); valores.push(email.toLowerCase().trim()); }
  if (role !== undefined && editor.role === 'super_admin') { campos.push('role = ?'); valores.push(role); }
  if (ativo !== undefined) { campos.push('ativo = ?'); valores.push(ativo ? 1 : 0); }

  if (campos.length === 0) {
    return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
  }

  valores.push(id);

  // Verificar permissão: admin só edita da sua empresa
  let sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
  if (editor.role !== 'super_admin') {
    sql += ' AND empresa_id = ?';
    valores.push(editor.empresa_id);
  }

  db.run(sql, valores, function (err) {
    if (err) {
      console.error('Erro ao editar usuário:', err);
      return res.status(500).json({ erro: 'Erro ao editar usuário' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado ou sem permissão' });
    }
    res.json({ sucesso: true });
  });
});

/* =========================
   DELETE /:id — Desativar usuário
========================= */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const editor = req.usuario;

  // Impedir auto-exclusão
  if (id === editor.id) {
    return res.status(400).json({ erro: 'Você não pode desativar sua própria conta' });
  }

  let sql = 'UPDATE usuarios SET ativo = 0 WHERE id = ?';
  const params = [id];

  if (editor.role !== 'super_admin') {
    sql += ' AND empresa_id = ?';
    params.push(editor.empresa_id);
  }

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Erro ao desativar usuário:', err);
      return res.status(500).json({ erro: 'Erro ao desativar usuário' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado ou sem permissão' });
    }
    res.json({ sucesso: true, mensagem: 'Usuário desativado' });
  });
});

module.exports = router;
