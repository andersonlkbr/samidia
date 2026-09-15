const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

/* === SECTION === */
/* GET / - List all empresas */
router.get('/', (req, res) => {
    db.all('SELECT * FROM empresas ORDER BY criado_em DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching empresas:', err);
            return res.status(500).json({ error: 'Erro ao buscar empresas' });
        }
        res.json(rows);
    });
});

/* === SECTION === */
/* GET /:id - Get single empresa */
router.get('/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM empresas WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Error fetching empresa:', err);
            return res.status(500).json({ error: 'Erro ao buscar empresa' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }
        res.json(row);
    });
});

/* === SECTION === */
/* POST / - Create empresa */
router.post('/', (req, res) => {
    const { nome, logo } = req.body;
    
    if (!nome) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const id = uuidv4();
    const criado_em = Date.now();

    db.run(
        'INSERT INTO empresas (id, nome, logo, criado_em) VALUES (?, ?, ?, ?)',
        [id, nome, logo || null, criado_em],
        function(err) {
            if (err) {
                console.error('Error creating empresa:', err);
                return res.status(500).json({ error: 'Erro ao criar empresa' });
            }
            res.status(201).json({
                id,
                nome,
                logo: logo || null,
                criado_em
            });
        }
    );
});

/* === SECTION === */
/* PUT /:id - Update empresa */
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { nome, logo } = req.body;

    if (!nome) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    db.run(
        'UPDATE empresas SET nome = ?, logo = ? WHERE id = ?',
        [nome, logo || null, id],
        function(err) {
            if (err) {
                console.error('Error updating empresa:', err);
                return res.status(500).json({ error: 'Erro ao atualizar empresa' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Empresa não encontrada' });
            }
            res.json({ success: true, message: 'Empresa atualizada com sucesso' });
        }
    );
});

/* === SECTION === */
/* DELETE /:id - Delete empresa */
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM empresas WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error deleting empresa:', err);
            return res.status(500).json({ error: 'Erro ao deletar empresa' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }
        res.json({ success: true, message: 'Empresa deletada com sucesso' });
    });
});

/* === SECTION === */
/* GET /:id/resumo - Summary counters */
router.get('/:id/resumo', (req, res) => {
    const { id } = req.params;

    const queries = {
        total_tvs: 'SELECT COUNT(*) as count FROM tvs WHERE empresa_id = ?',
        total_campanhas: 'SELECT COUNT(*) as count FROM campanhas WHERE empresa_id = ?',
        total_midias_ativas: 'SELECT COUNT(m.id) as count FROM midias m JOIN campanhas c ON m.campanha_id = c.id WHERE c.empresa_id = ? AND m.ativo = 1',
        total_exibicoes: 'SELECT COUNT(r.id) as count FROM relatorios r JOIN tvs t ON r.tv_id = t.id WHERE t.empresa_id = ?'
    };

    let resumo = {};
    let completed = 0;
    const keys = Object.keys(queries);

    let hasError = false;

    keys.forEach(key => {
        db.get(queries[key], [id], (err, row) => {
            if (hasError) return;
            if (err) {
                console.error(`Error fetching ${key}:`, err);
                hasError = true;
                return res.status(500).json({ error: 'Erro ao buscar resumo' });
            }
            resumo[key] = row ? row.count : 0;
            completed++;
            
            if (completed === keys.length) {
                res.json(resumo);
            }
        });
    });
});

module.exports = router;
