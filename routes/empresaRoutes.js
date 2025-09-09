const express = require('express');
const router = express.Router();
const pool = require('../db');
const logger = require('../utils/logger');

// Middleware para verificar autenticação
const isAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.authenticated) {
        logger.warn('Acesso não autorizado à rota', { module: 'empresaRoutes', url: req.originalUrl, session: req.session });
        return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
    }
    logger.info('Sessão autenticada com sucesso', { module: 'empresaRoutes', sessionId: req.session.id });
    next();
};

// Rota para verificar sessão
router.get('/check-session', (req, res) => {
    if (req.session && req.session.authenticated) {
        return res.status(200).json({ authenticated: true });
    }
    return res.status(401).json({ authenticated: false });
});

// Rota para listar todas as empresas
router.get('/api/empresas', isAuthenticated, async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
        const [rows] = await client.query(`
            SELECT 
                e.id, e.razao_social, e.cnpj, e.inscricao_municipal, 
                e.email, e.telefone, e.cidade, e.estado
            FROM empresa e
        `);
        logger.info('Lista de empresas obtida com sucesso', { module: 'empresaRoutes', count: rows.length });
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar empresas', { module: 'empresaRoutes', stack: error.stack, message: error.message });
        res.status(500).json({ message: 'Erro ao listar empresas', error: error.message });
    } finally {
        if (client) client.release();
    }
});

// Rota para obter uma empresa específica
router.get('/api/empresas/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    let client;
    try {
        client = await pool.getConnection();
        // Buscar dados da empresa
        const [empresaRows] = await client.query(`
            SELECT 
                e.*, c.codigo AS cnae, c.descricao AS descricao_cnae
            FROM empresa e
            LEFT JOIN cnae c ON e.id_cnae = c.id
            WHERE e.id = ?
        `, [id]);

        if (empresaRows.length === 0) {
            logger.warn(`Empresa com ID ${id} não encontrada`, { module: 'empresaRoutes' });
            return res.status(404).json({ message: 'Empresa não encontrada' });
        }

        // Buscar atividades secundárias
        const [atividadesSecundarias] = await client.query(`
            SELECT c.id AS id_cnae, c.codigo AS cnae, c.descricao AS descricao_cnae
            FROM empresa_atividade_secundaria eas
            JOIN cnae c ON eas.id_cnae = c.id
            WHERE eas.empresa_id = ?
        `, [id]);

        const empresa = empresaRows[0];
        empresa.atividades_secundarias = atividadesSecundarias;

        logger.info(`Empresa com ID ${id} obtida com sucesso`, { module: 'empresaRoutes' });
        res.json(empresa);
    } catch (error) {
        logger.error(`Erro ao obter empresa com ID ${id}`, {
            module: 'empresaRoutes',
            stack: error.stack,
            message: error.message
        });
        res.status(500).json({ message: 'Erro ao obter empresa', error: error.message });
    } finally {
        if (client) client.release();
    }
});

// Rota para consultar CNAE
router.get('/api/cnae/:codigo', isAuthenticated, async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
        // Decodificar o parâmetro da URL para lidar com caracteres especiais
        const codigo = decodeURIComponent(req.params.codigo);
        // Sanitizar o código para suportar formatos com ou sem hífen/barra
        const sanitizedCodigo = codigo.replace(/[-\\/]/g, '');
        const formattedCodigo = sanitizedCodigo.length === 7 ? 
            sanitizedCodigo.replace(/(\d{4})(\d{1})(\d{2})/, '$1-$2/$3') : codigo;

        logger.info(`Consultando CNAE com código ${codigo} (formatado: ${formattedCodigo}, sanitizado: ${sanitizedCodigo})`, { module: 'empresaRoutes' });

        // Buscar o código no formato original ou formatado
        const [rows] = await client.query(`
            SELECT id, codigo, descricao
            FROM cnae
            WHERE codigo = ? OR codigo = ?
        `, [formattedCodigo, sanitizedCodigo]);

        if (rows.length === 0) {
            logger.warn(`CNAE com código ${codigo} não encontrado`, { module: 'empresaRoutes' });
            return res.status(404).json({ message: 'CNAE não encontrado' });
        }

        logger.info(`CNAE com código ${codigo} obtido com sucesso`, { module: 'empresaRoutes', id: rows[0].id });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao consultar CNAE', {
            module: 'empresaRoutes',
            stack: error.stack,
            message: error.message,
            sqlMessage: error.sqlMessage,
            sql: error.sql,
            code: error.code
        });
        res.status(500).json({ message: 'Erro ao consultar CNAE', error: error.message });
    } finally {
        if (client) client.release();
    }
});

// Rota para criar uma empresa
router.post('/api/empresas', isAuthenticated, async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
        await client.query('BEGIN');
        const {
            razao_social, nome_fantasia, cnpj, porte, inscricao_estadual, inscricao_municipal,
            id_cnae, regime_tributario, data_fundacao, natureza_juridica, cep, cidade, estado,
            rua, numero, bairro, complemento, email, telefone, site, pessoa_contato,
            situacao_cadastral, atividades_secundarias
        } = req.body;

        logger.info('Dados recebidos para criação de empresa', {
            module: 'empresaRoutes',
            razao_social,
            cnpj,
            email
        });

        // Inserir empresa
        const [result] = await client.query(`
            INSERT INTO empresa (
                razao_social, nome_fantasia, cnpj, porte, inscricao_estadual, inscricao_municipal,
                id_cnae, regime_tributario, data_fundacao, natureza_juridica, cep, cidade, estado,
                rua, numero, bairro, complemento, email, telefone, site, pessoa_contato, situacao_cadastral
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            razao_social, nome_fantasia || null, cnpj, porte || 'DEMAIS', inscricao_estadual || null,
            inscricao_municipal, id_cnae, regime_tributario, data_fundacao, natureza_juridica || null,
            cep, cidade, estado, rua, numero, bairro, complemento || null, email, telefone,
            site || null, pessoa_contato || null, situacao_cadastral || 'Ativa'
        ]);

        const empresaId = result.insertId;

        // Inserir atividades secundárias
        if (atividades_secundarias && Array.isArray(atividades_secundarias)) {
            for (const atividade of atividades_secundarias) {
                if (atividade.id_cnae) {
                    await client.query(`
                        INSERT INTO empresa_atividade_secundaria (empresa_id, id_cnae)
                        VALUES (?, ?)
                    `, [empresaId, atividade.id_cnae]);
                }
            }
        }

        await client.query('COMMIT');
        logger.info(`Empresa criada com sucesso`, { module: 'empresaRoutes', id: empresaId });
        res.json({ id: empresaId, message: 'Empresa criada com sucesso' });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        logger.error('Erro ao criar empresa', {
            module: 'empresaRoutes',
            stack: error.stack,
            message: error.message,
            sqlMessage: error.sqlMessage,
            sql: error.sql,
            code: error.code
        });
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'CNPJ já cadastrado' });
        } else {
            res.status(500).json({ message: 'Erro ao criar empresa', error: error.message });
        }
    } finally {
        if (client) client.release();
    }
});

// Rota para atualizar uma empresa
router.put('/api/empresas/:id', isAuthenticated, async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
        await client.query('BEGIN');
        const { id } = req.params;
        const {
            razao_social, nome_fantasia, cnpj, porte, inscricao_estadual, inscricao_municipal,
            id_cnae, regime_tributario, data_fundacao, natureza_juridica, cep, cidade, estado,
            rua, numero, bairro, complemento, email, telefone, site, pessoa_contato,
            situacao_cadastral, atividades_secundarias
        } = req.body;

        logger.info(`Dados recebidos para atualização de empresa com ID ${id}`, {
            module: 'empresaRoutes',
            razao_social,
            cnpj,
            email
        });

        // Verificar se a empresa existe
        const [existing] = await client.query('SELECT id FROM empresa WHERE id = ?', [id]);
        if (existing.length === 0) {
            throw new Error('Empresa não encontrada.');
        }

        // Atualizar empresa
        await client.query(`
            UPDATE empresa
            SET razao_social = ?, nome_fantasia = ?, cnpj = ?, porte = ?, inscricao_estadual = ?,
                inscricao_municipal = ?, id_cnae = ?, regime_tributario = ?, data_fundacao = ?,
                natureza_juridica = ?, cep = ?, cidade = ?, estado = ?, rua = ?, numero = ?,
                bairro = ?, complemento = ?, email = ?, telefone = ?, site = ?, pessoa_contato = ?,
                situacao_cadastral = ?
            WHERE id = ?
        `, [
            razao_social, nome_fantasia || null, cnpj, porte || 'DEMAIS', inscricao_estadual || null,
            inscricao_municipal, id_cnae, regime_tributario, data_fundacao, natureza_juridica || null,
            cep, cidade, estado, rua, numero, bairro, complemento || null, email, telefone,
            site || null, pessoa_contato || null, situacao_cadastral || 'Ativa', id
        ]);

        // Deletar atividades secundárias existentes
        await client.query(`
            DELETE FROM empresa_atividade_secundaria
            WHERE empresa_id = ?
        `, [id]);

        // Inserir novas atividades secundárias
        if (atividades_secundarias && Array.isArray(atividades_secundarias)) {
            for (const atividade of atividades_secundarias) {
                if (atividade.id_cnae) {
                    await client.query(`
                        INSERT INTO empresa_atividade_secundaria (empresa_id, id_cnae)
                        VALUES (?, ?)
                    `, [id, atividade.id_cnae]);
                }
            }
        }

        await client.query('COMMIT');
        logger.info(`Empresa com ID ${id} atualizada com sucesso`, { module: 'empresaRoutes' });
        res.json({ message: 'Empresa atualizada com sucesso' });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        logger.error(`Erro ao atualizar empresa com ID ${id}`, {
            module: 'empresaRoutes',
            stack: error.stack,
            message: error.message,
            sqlMessage: error.sqlMessage,
            sql: error.sql,
            code: error.code
        });
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'CNPJ já cadastrado' });
        } else {
            res.status(500).json({ message: 'Erro ao atualizar empresa', error: error.message });
        }
    } finally {
        if (client) client.release();
    }
});

module.exports = router;