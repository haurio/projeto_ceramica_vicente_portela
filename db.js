const mysql = require('mysql2/promise');
require('dotenv').config({ debug: false }); // Desativar saída de depuração do dotenv
const logger = require('./utils/logger');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Teste de conexão ao iniciar
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexão com o banco de dados MySQL estabelecida com sucesso!');
        logger.log({
            level: 'success',
            message: 'Conexão com o banco de dados MySQL estabelecida com sucesso!',
            module: 'database'
        });
        connection.release();
    } catch (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err.message);
        logger.error('Erro ao conectar ao banco de dados', { module: 'database', stack: err.stack });
        process.exit(1); // Interromper a execução em caso de falha
    }
})();

module.exports = pool;