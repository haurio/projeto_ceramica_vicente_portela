const express = require('express');
const router = express.Router();
const pool = require('../db');
const logger = require('../utils/logger');

// Middleware para verificar autenticação
const isAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.authenticated) {
        logger.warn('Acesso não autorizado à rota', { module: 'funcionariosRoutes', url: req.originalUrl, session: req.session });
        return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
    }
    logger.info('Sessão autenticada com sucesso', { module: 'funcionariosRoutes', sessionId: req.session.id });
    next();
};

// Função para validar CPF
const validateCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    return digit === parseInt(cpf.charAt(10));
};

// Função para validar e-mail
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Função para validar valores ENUM
const validateEnum = (value, allowedValues, fieldName) => {
    if (!allowedValues.includes(value)) {
        throw new Error(`O campo ${fieldName} deve ser um dos seguintes valores: ${allowedValues.join(', ')}`);
    }
};

// Verificar conexão com o banco e tabelas
const checkDatabase = async () => {
    try {
        await pool.query('SELECT 1');
        logger.info('Conexão com o banco de dados bem-sucedida', { module: 'funcionariosRoutes' });

        const requiredTables = [
            'funcionarios', 'funcionarios_dados_pessoais', 'funcionarios_enderecos',
            'funcionarios_dados_profissionais', 'funcionarios_dias_folga', 'funcionarios_dados_bancarios',
            'funcionarios_dependentes', 'bancos', 'departamentos', 'cargos'
        ];

        for (const table of requiredTables) {
            const [rows] = await pool.query('SHOW TABLES LIKE ?', [table]);
            if (rows.length === 0) {
                throw new Error(`Tabela ${table} não encontrada no banco de dados`);
            }
        }

        logger.info('Todas as tabelas necessárias encontradas', { module: 'funcionariosRoutes', tables: requiredTables });
    } catch (err) {
        logger.error('Erro ao verificar conexão com o banco ou tabelas', {
            module: 'funcionariosRoutes',
            stack: err.stack,
            message: err.message,
            code: err.code
        });
        throw err;
    }
};

// Obter opções de departamentos, cargos e bancos
router.get('/api/options', isAuthenticated, async (req, res) => {
    try {
        await checkDatabase();
        logger.info('Iniciando obtenção de opções', { module: 'funcionariosRoutes' });

        const [departments] = await pool.query('SELECT id AS value, nome AS text FROM departamentos');
        const [positions] = await pool.query('SELECT id AS value, nome AS text, departamento_id AS department_id FROM cargos');
        const [banks] = await pool.query('SELECT id AS value, CONCAT(nome) AS text FROM bancos');
    //  const [banks] = await pool.query('SELECT id AS value, CONCAT(nome, " (", codigo, ")") AS text FROM bancos'); 

        logger.info('Opções obtidas com sucesso', {
            module: 'funcionariosRoutes',
            departmentCount: departments.length,
            positionCount: positions.length,
            bankCount: banks.length
        });

        res.json({ departments, positions, banks });
    } catch (err) {
        logger.error('Erro ao obter opções', {
            module: 'funcionariosRoutes',
            stack: err.stack,
            message: err.message,
            sqlMessage: err.sqlMessage,
            sql: err.sql,
            code: err.code
        });
        res.status(500).json({
            message: 'Erro no servidor',
            error: process.env.NODE_ENV === 'development' ? {
                message: err.message,
                sqlMessage: err.sqlMessage,
                sql: err.sql,
                code: err.code
            } : undefined
        });
    }
});

// Obter todos os funcionários
router.get('/api/employees', isAuthenticated, async (req, res) => {
    try {
        await checkDatabase();
        await pool.query('SET SESSION group_concat_max_len = 10000');
        logger.info('Iniciando consulta de funcionários', { module: 'funcionariosRoutes' });

        const [rows] = await pool.query(`
            SELECT 
                f.id, 
                f.nome AS name, 
                f.cpf, 
                f.email, 
                f.cargo_id, 
                c.nome AS position, 
                f.status,
                f.departamento_id,
                d.nome AS department,
                dp.data_nascimento AS birth_date, 
                dp.cidade_nascimento AS birth_city, 
                dp.estado_nascimento AS birth_state,
                dp.nacionalidade AS nationality, 
                dp.escolaridade AS education_level, 
                dp.telefone AS phone,
                dp.estado_civil AS marital_status, 
                dp.titulo_eleitor AS voter_id, 
                dp.zona_eleitoral AS voter_zone,
                dp.secao_eleitoral AS voter_section, 
                dp.reservista AS military_id, 
                dp.categoria_reservista AS military_category,
                dp.rg AS identity_number, 
                dp.data_emissao_rg AS identity_issue_date, 
                dp.orgao_emissor_rg AS identity_issuer,
                dp.estado_emissor_rg AS identity_state, 
                dp.nome_pai AS father_name, 
                dp.nome_mae AS mother_name,
                dp.conjuge AS spouse, 
                dp.possui_filhos AS has_children,
                e.cep, 
                e.cidade AS city, 
                e.estado AS state, 
                e.rua AS street, 
                e.numero AS number, 
                e.bairro AS neighborhood, 
                e.complemento AS complement,
                prof.ctps, 
                prof.ctps_estado AS ctps_state, 
                prof.ctps_data_emissao AS ctps_issue_date, 
                prof.pis,
                f.data_admissao AS admission_date, 
                prof.salario AS salary, 
                prof.carga_horaria_mensal AS monthly_hours, 
                prof.carga_horaria_semanal AS weekly_hours,
                prof.periodo_experiencia AS trial_period, 
                prof.adicional_noturno AS night_shift_percentage,
                prof.primeiro_emprego AS first_job, 
                prof.motivo_saida AS leave_reason,
                f.data_demissao AS dismissal_date,
                prof.horario_inicio_semana AS weekday_start, 
                prof.horario_fim_semana AS weekday_end,
                prof.horario_inicio_sabado AS saturday_start, 
                prof.horario_fim_sabado AS saturday_end,
                prof.horario_inicio_domingo AS sunday_start, 
                prof.horario_fim_domingo AS sunday_end,
                db.forma_pagamento AS payment_method, 
                db.chave_pix AS pix_key, 
                db.banco_id AS bank,
                b.nome AS bank_name,
                db.agencia AS agency, 
                db.conta AS account, 
                db.tipo_conta AS account_type,
                COALESCE(GROUP_CONCAT(df.dia), '') AS days_off,
                COALESCE((
                    SELECT CONCAT(
                        '[',
                        GROUP_CONCAT(
                            JSON_OBJECT(
                                'id', d.id,
                                'name', d.nome,
                                'birth_date', d.data_nascimento,
                                'parentesco', d.parentesco
                            )
                            SEPARATOR ','
                        ),
                        ']'
                    )
                    FROM funcionarios_dependentes d 
                    WHERE d.funcionario_id = f.id
                ), '[]') AS dependents
            FROM funcionarios f
            LEFT JOIN cargos c ON f.cargo_id = c.id
            LEFT JOIN departamentos d ON f.departamento_id = d.id
            LEFT JOIN funcionarios_dados_pessoais dp ON f.id = dp.funcionario_id
            LEFT JOIN funcionarios_enderecos e ON f.id = e.funcionario_id
            LEFT JOIN funcionarios_dados_profissionais prof ON f.id = prof.funcionario_id
            LEFT JOIN funcionarios_dados_bancarios db ON f.id = db.funcionario_id
            LEFT JOIN bancos b ON db.banco_id = b.id
            LEFT JOIN funcionarios_dias_folga df ON f.id = df.funcionario_id
            GROUP BY f.id
        `);

        rows.forEach(row => {
            try {
                row.days_off = row.days_off ? row.days_off.split(',').map(day => day.toLowerCase()) : [];
                row.dependents = row.dependents ? JSON.parse(row.dependents) : [];
            } catch (parseErr) {
                logger.error('Erro ao processar dados do funcionário', {
                    module: 'funcionariosRoutes',
                    employeeId: row.id,
                    parseError: parseErr.message,
                    dependents: row.dependents
                });
                row.dependents = [];
                row.days_off = [];
            }
        });

        logger.info('Lista de funcionários obtida com sucesso', { module: 'funcionariosRoutes', count: rows.length });
        res.json(rows);
    } catch (err) {
        logger.error('Erro ao obter funcionários', {
            module: 'funcionariosRoutes',
            stack: err.stack,
            message: err.message,
            sqlMessage: err.sqlMessage,
            sql: err.sql,
            code: err.code
        });
        res.status(500).json({
            message: 'Erro no servidor',
            error: process.env.NODE_ENV === 'development' ? {
                message: err.message,
                sqlMessage: err.sqlMessage,
                sql: err.sql,
                code: err.code
            } : undefined
        });
    }
});

// Obter um funcionário específico
router.get('/api/employees/:id', isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await checkDatabase();
        const [rows] = await pool.query(`
            SELECT 
                f.id, 
                f.nome AS name, 
                f.cpf, 
                f.email, 
                f.cargo_id, 
                c.nome AS position, 
                f.status,
                f.departamento_id,
                d.nome AS department,
                dp.data_nascimento AS birth_date, 
                dp.cidade_nascimento AS birth_city, 
                dp.estado_nascimento AS birth_state,
                dp.nacionalidade AS nationality, 
                dp.escolaridade AS education_level, 
                dp.telefone AS phone,
                dp.estado_civil AS marital_status, 
                dp.titulo_eleitor AS voter_id, 
                dp.zona_eleitoral AS voter_zone,
                dp.secao_eleitoral AS voter_section, 
                dp.reservista AS military_id, 
                dp.categoria_reservista AS military_category,
                dp.rg AS identity_number, 
                dp.data_emissao_rg AS identity_issue_date, 
                dp.orgao_emissor_rg AS identity_issuer,
                dp.estado_emissor_rg AS identity_state, 
                dp.nome_pai AS father_name, 
                dp.nome_mae AS mother_name,
                dp.conjuge AS spouse, 
                dp.possui_filhos AS has_children,
                e.cep, 
                e.cidade AS city, 
                e.estado AS state, 
                e.rua AS street, 
                e.numero AS number, 
                e.bairro AS neighborhood, 
                e.complemento AS complement,
                prof.ctps, 
                prof.ctps_estado AS ctps_state, 
                prof.ctps_data_emissao AS ctps_issue_date, 
                prof.pis,
                f.data_admissao AS admission_date, 
                prof.salario AS salary, 
                prof.carga_horaria_mensal AS monthly_hours, 
                prof.carga_horaria_semanal AS weekly_hours,
                prof.periodo_experiencia AS trial_period, 
                prof.adicional_noturno AS night_shift_percentage,
                prof.primeiro_emprego AS first_job, 
                prof.motivo_saida AS leave_reason,
                f.data_demissao AS dismissal_date,
                prof.horario_inicio_semana AS weekday_start, 
                prof.horario_fim_semana AS weekday_end,
                prof.horario_inicio_sabado AS saturday_start, 
                prof.horario_fim_sabado AS saturday_end,
                prof.horario_inicio_domingo AS sunday_start, 
                prof.horario_fim_domingo AS sunday_end,
                db.forma_pagamento AS payment_method, 
                db.chave_pix AS pix_key, 
                db.banco_id AS bank,
                b.nome AS bank_name,
                db.agencia AS agency, 
                db.conta AS account, 
                db.tipo_conta AS account_type,
                COALESCE(GROUP_CONCAT(df.dia), '') AS days_off,
                COALESCE((
                    SELECT CONCAT(
                        '[',
                        GROUP_CONCAT(
                            JSON_OBJECT(
                                'id', d.id,
                                'name', d.nome,
                                'birth_date', d.data_nascimento,
                                'parentesco', d.parentesco
                            )
                            SEPARATOR ','
                        ),
                        ']'
                    )
                    FROM funcionarios_dependentes d 
                    WHERE d.funcionario_id = f.id
                ), '[]') AS dependents
            FROM funcionarios f
            LEFT JOIN cargos c ON f.cargo_id = c.id
            LEFT JOIN departamentos d ON f.departamento_id = d.id
            LEFT JOIN funcionarios_dados_pessoais dp ON f.id = dp.funcionario_id
            LEFT JOIN funcionarios_enderecos e ON f.id = e.funcionario_id
            LEFT JOIN funcionarios_dados_profissionais prof ON f.id = prof.funcionario_id
            LEFT JOIN funcionarios_dados_bancarios db ON f.id = db.funcionario_id
            LEFT JOIN bancos b ON db.banco_id = b.id
            LEFT JOIN funcionarios_dias_folga df ON f.id = df.funcionario_id
            WHERE f.id = ?
            GROUP BY f.id
        `, [id]);

        if (rows.length === 0) {
            logger.warn(`Funcionário com ID ${id} não encontrado`, { module: 'funcionariosRoutes' });
            return res.status(404).json({ message: 'Funcionário não encontrado' });
        }

        const employee = rows[0];
        try {
            employee.days_off = employee.days_off ? employee.days_off.split(',').map(day => day.toLowerCase()) : [];
            employee.dependents = employee.dependents ? JSON.parse(employee.dependents) : [];
        } catch (parseErr) {
            logger.error('Erro ao processar dados do funcionário', {
                module: 'funcionariosRoutes',
                employeeId: id,
                parseError: parseErr.message,
                dependents: employee.dependents
            });
            employee.dependents = [];
            employee.days_off = [];
        }

        logger.info(`Funcionário com ID ${id} obtido com sucesso`, { module: 'funcionariosRoutes' });
        res.json(employee);
    } catch (err) {
        logger.error(`Erro ao obter funcionário com ID ${id}`, {
            module: 'funcionariosRoutes',
            stack: err.stack,
            message: err.message,
            sqlMessage: err.sqlMessage,
            sql: err.sql,
            code: err.code
        });
        res.status(500).json({
            message: 'Erro no servidor',
            error: process.env.NODE_ENV === 'development' ? {
                message: err.message,
                sqlMessage: err.sqlMessage,
                sql: err.sql,
                code: err.code
            } : undefined
        });
    }
});

// Criar um novo funcionário
router.post('/api/employees', isAuthenticated, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await checkDatabase();

        const {
            name, cpf, email, cargo_id, departamento_id, status, birth_date, birth_city, birth_state, nationality,
            education_level, phone, marital_status, voter_id, voter_zone, voter_section,
            military_id, military_category, identity_number, identity_issue_date, identity_issuer,
            identity_state, father_name, mother_name, spouse, has_children, cep, city, state,
            street, number, neighborhood, complement, ctps, ctps_state, ctps_issue_date, pis,
            admission_date, salary, monthly_hours, weekly_hours, trial_period,
            night_shift_percentage, first_job, leave_reason, dismissal_date,
            weekday_start, weekday_end, saturday_start, saturday_end, sunday_start, sunday_end,
            payment_method, pix_key, bank, agency, account, account_type, days_off, dependents
        } = req.body;

        const requiredFields = [
            'name', 'cpf', 'email', 'cargo_id', 'departamento_id', 'status', 'birth_date', 'birth_city', 'birth_state',
            'nationality', 'education_level', 'phone', 'marital_status', 'identity_number',
            'identity_issue_date', 'identity_issuer', 'identity_state', 'father_name', 'mother_name',
            'has_children', 'cep', 'city', 'state', 'street', 'number', 'neighborhood', 'ctps',
            'ctps_state', 'ctps_issue_date', 'pis', 'admission_date', 'salary',
            'monthly_hours', 'weekly_hours', 'trial_period', 'payment_method'
        ];

        for (const field of requiredFields) {
            if (!req.body[field]) {
                throw new Error(`O campo ${field} é obrigatório`);
            }
        }

        const sanitizedName = name.trim();
        const sanitizedEmail = email.trim();
        const sanitizedCpf = cpf.trim();

        if (!validateCPF(sanitizedCpf)) {
            throw new Error('CPF inválido');
        }

        if (!validateEmail(sanitizedEmail)) {
            throw new Error('E-mail inválido');
        }

        validateEnum(status, ['Ativo', 'Afastado', 'Demitido'], 'status');
        validateEnum(has_children, ['sim', 'nao'], 'has_children');
        validateEnum(payment_method, ['PIX', 'Transferência', 'Dinheiro'], 'payment_method');
        if (first_job) validateEnum(first_job, ['sim', 'nao'], 'first_job');

        if (payment_method === 'PIX' && (!pix_key || !bank)) {
            throw new Error('Chave PIX e banco são obrigatórios para a forma de pagamento PIX');
        }

        if (payment_method === 'Transferência' && (!bank || !agency || !account || !account_type)) {
            throw new Error('Banco, agência, conta e tipo de conta são obrigatórios para a forma de pagamento Transferência');
        }

        if (status === 'Afastado' && !leave_reason) {
            throw new Error('Motivo de afastamento é obrigatório para o status Afastado');
        }

        if (status === 'Demitido' && !dismissal_date) {
            throw new Error('Data de demissão é obrigatória para o status Demitido');
        }

        if (!Array.isArray(days_off) || days_off.length === 0) {
            throw new Error('Pelo menos um dia de folga deve ser selecionado');
        }

        const validDays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        for (const day of days_off) {
            validateEnum(day, validDays, 'days_off');
        }

        for (const dep of dependents) {
            if (!dep.name || !dep.birth_date || !dep.parentesco) {
                throw new Error('Nome, data de nascimento e parentesco do dependente são obrigatórios');
            }
        }

        const [existing] = await client.query('SELECT id FROM funcionarios WHERE cpf = ? OR email = ?', [sanitizedCpf, sanitizedEmail]);
        if (existing.length > 0) {
            throw new Error('CPF ou e-mail já cadastrado');
        }

        const [funcResult] = await client.query(
            'INSERT INTO funcionarios (nome, cpf, email, cargo_id, departamento_id, status, data_admissao, data_demissao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [sanitizedName, sanitizedCpf, sanitizedEmail, cargo_id, departamento_id, status, admission_date, dismissal_date || null]
        );
        const funcionarioId = funcResult.insertId;

        await client.query(
            `INSERT INTO funcionarios_dados_pessoais (
                funcionario_id, data_nascimento, cidade_nascimento, estado_nascimento, nacionalidade,
                escolaridade, telefone, estado_civil, titulo_eleitor, zona_eleitoral, secao_eleitoral,
                reservista, categoria_reservista, rg, data_emissao_rg, orgao_emissor_rg, estado_emissor_rg,
                nome_pai, nome_mae, conjuge, possui_filhos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                funcionarioId, birth_date, birth_city, birth_state, nationality, education_level, phone,
                marital_status, voter_id || null, voter_zone || null, voter_section || null,
                military_id || null, military_category || null, identity_number, identity_issue_date,
                identity_issuer, identity_state, father_name, mother_name, spouse || null, has_children
            ]
        );

        await client.query(
            'INSERT INTO funcionarios_enderecos (funcionario_id, cep, cidade, estado, rua, numero, bairro, complemento) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [funcionarioId, cep, city, state, street, number, neighborhood, complement || null]
        );

        await client.query(
            `INSERT INTO funcionarios_dados_profissionais (
                funcionario_id, ctps, ctps_estado, ctps_data_emissao, pis, salario,
                carga_horaria_mensal, carga_horaria_semanal, periodo_experiencia,
                adicional_noturno, primeiro_emprego, motivo_saida,
                horario_inicio_semana, horario_fim_semana, horario_inicio_sabado, horario_fim_sabado,
                horario_inicio_domingo, horario_fim_domingo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                funcionarioId, ctps, ctps_state, ctps_issue_date, pis, salary,
                monthly_hours, weekly_hours, trial_period, night_shift_percentage || null,
                first_job || null, leave_reason || null,
                weekday_start, weekday_end, saturday_start || null, saturday_end || null,
                sunday_start || null, sunday_end || null
            ]
        );

        await client.query(
            'INSERT INTO funcionarios_dados_bancarios (funcionario_id, forma_pagamento, chave_pix, banco_id, agencia, conta, tipo_conta) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [funcionarioId, payment_method, pix_key || null, bank || null, agency || null, account || null, account_type || null]
        );

        for (const day of days_off) {
            await client.query('INSERT INTO funcionarios_dias_folga (funcionario_id, dia) VALUES (?, ?)', [funcionarioId, day]);
        }

        for (const dep of dependents) {
            await client.query(
                'INSERT INTO funcionarios_dependentes (funcionario_id, nome, data_nascimento, parentesco) VALUES (?, ?, ?, ?)',
                [funcionarioId, dep.name, dep.birth_date, dep.parentesco]
            );
        }

        await client.query('COMMIT');
        logger.info('Funcionário criado com sucesso', { module: 'funcionariosRoutes', id: funcionarioId });
        res.status(201).json({ message: 'Funcionário criado com sucesso' });
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Erro ao criar funcionário', {
            module: 'funcionariosRoutes',
            stack: err.stack,
            message: err.message,
            sqlMessage: err.sqlMessage,
            sql: err.sql,
            code: err.code
        });
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
});

// Atualizar um funcionário
router.put('/api/employees/:id', isAuthenticated, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await checkDatabase();

        const id = parseInt(req.params.id);
        const {
            name, cpf, email, cargo_id, departamento_id, status, birth_date, birth_city, birth_state, nationality,
            education_level, phone, marital_status, voter_id, voter_zone, voter_section,
            military_id, military_category, identity_number, identity_issue_date, identity_issuer,
            identity_state, father_name, mother_name, spouse, has_children, cep, city, state,
            street, number, neighborhood, complement, ctps, ctps_state, ctps_issue_date, pis,
            admission_date, salary, monthly_hours, weekly_hours, trial_period,
            night_shift_percentage, first_job, leave_reason, dismissal_date,
            weekday_start, weekday_end, saturday_start, saturday_end, sunday_start, sunday_end,
            payment_method, pix_key, bank, agency, account, account_type, days_off, dependents
        } = req.body;

        const requiredFields = [
            'name', 'cpf', 'email', 'cargo_id', 'departamento_id', 'status', 'birth_date', 'birth_city', 'birth_state',
            'nationality', 'education_level', 'phone', 'marital_status', 'identity_number',
            'identity_issue_date', 'identity_issuer', 'identity_state', 'father_name', 'mother_name',
            'has_children', 'cep', 'city', 'state', 'street', 'number', 'neighborhood', 'ctps',
            'ctps_state', 'ctps_issue_date', 'pis', 'admission_date', 'salary',
            'monthly_hours', 'weekly_hours', 'trial_period', 'payment_method'
        ];

        for (const field of requiredFields) {
            if (!req.body[field]) {
                throw new Error(`O campo ${field} é obrigatório`);
            }
        }

        const sanitizedName = name.trim();
        const sanitizedEmail = email.trim();
        const sanitizedCpf = cpf.trim();

        if (!validateCPF(sanitizedCpf)) {
            throw new Error('CPF inválido');
        }

        if (!validateEmail(sanitizedEmail)) {
            throw new Error('E-mail inválido');
        }

        validateEnum(status, ['Ativo', 'Afastado', 'Demitido'], 'status');
        validateEnum(has_children, ['sim', 'nao'], 'has_children');
        validateEnum(payment_method, ['PIX', 'Transferência', 'Dinheiro'], 'payment_method');
        if (first_job) validateEnum(first_job, ['sim', 'nao'], 'first_job');

        if (payment_method === 'PIX' && (!pix_key || !bank)) {
            throw new Error('Chave PIX e banco são obrigatórios para a forma de pagamento PIX');
        }

        if (payment_method === 'Transferência' && (!bank || !agency || !account || !account_type)) {
            throw new Error('Banco, agência, conta e tipo de conta são obrigatórios para a forma de pagamento Transferência');
        }

        if (status === 'Afastado' && !leave_reason) {
            throw new Error('Motivo de afastamento é obrigatório para o status Afastado');
        }

        if (status === 'Demitido' && !dismissal_date) {
            throw new Error('Data de demissão é obrigatória para o status Demitido');
        }

        if (!Array.isArray(days_off) || days_off.length === 0) {
            throw new Error('Pelo menos um dia de folga deve ser selecionado');
        }

        const validDays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        for (const day of days_off) {
            validateEnum(day, validDays, 'days_off');
        }

        for (const dep of dependents) {
            if (!dep.name || !dep.birth_date || !dep.parentesco) {
                throw new Error('Nome, data de nascimento e parentesco do dependente são obrigatórios');
            }
        }

        const [existing] = await client.query('SELECT id FROM funcionarios WHERE (cpf = ? OR email = ?) AND id != ?', [sanitizedCpf, sanitizedEmail, id]);
        if (existing.length > 0) {
            throw new Error('CPF ou e-mail já cadastrado');
        }

        await client.query(
            'UPDATE funcionarios SET nome = ?, cpf = ?, email = ?, cargo_id = ?, departamento_id = ?, status = ?, data_admissao = ?, data_demissao = ? WHERE id = ?',
            [sanitizedName, sanitizedCpf, sanitizedEmail, cargo_id, departamento_id, status, admission_date, dismissal_date || null, id]
        );

        await client.query(
            `UPDATE funcionarios_dados_pessoais SET
                data_nascimento = ?, cidade_nascimento = ?, estado_nascimento = ?, nacionalidade = ?,
                escolaridade = ?, telefone = ?, estado_civil = ?, titulo_eleitor = ?, zona_eleitoral = ?,
                secao_eleitoral = ?, reservista = ?, categoria_reservista = ?, rg = ?, data_emissao_rg = ?,
                orgao_emissor_rg = ?, estado_emissor_rg = ?, nome_pai = ?, nome_mae = ?, conjuge = ?,
                possui_filhos = ?
            WHERE funcionario_id = ?`,
            [
                birth_date, birth_city, birth_state, nationality, education_level, phone, marital_status,
                voter_id || null, voter_zone || null, voter_section || null, military_id || null,
                military_category || null, identity_number, identity_issue_date, identity_issuer,
                identity_state, father_name, mother_name, spouse || null, has_children, id
            ]
        );

        await client.query(
            'UPDATE funcionarios_enderecos SET cep = ?, cidade = ?, estado = ?, rua = ?, numero = ?, bairro = ?, complemento = ? WHERE funcionario_id = ?',
            [cep, city, state, street, number, neighborhood, complement || null, id]
        );

        await client.query(
            `UPDATE funcionarios_dados_profissionais SET
                ctps = ?, ctps_estado = ?, ctps_data_emissao = ?, pis = ?, salario = ?,
                carga_horaria_mensal = ?, carga_horaria_semanal = ?,
                periodo_experiencia = ?, adicional_noturno = ?, primeiro_emprego = ?, motivo_saida = ?,
                horario_inicio_semana = ?, horario_fim_semana = ?,
                horario_inicio_sabado = ?, horario_fim_sabado = ?,
                horario_inicio_domingo = ?, horario_fim_domingo = ?
            WHERE funcionario_id = ?`,
            [
                ctps, ctps_state, ctps_issue_date, pis, salary,
                monthly_hours, weekly_hours, trial_period, night_shift_percentage || null,
                first_job || null, leave_reason || null,
                weekday_start, weekday_end, saturday_start || null, saturday_end || null,
                sunday_start || null, sunday_end || null, id
            ]
        );

        await client.query(
            'UPDATE funcionarios_dados_bancarios SET forma_pagamento = ?, chave_pix = ?, banco_id = ?, agencia = ?, conta = ?, tipo_conta = ? WHERE funcionario_id = ?',
            [payment_method, pix_key || null, bank || null, agency || null, account || null, account_type || null, id]
        );

        await client.query('DELETE FROM funcionarios_dias_folga WHERE funcionario_id = ?', [id]);
        for (const day of days_off) {
            await client.query('INSERT INTO funcionarios_dias_folga (funcionario_id, dia) VALUES (?, ?)', [id, day]);
        }

        await client.query('DELETE FROM funcionarios_dependentes WHERE funcionario_id = ?', [id]);
        for (const dep of dependents) {
            await client.query(
                'INSERT INTO funcionarios_dependentes (funcionario_id, nome, data_nascimento, parentesco) VALUES (?, ?, ?, ?)',
                [id, dep.name, dep.birth_date, dep.parentesco]
            );
        }

        await client.query('COMMIT');
        logger.info(`Funcionário com ID ${id} atualizado com sucesso`, { module: 'funcionariosRoutes' });
        res.json({ message: 'Funcionário atualizado com sucesso' });
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Erro ao atualizar funcionário com ID ${id}`, {
            module: 'funcionariosRoutes',
            stack: err.stack,
            message: err.message,
            sqlMessage: err.sqlMessage,
            sql: err.sql,
            code: err.code
        });
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
});

// Deletar um funcionário
router.delete('/api/employees/:id', isAuthenticated, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await checkDatabase();
        const id = parseInt(req.params.id);

        const [existing] = await client.query('SELECT id FROM funcionarios WHERE id = ?', [id]);
        if (existing.length === 0) {
            throw new Error('Funcionário não encontrado');
        }

        await client.query('DELETE FROM funcionarios_dados_pessoais WHERE funcionario_id = ?', [id]);
        await client.query('DELETE FROM funcionarios_enderecos WHERE funcionario_id = ?', [id]);
        await client.query('DELETE FROM funcionarios_dados_profissionais WHERE funcionario_id = ?', [id]);
        await client.query('DELETE FROM funcionarios_dados_bancarios WHERE funcionario_id = ?', [id]);
        await client.query('DELETE FROM funcionarios_dias_folga WHERE funcionario_id = ?', [id]);
        await client.query('DELETE FROM funcionarios_dependentes WHERE funcionario_id = ?', [id]);
        await client.query('DELETE FROM funcionarios WHERE id = ?', [id]);

        await client.query('COMMIT');
        logger.info(`Funcionário com ID ${id} excluído com sucesso`, { module: 'funcionariosRoutes' });
        res.json({ message: 'Funcionário excluído com sucesso' });
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Erro ao excluir funcionário com ID ${id}`, {
            module: 'funcionariosRoutes',
            stack: err.stack,
            message: err.message,
            sqlMessage: err.sqlMessage,
            sql: err.sql,
            code: err.code
        });
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
});

// Rota para receber logs do cliente
router.post('/log-client', async (req, res) => {
    try {
        const { msg, level, module, stack } = req.body;
        const validLogLevels = ['info', 'warn', 'error', 'debug'];
        if (!validLogLevels.includes(level)) {
            throw new Error('Nível de log inválido');
        }
        logger.log(level, msg, { module, stack });
        res.status(200).send();
    } catch (err) {
        console.error('Erro ao processar log do cliente:', err);
        res.status(500).json({ message: 'Erro ao processar log' });
    }
});

module.exports = router;