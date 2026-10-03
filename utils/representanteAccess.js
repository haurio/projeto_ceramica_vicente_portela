const { resolvePerfil } = require('./usersAccess');

let ensurePromise = null;

async function ensureRepresentanteSupport(pool) {
    if (!ensurePromise) {
        ensurePromise = (async () => {
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
                CREATE INDEX IF NOT EXISTS representantes_user_idx
                ON representantes (user_id)
            `).catch(() => null);

            await pool.query(`
                ALTER TABLE clientes
                ADD COLUMN IF NOT EXISTS representante_id INTEGER
            `).catch(() => null);

            await pool.query(`
                ALTER TABLE pedidos
                    ADD COLUMN IF NOT EXISTS representante_id INTEGER,
                    ADD COLUMN IF NOT EXISTS origem VARCHAR(20) NOT NULL DEFAULT 'admin'
            `).catch(() => null);
        })().catch((error) => {
            ensurePromise = null;
            throw error;
        });
    }

    return ensurePromise;
}

function isRepresentanteUser(user) {
    return resolvePerfil(user?.perfil || user?.role) === 'Representante';
}

async function getRepresentanteByUserId(pool, userId) {
    if (!userId) return null;
    await ensureRepresentanteSupport(pool);
    const [rows] = await pool.query(
        `SELECT id, nome, email, comissao_percent, status, user_id
         FROM representantes
         WHERE user_id = ?
         LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
}

async function findRepresentanteForUser(pool, user) {
    const userId = Number(user?.id) || 0;
    if (userId) {
        const byUser = await getRepresentanteByUserId(pool, userId);
        if (byUser) return byUser;
    }

    const email = String(user?.email || '').trim().toLowerCase();
    const username = String(user?.username || '').trim().toLowerCase();
    if (!email && !username) return null;

    const [rows] = await pool.query(
        `SELECT id, nome, email, comissao_percent, status, user_id
         FROM representantes
         WHERE (email IS NOT NULL AND LOWER(email) = ?)
            OR (email IS NOT NULL AND LOWER(email) = ?)
         ORDER BY CASE WHEN user_id IS NULL THEN 1 ELSE 0 END, id
         LIMIT 1`,
        [email || username, username || email]
    );
    const found = rows[0] || null;
    if (found && userId && !found.user_id) {
        await pool.query(
            `UPDATE representantes
             SET user_id = ?, atualizado_em = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id IS NULL`,
            [userId, found.id]
        );
        found.user_id = userId;
    }
    return found;
}

async function resolveRepresentanteContext(pool, req) {
    const user = req.session?.user || null;
    if (!isRepresentanteUser(user)) {
        return { isRepresentante: false, representante: null, representanteId: null };
    }
    await ensureRepresentanteSupport(pool);
    const representante = await findRepresentanteForUser(pool, user);
    return {
        isRepresentante: true,
        representante,
        representanteId: representante?.id ? Number(representante.id) : null,
    };
}

module.exports = {
    isRepresentanteUser,
    getRepresentanteByUserId,
    resolveRepresentanteContext,
    ensureRepresentanteSupport,
};
