const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error('❌ Erro ao conectar SQLite:', err.message);
  } else {
    console.log('✅ SQLite conectado:', dbPath);
  }
});

/* ==========================
   CRIAÇÃO DE TABELAS
   (CREATE IF NOT EXISTS = seguro para rodar sempre)
========================== */
db.serialize(() => {

  // ─── Empresas / Clientes ───
  db.run(`
    CREATE TABLE IF NOT EXISTS empresas (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      logo TEXT,
      criado_em INTEGER
    )
  `);

  // ─── Usuários (autenticação) ───
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      empresa_id TEXT REFERENCES empresas(id),
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      ativo INTEGER DEFAULT 1,
      criado_em INTEGER
    )
  `);

  // ─── TVs / Telas ───
  db.run(`
    CREATE TABLE IF NOT EXISTS tvs (
      id TEXT PRIMARY KEY,
      empresa_id TEXT REFERENCES empresas(id),
      nome TEXT,
      cidade TEXT,
      estado TEXT,
      pin TEXT,
      orientacao TEXT DEFAULT 'horizontal',
      ultimo_ping INTEGER,
      tema_cor TEXT,
      tema_texto TEXT,
      logo TEXT,
      noticias_frequencia INTEGER DEFAULT 2,
      clima_frequencia INTEGER DEFAULT 4,
      noticias_duracao INTEGER DEFAULT 10,
      clima_duracao INTEGER DEFAULT 9
    )
  `);

  // ─── Campanhas ───
  db.run(`
    CREATE TABLE IF NOT EXISTS campanhas (
      id TEXT PRIMARY KEY,
      empresa_id TEXT REFERENCES empresas(id),
      nome TEXT NOT NULL,
      descricao TEXT,
      ativo INTEGER DEFAULT 1,
      criado_em INTEGER
    )
  `);

  // ─── Vínculo Campanha ↔ TV (N:N) ───
  db.run(`
    CREATE TABLE IF NOT EXISTS campanha_tvs (
      campanha_id TEXT REFERENCES campanhas(id) ON DELETE CASCADE,
      tv_id TEXT REFERENCES tvs(id) ON DELETE CASCADE,
      PRIMARY KEY (campanha_id, tv_id)
    )
  `);

  // ─── Mídias (pertencem a campanhas) ───
  db.run(`
    CREATE TABLE IF NOT EXISTS midias (
      id TEXT PRIMARY KEY,
      campanha_id TEXT REFERENCES campanhas(id) ON DELETE CASCADE,
      tv_id TEXT,
      tipo TEXT,
      url TEXT,
      duracao INTEGER DEFAULT 10,
      regiao TEXT DEFAULT 'Todas',
      ativo INTEGER DEFAULT 1,
      ordem INTEGER DEFAULT 0,
      data_inicio TEXT,
      data_fim TEXT,
      hora_inicio TEXT,
      hora_fim TEXT,
      dias_semana TEXT
    )
  `);

  // ─── Relatórios (proof-of-play) ───
  db.run(`
    CREATE TABLE IF NOT EXISTS relatorios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tv_id TEXT,
      midia_id TEXT,
      tipo TEXT,
      inicio INTEGER,
      duracao INTEGER
    )
  `);

  // ─── Playlist (legado, mantido por compatibilidade) ───
  db.run(`
    CREATE TABLE IF NOT EXISTS playlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tv_id TEXT,
      tipo TEXT,
      url TEXT,
      conteudo TEXT,
      duracao INTEGER DEFAULT 8,
      ordem INTEGER DEFAULT 0
    )
  `);

  /* ==========================
     MIGRATIONS SEGURAS
     Para bancos existentes que já têm as tabelas antigas
  ========================== */

  // Adicionar novas colunas em tvs (ignora se já existirem)
  const tvsMigrations = [
    'ALTER TABLE tvs ADD COLUMN empresa_id TEXT',
    'ALTER TABLE tvs ADD COLUMN pin TEXT',
    'ALTER TABLE tvs ADD COLUMN orientacao TEXT DEFAULT \'horizontal\'',
    'ALTER TABLE tvs ADD COLUMN tema_cor TEXT',
    'ALTER TABLE tvs ADD COLUMN tema_texto TEXT',
    'ALTER TABLE tvs ADD COLUMN logo TEXT',
    'ALTER TABLE tvs ADD COLUMN noticias_frequencia INTEGER DEFAULT 2',
    'ALTER TABLE tvs ADD COLUMN clima_frequencia INTEGER DEFAULT 4',
    'ALTER TABLE tvs ADD COLUMN noticias_duracao INTEGER DEFAULT 10',
    'ALTER TABLE tvs ADD COLUMN clima_duracao INTEGER DEFAULT 9',
  ];

  tvsMigrations.forEach(sql => {
    db.run(sql, err => {
      // Ignora erro "duplicate column name" — significa que a coluna já existe
      if (err && !err.message.includes('duplicate column')) {
        console.error('Migration tvs:', err.message);
      }
    });
  });

  // Adicionar novas colunas em midias
  const midiasMigrations = [
    'ALTER TABLE midias ADD COLUMN campanha_id TEXT',
    'ALTER TABLE midias ADD COLUMN data_inicio TEXT',
    'ALTER TABLE midias ADD COLUMN data_fim TEXT',
    'ALTER TABLE midias ADD COLUMN hora_inicio TEXT',
    'ALTER TABLE midias ADD COLUMN hora_fim TEXT',
    'ALTER TABLE midias ADD COLUMN dias_semana TEXT',
  ];

  midiasMigrations.forEach(sql => {
    db.run(sql, err => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Migration midias:', err.message);
      }
    });
  });

  // Adicionar novas colunas em empresas
  const empresasMigrations = [
    'ALTER TABLE empresas ADD COLUMN logo TEXT',
    'ALTER TABLE empresas ADD COLUMN criado_em INTEGER',
  ];

  empresasMigrations.forEach(sql => {
    db.run(sql, err => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Migration empresas:', err.message);
      }
    });
  });

});

module.exports = db;
