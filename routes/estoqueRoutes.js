const express = require('express');
const pool = require('../db');
const logger = require('../utils/logger');
const { logAuditoria } = require('../utils/auditoria');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
};

const TIPOS = ['entrada', 'saida', 'ajuste'];
const MOTIVOS_ENTRADA = ['producao', 'ajuste_manual', 'compra', 'outro'];
const MOTIVOS_SAIDA = ['ajuste_manual', 'perda', 'outro', 'pedido'];
const MOTIVOS_AJUSTE = ['ajuste_manual', 'outro'];

let tableReadyPromise = null;

async function ensureEstoqueTables() {
    if (!tableReadyPromise) {
        tableReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS produtos (
                    id SERIAL PRIMARY KEY,
                    codigo VARCHAR(40),
                    nome VARCHAR(150) NOT NULL,
                    categoria VARCHAR(80) DEFAULT 'Geral',
                    estoque NUMERIC(12, 2) DEFAULT 0,
                    unidade VARCHAR(20) DEFAULT 'un',
                    status VARCHAR(20) DEFAULT 'Ativo',
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS estoque_movimentos (
                    id SERIAL PRIMARY KEY,
                    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
                    tipo VARCHAR(20) NOT NULL,
                    motivo VARCHAR(40) NOT NULL DEFAULT 'outro',
                    quantidade NUMERIC(12, 2) NOT NULL,
                    data_movimento DATE NOT NULL DEFAULT CURRENT_DATE,
                    observacao TEXT,
                    saldo_apos NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    created_by VARCHAR(120),
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                ALTER TABLE estoque_movimentos
                ADD COLUMN IF NOT EXISTS pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL
            `).catch(() => null);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS estoque_movimentos_produto_idx
                ON estoque_movimentos (produto_id)
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS estoque_movimentos_data_idx
                ON estoque_movimentos (data_movimento DESC, id DESC)
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS estoque_movimentos_pedido_idx
                ON estoque_movimentos (pedido_id)
            `).catch(() => null);
        })().catch((error) => {
            tableReadyPromise = null;
            throw error;
        });
    }

    return tableReadyPromise;
}

function toNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value) {
    const raw = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return todayIso();
}

function getActor(req) {
    return req.session?.user?.username
        || req.session?.user?.full_name
        || req.session?.username
        || null;
}

function parseItens(body) {
    const source = Array.isArray(body?.itens) ? body.itens : [];
    return source
        .map((item) => ({
            produto_id: Number(item.produto_id),
            quantidade: toNumber(item.quantidade, 0),
        }))
        .filter((item) => Number.isInteger(item.produto_id) && item.produto_id > 0 && item.quantidade > 0);
}

async function applyMovimentos({ tipo, motivo, dataMovimento, observacao, itens, actor }) {
    const client = await pool.getConnection();

    try {
        await client.beginTransaction();
        const results = [];

        for (const item of itens) {
            const [produtos] = await client.query(
                'SELECT id, nome, estoque FROM produtos WHERE id = ? FOR UPDATE',
                [item.produto_id]
            );

            if (!produtos.length) {
                throw Object.assign(new Error(`Produto #${item.produto_id} não encontrado.`), { status: 404 });
            }

            const produto = produtos[0];
            const estoqueAtual = toNumber(produto.estoque, 0);
            const quantidade = toNumber(item.quantidade, 0);
            let saldoApos = estoqueAtual;

            if (tipo === 'entrada') {
                saldoApos = Number((estoqueAtual + quantidade).toFixed(2));
            } else if (tipo === 'saida') {
                if (quantidade > estoqueAtual) {
                    throw Object.assign(
                        new Error(`Estoque insuficiente para "${produto.nome}". Disponível: ${estoqueAtual}.`),
                        { status: 400 }
                    );
                }
                saldoApos = Number((estoqueAtual - quantidade).toFixed(2));
            } else if (tipo === 'ajuste') {
                saldoApos = Number(quantidade.toFixed(2));
            }

            await client.query(
                'UPDATE produtos SET estoque = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
                [saldoApos, item.produto_id]
            );

            const quantidadeRegistrada = tipo === 'ajuste'
                ? Math.abs(saldoApos - estoqueAtual) || quantidade
                : quantidade;

            const [insertResult] = await client.query(`
                INSERT INTO estoque_movimentos (
                    produto_id, tipo, motivo, quantidade, data_movimento,
                    observacao, saldo_apos, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                item.produto_id,
                tipo,
                motivo,
                quantidadeRegistrada,
                dataMovimento,
                observacao,
                saldoApos,
                actor,
            ]);

            results.push({
                id: insertResult.insertId,
                produto_id: item.produto_id,
                produto_nome: produto.nome,
                tipo,
                motivo,
                quantidade: quantidadeRegistrada,
                saldo_apos: saldoApos,
                data_movimento: dataMovimento,
            });
        }

        await client.commit();
        return results;
    } catch (error) {
        try {
            await client.rollback();
        } catch {
            // ignore rollback errors
        }
        throw error;
    } finally {
        client.release();
    }
}

router.use(isAuthenticated);

router.get('/', async (_req, res) => {
    try {
        await ensureEstoqueTables();

        const [rows] = await pool.query(`
            SELECT
                p.id AS produto_id,
                p.codigo,
                p.nome,
                p.categoria,
                p.unidade,
                p.status,
                COALESCE(p.estoque, 0) AS estoque,
                (
                    SELECT m.data_movimento
                    FROM estoque_movimentos m
                    WHERE m.produto_id = p.id
                    ORDER BY m.data_movimento DESC, m.id DESC
                    LIMIT 1
                ) AS ultima_data,
                (
                    SELECT m.tipo
                    FROM estoque_movimentos m
                    WHERE m.produto_id = p.id
                    ORDER BY m.data_movimento DESC, m.id DESC
                    LIMIT 1
                ) AS ultimo_tipo
            FROM produtos p
            WHERE LOWER(COALESCE(p.status, 'ativo')) = 'ativo'
            ORDER BY p.nome
        `);

        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar estoque', { module: 'estoqueRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar estoque.' });
    }
});

router.get('/movimentos', async (req, res) => {
    try {
        await ensureEstoqueTables();

        const filters = [];
        const params = [];

        if (req.query.produto_id) {
            filters.push('m.produto_id = ?');
            params.push(Number(req.query.produto_id));
        }

        if (req.query.tipo && TIPOS.includes(String(req.query.tipo))) {
            filters.push('m.tipo = ?');
            params.push(String(req.query.tipo));
        }

        if (req.query.de) {
            filters.push('m.data_movimento >= ?');
            params.push(normalizeDate(req.query.de));
        }

        if (req.query.ate) {
            filters.push('m.data_movimento <= ?');
            params.push(normalizeDate(req.query.ate));
        }

        const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        const [rows] = await pool.query(`
            SELECT
                m.id,
                m.produto_id,
                p.nome AS produto_nome,
                p.codigo AS produto_codigo,
                p.unidade,
                m.tipo,
                m.motivo,
                m.quantidade,
                m.data_movimento,
                m.observacao,
                m.saldo_apos,
                m.created_by,
                m.criado_em,
                m.pedido_id,
                ped.id AS pedido_resolvido_id,
                ped.numero AS pedido_numero,
                COALESCE(
                    NULLIF(TRIM(ped.nfe_numero), ''),
                    NULLIF(TRIM(nfe.numero::text), '')
                ) AS nfe_numero,
                COALESCE(
                    NULLIF(TRIM(ped.nfe_chave), ''),
                    NULLIF(TRIM(nfe.chave), '')
                ) AS nfe_chave,
                COALESCE(
                    NULLIF(TRIM(ped.nfe_status), ''),
                    NULLIF(TRIM(nfe.status), '')
                ) AS nfe_status
            FROM estoque_movimentos m
            INNER JOIN produtos p ON p.id = m.produto_id
            LEFT JOIN pedidos ped ON ped.id = COALESCE(
                m.pedido_id,
                CASE
                    WHEN m.observacao ~* 'PED-[0-9]+' THEN (
                        SELECT pe.id
                        FROM pedidos pe
                        WHERE pe.numero = UPPER((regexp_match(m.observacao, '(PED-[0-9]+)', 'i'))[1])
                        LIMIT 1
                    )
                    ELSE NULL
                END
            )
            LEFT JOIN LATERAL (
                SELECT ne.numero, ne.chave, ne.status
                FROM nfe_emissoes ne
                WHERE ne.pedido_id = ped.id
                ORDER BY ne.id DESC
                LIMIT 1
            ) nfe ON TRUE
            ${where}
            ORDER BY m.data_movimento DESC, m.id DESC
            LIMIT 500
        `, params);

        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar movimentos de estoque', { module: 'estoqueRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar histórico de estoque.' });
    }
});

router.post('/entrada', async (req, res) => {
    try {
        await ensureEstoqueTables();

        const itens = parseItens(req.body);
        if (!itens.length) {
            return res.status(400).json({ message: 'Informe ao menos um produto com quantidade.' });
        }

        const motivo = MOTIVOS_ENTRADA.includes(req.body.motivo) ? req.body.motivo : 'producao';
        const dataMovimento = normalizeDate(req.body.data_movimento);
        const observacao = String(req.body.observacao || '').trim() || null;

        const results = await applyMovimentos({
            tipo: 'entrada',
            motivo,
            dataMovimento,
            observacao,
            itens,
            actor: getActor(req),
        });

        await logAuditoria(req, {
            modulo: 'estoque',
            acao: 'criar',
            entidade: 'movimento_entrada',
            entidadeId: results?.[0]?.id || null,
            descricao: `Registrou entrada de estoque (${itens.length} item(ns))`,
        });
        res.status(201).json({
            message: 'Entrada de estoque registrada com sucesso.',
            movimentos: results,
        });
    } catch (error) {
        logger.error('Erro ao registrar entrada de estoque', { module: 'estoqueRoutes', stack: error.stack });
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Erro ao registrar entrada de estoque.',
        });
    }
});

router.post('/saida', async (req, res) => {
    try {
        await ensureEstoqueTables();

        const itens = parseItens(req.body);
        if (!itens.length) {
            return res.status(400).json({ message: 'Informe ao menos um produto com quantidade.' });
        }

        const motivo = MOTIVOS_SAIDA.includes(req.body.motivo) ? req.body.motivo : 'outro';
        const dataMovimento = normalizeDate(req.body.data_movimento);
        const observacao = String(req.body.observacao || '').trim() || null;

        const results = await applyMovimentos({
            tipo: 'saida',
            motivo,
            dataMovimento,
            observacao,
            itens,
            actor: getActor(req),
        });

        await logAuditoria(req, {
            modulo: 'estoque',
            acao: 'criar',
            entidade: 'movimento_saida',
            entidadeId: results?.[0]?.id || null,
            descricao: `Registrou saída de estoque (${itens.length} item(ns))`,
        });
        res.status(201).json({
            message: 'Saída de estoque registrada com sucesso.',
            movimentos: results,
        });
    } catch (error) {
        logger.error('Erro ao registrar saída de estoque', { module: 'estoqueRoutes', stack: error.stack });
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Erro ao registrar saída de estoque.',
        });
    }
});

router.post('/ajuste', async (req, res) => {
    try {
        await ensureEstoqueTables();

        const produtoId = Number(req.body.produto_id);
        const quantidade = toNumber(req.body.quantidade, NaN);

        if (!Number.isInteger(produtoId) || produtoId <= 0 || !Number.isFinite(quantidade) || quantidade < 0) {
            return res.status(400).json({ message: 'Informe produto e quantidade válida para o ajuste.' });
        }

        const motivo = MOTIVOS_AJUSTE.includes(req.body.motivo) ? req.body.motivo : 'ajuste_manual';
        const dataMovimento = normalizeDate(req.body.data_movimento);
        const observacao = String(req.body.observacao || '').trim() || null;

        const results = await applyMovimentos({
            tipo: 'ajuste',
            motivo,
            dataMovimento,
            observacao,
            itens: [{ produto_id: produtoId, quantidade }],
            actor: getActor(req),
        });

        await logAuditoria(req, {
            modulo: 'estoque',
            acao: 'criar',
            entidade: 'movimento_ajuste',
            entidadeId: results?.[0]?.id || produtoId,
            descricao: `Registrou ajuste de estoque do produto #${produtoId}`,
        });
        res.status(201).json({
            message: 'Ajuste de estoque registrado com sucesso.',
            movimentos: results,
        });
    } catch (error) {
        logger.error('Erro ao registrar ajuste de estoque', { module: 'estoqueRoutes', stack: error.stack });
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Erro ao registrar ajuste de estoque.',
        });
    }
});

module.exports = router;
