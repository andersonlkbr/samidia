
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

module.exports = db;
