const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config({ debug: false });
require('express-async-errors');
const logger = require('./utils/logger');
const pool = require('./db');
const { requirePageAccess } = require('./utils/apiAccess');

const app = express();
const BASE_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT = BASE_PORT + 10;
const DEV_PORT_FILE = path.join(__dirname, '.dev-server-port');

// Verificar se SESSION_SECRET está definido
if (!process.env.SESSION_SECRET) {
    logger.error('SESSION_SECRET não está definido no arquivo .env', { module: 'server' });
    process.exit(1);
}

// Middleware para injetar pool nas requisições
app.use((req, res, next) => {
    req.pool = pool;
    next();
});

// Configurar CORS
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
    origin(origin, callback) {
        if (
            !origin
            || allowedOrigins.includes(origin)
            || /^http:\/\/localhost:\d+$/.test(origin)
            || /^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/i.test(origin)
            || /^https:\/\/[a-z0-9-]+\.ngrok\.io$/i.test(origin)
        ) {
            callback(null, true);
            return;
        }

        callback(null, false);
    },
    credentials: true
}));

// Middleware para processar dados do formulário
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const cookieSecure = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';
app.set('trust proxy', 1);

// Middleware para sessões
app.use(session({
    name: 'ceramica.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        // Só marcar Secure com HTTPS real (COOKIE_SECURE=true). NODE_ENV=production em localhost
        // impede o cookie de sessão no Edge e quebra o login mobile.
        secure: cookieSecure,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: cookieSecure ? 'none' : 'lax',
        path: '/',
    }
}));

// Servir build React (landing page)
const reactDistPath = path.join(__dirname, 'client', 'dist');

app.get(['/', '/index.html'], (req, res, next) => {
    const indexPath = path.join(reactDistPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) next(err);
    });
});

app.use(express.static(reactDistPath));

// Servir arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para verificar autenticação
function isAuthenticated(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    }
    res.redirect('/login');
}

// Importar rotas
const authRoutes = require('./routes/authRoutes');
const registerRoutes = require('./routes/registerRoutes');
const funcionariosRoutes = require('./routes/funcionariosRoutes');
const empresaRoutes = require('./routes/empresaRoutes');
const feriasRoutes = require('./routes/feriasRoutes'); // Adiciona as rotas de férias
const ausenciasRoutes = require('./routes/ausenciasRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const fornecedoresRoutes = require('./routes/fornecedoresRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const produtosRoutes = require('./routes/produtosRoutes');
const frotaRoutes = require('./routes/frotaRoutes');
const representantesRoutes = require('./routes/representantesRoutes');
const cipaRoutes = require('./routes/cipaRoutes');
const financeiroRoutes = require('./routes/financeiroRoutes');
const sistemaRoutes = require('./routes/sistemaRoutes');
const estoqueRoutes = require('./routes/estoqueRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const nfeRoutes = require('./routes/nfeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const configRoutes = require('./routes/configRoutes');
const configCadastrosRoutes = require('./routes/configCadastrosRoutes');
const relatoriosRoutes = require('./routes/relatoriosRoutes');

// Sessão/logout antes de routers com auth global.
// Sempre 200: 401 no check-session polui o console do browser no primeiro carregamento.
app.get('/check-session', async (req, res) => {
    const send = (payload, status = 200) => {
        if (res.headersSent) return;
        res.status(status).json(payload);
    };

    try {
        if (!req.session?.authenticated) {
            send({ authenticated: false, user: null });
            return;
        }

        if (req.session.user?.id) {
            try {
                const [rows] = await pool.query(
                    `SELECT id, username, email, full_name, status, perfil, permissoes, forcar_troca_senha
                     FROM users WHERE id = ?`,
                    [req.session.user.id]
                );

                if (rows.length) {
                    if (String(rows[0].status || '').toLowerCase() === 'inativo') {
                        req.session.destroy(() => {
                            send({ authenticated: false, user: null, message: 'Usuário inativo.' });
                        });
                        return;
                    }
                    const { sessionUserFromRow } = require('./utils/usersAccess');
                    req.session.user = sessionUserFromRow(rows[0]);
                }
            } catch (error) {
                logger.error('Erro ao atualizar dados da sessão', { module: 'server', stack: error.stack });
            }
        }

        send({
            authenticated: true,
            user: req.session.user || null,
        });
    } catch (error) {
        logger.error('Erro em /check-session', { module: 'server', stack: error.stack });
        send({
            authenticated: Boolean(req.session?.authenticated),
            user: req.session?.user || null,
        });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            logger.error('Erro ao realizar logout', { module: 'server', stack: err.stack });
            return res.status(500).json({ message: 'Erro ao realizar logout' });
        }
        logger.info('Logout realizado com sucesso', { module: 'server' });
        res.status(200).json({ message: 'Logout realizado com sucesso' });
    });
});

// Usar rotas
app.use(galleryRoutes);
app.use(authRoutes);
app.use(registerRoutes);
app.use(funcionariosRoutes);
app.use(empresaRoutes);
app.use(fornecedoresRoutes);
app.use(clientesRoutes);
app.use(produtosRoutes);
app.use(frotaRoutes);
app.use(representantesRoutes);
app.use(cipaRoutes);
app.use(financeiroRoutes);
app.use(sistemaRoutes);
app.use('/api/estoque', requirePageAccess('/estoque'), estoqueRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/nfe', nfeRoutes);
app.use('/api/config', configRoutes);
app.use('/api/config', configCadastrosRoutes);
app.use(dashboardRoutes);
app.use(relatoriosRoutes);
app.use('/api/ferias', isAuthenticated, feriasRoutes); // Registra as rotas de férias com autenticação
app.use('/api/ausencias', isAuthenticated, ausenciasRoutes);

// Rota para servir Home.html
app.get('/Home.html', isAuthenticated, (req, res) => {
    res.redirect('/dashboard');
});

// Rotas legadas redirecionam para o painel React
app.get('/funcionarios.html', isAuthenticated, (req, res) => {
    res.redirect('/funcionarios');
});

app.get('/empresa.html', isAuthenticated, (req, res) => {
    res.redirect('/empresa');
});

app.get('/ferias.html', isAuthenticated, (req, res) => {
    res.redirect('/ferias');
});

app.get('/ausencias.html', isAuthenticated, (req, res) => {
    res.redirect('/ausencias');
});

app.get(/^\/(admin|dashboard|funcionarios|fornecedores|empresa|clientes|representantes|produtos|estoque|frota|ferias|ausencias|cipa|financeiro|pedidos|agendamentos|emitir-nfe|notas-fiscais|configuracoes|relatorios|pagamentos|mobile)(\/.*)?$/, (req, res) => {
    res.sendFile(path.join(reactDistPath, 'index.html'), (err) => {
        if (err) {
            logger.error('Build React não encontrado para rota do painel', { module: 'server', stack: err.stack });
            res.status(503).send('Execute npm run build:client para acessar o painel administrativo.');
        }
    });
});

// Rota para receber logs do cliente
app.post('/log-client', (req, res) => {
    const { msg, level, module, stack } = req.body;
    const validLevels = ['error', 'warn', 'info', 'success'];
    const logLevel = validLevels.includes(level) ? level : 'info';

    try {
        logger.log({
            level: logLevel,
            message: msg,
            module,
            stack
        });
        res.status(200).json({ message: 'Log registrado no servidor' });
    } catch (err) {
        logger.error('Erro ao registrar log do cliente', { module: 'server', stack: err.stack });
        res.status(200).json({ message: 'Log registrado com falha' });
    }
});

// Middleware global para tratamento de erros
app.use((err, req, res, next) => {
    logger.error(`Erro não tratado: ${err.message}`, { module: 'server', stack: err.stack });
    res.status(500).json({ message: 'Erro no servidor. Tente novamente mais tarde.' });
});

function writeDevPortFile(port) {
    fs.writeFileSync(DEV_PORT_FILE, String(port), 'utf8');
}

function startServer(port) {
    if (port > MAX_PORT) {
        logger.error(`Nenhuma porta disponível entre ${BASE_PORT} e ${MAX_PORT}`, { module: 'server' });
        process.exit(1);
        return;
    }

    const server = app.listen(port, '0.0.0.0', () => {
        writeDevPortFile(port);
        logger.info(`Servidor rodando em http://localhost:${port} e http://127.0.0.1:${port}`, { module: 'server' });

        if (port !== BASE_PORT) {
            logger.warn(`Porta ${BASE_PORT} ocupada. Servidor iniciado na porta ${port}.`, { module: 'server' });
        }
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            logger.warn(`Porta ${port} em uso, tentando ${port + 1}...`, { module: 'server' });
            startServer(port + 1);
            return;
        }

        logger.error(`Erro ao iniciar servidor: ${error.message}`, { module: 'server', stack: error.stack });
        process.exit(1);
    });
}

startServer(BASE_PORT);
