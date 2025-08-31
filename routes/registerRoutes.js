const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('../db');
const logger = require('../utils/logger'); // Importar o logger

const router = express.Router();

// Rota para a página de registro
router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'register.html'));
});

// Rota para processar o registro
router.post('/register', async (req, res) => {
    const { username, email, password, full_name, status } = req.body;

    try {
        // Validações no backend
        if (!username || !email || !password || !full_name || !status) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }

        if (!['Ativo', 'Inativo'].includes(status)) {
            return res.status(400).json({ message: 'Status inválido. Use "Ativo" ou "Inativo".' });
        }

        // Validar formato do e-mail
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'E-mail inválido.' });
        }

        // Validar comprimento mínimo da senha
        if (password.length < 8) {
            return res.status(400).json({ message: 'A senha deve ter pelo menos 8 caracteres.' });
        }

        // Validar comprimento máximo dos campos
        if (username.length > 255 || full_name.length > 255) {
            return res.status(400).json({ message: 'Usuário ou nome completo excedem o tamanho máximo.' });
        }

        // Verificar se o e-mail ou usuário já existe
        const [existing] = await db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existing.length > 0) {
            return res.status(400).json({
                message: existing[0].username === username ? 'Usuário já existe.' : 'E-mail já está em uso.'
            });
        }

        // Hashear a senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserir o novo usuário
        await db.query(
            'INSERT INTO users (username, email, password, full_name, status) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name, status]
        );

        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        logger.error(`Erro ao registrar usuário: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: 'Erro no servidor. Tente novamente mais tarde.' });
    }
});

module.exports = router;