const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const logger = require('../utils/logger');
const { ensureAuditoriaTable, logAuditoria } = require('../utils/auditoria');
const {
    PERFIS,
    PAGINAS_ACESSO,
    resolvePerfil,
    normalizePermissoes,
    mapUserRow,
    defaultPermissoes,
    validateStrongPassword,
} = require('../utils/usersAccess');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
};

const DEFAULT_CARTAO_PRAZOS = Array.from({ length: 12 }, (_, index) => ({
    dias: index + 1,
    juros_percent: 0,
    ativo: index < 6,
}));

const DEFAULT_BOLETO_PRAZOS = [
    { dias: 15, juros_percent: 0, ativo: true },
    { dias: 30, juros_percent: 0, ativo: true },
];

const DEFAULT_FORMAS = [
    { nome: 'Dinheiro', tipo: 'avista', tem_juros: false, juros_percent: 0, ordem: 1, prazos: [] },
    { nome: 'PIX', tipo: 'avista', tem_juros: false, juros_percent: 0, ordem: 2, prazos: [] },
    {
        nome: 'Cartão de crédito',
        tipo: 'cartao',
        tem_juros: true,
        juros_percent: 0,
        ordem: 3,
        prazos: DEFAULT_CARTAO_PRAZOS,
    },
    { nome: 'Cartão de débito', tipo: 'avista', tem_juros: false, juros_percent: 0, ordem: 4, prazos: [] },
    {
        nome: 'Boleto',
        tipo: 'boleto',
        tem_juros: true,
        juros_percent: 1,
        ordem: 5,
        prazos: DEFAULT_BOLETO_PRAZOS,
    },
    { nome: 'Transferência', tipo: 'avista', tem_juros: false, juros_percent: 0, ordem: 6, prazos: [] },
    {
        nome: 'A prazo',
        tipo: 'prazo',
        tem_juros: true,
        juros_percent: 0,
        ordem: 7,
        prazos: [
            { dias: 30, juros_percent: 0, ativo: true },
            { dias: 60, juros_percent: 2, ativo: true },
            { dias: 90, juros_percent: 4, ativo: true },
        ],
    },
    { nome: 'Outro', tipo: 'avista', tem_juros: false, juros_percent: 0, ordem: 8, prazos: [] },
];

let tableReadyPromise = null;

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveTipo(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'prazo') return 'prazo';
    if (raw === 'cartao' || raw === 'cartão') return 'cartao';
    if (raw === 'boleto') return 'boleto';
    return 'avista';
}

function hasOpcoesPrazo(tipo) {
    return tipo === 'prazo' || tipo === 'cartao' || tipo === 'boleto';
}

function prazoDefaultsForTipo(tipo) {
    if (tipo === 'cartao') {
        return Array.from({ length: 12 }, (_, index) => index + 1);
    }
    if (tipo === 'boleto') {
        return [15, 30];
    }
    return [30, 60, 90];
}

function normalizePrazos(raw, temJuros, tipo = 'prazo') {
    const source = Array.isArray(raw) ? raw : [];
    const defaults = prazoDefaultsForTipo(tipo);
    const allowed = new Set(defaults);
    const byDias = new Map();

    source.forEach((item) => {
        const dias = Number(item?.dias);
        if (!allowed.has(dias)) return;
        byDias.set(dias, {
            dias,
            juros_percent: Math.max(0, toNumber(item.juros_percent, 0)),
            ativo: item.ativo !== false && item.ativo !== 'nao' && item.ativo !== 0,
        });
    });

    return defaults.map((dias) => {
        const current = byDias.get(dias) || {
            dias,
            juros_percent: 0,
            ativo: tipo === 'cartao' ? dias <= 6 : true,
        };
        // Boleto: juros ficam no nível da forma (após vencimento), não por prazo
        if (!temJuros || tipo === 'boleto') current.juros_percent = 0;
        return current;
    });
}

function mapForma(row) {
    const temJuros = Boolean(row.tem_juros);
    const tipo = resolveTipo(row.tipo);
    const prazos = hasOpcoesPrazo(tipo)
        ? normalizePrazos(
            typeof row.prazos_json === 'string' ? JSON.parse(row.prazos_json) : (row.prazos_json || []),
            temJuros,
            tipo
        )
        : [];

    return {
        id: row.id,
        nome: row.nome,
        ativo: Boolean(row.ativo),
        ordem: Number(row.ordem) || 0,
        tipo,
        tem_juros: temJuros,
        juros_percent: Math.max(0, toNumber(row.juros_percent, 0)),
        prazos,
        criado_em: row.criado_em,
        atualizado_em: row.atualizado_em,
    };
}

async function ensureFormasPagamentoTable() {
    if (!tableReadyPromise) {
        tableReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS formas_pagamento (
                    id SERIAL PRIMARY KEY,
                    nome VARCHAR(80) NOT NULL UNIQUE,
                    ativo BOOLEAN NOT NULL DEFAULT TRUE,
                    ordem INTEGER NOT NULL DEFAULT 0,
                    tipo VARCHAR(20) NOT NULL DEFAULT 'avista',
                    tem_juros BOOLEAN NOT NULL DEFAULT FALSE,
                    juros_percent NUMERIC(8, 2) NOT NULL DEFAULT 0,
                    prazos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            const [countRows] = await pool.query('SELECT COUNT(*)::int AS total FROM formas_pagamento');
            if (!countRows[0]?.total) {
                for (const item of DEFAULT_FORMAS) {
                    await pool.query(`
                        INSERT INTO formas_pagamento (
                            nome, ativo, ordem, tipo, tem_juros, juros_percent, prazos_json
                        ) VALUES (?, TRUE, ?, ?, ?, ?, ?::jsonb)
                    `, [
                        item.nome,
                        item.ordem,
                        item.tipo,
                        item.tem_juros,
                        item.juros_percent,
                        JSON.stringify(item.prazos),
                    ]);
                }
            } else {
                // Migra cartão de crédito antigo (à vista) para parcelável 1x–12x
                await pool.query(`
                    UPDATE formas_pagamento
                    SET tipo = 'cartao',
                        tem_juros = TRUE,
                        juros_percent = 0,
                        prazos_json = ?::jsonb,
                        atualizado_em = CURRENT_TIMESTAMP
                    WHERE tipo = 'avista'
                      AND (
                        LOWER(nome) = 'cartão de crédito'
                        OR LOWER(nome) = 'cartao de credito'
                        OR LOWER(nome) LIKE '%cart%cr_dito%'
                      )
                `, [JSON.stringify(DEFAULT_CARTAO_PRAZOS)]);

                // Migra boleto antigo (à vista) para 15/30 dias + juros após vencimento
                await pool.query(`
                    UPDATE formas_pagamento
                    SET tipo = 'boleto',
                        tem_juros = TRUE,
                        juros_percent = CASE
                            WHEN COALESCE(juros_percent, 0) > 0 THEN juros_percent
                            ELSE 1
                        END,
                        prazos_json = ?::jsonb,
                        atualizado_em = CURRENT_TIMESTAMP
                    WHERE tipo = 'avista'
                      AND LOWER(nome) = 'boleto'
                `, [JSON.stringify(DEFAULT_BOLETO_PRAZOS)]);
            }
        })().catch((error) => {
            tableReadyPromise = null;
            throw error;
        });
    }

    return tableReadyPromise;
}

router.use(isAuthenticated);

router.get('/formas-pagamento', async (req, res) => {
    try {
        await ensureFormasPagamentoTable();
        const onlyActive = String(req.query.ativo || '') === '1' || String(req.query.ativo || '') === 'true';

        const [rows] = await pool.query(`
            SELECT *
            FROM formas_pagamento
            ${onlyActive ? 'WHERE ativo = TRUE' : ''}
            ORDER BY ordem ASC, nome ASC
        `);

        res.json(rows.map(mapForma));
    } catch (error) {
        logger.error('Erro ao listar formas de pagamento', {
            module: 'configRoutes',
            stack: error.stack,
        });
        res.status(500).json({ message: 'Erro ao listar formas de pagamento.' });
    }
});

router.get('/formas-pagamento/:id', async (req, res) => {
    try {
        await ensureFormasPagamentoTable();
        const [rows] = await pool.query('SELECT * FROM formas_pagamento WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });
        res.json(mapForma(rows[0]));
    } catch (error) {
        logger.error('Erro ao buscar forma de pagamento', {
            module: 'configRoutes',
            stack: error.stack,
        });
        res.status(500).json({ message: 'Erro ao buscar forma de pagamento.' });
    }
});

router.post('/formas-pagamento', async (req, res) => {
    try {
        await ensureFormasPagamentoTable();

        const nome = String(req.body.nome || '').trim();
        if (!nome) return res.status(400).json({ message: 'Informe o nome da forma de pagamento.' });

        const tipo = resolveTipo(req.body.tipo);
        const temJuros = Boolean(req.body.tem_juros);
        // prazo/cartão: juros por opção; boleto/avista: juros no nível da forma (boleto = após vencimento)
        const jurosPercent = (tipo === 'prazo' || tipo === 'cartao')
            ? 0
            : Math.max(0, toNumber(req.body.juros_percent, 0));
        const prazos = hasOpcoesPrazo(tipo)
            ? normalizePrazos(req.body.prazos, temJuros, tipo)
            : [];
        const ativo = req.body.ativo !== false && req.body.ativo !== 'nao' && req.body.ativo !== 0;
        const ordem = Math.max(0, Math.trunc(toNumber(req.body.ordem, 99)));

        const [insertResult] = await pool.query(`
            INSERT INTO formas_pagamento (
                nome, ativo, ordem, tipo, tem_juros, juros_percent, prazos_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?::jsonb)
        `, [
            nome,
            ativo,
            ordem,
            tipo,
            temJuros,
            temJuros ? jurosPercent : 0,
            JSON.stringify(prazos),
        ]);

        const [rows] = await pool.query('SELECT * FROM formas_pagamento WHERE id = ?', [insertResult.insertId]);
        const created = mapForma(rows[0]);
        await logAuditoria(req, {
            modulo: 'formas_pagamento',
            acao: 'criar',
            entidade: 'forma_pagamento',
            entidadeId: created.id,
            descricao: `Criou forma de pagamento "${created.nome}"`,
            dados: { nome: created.nome, tipo: created.tipo, tem_juros: created.tem_juros },
        });
        res.status(201).json(created);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Já existe uma forma de pagamento com este nome.' });
        }
        logger.error('Erro ao criar forma de pagamento', {
            module: 'configRoutes',
            stack: error.stack,
        });
        res.status(500).json({ message: 'Erro ao criar forma de pagamento.' });
    }
});

router.put('/formas-pagamento/:id', async (req, res) => {
    try {
        await ensureFormasPagamentoTable();

        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT id FROM formas_pagamento WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });

        const nome = String(req.body.nome || '').trim();
        if (!nome) return res.status(400).json({ message: 'Informe o nome da forma de pagamento.' });

        const tipo = resolveTipo(req.body.tipo);
        const temJuros = Boolean(req.body.tem_juros);
        const jurosPercent = (tipo === 'prazo' || tipo === 'cartao')
            ? 0
            : Math.max(0, toNumber(req.body.juros_percent, 0));
        const prazos = hasOpcoesPrazo(tipo)
            ? normalizePrazos(req.body.prazos, temJuros, tipo)
            : [];
        const ativo = req.body.ativo !== false && req.body.ativo !== 'nao' && req.body.ativo !== 0;
        const ordem = Math.max(0, Math.trunc(toNumber(req.body.ordem, 99)));

        await pool.query(`
            UPDATE formas_pagamento
            SET nome = ?,
                ativo = ?,
                ordem = ?,
                tipo = ?,
                tem_juros = ?,
                juros_percent = ?,
                prazos_json = ?::jsonb,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            nome,
            ativo,
            ordem,
            tipo,
            temJuros,
            temJuros ? jurosPercent : 0,
            JSON.stringify(prazos),
            id,
        ]);

        const [rows] = await pool.query('SELECT * FROM formas_pagamento WHERE id = ?', [id]);
        const updated = mapForma(rows[0]);
        await logAuditoria(req, {
            modulo: 'formas_pagamento',
            acao: 'editar',
            entidade: 'forma_pagamento',
            entidadeId: updated.id,
            descricao: `Alterou forma de pagamento "${updated.nome}"`,
            dados: { nome: updated.nome, tipo: updated.tipo, tem_juros: updated.tem_juros, ativo: updated.ativo },
        });
        res.json(updated);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Já existe uma forma de pagamento com este nome.' });
        }
        logger.error('Erro ao atualizar forma de pagamento', {
            module: 'configRoutes',
            stack: error.stack,
        });
        res.status(500).json({ message: 'Erro ao atualizar forma de pagamento.' });
    }
});

router.delete('/formas-pagamento/:id', async (req, res) => {
    try {
        await ensureFormasPagamentoTable();
        const [atuais] = await pool.query('SELECT id, nome FROM formas_pagamento WHERE id = ?', [req.params.id]);
        if (!atuais.length) {
            return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });
        }
        await pool.query('DELETE FROM formas_pagamento WHERE id = ?', [req.params.id]);
        await logAuditoria(req, {
            modulo: 'formas_pagamento',
            acao: 'excluir',
            entidade: 'forma_pagamento',
            entidadeId: atuais[0].id,
            descricao: `Excluiu forma de pagamento "${atuais[0].nome}"`,
        });
        res.json({ message: 'Forma de pagamento excluída.' });
    } catch (error) {
        logger.error('Erro ao excluir forma de pagamento', {
            module: 'configRoutes',
            stack: error.stack,
        });
        res.status(500).json({ message: 'Erro ao excluir forma de pagamento.' });
    }
});

router.get('/auditoria', async (req, res) => {
    try {
        await ensureAuditoriaTable();
        const modulo = String(req.query.modulo || '').trim();
        const q = String(req.query.q || '').trim();
        const inicio = String(req.query.inicio || '').trim().slice(0, 10);
        const fim = String(req.query.fim || '').trim().slice(0, 10);
        const limit = Math.min(300, Math.max(1, Number(req.query.limit) || 100));

        const params = [];
        const where = [];
        if (modulo) {
            where.push('a.modulo = ?');
            params.push(modulo);
        }
        if (inicio && /^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
            where.push('a.criado_em::date >= ?::date');
            params.push(inicio);
        }
        if (fim && /^\d{4}-\d{2}-\d{2}$/.test(fim)) {
            where.push('a.criado_em::date <= ?::date');
            params.push(fim);
        }
        if (q) {
            where.push(`(
                COALESCE(a.usuario, '') ILIKE ?
                OR COALESCE(u.full_name, '') ILIKE ?
                OR COALESCE(u.username, '') ILIKE ?
                OR COALESCE(a.descricao, '') ILIKE ?
                OR COALESCE(a.entidade, '') ILIKE ?
                OR COALESCE(a.entidade_id, '') ILIKE ?
                OR COALESCE(a.acao, '') ILIKE ?
            )`);
            const like = `%${q}%`;
            params.push(like, like, like, like, like, like, like);
        }

        params.push(limit);
        const [rows] = await pool.query(`
            SELECT
                a.id,
                a.modulo,
                a.acao,
                a.entidade,
                a.entidade_id,
                a.descricao,
                a.usuario,
                a.usuario_id,
                a.dados_json,
                a.ip,
                a.criado_em,
                u.full_name AS usuario_nome,
                u.username AS usuario_login,
                COALESCE(
                    NULLIF(TRIM(a.usuario), ''),
                    NULLIF(TRIM(u.full_name), ''),
                    NULLIF(TRIM(u.username), ''),
                    'sistema'
                ) AS usuario_exibicao
            FROM auditoria a
            LEFT JOIN users u ON u.id = a.usuario_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY a.criado_em DESC, a.id DESC
            LIMIT ?
        `, params);

        res.json(rows.map((row) => ({
            ...row,
            usuario: row.usuario_exibicao || row.usuario || 'sistema',
        })));
    } catch (error) {
        logger.error('Erro ao listar auditoria', {
            module: 'configRoutes',
            stack: error.stack,
        });
        res.status(500).json({ message: 'Erro ao listar auditoria.' });
    }
});

let usersReadyPromise = null;

async function ensureUsersAccessColumns() {
    if (!usersReadyPromise) {
        usersReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) NOT NULL,
                    email VARCHAR(100) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255) NOT NULL,
                    status VARCHAR(100) NOT NULL DEFAULT 'Ativo',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await pool.query(`
                ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS perfil VARCHAR(40) NOT NULL DEFAULT 'Administrador',
                    ADD COLUMN IF NOT EXISTS permissoes JSONB NOT NULL DEFAULT '[]'::jsonb,
                    ADD COLUMN IF NOT EXISTS forcar_troca_senha BOOLEAN NOT NULL DEFAULT FALSE,
                    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            `);
            await pool.query(`
                UPDATE users
                SET perfil = 'Administrador',
                    permissoes = ?::jsonb
                WHERE COALESCE(perfil, '') = ''
                   OR perfil IS NULL
            `, [JSON.stringify(defaultPermissoes('Administrador'))]);
        })().catch((error) => {
            usersReadyPromise = null;
            throw error;
        });
    }
    return usersReadyPromise;
}

function requireAdminUsuarios(req, res, next) {
    const perfil = resolvePerfil(req.session?.user?.perfil || req.session?.user?.role);
    const permissoes = Array.isArray(req.session?.user?.permissoes)
        ? req.session.user.permissoes
        : [];
    if (perfil === 'Administrador' || permissoes.includes('/configuracoes/usuarios')) {
        return next();
    }
    return res.status(403).json({ message: 'Sem permissão para gerenciar usuários.' });
}

router.get('/usuarios/meta', requireAdminUsuarios, async (_req, res) => {
    try {
        await ensureUsersAccessColumns();
        res.json({ perfis: PERFIS, paginas: PAGINAS_ACESSO });
    } catch (error) {
        logger.error('Erro ao carregar meta de usuários', { module: 'configRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao carregar metadados de usuários.' });
    }
});

router.get('/usuarios', requireAdminUsuarios, async (req, res) => {
    try {
        await ensureUsersAccessColumns();
        const [rows] = await pool.query(`
            SELECT id, username, email, full_name, status, perfil, permissoes,
                   forcar_troca_senha, created_at, updated_at
            FROM users
            ORDER BY full_name ASC, username ASC
        `);
        res.json(rows.map(mapUserRow));
    } catch (error) {
        logger.error('Erro ao listar usuários', { module: 'configRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar usuários.' });
    }
});

router.get('/usuarios/:id', requireAdminUsuarios, async (req, res) => {
    try {
        await ensureUsersAccessColumns();
        const [rows] = await pool.query(`
            SELECT id, username, email, full_name, status, perfil, permissoes,
                   forcar_troca_senha, created_at, updated_at
            FROM users WHERE id = ?
        `, [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.json(mapUserRow(rows[0]));
    } catch (error) {
        logger.error('Erro ao buscar usuário', { module: 'configRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao buscar usuário.' });
    }
});

router.post('/usuarios/me/senha', async (req, res) => {
    try {
        await ensureUsersAccessColumns();
        const userId = Number(req.session?.user?.id);
        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({ message: 'Sessão inválida.' });
        }

        const senhaAtual = String(req.body.senha_atual || '');
        const senhaNova = String(req.body.senha_nova || '');
        const senhaConfirmacao = String(req.body.senha_confirmacao || '');

        if (!senhaAtual || !senhaNova) {
            return res.status(400).json({ message: 'Informe a senha atual e a nova senha.' });
        }
        if (senhaNova !== senhaConfirmacao) {
            return res.status(400).json({ message: 'A confirmação da nova senha não confere.' });
        }
        if (senhaNova === senhaAtual) {
            return res.status(400).json({ message: 'A nova senha deve ser diferente da senha atual.' });
        }

        const strengthError = validateStrongPassword(senhaNova);
        if (strengthError) {
            return res.status(400).json({ message: strengthError });
        }

        const [rows] = await pool.query('SELECT id, password FROM users WHERE id = ?', [userId]);
        if (!rows.length) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const ok = await bcrypt.compare(senhaAtual, rows[0].password);
        if (!ok) {
            return res.status(400).json({ message: 'Senha atual incorreta.' });
        }

        const hashed = await bcrypt.hash(senhaNova, 10);
        await pool.query(`
            UPDATE users SET
                password = ?,
                forcar_troca_senha = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [hashed, userId]);

        const [fresh] = await pool.query(`
            SELECT id, username, email, full_name, status, perfil, permissoes, forcar_troca_senha
            FROM users WHERE id = ?
        `, [userId]);
        const { sessionUserFromRow } = require('../utils/usersAccess');
        req.session.user = sessionUserFromRow(fresh[0]);

        await logAuditoria(req, {
            modulo: 'usuarios',
            acao: 'trocar_senha',
            entidade: 'usuario',
            entidadeId: userId,
            descricao: 'Usuário alterou a senha no primeiro acesso.',
        });

        res.json({ message: 'Senha atualizada com sucesso.', user: req.session.user });
    } catch (error) {
        logger.error('Erro ao trocar senha do usuário', { module: 'configRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao alterar a senha.' });
    }
});

router.post('/usuarios', requireAdminUsuarios, async (req, res) => {
    try {
        await ensureUsersAccessColumns();

        const username = String(req.body.username || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const fullName = String(req.body.full_name || '').trim();
        const password = String(req.body.password || '');
        const status = ['Ativo', 'Inativo'].includes(req.body.status) ? req.body.status : 'Ativo';
        const perfil = resolvePerfil(req.body.perfil);
        const permissoes = normalizePermissoes(perfil, req.body.permissoes);
        const forcarTrocaSenha = req.body.forcar_troca_senha === true
            || req.body.forcar_troca_senha === 'sim'
            || req.body.forcar_troca_senha === 1
            || req.body.forcar_troca_senha === '1';

        if (!username || !email || !fullName || !password) {
            return res.status(400).json({ message: 'Preencha nome, usuário, e-mail e senha.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'A senha deve ter pelo menos 8 caracteres.' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'E-mail inválido.' });
        }

        const [existing] = await pool.query(
            'SELECT id, username, email FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        if (existing.length) {
            return res.status(400).json({
                message: existing[0].username === username ? 'Usuário já existe.' : 'E-mail já está em uso.',
            });
        }

        const hashed = await bcrypt.hash(password, 10);
        const [insertResult] = await pool.query(`
            INSERT INTO users (
                username, email, password, full_name, status, perfil, permissoes, forcar_troca_senha
            ) VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?)
        `, [username, email, hashed, fullName, status, perfil, JSON.stringify(permissoes), forcarTrocaSenha]);

        const [rows] = await pool.query(`
            SELECT id, username, email, full_name, status, perfil, permissoes,
                   forcar_troca_senha, created_at, updated_at
            FROM users WHERE id = ?
        `, [insertResult.insertId]);
        const created = mapUserRow(rows[0]);

        await logAuditoria(req, {
            modulo: 'usuarios',
            acao: 'criar',
            entidade: 'usuario',
            entidadeId: created.id,
            descricao: `Criou usuário "${created.username}" (${created.perfil})`,
            dados: {
                username: created.username,
                perfil: created.perfil,
                status: created.status,
                forcar_troca_senha: created.forcar_troca_senha,
            },
        });

        res.status(201).json(created);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Usuário ou e-mail já cadastrado.' });
        }
        logger.error('Erro ao criar usuário', { module: 'configRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao criar usuário.' });
    }
});

router.put('/usuarios/:id', requireAdminUsuarios, async (req, res) => {
    try {
        await ensureUsersAccessColumns();
        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Usuário não encontrado.' });

        const atual = atuais[0];
        const username = String(req.body.username || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const fullName = String(req.body.full_name || '').trim();
        const password = String(req.body.password || '');
        const status = ['Ativo', 'Inativo'].includes(req.body.status) ? req.body.status : (atual.status || 'Ativo');
        const perfil = resolvePerfil(req.body.perfil);
        const permissoes = normalizePermissoes(perfil, req.body.permissoes);
        const forcarTrocaSenha = req.body.forcar_troca_senha === true
            || req.body.forcar_troca_senha === 'sim'
            || req.body.forcar_troca_senha === 1
            || req.body.forcar_troca_senha === '1';

        if (!username || !email || !fullName) {
            return res.status(400).json({ message: 'Preencha nome, usuário e e-mail.' });
        }
        if (password && password.length < 8) {
            return res.status(400).json({ message: 'A senha deve ter pelo menos 8 caracteres.' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'E-mail inválido.' });
        }

        // Não deixar o último administrador se desativar/remover perfil
        if (
            Number(req.session?.user?.id) === id
            && (status === 'Inativo' || perfil !== 'Administrador')
        ) {
            const [admins] = await pool.query(`
                SELECT COUNT(*)::int AS total
                FROM users
                WHERE perfil = 'Administrador' AND status = 'Ativo' AND id <> ?
            `, [id]);
            if (!admins[0]?.total && (status === 'Inativo' || perfil !== 'Administrador')) {
                return res.status(400).json({
                    message: 'Não é possível remover o único administrador ativo da conta atual.',
                });
            }
        }

        const [dup] = await pool.query(
            'SELECT id, username, email FROM users WHERE (email = ? OR username = ?) AND id <> ?',
            [email, username, id]
        );
        if (dup.length) {
            return res.status(400).json({
                message: dup[0].username === username ? 'Usuário já existe.' : 'E-mail já está em uso.',
            });
        }

        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            await pool.query(`
                UPDATE users SET
                    username = ?, email = ?, password = ?, full_name = ?,
                    status = ?, perfil = ?, permissoes = ?::jsonb,
                    forcar_troca_senha = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [username, email, hashed, fullName, status, perfil, JSON.stringify(permissoes), forcarTrocaSenha, id]);
        } else {
            await pool.query(`
                UPDATE users SET
                    username = ?, email = ?, full_name = ?,
                    status = ?, perfil = ?, permissoes = ?::jsonb,
                    forcar_troca_senha = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [username, email, fullName, status, perfil, JSON.stringify(permissoes), forcarTrocaSenha, id]);
        }

        const [rows] = await pool.query(`
            SELECT id, username, email, full_name, status, perfil, permissoes,
                   forcar_troca_senha, created_at, updated_at
            FROM users WHERE id = ?
        `, [id]);
        const updated = mapUserRow(rows[0]);

        await logAuditoria(req, {
            modulo: 'usuarios',
            acao: 'editar',
            entidade: 'usuario',
            entidadeId: updated.id,
            descricao: `Atualizou usuário "${updated.username}" (${updated.perfil})`,
            dados: {
                username: updated.username,
                perfil: updated.perfil,
                status: updated.status,
                forcar_troca_senha: updated.forcar_troca_senha,
            },
        });

        // Se editou a si mesmo, atualiza a sessão
        if (Number(req.session?.user?.id) === id) {
            const { sessionUserFromRow } = require('../utils/usersAccess');
            req.session.user = sessionUserFromRow(rows[0]);
        }

        res.json(updated);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Usuário ou e-mail já cadastrado.' });
        }
        logger.error('Erro ao atualizar usuário', { module: 'configRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar usuário.' });
    }
});

router.delete('/usuarios/:id', requireAdminUsuarios, async (req, res) => {
    try {
        await ensureUsersAccessColumns();
        const id = Number(req.params.id);
        if (Number(req.session?.user?.id) === id) {
            return res.status(400).json({ message: 'Você não pode excluir o próprio usuário.' });
        }

        const [atuais] = await pool.query('SELECT id, username, perfil, status FROM users WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Usuário não encontrado.' });

        if (atuais[0].perfil === 'Administrador' && atuais[0].status === 'Ativo') {
            const [admins] = await pool.query(`
                SELECT COUNT(*)::int AS total
                FROM users
                WHERE perfil = 'Administrador' AND status = 'Ativo' AND id <> ?
            `, [id]);
            if (!admins[0]?.total) {
                return res.status(400).json({ message: 'Não é possível excluir o único administrador ativo.' });
            }
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        await logAuditoria(req, {
            modulo: 'usuarios',
            acao: 'excluir',
            entidade: 'usuario',
            entidadeId: atuais[0].id,
            descricao: `Excluiu usuário "${atuais[0].username}"`,
        });
        res.json({ message: 'Usuário excluído.' });
    } catch (error) {
        logger.error('Erro ao excluir usuário', { module: 'configRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir usuário.' });
    }
});

module.exports = router;
module.exports.ensureFormasPagamentoTable = ensureFormasPagamentoTable;
module.exports.ensureUsersAccessColumns = ensureUsersAccessColumns;
