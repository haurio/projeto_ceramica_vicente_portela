const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');
const db = require('../db');
const { sendEmail } = require('../send_email');
const logger = require('../utils/logger');
const { sessionUserFromRow, resolvePerfil } = require('../utils/usersAccess');

const router = express.Router();
const reactIndex = path.join(__dirname, '../client/dist/index.html');

async function ensureUserAccessColumnsSafe() {
    try {
        await db.query(`
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS perfil VARCHAR(40) NOT NULL DEFAULT 'Administrador',
                ADD COLUMN IF NOT EXISTS permissoes JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS forcar_troca_senha BOOLEAN NOT NULL DEFAULT FALSE
        `);
    } catch (_error) {
        // tabela pode ainda não existir em ambientes novos
    }
}

function isDatabaseUnavailableError(error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    return (
        code === 'ECONNRESET'
        || code === 'ECONNREFUSED'
        || code === 'ETIMEDOUT'
        || code === 'ENOTFOUND'
        || code === '57P01'
        || code === '57P03'
        || /ECONNRESET|ECONNREFUSED|timeout|terminat|not accept/i.test(message)
    );
}

function loginServerErrorMessage(error) {
    if (isDatabaseUnavailableError(error)) {
        return 'Banco de dados indisponível. Inicie o PostgreSQL e tente novamente.';
    }
    return 'Erro no servidor. Tente novamente mais tarde.';
}

function sendReactApp(res, fallbackPath) {
    res.sendFile(reactIndex, (err) => {
        if (err && fallbackPath) {
            res.sendFile(fallbackPath);
            return;
        }

        if (err) {
            logger.error('Build React não encontrado para login', { module: 'authRoutes', stack: err.stack });
            res.status(503).send('Execute npm run build:client ou acesse http://localhost:5173/login em desenvolvimento.');
        }
    });
}

// Configuração do armazenamento de upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Rota para a página de login
router.get('/login', (req, res) => {
    if (req.session?.authenticated) {
        return res.redirect('/dashboard');
    }

    sendReactApp(res, path.join(__dirname, '../public/login.html'));
});

// Login do sistema de gestão — username ou email
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const loginId = String(username || '').trim();

    if (!loginId || !password) {
        return res.status(400).json({ message: 'Informe o usuário e a senha.' });
    }

    try {
        await ensureUserAccessColumnsSafe();
        const [rows] = await db.query(
            `SELECT * FROM users
             WHERE LOWER(COALESCE(username, '')) = LOWER(?)
                OR LOWER(COALESCE(email, '')) = LOWER(?)
             ORDER BY
                CASE WHEN LOWER(COALESCE(username, '')) = LOWER(?) THEN 0 ELSE 1 END,
                id`,
            [loginId, loginId, loginId]
        );

        if (rows.length === 0) {
            logger.warn('Tentativa de login com usuário inexistente', { username: loginId });
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        let matchedUser = null;
        for (const candidate of rows) {
            if (candidate.password) {
                const isValid = await bcrypt.compare(password, candidate.password);
                if (isValid) {
                    matchedUser = candidate;
                    break;
                }
            }
        }

        if (!matchedUser) {
            logger.warn('Tentativa de login com senha inválida', { username: loginId });
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        if (String(matchedUser.status || '').toLowerCase() === 'inativo') {
            return res.status(403).json({ message: 'Usuário inativo. Contate o administrador.' });
        }

        const perfil = resolvePerfil(matchedUser.perfil);
        if (perfil === 'Representante') {
            logger.warn('Login de representante bloqueado no sistema de gestão', {
                username: matchedUser.username,
                email: matchedUser.email,
            });
            return res.status(403).json({
                message: 'Você não tem permissão para acessar este sistema. Este cadastro é exclusivo do sistema Mobile no celular.',
            });
        }

        req.session.authenticated = true;
        req.session.user = sessionUserFromRow(matchedUser);
        logger.info('Login bem-sucedido', { username: matchedUser.username, perfil });

        req.session.save((saveError) => {
            if (saveError) {
                logger.error(`Erro ao salvar sessão: ${saveError.message}`, { stack: saveError.stack });
                return res.status(500).json({ message: 'Erro ao criar sessão. Tente novamente.' });
            }

            res.json({
                message: 'Login bem-sucedido!',
                redirect: '/dashboard',
                user: req.session.user
            });
        });
    } catch (error) {
        logger.error(`Erro ao processar login: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: loginServerErrorMessage(error) });
    }
});

// Login do PWA Mobile — e-mail ou usuário + senha
router.post('/mobile/login', async (req, res) => {
    const loginId = String(req.body.email || req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!loginId || !password) {
        return res.status(400).json({ message: 'Informe o e-mail/usuário e a senha.' });
    }

    try {
        await ensureUserAccessColumnsSafe();

        const [rows] = await db.query(
            `SELECT * FROM users
             WHERE LOWER(COALESCE(email, '')) = LOWER(?)
                OR LOWER(COALESCE(username, '')) = LOWER(?)
             ORDER BY
                CASE WHEN LOWER(COALESCE(email, '')) = LOWER(?) THEN 0 ELSE 1 END,
                CASE WHEN LOWER(COALESCE(username, '')) = LOWER(?) THEN 0 ELSE 1 END,
                CASE WHEN perfil = 'Representante' THEN 0 ELSE 1 END,
                id`,
            [loginId, loginId, loginId, loginId]
        );

        if (rows.length === 0) {
            logger.warn('Tentativa de login mobile com usuário inexistente', { login: loginId });
            return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
        }

        let matchedUser = null;
        for (const candidate of rows) {
            if (candidate.password) {
                const isValid = await bcrypt.compare(password, candidate.password);
                if (isValid) {
                    matchedUser = candidate;
                    break;
                }
            }
        }

        if (!matchedUser) {
            logger.warn('Tentativa de login mobile com senha inválida', { login: loginId });
            return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
        }

        if (String(matchedUser.status || '').toLowerCase() === 'inativo') {
            return res.status(403).json({ message: 'Usuário inativo. Contate o administrador.' });
        }

        req.session.authenticated = true;
        req.session.user = sessionUserFromRow(matchedUser);
        logger.info('Login mobile bem-sucedido', {
            username: matchedUser.username,
            perfil: matchedUser.perfil,
        });

        req.session.save((saveError) => {
            if (saveError) {
                logger.error(`Erro ao salvar sessão mobile: ${saveError.message}`, { stack: saveError.stack });
                return res.status(500).json({ message: 'Erro ao criar sessão. Tente novamente.' });
            }

            res.json({
                message: 'Login bem-sucedido!',
                redirect: '/mobile',
                user: req.session.user
            });
        });
    } catch (error) {
        logger.error(`Erro ao processar login mobile: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: loginServerErrorMessage(error) });
    }
});

// Rota para processar o formulário com upload
router.post('/send-email', upload.array('anexo'), async (req, res) => {
    try {
        await sendEmail(req, res);
        logger.info('E-mail enviado com sucesso', { email: req.body.email });
    } catch (error) {
        logger.error(`Erro ao processar envio de e-mail: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: 'Erro ao enviar e-mail. Tente novamente mais tarde.' });
    }
});

module.exports = router;