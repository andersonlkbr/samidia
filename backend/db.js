const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(
  path.join(__dirname, 'database.sqlite')
);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS tvs (
      id TEXT PRIMARY KEY,
      nome TEXT,
      cidade TEXT,
      estado TEXT,
      ultimo_ping INTEGER
    )
  `);

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
});

module.exports = db;
