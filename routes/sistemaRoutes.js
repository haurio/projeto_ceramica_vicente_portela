const express = require('express');
const tls = require('tls');
const pool = require('../db');
const logger = require('../utils/logger');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
};

router.use('/api/sistema', isAuthenticated);

const SEFAZ_HOSTS = {
    homologacao: 'hnfe.fazenda.mg.gov.br',
    producao: 'nfe.fazenda.mg.gov.br',
};

function checkHostReachable(host, port = 443, timeoutMs = 5000) {
    return new Promise((resolve) => {
        const started = Date.now();
        let settled = false;

        const finish = (ok, message) => {
            if (settled) return;
            settled = true;
            try { socket.destroy(); } catch (_error) { /* ignore */ }
            resolve({
                ok,
                latency_ms: Date.now() - started,
                message,
            });
        };

        const socket = tls.connect({
            host,
            port,
            servername: host,
            rejectUnauthorized: false,
            timeout: timeoutMs,
        });

        socket.once('secureConnect', () => finish(true, 'Conexão TLS ok'));
        socket.once('timeout', () => finish(false, 'Timeout de conexão'));
        socket.once('error', (error) => {
            const msg = String(error.message || '');
            // SEFAZ pode exigir certificado cliente; falha de handshake ainda indica host ativo.
            if (
                error.code === 'EPROTO'
                || /handshake|certificate|alert/i.test(msg)
            ) {
                finish(true, 'Host alcançável (handshake TLS com restrição de certificado)');
                return;
            }
            finish(false, msg || 'Falha de conexão');
        });
    });
}

async function checkHttp(url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        });
        clearTimeout(timer);
        return {
            ok: response.ok || response.status < 500,
            latency_ms: Date.now() - started,
            message: response.ok ? 'Resposta OK' : `HTTP ${response.status}`,
            http_status: response.status,
        };
    } catch (error) {
        clearTimeout(timer);
        return {
            ok: false,
            latency_ms: Date.now() - started,
            message: error.name === 'AbortError' ? 'Timeout' : (error.message || 'Indisponível'),
        };
    }
}

async function checkDatabase() {
    const started = Date.now();
    try {
        await pool.query('SELECT 1');
        return {
            ok: true,
            latency_ms: Date.now() - started,
            message: 'Conexão com o banco OK',
        };
    } catch (error) {
        return {
            ok: false,
            latency_ms: Date.now() - started,
            message: error.message || 'Falha no banco de dados',
        };
    }
}

async function resolveSefazAmbiente() {
    try {
        const [rows] = await pool.query(`
            SELECT ambiente
            FROM nfe_config
            ORDER BY id ASC
            LIMIT 1
        `);
        const ambiente = String(rows[0]?.ambiente || 'homologacao').toLowerCase();
        return ambiente === 'producao' ? 'producao' : 'homologacao';
    } catch (_error) {
        return 'homologacao';
    }
}

router.get('/api/sistema/status', async (_req, res) => {
    try {
        const ambiente = await resolveSefazAmbiente();
        const sefazHost = SEFAZ_HOSTS[ambiente] || SEFAZ_HOSTS.homologacao;

        const [apiSelf, database, viacep, sefaz] = await Promise.all([
            Promise.resolve({
                ok: true,
                latency_ms: 0,
                message: 'API do sistema respondendo',
            }),
            checkDatabase(),
            checkHttp('https://viacep.com.br/ws/30130000/json/'),
            checkHostReachable(sefazHost),
        ]);

        const services = [
            {
                id: 'api',
                name: 'API do sistema',
                description: 'Backend da aplicação (Express)',
                ...apiSelf,
                status: apiSelf.ok ? 'online' : 'offline',
            },
            {
                id: 'database',
                name: 'Banco de dados',
                description: 'PostgreSQL / MySQL da aplicação',
                ...database,
                status: database.ok ? 'online' : 'offline',
            },
            {
                id: 'viacep',
                name: 'ViaCEP',
                description: 'Consulta de endereço por CEP',
                ...viacep,
                status: viacep.ok ? 'online' : 'offline',
            },
            {
                id: 'sefaz',
                name: `SEFAZ MG (${ambiente})`,
                description: `Host ${sefazHost}`,
                ...sefaz,
                status: sefaz.ok ? 'online' : 'offline',
            },
        ];

        const onlineCount = services.filter((item) => item.status === 'online').length;

        res.json({
            checked_at: new Date().toISOString(),
            summary: {
                total: services.length,
                online: onlineCount,
                offline: services.length - onlineCount,
                healthy: onlineCount === services.length,
            },
            services,
        });
    } catch (error) {
        logger.error('Erro ao consultar status do sistema', { module: 'sistemaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao consultar status das integrações.' });
    }
});

module.exports = router;
