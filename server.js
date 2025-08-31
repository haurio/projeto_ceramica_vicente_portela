const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config({ debug: false });
require('express-async-errors');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Verificar se SESSION_SECRET está definido
if (!process.env.SESSION_SECRET) {
    logger.error('SESSION_SECRET não está definido no arquivo .env', { module: 'server' });
    process.exit(1);
}

// Configurar CORS
app.use(cors({
    origin: 'http://localhost:3000', // Substitua pela origem do frontend
    credentials: true // Permite o envio de cookies
}));

// Middleware para processar dados do formulário
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Middleware para sessões
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use true em produção com HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        sameSite: 'lax' // Ajuste para 'none' em produção com HTTPS
    }
}));

// Servir arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Importar rotas
const authRoutes = require('./routes/authRoutes');
const registerRoutes = require('./routes/registerRoutes');
const funcionariosRoutes = require('./routes/funcionariosRoutes');

// Usar rotas
app.use(authRoutes);
app.use(registerRoutes);
app.use(funcionariosRoutes);

// Rota para servir Home.html
app.get('/Home.html', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.sendFile(path.join(__dirname, 'public', 'Home.html'));
    } else {
        res.redirect('/login');
    }
});

// Rota para servir funcionarios.html
app.get('/funcionarios.html', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.sendFile(path.join(__dirname, 'public', 'funcionarios.html'));
    } else {
        res.redirect('/login');
    }
});

// Rota para verificar sessão
app.get('/check-session', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.status(200).json({ authenticated: true });
    } else {
        res.status(401).json({ authenticated: false });
    }
});

// Rota para logout
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

app.listen(PORT, () => {
    logger.info(`Servidor rodando em http://localhost:${PORT}`, { module: 'server' });
});