/**
 * Script para criar o primeiro super_admin
 * 
 * Uso:
 *   node backend/scripts/seed-admin.js
 *   node backend/scripts/seed-admin.js --email admin@samidia.com --senha 123456
 *   node backend/scripts/seed-admin.js --email admin@samidia.com --senha 123456 --nome "Anderson"
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const SALT_ROUNDS = 10;

// Pegar argumentos da linha de comando
const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && args[index + 1]) return args[index + 1];
  return defaultValue;
}

const email = getArg('email', 'admin@samidia.com');
const senha = getArg('senha', '123456');
const nome = getArg('nome', 'Administrador');

async function seed() {
  console.log('🌱 Criando super_admin...\n');

  // Aguardar o banco inicializar
  await new Promise(r => setTimeout(r, 500));

  try {
    // Verificar se já existe
    const existente = await new Promise((resolve, reject) => {
      db.get('SELECT id, email FROM usuarios WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existente) {
      console.log(`⚠️  Usuário ${email} já existe (ID: ${existente.id})`);
      console.log('   Use outro email ou delete o existente primeiro.');
      process.exit(0);
    }

    // Buscar primeira empresa (criada pela migração)
    const empresa = await new Promise((resolve, reject) => {
      db.get('SELECT id, nome FROM empresas LIMIT 1', [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!empresa) {
      console.log('❌ Nenhuma empresa encontrada. Execute primeiro: node backend/scripts/migrate-v2.js');
      process.exit(1);
    }

    const id = uuidv4();
    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO usuarios (id, empresa_id, nome, email, senha_hash, role, ativo, criado_em)
         VALUES (?, ?, ?, ?, ?, 'super_admin', 1, ?)`,
        [id, empresa.id, nome, email, senhaHash, Date.now()],
        err => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log('✅ Super admin criado com sucesso!');
    console.log('────────────────────────────────');
    console.log(`   Email:    ${email}`);
    console.log(`   Senha:    ${senha}`);
    console.log(`   Role:     super_admin`);
    console.log(`   Empresa:  ${empresa.nome}`);
    console.log(`   ID:       ${id}`);
    console.log('────────────────────────────────');
    console.log('\n🔐 Use estas credenciais para fazer login no admin.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao criar admin:', err);
    process.exit(1);
  }
}

seed();
