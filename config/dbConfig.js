require('dotenv').config({ debug: false });

function normalizePassword(raw) {
    if (raw == null) return '';
    let value = String(raw).trim();
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }
    return value;
}

function getDbConfig() {
    if (process.env.DATABASE_URL) {
        return { connectionString: process.env.DATABASE_URL };
    }

    const password = normalizePassword(process.env.DB_PASSWORD);

    return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        user: process.env.DB_USERNAME || 'postgres',
        database: process.env.DB_DATABASE,
        password
    };
}

function validateDbConfig(config) {
    if (config.connectionString) return null;

    if (!config.database) {
        return 'DB_DATABASE não está definido no arquivo .env';
    }

    if (!config.password) {
        return [
            'DB_PASSWORD não está definido no arquivo .env.',
            'O PostgreSQL 18 usa autenticação SCRAM e exige senha.',
            'Use a senha definida na instalação do PostgreSQL.',
            'Exemplo: DB_PASSWORD=sua_senha_aqui (sem aspas)'
        ].join(' ');
    }

    return null;
}

module.exports = { getDbConfig, validateDbConfig, normalizePassword };
