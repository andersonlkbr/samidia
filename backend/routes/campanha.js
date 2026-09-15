const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

/* === SECTION === */
// GET / - List all campanhas
router.get('/', (req, res) => {
    const { empresa_id } = req.query;
    
    if (empresa_id) {
        db.all('SELECT * FROM campanhas WHERE empresa_id = ? ORDER BY criado_em DESC', [empresa_id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        db.all('SELECT * FROM campanhas ORDER BY criado_em DESC', [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

/* === SECTION === */
// GET /:id - Get single campanha by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM campanhas WHERE id = ?', [id], (err, campanha) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!campanha) return res.status(404).json({ error: 'Campanha não encontrada' });
        
        // Get linked TVs
        db.all('SELECT t.* FROM tvs t JOIN campanha_tvs ct ON t.id = ct.tv_id WHERE ct.campanha_id = ?', [id], (err, tvs) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Get midias count
            db.get('SELECT COUNT(*) as count FROM midias WHERE campanha_id = ?', [id], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                
                campanha.tvs = tvs || [];
                campanha.midias_count = row ? row.count : 0;
                res.json(campanha);
            });
        });
    });
});

/* === SECTION === */
// POST / - Create campanha
router.post('/', (req, res) => {
    const { nome, descricao, empresa_id } = req.body;
    
    if (!nome || !empresa_id) {
        return res.status(400).json({ error: 'Nome e empresa_id são obrigatórios' });
    }
    
    const id = uuidv4();
    const criado_em = Date.now();
    const ativo = 1;
    
    db.run(
        'INSERT INTO campanhas (id, empresa_id, nome, descricao, ativo, criado_em) VALUES (?, ?, ?, ?, ?, ?)',
        [id, empresa_id, nome, descricao || '', ativo, criado_em],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, empresa_id, nome, descricao, ativo, criado_em });
        }
    );
});

/* === SECTION === */
// PUT /:id - Update campanha
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { nome, descricao, ativo } = req.body;
    
    db.run(
        'UPDATE campanhas SET nome = ?, descricao = ?, ativo = ? WHERE id = ?',
        [nome, descricao, ativo, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Campanha não encontrada' });
            res.json({ message: 'Campanha atualizada com sucesso' });
        }
    );
});

/* === SECTION === */
// DELETE /:id - Delete campanha, its midias and campanha_tvs
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        db.run('DELETE FROM midias WHERE campanha_id = ?', [id], function(err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }
            
            db.run('DELETE FROM campanha_tvs WHERE campanha_id = ?', [id], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                
                db.run('DELETE FROM campanhas WHERE id = ?', [id], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }
                    
                    if (this.changes === 0) {
                        db.run('ROLLBACK');
                        return res.status(404).json({ error: 'Campanha não encontrada' });
                    }
                    
                    db.run('COMMIT');
                    res.json({ message: 'Campanha removida com sucesso' });
                });
            });
        });
    });
});

/* === SECTION === */
// POST /:id/tvs - Link TVs to campaign
router.post('/:id/tvs', (req, res) => {
    const { id } = req.params;
    const { tv_ids } = req.body;
    
    if (!tv_ids || !Array.isArray(tv_ids)) {
        return res.status(400).json({ error: 'tv_ids deve ser um array' });
    }
    
    if (tv_ids.length === 0) {
        return res.json({ message: 'Nenhuma TV para vincular' });
    }
    
    const placeholders = tv_ids.map(() => '(?, ?)').join(', ');
    const params = [];
    tv_ids.forEach(tv_id => {
        params.push(id, tv_id);
    });
    
    db.run(
        `INSERT OR IGNORE INTO campanha_tvs (campanha_id, tv_id) VALUES ${placeholders}`,
        params,
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'TVs vinculadas com sucesso', vinculadas: this.changes });
        }
    );
});

/* === SECTION === */
// DELETE /:id/tvs/:tvId - Unlink a specific TV from a campaign
router.delete('/:id/tvs/:tvId', (req, res) => {
    const { id, tvId } = req.params;
    
    db.run('DELETE FROM campanha_tvs WHERE campanha_id = ? AND tv_id = ?', [id, tvId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Vínculo não encontrado' });
        res.json({ message: 'TV desvinculada com sucesso' });
    });
});

/* === SECTION === */
// GET /:id/tvs - List all TVs linked to this campaign
router.get('/:id/tvs', (req, res) => {
    const { id } = req.params;
    
    db.all(
        'SELECT t.* FROM tvs t JOIN campanha_tvs ct ON t.id = ct.tv_id WHERE ct.campanha_id = ?',
        [id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

module.exports = router;
