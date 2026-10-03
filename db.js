const { Pool } = require('pg');
const { getDbConfig, validateDbConfig } = require('./config/dbConfig');
const logger = require('./utils/logger');

const dbConfig = getDbConfig();
const configError = validateDbConfig(dbConfig);

if (configError) {
    console.error('❌ Erro de configuração do banco:', configError);
    logger.error(configError, { module: 'database' });
    process.exit(1);
}

const pgPool = new Pool({
    ...dbConfig,
    host: dbConfig.host === 'localhost' ? '127.0.0.1' : dbConfig.host,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    ssl: false,
});

pgPool.on('error', (err) => {
    console.error('❌ Erro inesperado no pool PostgreSQL:', err.message || err);
    logger.error('Erro inesperado no pool PostgreSQL', {
        module: 'database',
        stack: err.stack,
    });
});

function convertPlaceholders(sql, params = []) {
    if (!params.length) return { sql, params };
    let index = 0;
    const convertedSql = sql.replace(/\?/g, () => `$${++index}`);
    return { sql: convertedSql, params };
}

function isInsertStatement(sql) {
    return /^\s*INSERT\s+INTO/i.test(sql.trim());
}

async function executeQuery(clientOrPool, sql, params) {
    const trimmedSql = sql.trim();
    const isInsert = isInsertStatement(trimmedSql);
    const isTransaction = /^(BEGIN|COMMIT|ROLLBACK)/i.test(trimmedSql);

    let processedSql = trimmedSql;
    if (isInsert && !/RETURNING/i.test(trimmedSql)) {
        processedSql = trimmedSql.replace(/;\s*$/, '') + ' RETURNING id';
    }

    const { sql: pgSql, params: pgParams } = convertPlaceholders(processedSql, params);

    try {
        const result = await clientOrPool.query(pgSql, pgParams);

        if (isInsert) {
            return [{ insertId: result.rows[0]?.id, affectedRows: result.rowCount }, result.fields];
        }

        if (isTransaction) {
            return [[], []];
        }

        return [result.rows, result.fields];
    } catch (err) {
        err.sqlMessage = err.detail || err.message;
        err.sql = pgSql;
        throw err;
    }
}

function wrapClient(pgClient) {
    return {
        query: (sql, params) => executeQuery(pgClient, sql, params),
        release: () => pgClient.release(),
        beginTransaction: async () => {
            await pgClient.query('BEGIN');
        },
        commit: async () => {
            await pgClient.query('COMMIT');
        },
        rollback: async () => {
            await pgClient.query('ROLLBACK');
        }
    };
}

const pool = {
    query: (sql, params) => executeQuery(pgPool, sql, params),
    getConnection: async () => wrapClient(await pgPool.connect())
};

(async () => {
    try {
        const client = await pgPool.connect();
        console.log('✅ Conexão com o banco de dados PostgreSQL estabelecida com sucesso!');
        logger.log({
            level: 'success',
            message: 'Conexão com o banco de dados PostgreSQL estabelecida com sucesso!',
            module: 'database'
        });
        client.release();
    } catch (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err.message || err);
        if (err.code) console.error('Código:', err.code);
        if (err.message && err.message.includes('password authentication failed')) {
            console.error('A senha em DB_PASSWORD está incorreta. Verifique a senha do usuário postgres.');
        }
        if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
            console.error('⚠️ PostgreSQL parece parado ou bloqueado pelo Windows. Inicie o serviço postgresql-x64-18.');
        }
        logger.error('Erro ao conectar ao banco de dados', { module: 'database', stack: err.stack });
        // Mantém o servidor no ar para retornar erro claro no login (evita "Failed to fetch")
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
})();

module.exports = pool;
