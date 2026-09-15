/**
 * Script de Migração — SAmídia v1 → v2
 * 
 * Migra dados existentes para o novo schema:
 * 1. Cria uma empresa padrão
 * 2. Vincula todas as TVs existentes a essa empresa
 * 3. Para cada TV com mídias, cria uma campanha e move as mídias
 * 4. Cria vínculos campanha_tvs
 * 
 * Uso: node backend/scripts/migrate-v2.js
 */

const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Importar banco (isso também roda as migrations de ALTER TABLE)
const db = require('../database');

const EMPRESA_PADRAO_NOME = 'Minha Empresa';

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function migrar() {
  console.log('🔄 Iniciando migração SAmídia v1 → v2...\n');

  // 1️⃣ Verificar se já foi migrado
  const empresas = await all('SELECT * FROM empresas');
  if (empresas.length > 0) {
    console.log('⚠️  Já existem empresas cadastradas. Pulando criação de empresa padrão.');
  }

  // Criar empresa padrão se não existir
  let empresaId;
  if (empresas.length === 0) {
    empresaId = uuidv4();
    await run(
      'INSERT INTO empresas (id, nome, criado_em) VALUES (?, ?, ?)',
      [empresaId, EMPRESA_PADRAO_NOME, Date.now()]
    );
    console.log(`✅ Empresa padrão criada: "${EMPRESA_PADRAO_NOME}" (${empresaId})`);
  } else {
    empresaId = empresas[0].id;
    console.log(`📋 Usando empresa existente: "${empresas[0].nome}" (${empresaId})`);
  }

  // 2️⃣ Vincular TVs sem empresa à empresa padrão
  const tvsUpdate = await run(
    'UPDATE tvs SET empresa_id = ? WHERE empresa_id IS NULL OR empresa_id = ?',
    [empresaId, '']
  );
  console.log(`✅ ${tvsUpdate.changes} TV(s) vinculada(s) à empresa padrão`);

  // 3️⃣ Gerar PINs para TVs sem PIN
  const tvsSemPin = await all('SELECT id FROM tvs WHERE pin IS NULL OR pin = ?', ['']);
  for (const tv of tvsSemPin) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    await run('UPDATE tvs SET pin = ? WHERE id = ?', [pin, tv.id]);
  }
  console.log(`✅ ${tvsSemPin.length} PIN(s) gerado(s) para TVs`);

  // 4️⃣ Migrar mídias de tv_id para campanhas
  const midiasOrfas = await all(
    'SELECT DISTINCT tv_id FROM midias WHERE tv_id IS NOT NULL AND (campanha_id IS NULL OR campanha_id = ?)',
    ['']
  );

  let campanhasCriadas = 0;
  let midiasMigradas = 0;

  for (const { tv_id } of midiasOrfas) {
    // Buscar info da TV
    const tv = await get('SELECT nome FROM tvs WHERE id = ?', [tv_id]);
    const tvNome = tv?.nome || 'TV Desconhecida';

    // Verificar se já existe campanha para essa TV
    const campanhaExistente = await get(
      `SELECT c.id FROM campanhas c
       INNER JOIN campanha_tvs ct ON c.id = ct.campanha_id
       WHERE ct.tv_id = ? AND c.nome LIKE ?`,
      [tv_id, `%${tvNome}%`]
    );

    let campanhaId;
    if (campanhaExistente) {
      campanhaId = campanhaExistente.id;
    } else {
      // Criar campanha
      campanhaId = uuidv4();
      await run(
        'INSERT INTO campanhas (id, empresa_id, nome, descricao, ativo, criado_em) VALUES (?, ?, ?, ?, 1, ?)',
        [campanhaId, empresaId, `Campanha - ${tvNome}`, `Migração automática da TV ${tvNome}`, Date.now()]
      );
      campanhasCriadas++;

      // Vincular campanha à TV
      await run(
        'INSERT OR IGNORE INTO campanha_tvs (campanha_id, tv_id) VALUES (?, ?)',
        [campanhaId, tv_id]
      );
    }

    // Atualizar mídias com o campanha_id
    const result = await run(
      'UPDATE midias SET campanha_id = ? WHERE tv_id = ? AND (campanha_id IS NULL OR campanha_id = ?)',
      [campanhaId, tv_id, '']
    );
    midiasMigradas += result.changes;
  }

  console.log(`✅ ${campanhasCriadas} campanha(s) criada(s)`);
  console.log(`✅ ${midiasMigradas} mídia(s) migrada(s) para campanhas`);

  // 5️⃣ Resumo final
  console.log('\n────────────────────────────────');
  console.log('📊 Resumo da migração:');
  
  const totalEmpresas = await get('SELECT COUNT(*) as n FROM empresas');
  const totalTVs = await get('SELECT COUNT(*) as n FROM tvs');
  const totalCampanhas = await get('SELECT COUNT(*) as n FROM campanhas');
  const totalMidias = await get('SELECT COUNT(*) as n FROM midias');
  const totalVinculos = await get('SELECT COUNT(*) as n FROM campanha_tvs');
  
  console.log(`   Empresas:  ${totalEmpresas.n}`);
  console.log(`   TVs:       ${totalTVs.n}`);
  console.log(`   Campanhas: ${totalCampanhas.n}`);
  console.log(`   Mídias:    ${totalMidias.n}`);
  console.log(`   Vínculos:  ${totalVinculos.n}`);
  console.log('────────────────────────────────');
  console.log('\n✅ Migração concluída com sucesso!');
  
  process.exit(0);
}

migrar().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
