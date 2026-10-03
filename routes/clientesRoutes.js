const express = require('express');
const pool = require('../db');
const logger = require('../utils/logger');
const { logAuditoria } = require('../utils/auditoria');
const { resolveRepresentanteContext } = require('../utils/representanteAccess');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
};

let clientesColumnsReady = null;

async function ensureClientesRepresentanteColumn() {
    if (!clientesColumnsReady) {
        clientesColumnsReady = pool.query(`
            ALTER TABLE clientes
                ADD COLUMN IF NOT EXISTS representante_id INTEGER
        `).catch(() => null);
    }
    await clientesColumnsReady;
}

router.get('/api/clientes', isAuthenticated, async (req, res) => {
    try {
        await ensureClientesRepresentanteColumn();
        const { ensureRepresentanteSupport } = require('../utils/representanteAccess');
        await ensureRepresentanteSupport(pool);
        const ctx = await resolveRepresentanteContext(pool, req);
        if (ctx.isRepresentante && !ctx.representanteId) {
            return res.status(403).json({ message: 'Representante sem cadastro vinculado.' });
        }

        const params = [];
        let whereSql = '';
        if (ctx.representanteId) {
            whereSql = 'WHERE representante_id = ?';
            params.push(ctx.representanteId);
        }

        const [rows] = await pool.query(`
            SELECT id, tipo_pessoa, nome_razao_social, cpf_cnpj, telefone_principal,
                   email_contato, cep, endereco, numero, bairro, cidade, estado, complemento,
                   limite_credito, status_credito, status, representante_id
            FROM clientes
            ${whereSql}
            ORDER BY nome_razao_social
        `, params);
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar clientes', { module: 'clientesRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar clientes.' });
    }
});

router.get('/api/clientes/:id', isAuthenticated, async (req, res) => {
    try {
        await ensureClientesRepresentanteColumn();
        const ctx = await resolveRepresentanteContext(pool, req);
        const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Cliente não encontrado.' });
        if (ctx.representanteId && Number(rows[0].representante_id) !== ctx.representanteId) {
            return res.status(403).json({ message: 'Cliente fora da sua carteira.' });
        }
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao obter cliente', { module: 'clientesRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao obter cliente.' });
    }
});

router.post('/api/clientes', isAuthenticated, async (req, res) => {
    const {
        tipo_pessoa, nome_razao_social, cpf_cnpj, rg_ie, telefone_principal, email_contato,
        data_cadastro, cep, endereco, numero, bairro, cidade, estado, complemento,
        limite_credito, status_credito, formas_pagamento_aceitas, status, observacoes
    } = req.body;

    if (!tipo_pessoa || !nome_razao_social?.trim() || !cpf_cnpj?.trim()) {
        return res.status(400).json({ message: 'Tipo, nome/razão social e CPF/CNPJ são obrigatórios.' });
    }

    try {
        await ensureClientesRepresentanteColumn();
        const ctx = await resolveRepresentanteContext(pool, req);
        if (ctx.isRepresentante && !ctx.representanteId) {
            return res.status(403).json({ message: 'Representante sem cadastro vinculado.' });
        }

        const requestedId = req.body.representante_id ? Number(req.body.representante_id) : null;
        const representanteId = ctx.isRepresentante
            ? ctx.representanteId
            : (Number.isInteger(requestedId) && requestedId > 0 ? requestedId : null);

        const [result] = await pool.query(`
            INSERT INTO clientes (
                tipo_pessoa, nome_razao_social, cpf_cnpj, rg_ie, telefone_principal, email_contato,
                data_cadastro, cep, endereco, numero, bairro, cidade, estado, complemento,
                limite_credito, status_credito, formas_pagamento_aceitas, status, observacoes,
                representante_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tipo_pessoa, nome_razao_social.trim(), cpf_cnpj.trim(), rg_ie || null,
            telefone_principal || null, email_contato || null,
            data_cadastro || new Date().toISOString().slice(0, 10),
            cep || null, endereco || null, numero || null, bairro || null, cidade || null,
            estado || null, complemento || null, limite_credito ?? 0,
            status_credito || (ctx.isRepresentante ? 'Em análise' : 'Pendente'),
            formas_pagamento_aceitas || 'Boleto,Cartão Crédito,PIX', status || 'Ativo',
            observacoes || null,
            representanteId || null,
        ]);

        res.status(201).json({ id: result.insertId, message: 'Cliente criado com sucesso.' });
        await logAuditoria(req, {
            modulo: 'clientes',
            acao: 'criar',
            entidade: 'cliente',
            entidadeId: result.insertId,
            descricao: `Criou cliente "${nome_razao_social.trim()}"`,
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'CPF/CNPJ já cadastrado.' });
        }
        logger.error('Erro ao criar cliente', { module: 'clientesRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao criar cliente.' });
    }
});

router.put('/api/clientes/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const {
        tipo_pessoa, nome_razao_social, cpf_cnpj, rg_ie, telefone_principal, email_contato,
        data_cadastro, cep, endereco, numero, bairro, cidade, estado, complemento,
        limite_credito, status_credito, formas_pagamento_aceitas, status, observacoes
    } = req.body;

    if (!tipo_pessoa || !nome_razao_social?.trim() || !cpf_cnpj?.trim()) {
        return res.status(400).json({ message: 'Tipo, nome/razão social e CPF/CNPJ são obrigatórios.' });
    }

    try {
        await ensureClientesRepresentanteColumn();
        const ctx = await resolveRepresentanteContext(pool, req);
        const [existing] = await pool.query('SELECT id, representante_id, status_credito FROM clientes WHERE id = ?', [id]);
        if (!existing.length) return res.status(404).json({ message: 'Cliente não encontrado.' });
        if (ctx.representanteId && Number(existing[0].representante_id) !== ctx.representanteId) {
            return res.status(403).json({ message: 'Cliente fora da sua carteira.' });
        }
        if (ctx.representanteId && String(existing[0].status_credito || '').trim().toLowerCase() === 'bloqueado') {
            return res.status(403).json({ message: 'Crédito bloqueado. Não é possível editar este cliente.' });
        }

        await pool.query(`
            UPDATE clientes SET
                tipo_pessoa = ?, nome_razao_social = ?, cpf_cnpj = ?, rg_ie = ?, telefone_principal = ?,
                email_contato = ?, data_cadastro = ?, cep = ?, endereco = ?, numero = ?, bairro = ?,
                cidade = ?, estado = ?, complemento = ?, limite_credito = ?, status_credito = ?,
                formas_pagamento_aceitas = ?, status = ?, observacoes = ?,
                representante_id = ?,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            tipo_pessoa, nome_razao_social.trim(), cpf_cnpj.trim(), rg_ie || null,
            telefone_principal || null, email_contato || null,
            data_cadastro || new Date().toISOString().slice(0, 10),
            cep || null, endereco || null, numero || null, bairro || null, cidade || null,
            estado || null, complemento || null, limite_credito ?? 0, status_credito || 'Pendente',
            formas_pagamento_aceitas || 'Boleto,Cartão Crédito,PIX', status || 'Ativo',
            observacoes || null,
            ctx.representanteId || existing[0].representante_id || null,
            id
        ]);

        res.json({ message: 'Cliente atualizado com sucesso.' });
        await logAuditoria(req, {
            modulo: 'clientes',
            acao: 'editar',
            entidade: 'cliente',
            entidadeId: id,
            descricao: `Alterou cliente "${nome_razao_social.trim()}"`,
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'CPF/CNPJ já cadastrado.' });
        }
        logger.error('Erro ao atualizar cliente', { module: 'clientesRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar cliente.' });
    }
});

router.delete('/api/clientes/:id', isAuthenticated, async (req, res) => {
    try {
        await ensureClientesRepresentanteColumn();
        const ctx = await resolveRepresentanteContext(pool, req);
        if (ctx.isRepresentante) {
            return res.status(403).json({ message: 'Representantes não podem excluir clientes.' });
        }
        const [result] = await pool.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Cliente não encontrado.' });
        await logAuditoria(req, {
            modulo: 'clientes',
            acao: 'excluir',
            entidade: 'cliente',
            entidadeId: req.params.id,
            descricao: `Excluiu cliente #${req.params.id}`,
        });
        res.json({ message: 'Cliente excluído com sucesso.' });
    } catch (error) {
        logger.error('Erro ao excluir cliente', { module: 'clientesRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir cliente.' });
    }
});

module.exports = router;
