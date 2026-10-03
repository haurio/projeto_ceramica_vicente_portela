const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/register', async (req, res) => {
    const { username, email, password, full_name, status } = req.body || {};

    try {
        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }

        if (!['Ativo', 'Inativo'].includes(status || 'Ativo')) {
            return res.status(400).json({ message: 'Status inválido. Use "Ativo" ou "Inativo".' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'E-mail inválido.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'A senha deve ter pelo menos 8 caracteres.' });
        }

        if (username.length > 255 || full_name.length > 255) {
            return res.status(400).json({ message: 'Usuário ou nome completo excedem o tamanho máximo.' });
        }

        const [existing] = await pool.query(
            'SELECT id, username, email FROM users WHERE email = ? OR username = ? LIMIT 1',
            [email, username]
        );
        if (existing.length > 0) {
            return res.status(400).json({
                message: existing[0].username === username ? 'Usuário já existe.' : 'E-mail já está em uso.',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userStatus = status === 'Inativo' ? 'Inativo' : 'Ativo';

        await pool.query(
            `INSERT INTO users (username, email, password, full_name, status)
             VALUES (?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, full_name, userStatus]
        );

        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        logger.error(`Erro ao registrar usuário: ${error.message}`, {
            module: 'registerRoutes',
            stack: error.stack,
        });
        res.status(500).json({ message: 'Erro no servidor. Tente novamente mais tarde.' });
    }
});

module.exports = router;
