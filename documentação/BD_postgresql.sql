-- Schema PostgreSQL convertido de documentação/BD.txt
-- Ordem ajustada para respeitar chaves estrangeiras

BEGIN;

-- Tipos ENUM
DO $$ BEGIN
    CREATE TYPE funcionario_status AS ENUM ('Ativo', 'Afastado', 'Demitido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE sim_nao AS ENUM ('sim', 'nao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE dia_semana AS ENUM ('domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE forma_pagamento AS ENUM ('PIX', 'Transferência', 'Dinheiro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_conta AS ENUM ('Corrente', 'Poupança');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE empresa_porte AS ENUM ('ME', 'EPP', 'DEMAIS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE regime_tributario AS ENUM ('Simples Nacional', 'Lucro Presumido', 'Lucro Real');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE situacao_cadastral AS ENUM ('Ativa', 'Inativa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE ferias_status AS ENUM ('Planejada', 'Em Andamento', 'Concluída', 'Cancelada', 'Atrasada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE ausencia_status AS ENUM ('Registrada', 'Justificada', 'Não Justificada', 'Cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE ausencia_tipo AS ENUM (
        'Férias', 'Acidente De Trabalho', 'Aleitamento', 'Baixa médica', 'Casamento',
        'Outro Assuntos Pessoais- Dia', 'Ausências justificadas- Dias', 'Dia aniversário',
        'Falecimento Familiar', 'Falta Injustificada- Dias', 'Falta injustificada - Horas',
        'Gravidez De Risco', 'Ausência Justificada- Horas', 'Outros Assuntos Pessoais- Horas',
        'Ida ao médico', 'Isolamento Profilático', 'Licença parental', 'Maternidade',
        'Paternidade', 'Tolerância de Ponto'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Funções para atualizar colunas de timestamp
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela de usuários (login/registro do sistema)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departamentos
CREATE TABLE IF NOT EXISTS departamentos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

-- Cargos
CREATE TABLE IF NOT EXISTS cargos (
    id SERIAL PRIMARY KEY,
    departamento_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
);

-- Bancos brasileiros
CREATE TABLE IF NOT EXISTS bancos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    codigo CHAR(3) NOT NULL UNIQUE
);

-- CNAE
CREATE TABLE IF NOT EXISTS cnae (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    descricao VARCHAR(255) NOT NULL
);

-- Empresa
CREATE TABLE IF NOT EXISTS empresa (
    id SERIAL PRIMARY KEY,
    razao_social VARCHAR(100) NOT NULL,
    nome_fantasia VARCHAR(100),
    cnpj VARCHAR(20) NOT NULL UNIQUE,
    porte empresa_porte DEFAULT 'DEMAIS',
    inscricao_estadual VARCHAR(20),
    inscricao_municipal VARCHAR(20) NOT NULL,
    id_cnae INT NOT NULL,
    regime_tributario regime_tributario NOT NULL,
    data_fundacao DATE NOT NULL,
    natureza_juridica VARCHAR(110),
    cep VARCHAR(10) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    rua VARCHAR(100) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    bairro VARCHAR(50) NOT NULL,
    complemento VARCHAR(100),
    email VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    site VARCHAR(100),
    pessoa_contato VARCHAR(100),
    situacao_cadastral situacao_cadastral DEFAULT 'Ativa',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cnae) REFERENCES cnae(id)
);

DROP TRIGGER IF EXISTS trg_empresa_atualizado_em ON empresa;
CREATE TRIGGER trg_empresa_atualizado_em
    BEFORE UPDATE ON empresa
    FOR EACH ROW EXECUTE PROCEDURE set_atualizado_em();

-- Atividades secundárias da empresa
CREATE TABLE IF NOT EXISTS empresa_atividade_secundaria (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL,
    id_cnae INT NOT NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE,
    FOREIGN KEY (id_cnae) REFERENCES cnae(id)
);

-- Funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf CHAR(14) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    departamento_id INT NOT NULL,
    cargo_id INT NOT NULL,
    status funcionario_status NOT NULL,
    data_admissao DATE NOT NULL,
    data_demissao DATE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
    FOREIGN KEY (cargo_id) REFERENCES cargos(id)
);

DROP TRIGGER IF EXISTS trg_funcionarios_atualizado_em ON funcionarios;
CREATE TRIGGER trg_funcionarios_atualizado_em
    BEFORE UPDATE ON funcionarios
    FOR EACH ROW EXECUTE PROCEDURE set_atualizado_em();

-- Dados pessoais dos funcionários
CREATE TABLE IF NOT EXISTS funcionarios_dados_pessoais (
    funcionario_id INT PRIMARY KEY,
    data_nascimento DATE NOT NULL,
    cidade_nascimento VARCHAR(100) NOT NULL,
    estado_nascimento CHAR(2) NOT NULL,
    nacionalidade VARCHAR(50) NOT NULL,
    escolaridade VARCHAR(50) NOT NULL,
    telefone VARCHAR(15) NOT NULL,
    estado_civil VARCHAR(20) NOT NULL,
    titulo_eleitor VARCHAR(20),
    zona_eleitoral VARCHAR(10),
    secao_eleitoral VARCHAR(10),
    reservista VARCHAR(20),
    categoria_reservista VARCHAR(20),
    rg VARCHAR(20) NOT NULL,
    data_emissao_rg DATE NOT NULL,
    orgao_emissor_rg VARCHAR(10) NOT NULL,
    estado_emissor_rg CHAR(2) NOT NULL,
    nome_pai VARCHAR(100) NOT NULL,
    nome_mae VARCHAR(100) NOT NULL,
    conjuge VARCHAR(100),
    possui_filhos sim_nao NOT NULL,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
);

-- Endereços dos funcionários
CREATE TABLE IF NOT EXISTS funcionarios_enderecos (
    funcionario_id INT PRIMARY KEY,
    cep CHAR(9) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    rua VARCHAR(100) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    bairro VARCHAR(50) NOT NULL,
    complemento VARCHAR(100),
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
);

-- Dados profissionais dos funcionários
CREATE TABLE IF NOT EXISTS funcionarios_dados_profissionais (
    funcionario_id INT PRIMARY KEY,
    ctps VARCHAR(20) NOT NULL,
    ctps_estado CHAR(2) NOT NULL,
    ctps_data_emissao DATE NOT NULL,
    pis CHAR(14) NOT NULL,
    salario DECIMAL(10, 2) NOT NULL,
    carga_horaria_mensal INT NOT NULL,
    carga_horaria_semanal INT NOT NULL,
    periodo_experiencia INT NOT NULL CHECK (periodo_experiencia BETWEEN 0 AND 90),
    adicional_noturno DECIMAL(5, 2) CHECK (adicional_noturno BETWEEN 0 AND 100),
    primeiro_emprego sim_nao,
    motivo_saida VARCHAR(100),
    horario_inicio_semana TIME NOT NULL,
    horario_fim_semana TIME NOT NULL,
    horario_inicio_sabado TIME,
    horario_fim_sabado TIME,
    horario_inicio_domingo TIME,
    horario_fim_domingo TIME,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
);

-- Dias de folga dos funcionários
CREATE TABLE IF NOT EXISTS funcionarios_dias_folga (
    id SERIAL PRIMARY KEY,
    funcionario_id INT,
    dia dia_semana NOT NULL,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
);

-- Dados bancários dos funcionários
CREATE TABLE IF NOT EXISTS funcionarios_dados_bancarios (
    funcionario_id INT PRIMARY KEY,
    forma_pagamento forma_pagamento NOT NULL,
    chave_pix VARCHAR(50),
    banco_id INT,
    agencia VARCHAR(10),
    conta VARCHAR(20),
    tipo_conta tipo_conta,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id),
    FOREIGN KEY (banco_id) REFERENCES bancos(id)
);

-- Dependentes dos funcionários
CREATE TABLE IF NOT EXISTS funcionarios_dependentes (
    id SERIAL PRIMARY KEY,
    funcionario_id INT,
    nome VARCHAR(100) NOT NULL,
    data_nascimento DATE NOT NULL,
    parentesco VARCHAR(50) NOT NULL,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
);

-- Férias
CREATE TABLE IF NOT EXISTS ferias (
    id SERIAL PRIMARY KEY,
    funcionario_id INT NOT NULL,
    periodo_aquisitivo_inicio DATE NOT NULL,
    periodo_aquisitivo_fim DATE NOT NULL,
    data_inicio DATE,
    data_fim DATE,
    dias_concedidos INT NOT NULL DEFAULT 30,
    status ferias_status NOT NULL DEFAULT 'Planejada',
    motivo VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (data_fim IS NULL OR data_inicio IS NULL OR data_fim >= data_inicio),
    CHECK (dias_concedidos BETWEEN 15 AND 30)
);

DROP TRIGGER IF EXISTS trg_ferias_atualizado_em ON ferias;
CREATE TRIGGER trg_ferias_atualizado_em
    BEFORE UPDATE ON ferias
    FOR EACH ROW EXECUTE PROCEDURE set_atualizado_em();

-- Ausências
CREATE TABLE IF NOT EXISTS ausencias (
    id SERIAL PRIMARY KEY,
    funcionario_id INT NOT NULL,
    tipo ausencia_tipo NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE DEFAULT NULL,
    justificativa TEXT DEFAULT NULL,
    status ausencia_status NOT NULL DEFAULT 'Registrada',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

DROP TRIGGER IF EXISTS trg_ausencias_updated_at ON ausencias;
CREATE TRIGGER trg_ausencias_updated_at
    BEFORE UPDATE ON ausencias
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_ausencias_funcionario_data ON ausencias (funcionario_id, data_inicio);
CREATE INDEX IF NOT EXISTS idx_ausencias_status_tipo ON ausencias (status, tipo);

COMMIT;
