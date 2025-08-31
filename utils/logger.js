const winston = require('winston');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone'); // Adicionar moment-timezone
const CronJob = require('cron').CronJob;

// Pasta de logs
const logsDir = path.join(__dirname, 'logs');

// Criar pasta logs se não existir
fs.ensureDirSync(logsDir);

// Definir níveis personalizados, incluindo 'success'
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        success: 3
    },
    icons: {
        error: '❌',
        warn: '⚠️',
        info: 'ℹ️',
        success: '✅'
    }
};

// Configurar o logger com winston
const logger = winston.createLogger({
    level: 'success', // Permitir todos os níveis, incluindo 'success'
    levels: customLevels.levels, // Definir níveis personalizados
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => moment().tz('Europe/Lisbon').format('YYYY-MM-DD HH:mm:ss') // Usar fuso horário de Lisboa
        }),
        winston.format.errors({ stack: true }), // Incluir stack trace
        winston.format.splat(),
        winston.format.printf((info) => {
            const timestamp = info.timestamp; // Já formatado com Europe/Lisbon
            const date = timestamp.split(' ')[0]; // YYYY-MM-DD
            const time = timestamp.split(' ')[1]; // HH:mm:ss
            const logObject = [
                customLevels.icons[info.level] || 'ℹ️',
                date,
                time,
                info.module || 'unknown',
                info.message,
                info.stack || ''
            ];
            // Incluir metadados adicionais como campos extras no final
            if (info.metadata) {
                Object.keys(info.metadata).forEach(key => {
                    logObject[key] = info.metadata[key];
                });
            }
            return JSON.stringify(logObject);
        })
    ),
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, `app-${moment().tz('Europe/Lisbon').format('YYYY-MM-DD')}.log`), // Arquivo diário com data em Lisboa
            maxsize: 5242880, // Máximo 5MB por arquivo
            maxFiles: 365, // Manter até 365 arquivos
            zippedArchive: true // Compactar arquivos antigos
        })
    ]
});

// Função para deletar logs antigos (mais de 15 dias)
const deleteOldLogs = () => {
    const files = fs.readdirSync(logsDir);
    const today = moment().tz('Europe/Lisbon').startOf('day');
    const fifteenDaysAgo = moment(today).subtract(15, 'days');

    files.forEach(file => {
        const filePath = path.join(logsDir, file);
        const stat = fs.statSync(filePath);
        const fileDate = moment(stat.birthtime).tz('Europe/Lisbon');
        if (fileDate.isBefore(fifteenDaysAgo)) {
            fs.unlinkSync(filePath); // Deletar arquivo
            logger.info('Log deletado', { module: 'logger', metadata: { file } });
        }
    });
};

// Agendar limpeza a cada 30 dias (todo dia 1º do mês à meia-noite, em Lisboa)
new CronJob('0 0 1 * *', deleteOldLogs, null, true, 'Europe/Lisbon');

module.exports = logger;