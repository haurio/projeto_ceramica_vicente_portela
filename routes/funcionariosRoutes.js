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
    if (!value || !allowedValues.includes(value.trim())) {
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
        const [banks] = await pool.query('SELECT id AS value, nome AS text FROM bancos');

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
            message: 'Erro ao carregar opções de departamentos, cargos ou bancos. Contate o administrador.',
            error: {
                message: err.message,
                sqlMessage: err.sqlMessage,
                sql: err.sql,
                code: err.code
            }
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
                row.days_off = row.days_off ? row.days_off.split(',').map(day => day.toLowerCase().trim()) : [];
                row.dependents = row.dependents ? JSON.parse(row.dependents) : [];
                if (row.bank !== null && row.bank !== undefined) {
                    row.bank = row.bank.toString();
                }
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
            message: 'Erro ao carregar a lista de funcionários. Contate o administrador.',
            error: {
                message: err.message,
                sqlMessage: err.sqlMessage,
                sql: err.sql,
                code: err.code
            }
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
            return res.status(404).json({ message: 'Funcionário não encontrado.' });
        }

        const employee = rows[0];
        try {
            employee.days_off = employee.days_off ? employee.days_off.split(',').map(day => day.toLowerCase().trim()) : [];
            employee.dependents = employee.dependents ? JSON.parse(employee.dependents) : [];
            if (employee.bank !== null && employee.bank !== undefined) {
                employee.bank = employee.bank.toString();
            }
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
            message: 'Erro ao carregar dados do funcionário. Contate o administrador.',
            error: {
                message: err.message,
                sqlMessage: err.sqlMessage,
                sql: err.sql,
                code: err.code
            }
        });
    }
});

// Criar um novo funcionário
router.post('/api/employees', isAuthenticated, async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
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

        logger.info('Dados recebidos para criação de funcionário', {
            module: 'funcionariosRoutes',
            name,
            cpf,
            email,
            cargo_id,
            departamento_id,
            status,
            dependents: JSON.stringify(dependents),
            fullBody: JSON.stringify(req.body)
        });

        // Validação de campos obrigatórios com mensagens claras
        const requiredFields = {
            name: 'Nome Completo',
            cpf: 'CPF',
            email: 'E-mail',
            cargo_id: 'Cargo',
            departamento_id: 'Departamento',
            status: 'Status',
            birth_date: 'Data de Nascimento',
            birth_city: 'Cidade de Nascimento',
            birth_state: 'Estado de Nascimento',
            nationality: 'Nacionalidade',
            education_level: 'Escolaridade',
            phone: 'Telefone',
            marital_status: 'Estado Civil',
            identity_number: 'Número do RG',
            identity_issue_date: 'Data de Emissão do RG',
            identity_issuer: 'Órgão Emissor do RG',
            identity_state: 'Estado Emissor do RG',
            father_name: 'Nome do Pai',
            mother_name: 'Nome da Mãe',
            has_children: 'Possui Filhos',
            cep: 'CEP',
            city: 'Cidade',
            state: 'Estado',
            street: 'Rua',
            number: 'Número',
            neighborhood: 'Bairro',
            ctps: 'CTPS',
            ctps_state: 'Estado da CTPS',
            ctps_issue_date: 'Data de Emissão da CTPS',
            pis: 'PIS/PASEP',
            admission_date: 'Data de Admissão',
            salary: 'Salário',
            monthly_hours: 'Carga Horária Mensal',
            weekly_hours: 'Carga Horária Semanal',
            trial_period: 'Período de Experiência',
            payment_method: 'Forma de Pagamento',
            weekday_start: 'Horário de Início (Semana)',
            weekday_end: 'Horário de Fim (Semana)'
        };

        for (const [field, displayName] of Object.entries(requiredFields)) {
            if (!req.body[field] || req.body[field].toString().trim() === '') {
                throw new Error(`O campo ${displayName} é obrigatório.`);
            }
        }

        const sanitizedName = name.trim();
        const sanitizedEmail = email.trim();
        const sanitizedCpf = cpf.replace(/[^\d]+/g, '').trim();

        if (!validateCPF(sanitizedCpf)) {
            throw new Error('CPF inválido. Verifique os dígitos.');
        }

        if (!validateEmail(sanitizedEmail)) {
            throw new Error('E-mail inválido. Use o formato: exemplo@dominio.com');
        }

        // Validações de ENUM com mensagens mais claras
        validateEnum(status, ['Ativo', 'Afastado', 'Demitido'], 'Status');
        validateEnum(has_children, ['sim', 'nao'], 'Possui Filhos');
        validateEnum(payment_method, ['PIX', 'Transferência', 'Dinheiro'], 'Forma de Pagamento');
        
        if (first_job && first_job.trim() !== '') {
            validateEnum(first_job, ['sim', 'nao'], 'Primeiro Emprego');
        }

        // Validações condicionais de pagamento
        if (payment_method === 'PIX') {
            if (!pix_key || pix_key.trim() === '' || !bank || bank.toString().trim() === '') {
                throw new Error('Chave PIX e Banco são obrigatórios para a forma de pagamento PIX.');
            }
            // Validar se o banco existe
            const [bankExists] = await client.query('SELECT id FROM bancos WHERE id = ?', [parseInt(bank)]);
            if (bankExists.length === 0) {
                throw new Error('Banco selecionado para PIX não existe.');
            }
        }

        if (payment_method === 'Transferência') {
            if (!bank || bank.toString().trim() === '' || !agency || agency.trim() === '' || 
                !account || account.trim() === '' || !account_type || account_type.trim() === '') {
                throw new Error('Banco, Agência, Conta e Tipo de Conta são obrigatórios para a forma de pagamento Transferência.');
            }
            // Validar se o banco existe
            const [bankExists] = await client.query('SELECT id FROM bancos WHERE id = ?', [parseInt(bank)]);
            if (bankExists.length === 0) {
                throw new Error('Banco selecionado para Transferência não existe.');
            }
        }

        // Validações condicionais de status
        if (status === 'Afastado' && (!leave_reason || leave_reason.trim() === '')) {
            throw new Error('Motivo de afastamento é obrigatório para o status Afastado.');
        }

        if (status === 'Demitido' && (!dismissal_date || dismissal_date.trim() === '')) {
            throw new Error('Data de demissão é obrigatória para o status Demitido.');
        }

        // Validação de dias de folga
        if (!Array.isArray(days_off) || days_off.length === 0) {
            throw new Error('Pelo menos um dia de folga deve ser selecionado.');
        }

        const validDays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        for (const day of days_off) {
            if (day && day.trim() !== '') {
                validateEnum(day.trim(), validDays, 'Dia de Folga');
            }
        }

        // Verificar se CPF ou email já existem
        const [existing] = await client.query('SELECT id FROM funcionarios WHERE cpf = ? OR email = ?', [sanitizedCpf, sanitizedEmail]);
        if (existing.length > 0) {
            throw new Error('CPF ou e-mail já cadastrado no sistema.');
        }

        // Inserir funcionário principal
        const [funcResult] = await client.query(
            'INSERT INTO funcionarios (nome, cpf, email, cargo_id, departamento_id, status, data_admissao, data_demissao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [sanitizedName, sanitizedCpf, sanitizedEmail, parseInt(cargo_id), parseInt(departamento_id), status, admission_date, dismissal_date || null]
        );
        const funcionarioId = funcResult.insertId;

        logger.info('Funcionário principal inserido', { module: 'funcionariosRoutes', id: funcionarioId });

        // Inserir dados pessoais
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

        // Inserir endereço
        await client.query(
            'INSERT INTO funcionarios_enderecos (funcionario_id, cep, cidade, estado, rua, numero, bairro, complemento) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [funcionarioId, cep, city, state, street, number, neighborhood, complement || null]
        );

        // Inserir dados profissionais
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

        // Inserir dados bancários
        await client.query(
            'INSERT INTO funcionarios_dados_bancarios (funcionario_id, forma_pagamento, chave_pix, banco_id, agencia, conta, tipo_conta) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [funcionarioId, payment_method, pix_key || null, bank ? parseInt(bank) : null, agency || null, account || null, account_type || null]
        );

        // Inserir dias de folga
        if (days_off && Array.isArray(days_off)) {
            for (const day of days_off) {
                if (day && day.trim() !== '') {
                    await client.query('INSERT INTO funcionarios_dias_folga (funcionario_id, dia) VALUES (?, ?)', [funcionarioId, day.trim()]);
                }
            }
        }

        // Inserir dependentes somente se houver informações completas nos campos
        if (dependents && Array.isArray(dependents)) {
            for (const dep of dependents) {
                // Verificar se todos os campos obrigatórios estão preenchidos
                if (dep && dep.name?.trim() && dep.birth_date?.trim() && dep.parentesco?.trim()) {
                    await client.query(
                        'INSERT INTO funcionarios_dependentes (funcionario_id, nome, data_nascimento, parentesco) VALUES (?, ?, ?, ?)',
                        [funcionarioId, dep.name.trim(), dep.birth_date, dep.parentesco.trim()]
                    );
                    logger.info('Dependente inserido', { module: 'funcionariosRoutes', funcionarioId, depName: dep.name });
                } else {
                    logger.warn('Dependente ignorado por campos vazios', { module: 'funcionariosRoutes', dep });
                }
            }
        }

        await client.query('COMMIT');
        logger.info('Funcionário criado com sucesso', { module: 'funcionariosRoutes', id: funcionarioId });
        res.status(201).json({ 
            message: 'Funcionário criado com sucesso!',
            id: funcionarioId 
        });
    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        logger.error('Erro ao criar funcionário', {
            module: 'funcionariosRoutes',
            stack: err.stack,
            message: err.message,
            sqlMessage: err.sqlMessage,
            sql: err.sql,
            code: err.code,
            requestBody: JSON.stringify(req.body)
        });
        res.status(400).json({ 
            message: err.message,
            error: {
                message: err.message,
                stack: err.stack,
                sqlMessage: err.sqlMessage,
                sql: err.sql,
                code: err.code,
                requestBody: JSON.stringify(req.body)
            }
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// Atualizar um funcionário
router.put('/api/employees/:id', isAuthenticated, async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
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

        logger.info('Dados recebidos para atualização de funcionário', {
            module: 'funcionariosRoutes',
            id,
            name,
            cpf,
            email,
            cargo_id,
            departamento_id,
            status,
            dependents: JSON.stringify(dependents),
            fullBody: JSON.stringify(req.body)
        });

        // Validação de campos obrigatórios
        const requiredFields = {
            name: 'Nome Completo',
            cpf: 'CPF',
            email: 'E-mail',
            cargo_id: 'Cargo',
            departamento_id: 'Departamento',
            status: 'Status',
            birth_date: 'Data de Nascimento',
            birth_city: 'Cidade de Nascimento',
            birth_state: 'Estado de Nascimento',
            nationality: 'Nacionalidade',
            education_level: 'Escolaridade',
            phone: 'Telefone',
            marital_status: 'Estado Civil',
            identity_number: 'Número do RG',
            identity_issue_date: 'Data de Emissão do RG',
            identity_issuer: 'Órgão Emissor do RG',
            identity_state: 'Estado Emissor do RG',
            father_name: 'Nome do Pai',
            mother_name: 'Nome da Mãe',
            has_children: 'Possui Filhos',
            cep: 'CEP',
            city: 'Cidade',
            state: 'Estado',
            street: 'Rua',
            number: 'Número',
            neighborhood: 'Bairro',
            ctps: 'CTPS',
            ctps_state: 'Estado da CTPS',
            ctps_issue_date: 'Data de Emissão da CTPS',
            pis: 'PIS/PASEP',
            admission_date: 'Data de Admissão',
            salary: 'Salário',
            monthly_hours: 'Carga Horária Mensal',
            weekly_hours: 'Carga Horária Semanal',
            trial_period: 'Período de Experiência',
            payment_method: 'Forma de Pagamento',
            weekday_start: 'Horário de Início (Semana)',
            weekday_end: 'Horário de Fim (Semana)'
        };

        for (const [field, displayName] of Object.entries(requiredFields)) {
            if (!req.body[field] || req.body[field].toString().trim() === '') {
                throw new Error(`O campo ${displayName} é obrigatório.`);
            }
        }

        const sanitizedName = name.trim();
        const sanitizedEmail = email.trim();
        const sanitizedCpf = cpf.replace(/[^\d]+/g, '').trim();

        if (!validateCPF(sanitizedCpf)) {
            throw new Error('CPF inválido. Verifique os dígitos.');
        }

        if (!validateEmail(sanitizedEmail)) {
            throw new Error('E-mail inválido. Use o formato: exemplo@dominio.com');
        }

        // Validações de ENUM
        validateEnum(status, ['Ativo', 'Afastado', 'Demitido'], 'Status');
        validateEnum(has_children, ['sim', 'nao'], 'Possui Filhos');
        validateEnum(payment_method, ['PIX', 'Transferência', 'Dinheiro'], 'Forma de Pagamento');
        
        if (first_job && first_job.trim() !== '') {
            validateEnum(first_job, ['sim', 'nao'], 'Primeiro Emprego');
        }

        if (payment_method === 'PIX') {
            if (!pix_key || pix_key.trim() === '' || !bank || bank.toString().trim() === '') {
                throw new Error('Chave PIX e Banco são obrigatórios para a forma de pagamento PIX.');
            }
            const [bankExists] = await client.query('SELECT id FROM bancos WHERE id = ?', [parseInt(bank)]);
            if (bankExists.length === 0) {
                throw new Error('Banco selecionado para PIX não existe.');
            }
        }

        if (payment_method === 'Transferência') {
            if (!bank || bank.toString().trim() === '' || !agency || agency.trim() === '' || 
                !account || account.trim() === '' || !account_type || account_type.trim() === '') {
                throw new Error('Banco, Agência, Conta e Tipo de Conta são obrigatórios para a forma de pagamento Transferência.');
            }
            const [bankExists] = await client.query('SELECT id FROM bancos WHERE id = ?', [parseInt(bank)]);
            if (bankExists.length === 0) {
                throw new Error('Banco selecionado para Transferência não existe.');
            }
        }

        if (status === 'Afastado' && (!leave_reason || leave_reason.trim() === '')) {
            throw new Error('Motivo de afastamento é obrigatório para o status Afastado.');
        }

        if (status === 'Demitido' && (!dismissal_date || dismissal_date.trim() === '')) {
            throw new Error('Data de demissão é obrigatório para o status Demitido.');
        }

        if (!Array.isArray(days_off) || days_off.length === 0) {
            throw new Error('Pelo menos um dia de folga deve ser selecionado.');
        }

        const validDays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        for (const day of days_off) {
            if (day && day.trim() !== '') {
                validateEnum(day.trim(), validDays, 'Dia de Folga');
            }
        }

        // Verificar se CPF ou email já existem para outro funcionário
        const [existing] = await client.query('SELECT id FROM funcionarios WHERE (cpf = ? OR email = ?) AND id != ?', [sanitizedCpf, sanitizedEmail, id]);
        if (existing.length > 0) {
            throw new Error('CPF ou e-mail já cadastrado no sistema.');
        }

        // Verificar se o funcionário existe
        const [existingEmployee] = await client.query('SELECT id FROM funcionarios WHERE id = ?', [id]);
        if (existingEmployee.length === 0) {
            throw new Error('Funcionário não encontrado.');
        }

        // Atualizar funcionário principal
        await client.query(
            'UPDATE funcionarios SET nome = ?, cpf = ?, email = ?, cargo_id = ?, departamento_id = ?, status = ?, data_admissao = ?, data_demissao = ? WHERE id = ?',
            [sanitizedName, sanitizedCpf, sanitizedEmail, parseInt(cargo_id), parseInt(departamento_id), status, admission_date, dismissal_date || null, id]
        );

        // Atualizar dados pessoais
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

        // Atualizar endereço
        await client.query(
            'UPDATE funcionarios_enderecos SET cep = ?, cidade = ?, estado = ?, rua = ?, numero = ?, bairro = ?, complemento = ? WHERE funcionario_id = ?',
            [cep, city, state, street, number, neighborhood, complement || null, id]
        );

        // Atualizar dados profissionais
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

        // Atualizar dados bancários
        await client.query(
            'UPDATE funcionarios_dados_bancarios SET forma_pagamento = ?, chave_pix = ?, banco_id = ?, agencia = ?, conta = ?, tipo_conta = ? WHERE funcionario_id = ?',
            [payment_method, pix_key || null, bank ? parseInt(bank) : null, agency || null, account || null, account_type || null, id]
        );

        // Deletar e inserir dias de folga
        await client.query('DELETE FROM funcionarios_dias_folga WHERE funcionario_id = ?', [id]);
        if (days_off && Array.isArray(days_off)) {
            for (const day of days_off) {
                if (day && day.trim() !== '') {
                    await client.query('INSERT INTO funcionarios_dias_folga (funcionario_id, dia) VALUES (?, ?)', [id, day.trim()]);
                }
            }
        }

        // Deletar e inserir dependentes somente se houver informações completas nos campos
        await client.query('DELETE FROM funcionarios_dependentes WHERE funcionario_id = ?', [id]);
        if (dependents && Array.isArray(dependents)) {
            for (const dep of dependents) {
                if (dep && dep.name?.trim() && dep.birth_date?.trim() && dep.parentesco?.trim()) {
                    await client.query(
                        'INSERT INTO funcionarios_dependentes (funcionario_id, nome, data_nascimento, parentesco) VALUES (?, ?, ?, ?)',
                        [id, dep.name.trim(), dep.birth_date, dep.parentesco.trim()]
                    );
                    logger.info('Dependente inserido', { module: 'funcionariosRoutes', id, depName: dep.name });
                } else {
                    logger.warn('Dependente ignorado por campos vazios', { module: 'funcionariosRoutes', dep });
                }
            }
        }

        await client.query('COMMIT');
        logger.info(`Funcionário com ID ${id} atualizado com sucesso`, { module: 'funcionariosRoutes' });
        res.json({ message: 'Funcionário atualizado com sucesso!' });
    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        logger.error(`Erro ao atualizar funcionário com ID ${id}`, {
            module: 'funcionariosRoutes',
            stack: err.stack,
            message: err.message,
            sqlMessage: err.sqlMessage,
            sql: err.sql,
            code: err.code,
            requestBody: JSON.stringify(req.body)
        });
        res.status(400).json({ 
            message: err.message,
            error: {
                message: err.message,
                stack: err.stack,
                sqlMessage: err.sqlMessage,
                sql: err.sql,
                code: err.code,
                requestBody: JSON.stringify(req.body)
            }
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// Deletar um funcionário
router.delete('/api/employees/:id', isAuthenticated, async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
        await client.query('BEGIN');
        await checkDatabase();
        const id = parseInt(req.params.id);

        const [existing] = await client.query('SELECT id FROM funcionarios WHERE id = ?', [id]);
        if (existing.length === 0) {
            await client.query('ROLLBACK');
            throw new Error('Funcionário não encontrado.');
        }

        // Deletar em cascata
        await client.query('DELETE FROM funcionarios_dados_pessoais WHERE funcionario_id = ?', [id]);
        await client.query('DELETE FROM funcionarios_enderecos WHERE funcionario_id = ?', [id]);
        await client.query('DELETE FROM funcionarios_dados_profissionais WHERE funcionario_id = ?', [id]);
        await client.query('DELETE FROM funcionarios_dados_bancarios WHERE funcionario_id = ?', [id]);
        await client.query('DELETE FROM funcionarios_dias_folga WHERE funcionario_id = ?', [id]);
        await client.query('DELETE FROM funcionarios_dependentes WHERE funcionario_id = ?', [id]);
        await client.query('DELETE FROM funcionarios WHERE id = ?', [id]);

        await client.query('COMMIT');
        logger.info(`Funcionário com ID ${id} excluído com sucesso`, { module: 'funcionariosRoutes' });
        res.json({ message: 'Funcionário excluído com sucesso!' });
    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        logger.error(`Erro ao excluir funcionário com ID ${id}`, {
            module: 'funcionariosRoutes',
            stack: err.stack,
            message: err.message,
            sqlMessage: err.sqlMessage,
            sql: err.sql,
            code: err.code
        });
        res.status(400).json({ 
            message: err.message,
            error: {
                message: err.message,
                stack: err.stack,
                sqlMessage: err.sqlMessage,
                sql: err.sql,
                code: err.code
            }
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// Rota para receber logs do cliente - CORRIGIDA
router.post('/log-client', async (req, res) => {
    try {
        const { msg, level, module, stack, metadata } = req.body;
        // Aceitar 'success' e mapear para 'info'
        const validLogLevels = ['info', 'warn', 'error', 'debug', 'success'];
        if (!validLogLevels.includes(level)) {
            logger.warn('Nível de log inválido recebido', { module, level, msg });
            return res.status(400).json({ message: `Nível de log "${level}" inválido. Use: ${validLogLevels.join(', ')}.` });
        }
        // Mapear 'success' para 'info'
        const logLevel = level === 'success' ? 'info' : level;
        logger.log(logLevel, msg, { module, stack, ...metadata });
        res.status(200).send();
    } catch (err) {
        logger.error('Erro ao processar log do cliente', {
            module: 'funcionariosRoutes',
            stack: err.stack,
            message: err.message
        });
        res.status(500).json({ message: 'Erro ao processar log. Contate o administrador.' });
    }
});

module.exports = router;