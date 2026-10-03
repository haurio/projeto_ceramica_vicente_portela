const express = require('express');
const pool = require('../db');
const logger = require('../utils/logger');
const { logAuditoria } = require('../utils/auditoria');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
};

let tableReadyPromise = null;

async function ensureRepresentantesTables() {
    if (!tableReadyPromise) {
        tableReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS representantes (
                    id SERIAL PRIMARY KEY,
                    nome VARCHAR(150) NOT NULL,
                    cpf_cnpj VARCHAR(20),
                    email VARCHAR(150),
                    telefone VARCHAR(30),
                    cep VARCHAR(12),
                    endereco VARCHAR(180),
                    numero VARCHAR(20),
                    complemento VARCHAR(120),
                    bairro VARCHAR(120),
                    cidade VARCHAR(120),
                    estado VARCHAR(2),
                    comissao_percent NUMERIC(8, 2) NOT NULL DEFAULT 0,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
                    observacoes TEXT,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS representantes_nome_idx
                ON representantes (nome)
            `).catch(() => null);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS representantes_user_idx
                ON representantes (user_id)
            `).catch(() => null);

            await pool.query(`
                ALTER TABLE clientes
                ADD COLUMN IF NOT EXISTS representante_id INTEGER REFERENCES representantes(id) ON DELETE SET NULL
            `).catch(() => null);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS clientes_representante_idx
                ON clientes (representante_id)
            `).catch(() => null);

            await pool.query(`
                ALTER TABLE pedidos
                    ADD COLUMN IF NOT EXISTS representante_id INTEGER REFERENCES representantes(id) ON DELETE SET NULL,
                    ADD COLUMN IF NOT EXISTS origem VARCHAR(20) NOT NULL DEFAULT 'admin'
            `).catch(() => null);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS pedidos_representante_idx
                ON pedidos (representante_id)
            `).catch(() => null);

            const demoReps = [
                ['Marcos Oliveira Santos', '123.456.789-00', 'marcos.rep@exemplo.com', '(32) 98811-2200', '36500-000', 'Rua das Palmeiras', '120', 'Centro', 'Ubá', 'MG', 5, 'Ativo', 'Representante região Zona da Mata.'],
                ['Ana Beatriz Ferreira', '987.654.321-00', 'ana.rep@exemplo.com', '(32) 99122-3344', '36010-040', 'Av. Barão do Rio Branco', '850', 'Centro', 'Juiz de Fora', 'MG', 4.5, 'Ativo', 'Carteira foco em lojas de materiais.'],
                ['Carlos Eduardo Lima', '456.789.123-00', 'carlos.rep@exemplo.com', '(31) 98455-6677', '30130-000', 'Rua da Bahia', '1148', 'Centro', 'Belo Horizonte', 'MG', 6, 'Ativo', 'Atendimento Grande BH.'],
                ['Juliana Costa Ribeiro', '321.654.987-00', 'juliana.rep@exemplo.com', '(27) 99770-1122', '29010-120', 'Av. Jerônimo Monteiro', '300', 'Centro', 'Vitória', 'ES', 5.5, 'Ativo', 'Cobertura ES e litoral.'],
                ['Pedro Henrique Alves', '159.753.486-00', 'pedro.rep@exemplo.com', '(24) 98800-5566', '25620-000', 'Rua do Imperador', '45', 'Centro', 'Petrópolis', 'RJ', 3, 'Inativo', 'Cadastro demonstrativo inativo.'],
            ];

            for (const row of demoReps) {
                const [exists] = await pool.query(
                    'SELECT id FROM representantes WHERE email = ? LIMIT 1',
                    [row[2]]
                );
                if (exists.length) continue;
                await pool.query(`
                    INSERT INTO representantes (
                        nome, cpf_cnpj, email, telefone, cep, endereco, numero, bairro,
                        cidade, estado, comissao_percent, status, observacoes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, row);
            }
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

function parseClienteIds(raw) {
    if (Array.isArray(raw)) {
        return [...new Set(raw.map((item) => Number(item)).filter((id) => Number.isInteger(id) && id > 0))];
    }
    if (typeof raw === 'string') {
        return [...new Set(
            raw.split(',')
                .map((item) => Number(String(item).trim()))
                .filter((id) => Number.isInteger(id) && id > 0)
        )];
    }
    return [];
}

function slugUsername(nome, email) {
    const fromEmail = String(email || '').split('@')[0].trim().toLowerCase();
    if (fromEmail) return fromEmail.replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'representante';
    return String(nome || 'representante')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '')
        .slice(0, 40) || 'representante';
}

async function fetchRepresentanteCompleto(id) {
    const [rows] = await pool.query(`
        SELECT *
        FROM representantes
        WHERE id = ?
    `, [id]);

    if (!rows.length) return null;

    const [clientes] = await pool.query(`
        SELECT id, nome_razao_social, cpf_cnpj, cidade, estado, telefone_principal, status
        FROM clientes
        WHERE representante_id = ?
        ORDER BY nome_razao_social
    `, [id]);

    return {
        ...rows[0],
        comissao_percent: toNumber(rows[0].comissao_percent, 0),
        cliente_ids: clientes.map((item) => item.id),
        clientes,
    };
}

async function syncCarteira(client, representanteId, clienteIds) {
    const ids = parseClienteIds(clienteIds);

    await client.query(`
        UPDATE clientes
        SET representante_id = NULL, atualizado_em = CURRENT_TIMESTAMP
        WHERE representante_id = ?
          AND (${ids.length ? 'id NOT IN (' + ids.map(() => '?').join(', ') + ')' : 'TRUE'})
    `, ids.length ? [representanteId, ...ids] : [representanteId]);

    if (!ids.length) return;

    await client.query(`
        UPDATE clientes
        SET representante_id = ?, atualizado_em = CURRENT_TIMESTAMP
        WHERE id IN (${ids.map(() => '?').join(', ')})
    `, [representanteId, ...ids]);
}


router.get('/api/representantes', isAuthenticated, async (req, res) => {
    try {
        await ensureRepresentantesTables();

        const [rows] = await pool.query(`
            SELECT
                id,
                nome,
                cpf_cnpj,
                email,
                telefone,
                cidade,
                estado,
                comissao_percent,
                status,
                (
                    SELECT COUNT(*)::int
                    FROM clientes c
                    WHERE c.representante_id = representantes.id
                ) AS clientes_qtd
            FROM representantes
            ORDER BY nome
        `);

        res.json(rows.map((row) => ({
            ...row,
            comissao_percent: toNumber(row.comissao_percent, 0),
            clientes_qtd: Number(row.clientes_qtd) || 0,
        })));
    } catch (error) {
        logger.error('Erro ao listar representantes', { module: 'representantesRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar representantes.' });
    }
});

const COMISSAO_STATUS = [
    'Confirmado',
    'Aguardando carregamento',
    'Aguardando entrega',
    'Entregue',
];

function normalizeDate(value) {
    if (!value) return null;
    const raw = String(value).trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function monthBounds(reference = new Date()) {
    const year = reference.getFullYear();
    const month = reference.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const toIso = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    return { inicio: toIso(start), fim: toIso(end) };
}

router.get('/api/representantes/comissoes', isAuthenticated, async (req, res) => {
    try {
        await ensureRepresentantesTables();

        const defaults = monthBounds();
        const inicio = normalizeDate(req.query.inicio) || defaults.inicio;
        const fim = normalizeDate(req.query.fim) || defaults.fim;
        const statusPlaceholders = COMISSAO_STATUS.map(() => '?').join(', ');

        const [rows] = await pool.query(`
            SELECT
                r.id AS representante_id,
                r.nome,
                r.comissao_percent,
                r.status,
                COUNT(p.id)::int AS pedidos_qtd,
                COALESCE(SUM(
                    COALESCE((
                        SELECT SUM(i.subtotal)
                        FROM pedido_itens i
                        WHERE i.pedido_id = p.id
                    ), 0) + COALESCE(p.frete, 0) - COALESCE(p.desconto, 0)
                ), 0) AS vendas_total,
                COALESCE(SUM(
                    (
                        COALESCE((
                            SELECT SUM(i.subtotal)
                            FROM pedido_itens i
                            WHERE i.pedido_id = p.id
                        ), 0) + COALESCE(p.frete, 0) - COALESCE(p.desconto, 0)
                    ) * COALESCE(r.comissao_percent, 0) / 100.0
                ), 0) AS comissao_total
            FROM representantes r
            LEFT JOIN pedidos p
                ON p.representante_id = r.id
               AND p.data_pedido BETWEEN ? AND ?
               AND p.status IN (${statusPlaceholders})
            GROUP BY r.id, r.nome, r.comissao_percent, r.status
            ORDER BY comissao_total DESC, r.nome ASC
        `, [inicio, fim, ...COMISSAO_STATUS]);

        const itens = rows.map((row) => ({
            representante_id: row.representante_id,
            nome: row.nome,
            comissao_percent: toNumber(row.comissao_percent, 0),
            status: row.status || 'Ativo',
            pedidos_qtd: Number(row.pedidos_qtd) || 0,
            vendas_total: Number(Number(row.vendas_total || 0).toFixed(2)),
            comissao_total: Number(Number(row.comissao_total || 0).toFixed(2)),
        }));

        const summary = {
            representantes: itens.length,
            com_comissao: itens.filter((item) => item.comissao_total > 0).length,
            pedidos_qtd: itens.reduce((acc, item) => acc + item.pedidos_qtd, 0),
            vendas_total: Number(itens.reduce((acc, item) => acc + item.vendas_total, 0).toFixed(2)),
            comissao_total: Number(itens.reduce((acc, item) => acc + item.comissao_total, 0).toFixed(2)),
        };

        res.json({
            periodo: { inicio, fim },
            itens,
            summary,
        });
    } catch (error) {
        logger.error('Erro ao listar comissões de representantes', {
            module: 'representantesRoutes',
            stack: error.stack,
        });
        res.status(500).json({ message: 'Erro ao carregar comissões.' });
    }
});

router.get('/api/representantes/:id', isAuthenticated, async (req, res) => {
    try {
        await ensureRepresentantesTables();
        const item = await fetchRepresentanteCompleto(Number(req.params.id));
        if (!item) return res.status(404).json({ message: 'Representante não encontrado.' });
        res.json(item);
    } catch (error) {
        logger.error('Erro ao obter representante', { module: 'representantesRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao obter representante.' });
    }
});

router.post('/api/representantes', isAuthenticated, async (req, res) => {
    const client = await pool.getConnection();

    try {
        await ensureRepresentantesTables();

        const nome = String(req.body.nome || '').trim();
        if (!nome) {
            return res.status(400).json({ message: 'Nome do representante é obrigatório.' });
        }

        const email = String(req.body.email || '').trim().toLowerCase() || null;
        const telefone = String(req.body.telefone || '').trim() || null;
        const cpfCnpj = String(req.body.cpf_cnpj || '').trim() || null;
        const status = String(req.body.status || 'Ativo') === 'Inativo' ? 'Inativo' : 'Ativo';
        const comissaoPercent = Math.max(0, Math.min(100, toNumber(req.body.comissao_percent, 0)));

        await client.beginTransaction();

        const [result] = await client.query(`
            INSERT INTO representantes (
                nome, cpf_cnpj, email, telefone, cep, endereco, numero, complemento,
                bairro, cidade, estado, comissao_percent, status, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            nome,
            cpfCnpj,
            email,
            telefone,
            String(req.body.cep || '').trim() || null,
            String(req.body.endereco || '').trim() || null,
            String(req.body.numero || '').trim() || null,
            String(req.body.complemento || '').trim() || null,
            String(req.body.bairro || '').trim() || null,
            String(req.body.cidade || '').trim() || null,
            String(req.body.estado || '').trim().toUpperCase().slice(0, 2) || null,
            comissaoPercent,
            status,
            String(req.body.observacoes || '').trim() || null,
        ]);

        const representanteId = result.insertId;
        await syncCarteira(client, representanteId, req.body.cliente_ids || req.body.clientes);
        await client.commit();

        const completo = await fetchRepresentanteCompleto(representanteId);
        await logAuditoria(req, {
            modulo: 'representantes',
            acao: 'criar',
            entidade: 'representante',
            entidadeId: representanteId,
            descricao: `Criou representante "${nome}"`,
        });

        res.status(201).json({
            message: 'Representante criado com sucesso.',
            representante: completo,
        });
    } catch (error) {
        try {
            await client.rollback();
        } catch {
            // ignore
        }
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Usuário ou e-mail já cadastrado.' });
        }
        logger.error('Erro ao criar representante', { module: 'representantesRoutes', stack: error.stack });
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Erro ao criar representante.',
        });
    } finally {
        client.release();
    }
});

router.put('/api/representantes/:id', isAuthenticated, async (req, res) => {
    const client = await pool.getConnection();
    const representanteId = Number(req.params.id);

    try {
        await ensureRepresentantesTables();

        const [atuais] = await pool.query('SELECT * FROM representantes WHERE id = ?', [representanteId]);
        if (!atuais.length) {
            return res.status(404).json({ message: 'Representante não encontrado.' });
        }

        const atual = atuais[0];
        const nome = String(req.body.nome || '').trim();
        if (!nome) {
            return res.status(400).json({ message: 'Nome do representante é obrigatório.' });
        }

        const email = String(req.body.email || '').trim().toLowerCase() || null;
        const telefone = String(req.body.telefone || '').trim() || null;
        const cpfCnpj = String(req.body.cpf_cnpj || '').trim() || null;
        const status = String(req.body.status || 'Ativo') === 'Inativo' ? 'Inativo' : 'Ativo';
        const comissaoPercent = Math.max(0, Math.min(100, toNumber(req.body.comissao_percent, 0)));

        await client.beginTransaction();

        await client.query(`
            UPDATE representantes SET
                nome = ?,
                cpf_cnpj = ?,
                email = ?,
                telefone = ?,
                cep = ?,
                endereco = ?,
                numero = ?,
                complemento = ?,
                bairro = ?,
                cidade = ?,
                estado = ?,
                comissao_percent = ?,
                status = ?,
                observacoes = ?,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            nome,
            cpfCnpj,
            email,
            telefone,
            String(req.body.cep || '').trim() || null,
            String(req.body.endereco || '').trim() || null,
            String(req.body.numero || '').trim() || null,
            String(req.body.complemento || '').trim() || null,
            String(req.body.bairro || '').trim() || null,
            String(req.body.cidade || '').trim() || null,
            String(req.body.estado || '').trim().toUpperCase().slice(0, 2) || null,
            comissaoPercent,
            status,
            String(req.body.observacoes || '').trim() || null,
            representanteId,
        ]);

        if (req.body.cliente_ids !== undefined || req.body.clientes !== undefined) {
            await syncCarteira(client, representanteId, req.body.cliente_ids || req.body.clientes);
        }

        await client.commit();

        const completo = await fetchRepresentanteCompleto(representanteId);
        await logAuditoria(req, {
            modulo: 'representantes',
            acao: 'editar',
            entidade: 'representante',
            entidadeId: representanteId,
            descricao: `Atualizou representante "${nome}"`,
        });

        res.json({
            message: 'Representante atualizado com sucesso.',
            representante: completo,
        });
    } catch (error) {
        try {
            await client.rollback();
        } catch {
            // ignore
        }
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Usuário ou e-mail já cadastrado.' });
        }
        logger.error('Erro ao atualizar representante', { module: 'representantesRoutes', stack: error.stack });
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Erro ao atualizar representante.',
        });
    } finally {
        client.release();
    }
});

router.delete('/api/representantes/:id', isAuthenticated, async (req, res) => {
    try {
        await ensureRepresentantesTables();
        const representanteId = Number(req.params.id);

        const [atuais] = await pool.query('SELECT id, nome, user_id FROM representantes WHERE id = ?', [representanteId]);
        if (!atuais.length) {
            return res.status(404).json({ message: 'Representante não encontrado.' });
        }

        await pool.query(`
            UPDATE clientes
            SET representante_id = NULL, atualizado_em = CURRENT_TIMESTAMP
            WHERE representante_id = ?
        `, [representanteId]);

        await pool.query(`
            UPDATE representantes SET
                status = 'Inativo',
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [representanteId]);

        await logAuditoria(req, {
            modulo: 'representantes',
            acao: 'inativar',
            entidade: 'representante',
            entidadeId: representanteId,
            descricao: `Inativou representante "${atuais[0].nome}"`,
        });

        res.json({ message: 'Representante inativado com sucesso.' });
    } catch (error) {
        logger.error('Erro ao inativar representante', { module: 'representantesRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao inativar representante.' });
    }
});

module.exports = router;
