const pool = require('../db');
const logger = require('./logger');

let tableReadyPromise = null;

async function ensureAuditoriaTable() {
    if (!tableReadyPromise) {
        tableReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS auditoria (
                    id SERIAL PRIMARY KEY,
                    modulo VARCHAR(80) NOT NULL,
                    acao VARCHAR(40) NOT NULL,
                    entidade VARCHAR(80),
                    entidade_id VARCHAR(60),
                    descricao TEXT,
                    usuario VARCHAR(120),
                    usuario_id INTEGER,
                    dados_json JSONB,
                    ip VARCHAR(80),
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS auditoria_criado_idx
                ON auditoria (criado_em DESC, id DESC)
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS auditoria_modulo_idx
                ON auditoria (modulo, criado_em DESC)
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS auditoria_usuario_idx
                ON auditoria (usuario_id, criado_em DESC)
            `);
        })().catch((error) => {
            tableReadyPromise = null;
            throw error;
        });
    }
    return tableReadyPromise;
}

function resolveActor(req) {
    const user = req?.session?.user || {};
    const fullName = String(user.full_name || user.nome || user.name || '').trim();
    const username = String(user.username || req?.session?.username || '').trim();
    const email = String(user.email || '').trim();

    let usuario = 'sistema';
    if (fullName && username && fullName.toLowerCase() !== username.toLowerCase()) {
        usuario = `${fullName} (${username})`;
    } else if (fullName) {
        usuario = fullName;
    } else if (username) {
        usuario = username;
    } else if (email) {
        usuario = email;
    }

    const rawId = user.id ?? user.user_id ?? null;
    const usuarioId = Number.isFinite(Number(rawId)) ? Number(rawId) : null;

    return {
        usuario,
        usuario_id: usuarioId,
        username: username || null,
        full_name: fullName || null,
        ip: req?.headers?.['x-forwarded-for']?.toString()?.split(',')[0]?.trim()
            || req?.socket?.remoteAddress
            || null,
    };
}

async function logAuditoria(req, {
    modulo,
    acao,
    entidade = null,
    entidadeId = null,
    descricao = null,
    dados = null,
} = {}) {
    try {
        if (!modulo || !acao) return;
        await ensureAuditoriaTable();
        const actor = resolveActor(req);
        const payload = {
            ...(dados && typeof dados === 'object' ? dados : dados != null ? { valor: dados } : {}),
            _actor: {
                id: actor.usuario_id,
                username: actor.username,
                full_name: actor.full_name,
            },
        };
        await pool.query(`
            INSERT INTO auditoria (
                modulo, acao, entidade, entidade_id, descricao,
                usuario, usuario_id, dados_json, ip
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?)
        `, [
            String(modulo).slice(0, 80),
            String(acao).slice(0, 40),
            entidade ? String(entidade).slice(0, 80) : null,
            entidadeId != null ? String(entidadeId).slice(0, 60) : null,
            descricao ? String(descricao).slice(0, 2000) : null,
            actor.usuario ? String(actor.usuario).slice(0, 120) : 'sistema',
            actor.usuario_id || null,
            JSON.stringify(payload),
            actor.ip ? String(actor.ip).slice(0, 80) : null,
        ]);
    } catch (error) {
        logger.error('Falha ao registrar auditoria', {
            module: 'auditoria',
            stack: error.stack,
        });
    }
}

module.exports = {
    ensureAuditoriaTable,
    logAuditoria,
    resolveActor,
};
