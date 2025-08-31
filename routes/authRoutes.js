const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');
const db = require('../db');
const { sendEmail } = require('../send_email');
const logger = require('../utils/logger'); // Caminho corrigido

const router = express.Router();

// Configuração do armazenamento de upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Rota para a página principal (após login)
router.get('/', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.sendFile(path.join(__dirname, '../public', 'index.html'));
    } else {
        res.redirect('/login');
    }
});

// Rota para a página de login
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'login.html'));
});

// Rota para processar o login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length === 0) {
            logger.warn('Tentativa de login com usuário inexistente', { username });
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        const user = rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            logger.warn('Tentativa de login com senha inválida', { username });
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        // Autenticação bem-sucedida
        req.session.authenticated = true;
        req.session.user = { id: user.id, email: user.email, username: user.username };
        logger.info('Login bem-sucedido', { username });
        res.json({ message: 'Login bem-sucedido!', redirect: '/Home.html' });
    } catch (error) {
        logger.error(`Erro ao processar login: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: 'Erro no servidor. Tente novamente mais tarde.' });
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