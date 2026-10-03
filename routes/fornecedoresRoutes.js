const express = require('express');
const pool = require('../db');
const logger = require('../utils/logger');
const { logAuditoria } = require('../utils/auditoria');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
};

router.get('/api/fornecedores', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, razao_social, nome_fantasia, cnpj, telefone_contato, email_contato,
                   nome_contato, cidade, estado, ativo
            FROM fornecedores
            ORDER BY razao_social
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar fornecedores', { module: 'fornecedoresRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar fornecedores.' });
    }
});

router.get('/api/fornecedores/:id', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM fornecedores WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Fornecedor não encontrado.' });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao obter fornecedor', { module: 'fornecedoresRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao obter fornecedor.' });
    }
});

router.post('/api/fornecedores', isAuthenticated, async (req, res) => {
    const {
        razao_social, nome_fantasia, cnpj, telefone_contato, email_contato, nome_contato,
        cep, endereco, numero, complemento, bairro, cidade, estado, ativo, observacoes
    } = req.body;

    if (!razao_social?.trim() || !cnpj?.trim()) {
        return res.status(400).json({ message: 'Razão social e CNPJ são obrigatórios.' });
    }

    try {
        const [result] = await pool.query(`
            INSERT INTO fornecedores (
                razao_social, nome_fantasia, cnpj, telefone_contato, email_contato, nome_contato,
                cep, endereco, numero, complemento, bairro, cidade, estado, ativo, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            razao_social.trim(), nome_fantasia || null, cnpj.trim(), telefone_contato || null,
            email_contato || null, nome_contato || null, cep || null, endereco || null,
            numero || null, complemento || null, bairro || null, cidade || null, estado || null,
            ativo || 'sim', observacoes || null
        ]);

        await logAuditoria(req, {
            modulo: 'fornecedores',
            acao: 'criar',
            entidade: 'fornecedor',
            entidadeId: result.insertId,
            descricao: `Criou fornecedor "${razao_social.trim()}"`,
        });
        res.status(201).json({ id: result.insertId, message: 'Fornecedor criado com sucesso.' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'CNPJ já cadastrado.' });
        }
        logger.error('Erro ao criar fornecedor', { module: 'fornecedoresRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao criar fornecedor.' });
    }
});

router.put('/api/fornecedores/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const {
        razao_social, nome_fantasia, cnpj, telefone_contato, email_contato, nome_contato,
        cep, endereco, numero, complemento, bairro, cidade, estado, ativo, observacoes
    } = req.body;

    if (!razao_social?.trim() || !cnpj?.trim()) {
        return res.status(400).json({ message: 'Razão social e CNPJ são obrigatórios.' });
    }

    try {
        const [existing] = await pool.query('SELECT id FROM fornecedores WHERE id = ?', [id]);
        if (!existing.length) return res.status(404).json({ message: 'Fornecedor não encontrado.' });

        await pool.query(`
            UPDATE fornecedores SET
                razao_social = ?, nome_fantasia = ?, cnpj = ?, telefone_contato = ?, email_contato = ?,
                nome_contato = ?, cep = ?, endereco = ?, numero = ?, complemento = ?, bairro = ?,
                cidade = ?, estado = ?, ativo = ?, observacoes = ?, atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            razao_social.trim(), nome_fantasia || null, cnpj.trim(), telefone_contato || null,
            email_contato || null, nome_contato || null, cep || null, endereco || null,
            numero || null, complemento || null, bairro || null, cidade || null, estado || null,
            ativo || 'sim', observacoes || null, id
        ]);

        await logAuditoria(req, {
            modulo: 'fornecedores',
            acao: 'editar',
            entidade: 'fornecedor',
            entidadeId: id,
            descricao: `Alterou fornecedor "${razao_social.trim()}"`,
        });
        res.json({ message: 'Fornecedor atualizado com sucesso.' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'CNPJ já cadastrado.' });
        }
        logger.error('Erro ao atualizar fornecedor', { module: 'fornecedoresRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar fornecedor.' });
    }
});

router.delete('/api/fornecedores/:id', isAuthenticated, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM fornecedores WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Fornecedor não encontrado.' });
        await logAuditoria(req, {
            modulo: 'fornecedores',
            acao: 'excluir',
            entidade: 'fornecedor',
            entidadeId: req.params.id,
            descricao: `Excluiu fornecedor #${req.params.id}`,
        });
        res.json({ message: 'Fornecedor excluído com sucesso.' });
    } catch (error) {
        logger.error('Erro ao excluir fornecedor', { module: 'fornecedoresRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir fornecedor.' });
    }
});

module.exports = router;
