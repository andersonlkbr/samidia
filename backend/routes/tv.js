const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

/* === SECTION: Helpers === */
function gerarPIN() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function gerarPinUnico(callback) {
    const pin = gerarPIN();
    db.get(`SELECT id FROM tvs WHERE pin = ?`, [pin], (err, row) => {
        if (err) return callback(err);
        if (row) {
            gerarPinUnico(callback);
        } else {
            callback(null, pin);
        }
    });
}

/* === SECTION: Routes === */

// 1. GET / - List all TVs
router.get('/', (req, res) => {
    let sql = `SELECT * FROM tvs`;
    let params = [];
    
    if (req.query.empresa_id) {
        sql += ` WHERE empresa_id = ?`;
        params.push(req.query.empresa_id);
    }
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar TVs:', err);
            return res.status(500).json({ error: 'Erro ao buscar TVs' });
        }
        
        const now = Date.now();
        const tvs = rows.map(tv => ({
            ...tv,
            online: tv.ultimo_ping ? (now - tv.ultimo_ping < 60000) : false
        }));
        
        res.json(tvs);
    });
});

// 2. GET /:id - Get single TV by ID
router.get('/:id', (req, res) => {
    db.get(`SELECT * FROM tvs WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) {
            console.error('Erro ao buscar TV:', err);
            return res.status(500).json({ error: 'Erro ao buscar TV' });
        }
        if (!row) {
            return res.status(404).json({ error: 'TV não encontrada' });
        }
        res.json(row);
    });
});

// 3. POST / - Create TV
router.post('/', (req, res) => {
    const { nome, cidade, estado, empresa_id } = req.body;
    
    if (!nome || !empresa_id) {
        return res.status(400).json({ error: 'Nome e empresa_id são obrigatórios' });
    }
    
    const id = uuidv4();
    
    gerarPinUnico((err, pin) => {
        if (err) {
            console.error('Erro ao gerar PIN:', err);
            return res.status(500).json({ error: 'Erro ao gerar PIN' });
        }
        
        const sql = `
            INSERT INTO tvs (id, empresa_id, nome, cidade, estado, pin, orientacao, noticias_frequencia, clima_frequencia, noticias_duracao, clima_duracao)
            VALUES (?, ?, ?, ?, ?, ?, 'horizontal', 2, 4, 10, 9)
        `;
        const params = [id, empresa_id, nome, cidade || null, estado || null, pin];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('Erro ao criar TV:', err);
                return res.status(500).json({ error: 'Erro ao criar TV' });
            }
            res.status(201).json({ id, pin, message: 'TV criada com sucesso' });
        });
    });
});

// 8. POST /parear - Pair TV by PIN
router.post('/parear', (req, res) => {
    const { pin } = req.body;
    
    if (!pin) {
        return res.status(400).json({ error: 'PIN é obrigatório' });
    }
    
    db.get(`SELECT id, nome, cidade, estado FROM tvs WHERE pin = ?`, [pin], (err, row) => {
        if (err) {
            console.error('Erro ao parear TV:', err);
            return res.status(500).json({ error: 'Erro interno ao parear' });
        }
        if (!row) {
            return res.status(404).json({ error: 'PIN inválido ou não encontrado' });
        }
        res.json(row);
    });
});

// 4. PUT /:id - Update TV
router.put('/:id', (req, res) => {
    const { nome, cidade, estado, empresa_id, orientacao } = req.body;
    const { id } = req.params;
    
    let updates = [];
    let params = [];
    
    if (nome !== undefined) { updates.push('nome = ?'); params.push(nome); }
    if (cidade !== undefined) { updates.push('cidade = ?'); params.push(cidade); }
    if (estado !== undefined) { updates.push('estado = ?'); params.push(estado); }
    if (empresa_id !== undefined) { updates.push('empresa_id = ?'); params.push(empresa_id); }
    if (orientacao !== undefined) { updates.push('orientacao = ?'); params.push(orientacao); }
    
    if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    params.push(id);
    
    const sql = `UPDATE tvs SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Erro ao atualizar TV:', err);
            return res.status(500).json({ error: 'Erro ao atualizar TV' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'TV não encontrada' });
        }
        res.json({ message: 'TV atualizada com sucesso' });
    });
});

// 5. DELETE /:id - Delete TV and cascade
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        db.run(`DELETE FROM campanha_tvs WHERE tv_id = ?`, [id], function(err) {
            if (err) {
                console.error('Erro ao deletar de campanha_tvs:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Erro ao deletar dependências da TV' });
            }
            
            db.run(`DELETE FROM midias WHERE tv_id = ?`, [id], function(err) {
                if (err) {
                    console.error('Erro ao deletar midias:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Erro ao deletar dependências da TV' });
                }
                
                db.run(`DELETE FROM tvs WHERE id = ?`, [id], function(err) {
                    if (err) {
                        console.error('Erro ao deletar TV:', err);
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Erro ao deletar TV' });
                    }
                    if (this.changes === 0) {
                        db.run('ROLLBACK');
                        return res.status(404).json({ error: 'TV não encontrada' });
                    }
                    
                    db.run('COMMIT', (err) => {
                        if (err) {
                            console.error('Erro no commit:', err);
                            return res.status(500).json({ error: 'Erro ao deletar TV' });
                        }
                        res.json({ message: 'TV e dependências deletadas com sucesso' });
                    });
                });
            });
        });
    });
});

// 6. PUT /:id/tema - Update visual config
router.put('/:id/tema', (req, res) => {
    const { tema_cor, tema_texto, logo } = req.body;
    const { id } = req.params;
    
    db.run(
        `UPDATE tvs SET tema_cor = ?, tema_texto = ?, logo = ? WHERE id = ?`,
        [tema_cor, tema_texto, logo, id],
        function(err) {
            if (err) {
                console.error('Erro ao atualizar tema da TV:', err);
                return res.status(500).json({ error: 'Erro ao atualizar tema' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'TV não encontrada' });
            }
            res.json({ message: 'Tema atualizado com sucesso' });
        }
    );
});

// 7. GET /:id/tema - Get visual config
router.get('/:id/tema', (req, res) => {
    const { id } = req.params;
    
    db.get(
        `SELECT tema_cor, tema_texto, logo FROM tvs WHERE id = ?`,
        [id],
        (err, row) => {
            if (err) {
                console.error('Erro ao buscar tema da TV:', err);
                return res.status(500).json({ error: 'Erro ao buscar tema' });
            }
            if (!row) {
                return res.status(404).json({ error: 'TV não encontrada' });
            }
            res.json(row);
        }
    );
});

// 9. PUT /:id/config - Update player config
router.put('/:id/config', (req, res) => {
    const { noticias_frequencia, clima_frequencia, noticias_duracao, clima_duracao } = req.body;
    const { id } = req.params;
    
    let updates = [];
    let params = [];
    
    if (noticias_frequencia !== undefined) { updates.push('noticias_frequencia = ?'); params.push(noticias_frequencia); }
    if (clima_frequencia !== undefined) { updates.push('clima_frequencia = ?'); params.push(clima_frequencia); }
    if (noticias_duracao !== undefined) { updates.push('noticias_duracao = ?'); params.push(noticias_duracao); }
    if (clima_duracao !== undefined) { updates.push('clima_duracao = ?'); params.push(clima_duracao); }
    
    if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    params.push(id);
    const sql = `UPDATE tvs SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Erro ao atualizar configuração da TV:', err);
            return res.status(500).json({ error: 'Erro ao atualizar configuração' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'TV não encontrada' });
        }
        res.json({ message: 'Configurações atualizadas com sucesso' });
    });
});

// 10. GET /:id/config - Get player config
router.get('/:id/config', (req, res) => {
    const { id } = req.params;
    
    db.get(
        `SELECT noticias_frequencia, clima_frequencia, noticias_duracao, clima_duracao FROM tvs WHERE id = ?`,
        [id],
        (err, row) => {
            if (err) {
                console.error('Erro ao buscar configuração da TV:', err);
                return res.status(500).json({ error: 'Erro ao buscar configuração' });
            }
            if (!row) {
                return res.status(404).json({ error: 'TV não encontrada' });
            }
            res.json(row);
        }
    );
});

module.exports = router;
