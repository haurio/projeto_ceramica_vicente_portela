-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 11/07/2026 às 22:21
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `portela`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `ausencias`
--

CREATE TABLE `ausencias` (
  `id` int(11) NOT NULL COMMENT 'Chave primária da ausência',
  `funcionario_id` int(11) NOT NULL,
  `tipo` varchar(50) NOT NULL,
  `data_inicio` date NOT NULL,
  `data_fim` date DEFAULT NULL,
  `justificativa` text DEFAULT NULL,
  `status` enum('Pendente','Aprovada','Rejeitada','Concluída') NOT NULL DEFAULT 'Pendente',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `ausencias`
--

INSERT INTO `ausencias` (`id`, `funcionario_id`, `tipo`, `data_inicio`, `data_fim`, `justificativa`, `status`, `created_at`, `updated_at`, `created_by`) VALUES
(1, 1, 'Férias', '2025-12-15', '2025-12-19', 'Ferias', '', '2025-12-13 00:54:04', '2025-12-13 00:54:04', NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `bancos`
--

CREATE TABLE `bancos` (
  `id` int(11) NOT NULL COMMENT 'Chave primária do banco',
  `nome` varchar(100) NOT NULL COMMENT 'Nome completo do Banco',
  `codigo` varchar(10) NOT NULL COMMENT 'Código COMPE do Banco',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `bancos`
--

INSERT INTO `bancos` (`id`, `nome`, `codigo`, `created_at`, `updated_at`) VALUES
(62, 'Banco do Brasil S.A.', '001', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(63, 'Banco da Amazônia S.A.', '003', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(64, 'Banco do Nordeste do Brasil S.A.', '004', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(65, 'Banco Nacional de Desenvolvimento Econômico e Social - BNDES', '007', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(66, 'Banco Inbursa S.A.', '012', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(67, 'Banestes S.A. Banco do Estado do Espírito Santo', '021', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(68, 'Banco de Pernambuco S.A. - BANDEPE', '024', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(69, 'Banco Alfa S.A.', '025', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(70, 'Banco Agibank S.A.', '121', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(71, 'Banco ABC Brasil S.A.', '246', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(72, 'Banco AndBank (Brasil) S.A.', '065', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(73, 'Banco Arbi S.A.', '213', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(74, 'Banco B3 S.A.', '096', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(75, 'Banco Bari de Investimentos e Financiamentos S.A.', '330', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(76, 'Banco BMG S.A.', '318', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(77, 'Banco BNP Paribas Brasil S.A.', '752', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(78, 'Banco Bocom BBM S.A.', '107', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(79, 'Banco Bonsucesso S.A.', '218', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(80, 'Banco Bradesco S.A.', '237', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(81, 'Banco Bradesco BBI S.A.', '036', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(82, 'Banco Bradesco Financiamentos S.A.', '394', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(83, 'Banco BTG Pactual S.A.', '208', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(84, 'Banco C6 S.A.', '336', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(85, 'Banco Caixa Geral - Brasil S.A.', '473', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(86, 'Banco Cargill S.A.', '040', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(87, 'Banco Citibank S.A.', '745', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(88, 'Banco Cooperativo do Brasil S.A. - BANCOOB', '756', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(89, 'Banco Cooperativo Sicredi S.A.', '748', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(90, 'Banco Credit Suisse (Brasil) S.A.', '505', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(91, 'Banco Crefisa S.A.', '069', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(92, 'Banco da China Brasil S.A.', '083', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(93, 'Banco Daycoval S.A.', '707', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(94, 'Banco Digio S.A.', '335', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(95, 'Banco do Estado do Rio Grande do Sul S.A. - Banrisul', '041', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(96, 'Banco Econômico S.A.', '212', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(97, 'Banco Mercantil do Brasil S.A.', '389', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(98, 'Banco Modal S.A.', '746', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(99, 'Banco Morgan Stanley S.A.', '066', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(100, 'Banco MUFG Brasil S.A.', '456', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(101, 'Banco Original do Agronegócio S.A.', '079', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(102, 'Banco Ourinvest S.A.', '712', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(103, 'Banco Paulista S.A.', '611', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(104, 'Banco Pine S.A.', '643', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(105, 'Banco Rabobank International Brasil S.A.', '747', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(106, 'Banco Rendimento S.A.', '633', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(107, 'Banco Santander (Brasil) S.A.', '033', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(108, 'Banco Safra S.A.', '422', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(109, 'Banco Semear S.A.', '743', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(110, 'Banco Topázio S.A.', '082', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(111, 'Banco Votorantim S.A.', '655', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(112, 'Banco XP S.A.', '348', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(113, 'BRB - Banco de Brasília S.A.', '070', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(114, 'Caixa Econômica Federal', '104', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(115, 'Banco Inter S.A.', '077', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(116, 'PicPay Bank S.A.', '380', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(117, 'Neon Pagamentos S.A.', '260', '2025-12-12 00:38:49', '2025-12-12 00:38:49'),
(118, 'PagBank PagSeguro S.A.', '290', '2025-12-12 00:38:49', '2025-12-12 00:38:49');

-- --------------------------------------------------------

--
-- Estrutura para tabela `cargos`
--

CREATE TABLE `cargos` (
  `id` int(11) NOT NULL COMMENT 'Chave primária do cargo',
  `departamento_id` int(11) NOT NULL COMMENT 'Departamento do cargo',
  `nome` varchar(100) NOT NULL COMMENT 'Nome completo do cargo',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `cargos`
--

INSERT INTO `cargos` (`id`, `departamento_id`, `nome`, `created_at`, `updated_at`) VALUES
(1, 1, 'Gerente Administrativo', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(2, 1, 'Assistente Administrativo', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(3, 1, 'Recepcionista', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(4, 1, 'Vigia/Segurança Patrimonial', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(5, 2, 'Gerente Financeiro', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(6, 2, 'Contador', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(7, 2, 'Analista de Contas a Pagar', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(8, 2, 'Analista de Faturamento', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(9, 2, 'Analista Fiscal', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(10, 3, 'Coordenador de RH/DP', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(11, 3, 'Analista de Departamento Pessoal', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(12, 3, 'Analista de Recrutamento e Seleção', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(13, 3, 'Técnico de Segurança do Trabalho', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(14, 4, 'Gerente Comercial', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(15, 4, 'Supervisor de Vendas', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(16, 4, 'Vendedor Externo', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(17, 4, 'Vendedor Interno', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(18, 4, 'Assistente de Vendas', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(19, 5, 'Gerente de Produção', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(20, 5, 'Supervisor de Operações', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(21, 5, 'Operador de Máquina Extrusora', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(22, 5, 'Operador de Prensa', '2025-12-12 00:21:36', '2025-12-12 00:21:36'),
(23, 5, 'Auxiliar de Produção', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(24, 5, 'Técnico em Cerâmica', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(25, 6, 'Supervisor de Forno e Secagem', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(26, 6, 'Mestre de Forno', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(27, 6, 'Operador de Forno', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(28, 6, 'Operador de Secador', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(29, 7, 'Coordenador de Logística', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(30, 7, 'Encarregado de Pátio', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(31, 7, 'Operador de Empilhadeira', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(32, 7, 'Expedidor', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(33, 8, 'Coordenador de Manutenção', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(34, 8, 'Mecânico Industrial', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(35, 8, 'Eletricista Industrial', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(36, 8, 'Ajudante de Manutenção', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(37, 9, 'Analista de Qualidade', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(38, 9, 'Técnico Químico/Laboratorista', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(39, 9, 'Inspetor de Matéria-Prima', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(40, 9, 'Inspetor de Produtos Acabados', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(41, 10, 'Comprador Técnico', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(42, 10, 'Assistente de Suprimentos', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(43, 10, 'Almoxarife', '2025-12-12 00:21:37', '2025-12-12 00:21:37'),
(44, 11, 'Analista de Sistemas', '2025-12-12 00:41:33', '2025-12-12 00:41:33'),
(45, 11, 'Desenvolvedor de Software', '2025-12-12 00:41:33', '2025-12-12 00:41:33'),
(46, 11, 'Administrador de Banco de Dados', '2025-12-12 00:41:33', '2025-12-12 00:41:33'),
(47, 11, 'Administrador de Redes', '2025-12-12 00:41:33', '2025-12-12 00:41:33'),
(48, 11, 'Suporte Técnico', '2025-12-12 00:41:33', '2025-12-12 00:41:33'),
(49, 11, 'Engenheiro de Dados', '2025-12-12 00:41:33', '2025-12-12 00:41:33'),
(50, 11, 'Cientista de Dados', '2025-12-12 00:41:33', '2025-12-12 00:41:33'),
(51, 11, 'Gestor de TI', '2025-12-12 00:41:33', '2025-12-12 00:41:33');

-- --------------------------------------------------------

--
-- Estrutura para tabela `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL COMMENT 'Chave primária do cliente',
  `tipo_pessoa` enum('PF','PJ') NOT NULL COMMENT 'Pessoa Física ou Pessoa Jurídica',
  `nome_razao_social` varchar(255) NOT NULL COMMENT 'Nome completo (PF) ou Razão Social (PJ)',
  `cpf_cnpj` varchar(18) NOT NULL COMMENT 'CPF (PF) ou CNPJ (PJ)',
  `rg_ie` varchar(20) DEFAULT NULL COMMENT 'RG (PF) ou Inscrição Estadual (PJ)',
  `telefone_principal` varchar(20) DEFAULT NULL,
  `email_contato` varchar(100) DEFAULT NULL,
  `data_cadastro` date NOT NULL COMMENT 'Data em que o cliente foi cadastrado',
  `cep` varchar(10) DEFAULT NULL,
  `endereco` varchar(255) DEFAULT NULL COMMENT 'Rua, Avenida, etc.',
  `numero` varchar(10) DEFAULT NULL,
  `bairro` varchar(100) DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `estado` varchar(2) DEFAULT NULL COMMENT 'Sigla do Estado',
  `limite_credito` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Valor máximo de crédito concedido ao cliente',
  `status_credito` enum('Pendente','Aprovado','Reprovado','Bloqueado') NOT NULL DEFAULT 'Pendente' COMMENT 'Status da análise de crédito do cliente',
  `formas_pagamento_aceitas` set('Boleto','Cartão Crédito','Cartão Débito','PIX','Dinheiro','Cheque') DEFAULT 'Boleto,Cartão Crédito,PIX' COMMENT 'Formas de pagamento permitidas para o cliente',
  `status` enum('Ativo','Inativo','Pendente') NOT NULL DEFAULT 'Ativo',
  `observacoes` text DEFAULT NULL,
  `criado_em` datetime DEFAULT current_timestamp(),
  `atualizado_em` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `clientes`
--

INSERT INTO `clientes` (`id`, `tipo_pessoa`, `nome_razao_social`, `cpf_cnpj`, `rg_ie`, `telefone_principal`, `email_contato`, `data_cadastro`, `cep`, `endereco`, `numero`, `bairro`, `cidade`, `estado`, `limite_credito`, `status_credito`, `formas_pagamento_aceitas`, `status`, `observacoes`, `criado_em`, `atualizado_em`) VALUES
(1, 'PF', 'Carlos Eduardo da Silva', '111.222.333-44', '1234567-SSP', '11988776655', 'carlos.eduardo@email.com', '2025-10-01', '04543-011', NULL, NULL, NULL, 'São Paulo', 'SP', 5000.00, 'Aprovado', 'Cartão Crédito,PIX', 'Ativo', NULL, '2025-12-13 01:11:37', '2025-12-13 01:11:37'),
(2, 'PJ', 'Distribuidora Alpha Ltda.', '23.456.789/0001-10', '123456789-IS', '31999887766', 'contato@alpha.com.br', '2025-09-15', '30130-171', NULL, NULL, NULL, 'Belo Horizonte', 'MG', 15000.00, 'Aprovado', 'Boleto,PIX', 'Ativo', NULL, '2025-12-13 01:11:37', '2025-12-13 01:11:37'),
(3, 'PF', 'Juliana Torres Pimenta', '444.555.666-77', NULL, '41977665544', 'juliana.pimenta@email.com', '2025-11-20', '80060-000', NULL, NULL, NULL, 'Curitiba', 'PR', 0.00, 'Pendente', 'Cartão Débito,PIX', 'Pendente', NULL, '2025-12-13 01:11:37', '2025-12-13 01:11:37'),
(4, 'PJ', 'Comércio Beta do Sul EIRELI', '56.789.012/0001-20', '098765432-IS', '51966554433', 'vendas@beta.com.br', '2025-08-01', '90010-210', NULL, NULL, NULL, 'Porto Alegre', 'RS', 2000.00, 'Bloqueado', 'Dinheiro', 'Inativo', NULL, '2025-12-13 01:11:37', '2025-12-13 01:11:37'),
(5, 'PF', 'haurio', '04778787170', '5809806', '(54) 56498-7979', 'teste@gmail.com', '2025-12-12', '74843710', 'Avenida Rio Verde', '10', 'Setor dos Afonsos', 'Goiânia', 'GO', 200000.00, 'Aprovado', 'Boleto,Cartão Crédito,PIX', 'Ativo', NULL, '2025-12-13 02:42:14', '2025-12-13 02:42:14');

-- --------------------------------------------------------

--
-- Estrutura para tabela `cnae`
--

CREATE TABLE `cnae` (
  `id` int(11) NOT NULL COMMENT 'Chave primária do CNAE',
  `codigo` varchar(15) NOT NULL COMMENT 'Código completo da Classificação Nacional de Atividades Econômicas',
  `descricao` varchar(255) NOT NULL COMMENT 'Descrição detalhada da atividade econômica',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `cnae`
--

INSERT INTO `cnae` (`id`, `codigo`, `descricao`, `created_at`, `updated_at`) VALUES
(1, '0111301', 'Cultivo de arroz', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(2, '0111302', 'Cultivo de milho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(3, '0111303', 'Cultivo de trigo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(4, '0111399', 'Cultivo de outros cereais não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(5, '0112101', 'Cultivo de algodão herbáceo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(6, '0112102', 'Cultivo de juta', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(7, '0112199', 'Cultivo de outras fibras de lavoura temporária não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(8, '0113000', 'Cultivo de cana-de-açúcar', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(9, '0114800', 'Cultivo de fumo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(10, '0115600', 'Cultivo de soja', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(11, '0116401', 'Cultivo de amendoim', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(12, '0116402', 'Cultivo de girassol', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(13, '0116403', 'Cultivo de mamona', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(14, '0116499', 'Cultivo de outras oleaginosas de lavoura temporária não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(15, '0119901', 'Cultivo de abacaxi', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(16, '0119902', 'Cultivo de alho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(17, '0119903', 'Cultivo de batata-inglesa', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(18, '0119904', 'Cultivo de cebola', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(19, '0119905', 'Cultivo de feijão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(20, '0119906', 'Cultivo de mandioca', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(21, '0119907', 'Cultivo de melão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(22, '0119908', 'Cultivo de melancia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(23, '0119909', 'Cultivo de tomate rasteiro', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(24, '0119999', 'Cultivo de outras plantas de lavoura temporária não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(25, '0121101', 'Horticultura, exceto morango', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(26, '0121102', 'Cultivo de morango', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(27, '0131100', 'Cultivo de uva', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(28, '0132501', 'Cultivo de açaí', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(29, '0132502', 'Cultivo de cacau', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(30, '0132503', 'Cultivo de guaraná', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(31, '0132504', 'Cultivo de erva-mate', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(32, '0132599', 'Cultivo de outras plantas de lavoura permanente não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(33, '0133401', 'Cultivo de banana', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(34, '0133402', 'Cultivo de café', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(35, '0133403', 'Cultivo de citrus, exceto laranja', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(36, '0133404', 'Cultivo de laranja', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(37, '0133405', 'Cultivo de maçã', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(38, '0133499', 'Cultivo de outras frutas de lavoura permanente não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(39, '0134200', 'Cultivo de maracujá', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(40, '0135100', 'Cultivo de coco', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(41, '0139301', 'Cultivo de dendê', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(42, '0139302', 'Cultivo de pimenta-do-reino', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(43, '0139399', 'Cultivo de outras plantas oleaginosas de lavoura permanente não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(44, '0141501', 'Produção de sementes certificadas, exceto de forrageiras para pasto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(45, '0141502', 'Produção de sementes certificadas de forrageiras para formação de pasto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(46, '0142300', 'Produção de mudas e outras formas de propagação vegetal, certificadas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(47, '0151201', 'Criação de bovinos para corte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(48, '0151202', 'Criação de bovinos para leite', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(49, '0151203', 'Criação de bovinos, exceto para corte e leite', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(50, '0152100', 'Criação de bufalinos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(51, '0153901', 'Criação de caprinos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(52, '0153902', 'Criação de ovinos, inclusive para produção de lã', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(53, '0154700', 'Criação de suínos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(54, '0155501', 'Criação de frangos para corte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(55, '0155502', 'Produção de pintos de um dia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(56, '0155503', 'Criação de outros galináceos, exceto para corte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(57, '0159801', 'Criação de animais de estimação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(58, '0159802', 'Criação de abelhas e produção de mel e derivados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(59, '0159899', 'Criação de outros animais não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(60, '0161001', 'Atividades de apoio à agricultura não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(61, '0161002', 'Atividades de apoio à pecuária não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(62, '0161003', 'Atividades de pós-colheita', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(63, '0162801', 'Inseminação artificial em animais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(64, '0162899', 'Outras atividades de serviços relacionados à pecuária não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(65, '0170900', 'Caça e serviços relacionados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(66, '0210101', 'Extração de madeira em florestas plantadas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(67, '0210102', 'Extração de madeira em florestas nativas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(68, '0210103', 'Produção de carvão vegetal - florestas plantadas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(69, '0210104', 'Produção de carvão vegetal - florestas nativas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(70, '0210105', 'Produção de casca de acácia-negra - florestas plantadas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(71, '0210106', 'Extração de produtos não-madeireiros de florestas plantadas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(72, '0210199', 'Outras atividades de serviços relacionados à silvicultura', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(73, '0220901', 'Produção de carvão vegetal em florestas nativas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(74, '0220902', 'Coleta de castanha-do-pará em florestas nativas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(75, '0220903', 'Coleta de látex em florestas nativas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(76, '0220904', 'Coleta de palmito em florestas nativas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(77, '0220905', 'Conservação de florestas nativas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(78, '0220999', 'Outras atividades de apoio à extração de produtos florestais não-madeireiros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(79, '0311601', 'Pesca de peixes em água salgada', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(80, '0311602', 'Pesca de crustáceos e moluscos em água salgada', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(81, '0311603', 'Pesca de peixes em água doce', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(82, '0311604', 'Pesca de crustáceos e moluscos em água doce', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(83, '0312401', 'Criação de peixes em água salgada e salobra', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(84, '0312402', 'Criação de camarões em água salgada e salobra', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(85, '0312403', 'Criação de ostras e mexilhões em água salgada e salobra', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(86, '0312404', 'Criação de peixes em água doce', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(87, '0312405', 'Criação de camarões em água doce', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(88, '0321301', 'Criação de peixes ornamentais em água salgada e salobra', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(89, '0321302', 'Criação de peixes ornamentais em água doce', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(90, '0322101', 'Criação de frangos para corte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(91, '0322102', 'Produção de pintos de um dia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(92, '0322103', 'Criação de aves, exceto para corte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(93, '0322901', 'Criação de suínos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(94, '0322902', 'Criação de bovinos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(95, '0322999', 'Outras atividades de criação de animais não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(96, '0500301', 'Extração de carvão mineral', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(97, '0500302', 'Beneficiamento de carvão mineral', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(98, '0600001', 'Extração de petróleo e gás natural', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(99, '0600002', 'Extração e beneficiamento de xisto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(100, '0600003', 'Extração e beneficiamento de areias betuminosas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(101, '0710301', 'Extração de minério de ferro', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(102, '0710302', 'Pelotização, sinterização e outros beneficiamentos de minério de ferro', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(103, '0712101', 'Extração de minério de alumínio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(104, '0712102', 'Beneficiamento de minério de alumínio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(105, '0721901', 'Extração de minério de manganês', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(106, '0721902', 'Beneficiamento de minério de manganês', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(107, '0722701', 'Extração de minério de estanho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(108, '0722702', 'Beneficiamento de minério de estanho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(109, '0723501', 'Extração de minério de tungstênio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(110, '0723502', 'Beneficiamento de minério de tungstênio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(111, '0729401', 'Extração de minério de metais preciosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(112, '0729402', 'Beneficiamento de minério de metais preciosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(113, '0729403', 'Extração de minério de nióbio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(114, '0729404', 'Extração de minério de titânio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(115, '0729499', 'Extração de outros minerais metálicos não ferrosos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(116, '0810001', 'Extração de ardósia e beneficiamento associado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(117, '0810002', 'Extração de granito e beneficiamento associado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(118, '0810003', 'Extração de mármore e beneficiamento associado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(119, '0810004', 'Extração de calcário e beneficiamento associado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(120, '0810099', 'Extração de outros minerais não-metálicos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(121, '0891500', 'Extração de amianto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(122, '0899101', 'Extração de gemas (pedras preciosas e semipreciosas)', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(123, '0899199', 'Extração de outros minerais não-metálicos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(124, '0910600', 'Atividades de apoio à extração de petróleo e gás natural', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(125, '0990401', 'Atividades de apoio à extração de minério de ferro', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(126, '0990402', 'Atividades de apoio à extração de minerais metálicos não-ferrosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(127, '0990499', 'Atividades de apoio à extração de minerais não-metálicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(128, '1011201', 'Frigorífico - abate de bovinos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(129, '1011202', 'Frigorífico - abate de eqüinos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(130, '1011203', 'Frigorífico - abate de ovinos e caprinos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(131, '1011204', 'Frigorífico - abate de bufalinos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(132, '1011205', 'Matadouro - abate de reses sob contrato - exclusivo para terceiros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(133, '1012101', 'Abate de aves', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(134, '1012102', 'Abate de pequenos animais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(135, '1013901', 'Fabricação de produtos de carne', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(136, '1013902', 'Fabricação de conservas de carne', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(137, '1013903', 'Preparação de produtos de carne para alimentação animal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(138, '1020101', 'Preservação de peixes, crustáceos e moluscos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(139, '1020102', 'Fabricação de conservas de peixes, crustáceos e moluscos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(140, '1031700', 'Fabricação de conservas de frutas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(141, '1032501', 'Fabricação de conservas de palmito', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(142, '1032599', 'Fabricação de conservas de legumes e outros vegetais, exceto palmito', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(143, '1033301', 'Fabricação de sucos concentrados de frutas, hortaliças e legumes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(144, '1033302', 'Fabricação de sucos de frutas, hortaliças e legumes, exceto concentrados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(145, '1041400', 'Fabricação de óleos vegetais em bruto, exceto óleo de milho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(146, '1042200', 'Fabricação de óleos vegetais refinados, exceto óleo de milho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(147, '1043100', 'Fabricação de margarina e outras gorduras vegetais e de óleos não-comestíveis de animais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(148, '1051100', 'Preparação do leite', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(149, '1052000', 'Fabricação de laticínios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(150, '1053800', 'Fabricação de sorvetes e outros gelados comestíveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(151, '1061901', 'Beneficiamento de arroz', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(152, '1061902', 'Fabricação de produtos do arroz', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(153, '1062700', 'Moagem de trigo e fabricação de derivados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(154, '1063500', 'Fabricação de farinha de mandioca e derivados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(155, '1064300', 'Fabricação de farinha de milho e derivados, exceto óleos de milho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(156, '1065101', 'Fabricação de amidos e féculas de vegetais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(157, '1065102', 'Fabricação de óleo de milho em bruto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(158, '1065103', 'Fabricação de óleo de milho refinado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(159, '1066000', 'Fabricação de alimentos para animais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(160, '1069400', 'Torrefação e moagem de café', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(161, '1071600', 'Fabricação de açúcar em bruto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(162, '1072401', 'Fabricação de açúcar refinado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(163, '1072402', 'Fabricação de açúcar de cana refinado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(164, '1081301', 'Beneficiamento de cacau', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(165, '1081302', 'Fabricação de chocolate e produtos de cacau', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(166, '1082100', 'Fabricação de produtos à base de cacau e chocolates', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(167, '1091101', 'Fabricação de produtos de panificação industrial', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(168, '1091102', 'Fabricação de biscoitos e bolachas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(169, '1093701', 'Fabricação de especiarias, molhos, temperos e condimentos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(170, '1093702', 'Fabricação de alimentos e pratos preparados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(171, '1094500', 'Fabricação de massas alimentícias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(172, '1095300', 'Fabricação de especiarias, molhos, temperos e condimentos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(173, '1099601', 'Fabricação de vinagres', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(174, '1099602', 'Fabricação de pós alimentícios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(175, '1099603', 'Fabricação de fermentos e leveduras', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(176, '1099604', 'Fabricação de gelo comum', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(177, '1099605', 'Fabricação de produtos para infusão (chá, mate, etc.)', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(178, '1099699', 'Fabricação de outros produtos alimentícios não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(179, '1111901', 'Fabricação de aguardente de cana-de-açúcar', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(180, '1111902', 'Fabricação de outras aguardentes e bebidas destiladas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(181, '1112700', 'Fabricação de vinho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(182, '1113501', 'Fabricação de malte, cervejas e chopes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(183, '1113502', 'Fabricação de cervejas e chopes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(184, '1121600', 'Fabricação de águas envasadas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(185, '1122401', 'Fabricação de refrigerantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(186, '1122402', 'Fabricação de chá mate e outros chás prontos para consumo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(187, '1122499', 'Fabricação de outras bebidas não alcoólicas não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(188, '1210700', 'Processamento industrial do fumo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(189, '1220400', 'Fabricação de produtos do fumo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(190, '1311100', 'Preparação e fiação de algodão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(191, '1312000', 'Preparação e fiação de fibras de lã, inclusive cardagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(192, '1313800', 'Fiação de fibras artificiais e sintéticas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(193, '1314600', 'Fabricação de linhas para costurar e bordar', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(194, '1321900', 'Tecelagem de fios de algodão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(195, '1322700', 'Tecelagem de fios de fibras têxteis artificiais e sintéticas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(196, '1323500', 'Tecelagem de fios de lã', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(197, '1330800', 'Fabricação de tecidos de malha', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(198, '1340501', 'Estamparia e texturização em fios, tecidos, artefatos têxteis e peças de vestuário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(199, '1340502', 'Alvejamento, tingimento e torção em fios, tecidos, artefatos têxteis e peças de vestuário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(200, '1340599', 'Outros serviços de acabamento em fios, tecidos, artefatos têxteis e peças de vestuário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(201, '1351100', 'Fabricação de artefatos têxteis para uso doméstico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(202, '1352900', 'Fabricação de artefatos de tapeçaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(203, '1353700', 'Fabricação de artefatos de cordoaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(204, '1354500', 'Fabricação de tecidos especiais, inclusive artefatos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(205, '1359600', 'Fabricação de outros produtos têxteis não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(206, '1411801', 'Confecção de roupas íntimas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(207, '1411802', 'Facção de roupas íntimas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(208, '1412601', 'Confecção de peças de vestuário, exceto roupas íntimas e as de malha', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(209, '1412602', 'Confecção, sob medida, de peças de vestuário, exceto roupas íntimas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(210, '1412603', 'Facção de peças de vestuário, exceto roupas íntimas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(211, '1413401', 'Confecção de roupas profissionais, exceto roupas de proteção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(212, '1413402', 'Confecção, sob medida, de roupas profissionais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(213, '1413403', 'Facção de roupas profissionais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(214, '1414200', 'Fabricação de acessórios do vestuário, exceto para segurança e proteção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(215, '1421500', 'Fabricação de meias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(216, '1422300', 'Fabricação de artigos do vestuário, produzidos em malharias e tricotagens, exceto meias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(217, '1510601', 'Curtimento e outras preparações de couro', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(218, '1510602', 'Fabricação de artigos para viagem, bolsas e semelhantes de qualquer material', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(219, '1521100', 'Fabricação de calçados de couro', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(220, '1529700', 'Fabricação de tênis de qualquer material', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(221, '1531901', 'Fabricação de calçados de material sintético', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(222, '1531902', 'Fabricação de calçados de materiais diversos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(223, '1532700', 'Fabricação de componentes para calçados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(224, '1533500', 'Fabricação de calçados sob medida', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(225, '1539400', 'Fabricação de outros calçados e acessórios para calçados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(226, '1540800', 'Fabricação de partes para calçados, de qualquer material', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(227, '1610201', 'Serrarias com desdobramento de madeira', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(228, '1610202', 'Serrarias sem desdobramento de madeira', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(229, '1610203', 'Serrarias com desdobramento de madeira em bruto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(230, '1621800', 'Fabricação de casas de madeira pré-fabricadas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(231, '1622601', 'Fabricação de casas pré-fabricadas de madeira', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(232, '1622602', 'Fabricação de esquadrias de madeira e de peças de madeira para instalações industriais e comerciais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(233, '1623401', 'Fabricação de artefatos de tanoaria e de embalagens de madeira', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(234, '1623402', 'Fabricação de artefatos diversos de madeira, exceto móveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(235, '1629301', 'Fabricação de artefatos diversos de cortiça, bambu, palha, vime e outros materiais trançados, exceto móveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(236, '1629302', 'Fabricação de artefatos diversos de cortiça, bambu, palha, vime e outros materiais trançados, exceto móveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(237, '1701400', 'Fabricação de celulose e outras pastas para a fabricação de papel', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(238, '1702100', 'Fabricação de chapas e de embalagens de papelão ondulado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(239, '1709301', 'Fabricação de papel', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(240, '1709302', 'Fabricação de cartolina e papel-cartão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(241, '1710900', 'Fabricação de papel para usos sanitários e domésticos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(242, '1721400', 'Fabricação de papel, cartolina e papel-cartão para embalagens', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(243, '1729501', 'Fabricação de formulários contínuos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(244, '1729502', 'Fabricação de fraldas descartáveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(245, '1729503', 'Fabricação de absorventes higiênicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(246, '1729599', 'Fabricação de outros artefatos de papel e papelão para uso doméstico e higiênico-sanitário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(247, '1731100', 'Fabricação de embalagens de papel', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(248, '1732000', 'Fabricação de embalagens de cartolina e papel-cartão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(249, '1733800', 'Fabricação de chapas e de embalagens de papelão ondulado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(250, '1741901', 'Fabricação de formulários contínuos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(251, '1741999', 'Fabricação de outros produtos de papel, cartolina, papel-cartão e papelão ondulado não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(252, '1742701', 'Fabricação de fraldas descartáveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(253, '1742702', 'Fabricação de absorventes higiênicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(254, '1742799', 'Fabricação de outros produtos de papel e papelão para uso doméstico e higiênico-sanitário não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(255, '1749400', 'Fabricação de produtos de papel para usos industriais, comerciais e de escritório', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(256, '1811301', 'Impressão de jornais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(257, '1811302', 'Impressão de livros, revistas e outras publicações periódicas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(258, '1812100', 'Impressão de material para uso publicitário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(259, '1813001', 'Impressão de material para outros usos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(260, '1813099', 'Impressão de outros materiais gráficos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(261, '1813801', 'Serviços de pré-impressão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(262, '1813802', 'Serviços de encadernação e plastificação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(263, '1821100', 'Serviços de gravação de carimbos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(264, '1822901', 'Serviços de encadernação e plastificação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(265, '1822999', 'Reprodução de materiais gravados em qualquer suporte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(266, '1830001', 'Reprodução de som em qualquer suporte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(267, '1830002', 'Reprodução de vídeo em qualquer suporte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(268, '1830003', 'Reprodução de software em qualquer suporte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(269, '1910100', 'Coquerias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(270, '1921700', 'Fabricação de produtos do refino de petróleo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(271, '1922501', 'Formulação de combustíveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(272, '1922502', 'Rerrefino de óleos lubrificantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(273, '1922599', 'Fabricação de outros produtos derivados do petróleo, exceto produtos petroquímicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(274, '1931400', 'Fabricação de álcool', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(275, '1932200', 'Fabricação de biocombustíveis, exceto álcool', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(276, '2011800', 'Fabricação de cloro e álcalis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(277, '2012600', 'Fabricação de intermediários para fertilizantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(278, '2013401', 'Fabricação de adubos orgânicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(279, '2013402', 'Fabricação de fertilizantes minerais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(280, '2014200', 'Fabricação de gases industriais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(281, '2019301', 'Elaboração de combustíveis nucleares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(282, '2019399', 'Fabricação de outros produtos químicos inorgânicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(283, '2021500', 'Fabricação de produtos petroquímicos básicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(284, '2022300', 'Fabricação de intermediários para plastificação, resinas e adesivos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(285, '2029100', 'Fabricação de produtos químicos orgânicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(286, '2031200', 'Fabricação de resinas termoplásticas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(287, '2032100', 'Fabricação de resinas termofixas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(288, '2033900', 'Fabricação de elastômeros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(289, '2040101', 'Fabricação de sabões e detergentes sintéticos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(290, '2040102', 'Fabricação de produtos de limpeza e polimento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(291, '2040103', 'Fabricação de cosméticos, produtos de perfumaria e de higiene pessoal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(292, '2040104', 'Fabricação de desinfetantes domissanitários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(293, '2051700', 'Fabricação de defensivos agrícolas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(294, '2052500', 'Fabricação de desinfetantes para uso agropecuário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(295, '2063100', 'Fabricação de tintas, vernizes, esmaltes e lacas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(296, '2063900', 'Fabricação de impermeabilizantes, solventes e produtos afins', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(297, '2071100', 'Fabricação de tintas de impressão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(298, '2072000', 'Fabricação de pigmentos e preparações à base de pigmentos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(299, '2073800', 'Fabricação de preparados para limpeza e polimento de uso doméstico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(300, '2091600', 'Fabricação de adesivos e selantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(301, '2092401', 'Fabricação de pólvora, explosivos e detonadores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(302, '2092402', 'Fabricação de artigos pirotécnicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(303, '2092403', 'Fabricação de fósforos de segurança', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(304, '2093200', 'Fabricação de aditivos de uso industrial', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(305, '2094100', 'Fabricação de catalisadores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(306, '2099101', 'Fabricação de chapas, filmes, papéis e outros materiais e produtos químicos para fotografia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(307, '2099199', 'Fabricação de outros produtos químicos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(308, '2110600', 'Fabricação de medicamentos alopáticos para uso humano', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(309, '2111000', 'Fabricação de medicamentos homeopáticos para uso humano', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(310, '2111700', 'Fabricação de medicamentos fitoterápicos para uso humano', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(311, '2112500', 'Fabricação de medicamentos para uso veterinário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(312, '2121101', 'Fabricação de medicamentos alopáticos para uso veterinário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(313, '2121102', 'Fabricação de medicamentos homeopáticos para uso veterinário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(314, '2121103', 'Fabricação de medicamentos fitoterápicos para uso veterinário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(315, '2122000', 'Fabricação de produtos farmoquímicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(316, '2123800', 'Fabricação de preparações farmacêuticas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(317, '2211100', 'Fabricação de pneumáticos e de câmaras-de-ar', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(318, '2212900', 'Reforma de pneumáticos usados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(319, '2219600', 'Fabricação de câmaras-de-ar e pneus para bicicletas e motocicletas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(320, '2221800', 'Fabricação de artefatos de borracha não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(321, '2222600', 'Fabricação de embalagens de material plástico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(322, '2223400', 'Fabricação de tubos e acessórios de material plástico para uso na construção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(323, '2229301', 'Fabricação de artefatos de material plástico para uso pessoal e doméstico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(324, '2229302', 'Fabricação de artefatos de material plástico para uso na construção, exceto tubos e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(325, '2229303', 'Fabricação de artefatos de material plástico para usos industriais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(326, '2229399', 'Fabricação de artefatos de material plástico para usos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(327, '2311700', 'Fabricação de vidro plano e de segurança', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(328, '2312500', 'Fabricação de embalagens de vidro', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(329, '2319200', 'Fabricação de artigos de vidro', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(330, '2320600', 'Fabricação de cimento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(331, '2330301', 'Fabricação de estruturas pré-moldadas de concreto armado para construção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(332, '2330302', 'Fabricação de artefatos de cimento para uso na construção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(333, '2330303', 'Fabricação de artefatos de fibrocimento para uso na construção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(334, '2330304', 'Fabricação de casas pré-moldadas de concreto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(335, '2330305', 'Preparação de massa de concreto e argamassa para construção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(336, '2330399', 'Fabricação de outros artefatos e produtos de concreto, cimento, fibrocimento, gesso e materiais semelhantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(337, '2341900', 'Fabricação de produtos cerâmicos refratários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(338, '2342701', 'Fabricação de azulejos e pisos cerâmicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(339, '2342702', 'Fabricação de artefatos de cerâmica e porcelana para uso na construção, exceto azulejos e pisos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(340, '2349401', 'Fabricação de material sanitário de cerâmica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(341, '2349499', 'Fabricação de produtos cerâmicos não-refratários não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(342, '2391501', 'Britamento de pedras, exceto associado à extração', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(343, '2391502', 'Aparelhamento de pedras para construção, exceto associado à extração', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(344, '2391503', 'Aparelhamento de placas e execução de trabalhos em mármore, granito e outras pedras para construção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(345, '2392300', 'Fabricação de cal e gesso', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(346, '2399101', 'Decoração, lapidação, gravação, vitrificação e outros trabalhos em cerâmica, louça, vidro e cristal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(347, '2399102', 'Fabricação de abrasivos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(348, '2399199', 'Fabricação de outros produtos de minerais não-metálicos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(349, '2411300', 'Produção de ferro-gusa', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(350, '2412100', 'Produção de ferroligas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(351, '2421100', 'Produção de semi-acabados de aço', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(352, '2422901', 'Produção de laminados de aço, exceto para construção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(353, '2422902', 'Produção de laminados de aço para construção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(354, '2423701', 'Produção de tubos de aço sem costura', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(355, '2423702', 'Produção de tubos de aço com costura', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(356, '2424501', 'Produção de arames de aço', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(357, '2424502', 'Produção de relaminados, trefilados e perfilados de aço, exceto arames', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(358, '2429600', 'Produção de tubos de aço sem costura para uso industrial', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(359, '2431800', 'Produção de tubos de aço com costura, exceto para condução de fluidos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(360, '2432600', 'Produção de tubos de aço sem costura para condução de fluidos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(361, '2441501', 'Produção de alumínio e suas ligas em formas primárias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(362, '2441502', 'Produção de laminados de alumínio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(363, '2442300', 'Metalurgia do cobre', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(364, '2443100', 'Produção de metais preciosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(365, '2449101', 'Produção de zinco em formas primárias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(366, '2449102', 'Produção de laminados de zinco', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(367, '2449199', 'Metalurgia de outros metais não-ferrosos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(368, '2451200', 'Fundição de ferro e aço', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(369, '2452100', 'Fundição de metais não-ferrosos e suas ligas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(370, '2511000', 'Fabricação de estruturas metálicas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(371, '2512800', 'Fabricação de esquadrias de metal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(372, '2513600', 'Fabricação de obras de caldeiraria pesada', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(373, '2521700', 'Fabricação de tanques, reservatórios metálicos e caldeiras para aquecimento central', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(374, '2522500', 'Fabricação de caldeiras geradoras de vapor, exceto para aquecimento central e para veículos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(375, '2531401', 'Produção de forjados de aço', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(376, '2531402', 'Produção de forjados de metais não-ferrosos e suas ligas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(377, '2532201', 'Produção de artefatos estampados de metal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(378, '2532202', 'Metalurgia do pó', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(379, '2539000', 'Serviços de usinagem, solda, tratamento e revestimento em metais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(380, '2541100', 'Fabricação de artigos de cutelaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(381, '2542000', 'Fabricação de artigos de metal para uso doméstico e pessoal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(382, '2543800', 'Fabricação de ferramentas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(383, '2550101', 'Fabricação de equipamento bélico pesado, exceto veículos militares de combate', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(384, '2550102', 'Fabricação de armas de fogo leves', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(385, '2550103', 'Fabricação de munições e explosivos para uso bélico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(386, '2591800', 'Fabricação de embalagens metálicas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(387, '2592601', 'Fabricação de produtos de trefilaria com produção de arames', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(388, '2592602', 'Fabricação de produtos de trefilaria com produção de pregos, tachas e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(389, '2593400', 'Fabricação de artigos de metal para uso em escritório', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(390, '2599301', 'Serviços de confecção de armações metálicas para a construção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(391, '2599302', 'Serviços de corte e dobra de metais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(392, '2599399', 'Fabricação de outros produtos de metal não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(393, '2610800', 'Fabricação de componentes eletrônicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(394, '2621300', 'Fabricação de aparelhos de recepção, reprodução, gravação e amplificação de áudio e vídeo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(395, '2622100', 'Fabricação de periféricos para equipamentos de informática', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(396, '2631100', 'Fabricação de equipamentos de transmissão de comunicação, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(397, '2632900', 'Fabricação de aparelhos telefônicos e de outros equipamentos de transmissão de comunicação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(398, '2640000', 'Fabricação de aparelhos de reprodução e gravação de áudio e vídeo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(399, '2651500', 'Fabricação de aparelhos e equipamentos de medida, teste e controle', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(400, '2652300', 'Fabricação de cronômetros e relógios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(401, '2660400', 'Fabricação de aparelhos eletromédicos e eletroterapêuticos e equipamentos de irradiação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(402, '2670101', 'Fabricação de equipamentos de óptica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(403, '2670102', 'Fabricação de aparelhos fotográficos e cinematográficos, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(404, '2680900', 'Fabricação de mídias virgens, magnéticas e ópticas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(405, '2710401', 'Fabricação de geradores de corrente contínua e alternada, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(406, '2710402', 'Fabricação de transformadores, indutores, conversores, sincronizadores e semelhantes, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(407, '2710403', 'Fabricação de motores elétricos, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(408, '2721000', 'Fabricação de pilhas, baterias e acumuladores elétricos, exceto para veículos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(409, '2722801', 'Fabricação de baterias e acumuladores para veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(410, '2722802', 'Recondicionamento de baterias e acumuladores para veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(411, '2731700', 'Fabricação de aparelhos e equipamentos para distribuição e controle de energia elétrica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(412, '2732500', 'Fabricação de material elétrico para instalações em circuito de consumo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(413, '2733300', 'Fabricação de fios, cabos e condutores elétricos isolados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(414, '2740601', 'Fabricação de lâmpadas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(415, '2740602', 'Fabricação de luminárias e outros equipamentos de iluminação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(416, '2751100', 'Fabricação de fogões, refrigeradores e máquinas de lavar e secar para uso doméstico, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(417, '2759701', 'Fabricação de aparelhos elétricos de uso pessoal, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(418, '2759799', 'Fabricação de outros aparelhos eletrodomésticos não especificados anteriormente, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(419, '2790201', 'Fabricação de eletrodos, contatos e outros artigos de eletrotécnica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(420, '2790202', 'Fabricação de equipamentos para sinalização e alarme', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(421, '2790299', 'Fabricação de outros equipamentos e aparelhos elétricos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(422, '2811900', 'Fabricação de motores e turbinas, peças e acessórios, exceto para aviões e veículos rodoviários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(423, '2812700', 'Fabricação de equipamentos hidráulicos e pneumáticos, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(424, '2813500', 'Fabricação de válvulas, registros e dispositivos semelhantes, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(425, '2814301', 'Fabricação de compressores para uso industrial, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(426, '2814302', 'Fabricação de compressores para uso não industrial, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(427, '2815101', 'Fabricação de equipamentos de transmissão para fins industriais, exceto veículos e aeronaves', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(428, '2815102', 'Fabricação de rolamentos para fins industriais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(429, '2821501', 'Fabricação de máquinas de escrever, calcular e outros equipamentos não-eletrônicos para escritório, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(430, '2822401', 'Fabricação de máquinas, equipamentos e aparelhos para transporte e elevação de pessoas, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(431, '2822402', 'Fabricação de máquinas, equipamentos e aparelhos para transporte e elevação de cargas, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(432, '2823200', 'Fabricação de tratores agrícolas, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(433, '2824101', 'Fabricação de máquinas e equipamentos para a agricultura e pecuária, peças e acessórios, exceto para irrigação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(434, '2824102', 'Fabricação de equipamentos para irrigação agrícola, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(435, '2825900', 'Fabricação de máquinas e equipamentos para saneamento básico e ambiental, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(436, '2829101', 'Fabricação de máquinas e equipamentos para uso industrial específico não especificados anteriormente, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(437, '2829199', 'Fabricação de outras máquinas e equipamentos de uso geral não especificados anteriormente, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(438, '2831300', 'Fabricação de tratores, exceto agrícolas', '2025-12-12 00:05:34', '2025-12-12 00:05:34');
INSERT INTO `cnae` (`id`, `codigo`, `descricao`, `created_at`, `updated_at`) VALUES
(439, '2832100', 'Fabricação de máquinas e equipamentos para terraplenagem, pavimentação e construção, peças e acessórios, exceto tratores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(440, '2833000', 'Fabricação de máquinas e equipamentos para a prospecção e extração de petróleo, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(441, '2840200', 'Fabricação de máquinas-ferramenta, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(442, '2851800', 'Fabricação de máquinas e equipamentos para a indústria de celulose, papel e papelão, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(443, '2852600', 'Fabricação de máquinas e equipamentos para a indústria têxtil, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(444, '2853400', 'Fabricação de máquinas e equipamentos para as indústrias do vestuário, do couro e de calçados, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(445, '2854200', 'Fabricação de máquinas e equipamentos para a indústria de alimentos, bebidas e fumo, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(446, '2861500', 'Fabricação de máquinas e equipamentos para a indústria de transformação de material plástico, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(447, '2862300', 'Fabricação de máquinas e equipamentos para a indústria química, petroquímica e de combustíveis, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(448, '2863100', 'Fabricação de máquinas e equipamentos para a metalurgia, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(449, '2864000', 'Fabricação de máquinas e equipamentos para as indústrias de minerais não-metálicos, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(450, '2865800', 'Fabricação de máquinas e equipamentos para as indústrias de madeira, exceto para a construção, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(451, '2866600', 'Fabricação de máquinas e equipamentos para a indústria de bebidas, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(452, '2869100', 'Fabricação de máquinas e equipamentos para uso industrial específico não especificados anteriormente, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(453, '2910701', 'Fabricação de automóveis, camionetas e utilitários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(454, '2910702', 'Fabricação de chassis com motor para automóveis, camionetas e utilitários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(455, '2910703', 'Fabricação de motores para automóveis, camionetas e utilitários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(456, '2920401', 'Fabricação de caminhões e ônibus', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(457, '2920402', 'Fabricação de motores para caminhões e ônibus', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(458, '2930101', 'Fabricação de cabines, carrocerias e reboques para caminhões', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(459, '2930102', 'Fabricação de carrocerias para ônibus', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(460, '2930103', 'Fabricação de cabines, carrocerias e reboques para outros veículos automotores, exceto caminhões e ônibus', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(461, '2941700', 'Fabricação de peças e acessórios para o sistema de freios de veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(462, '2942500', 'Fabricação de peças e acessórios para o sistema de suspensão de veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(463, '2943300', 'Fabricação de peças e acessórios para o sistema de direção e transmissão de veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(464, '2944100', 'Fabricação de peças e accessories para o sistema motor de veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(465, '2945000', 'Fabricação de material elétrico e eletrônico para veículos automotores, exceto baterias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(466, '2949201', 'Fabricação de bancos e estofados para veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(467, '2949299', 'Fabricação de outras peças e acessórios para veículos automotores não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(468, '2950600', 'Recondicionamento e recuperação de motores para veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(469, '3011301', 'Construção de embarcações de grande porte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(470, '3011302', 'Construção de embarcações para uso comercial e especial, exceto de grande porte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(471, '3012100', 'Construção de embarcações para esporte e lazer', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(472, '3031800', 'Fabricação de locomotivas, vagões e outros materiais rodantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(473, '3032600', 'Fabricação de peças e acessórios para veículos ferroviários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(474, '3041500', 'Fabricação de aeronaves', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(475, '3042300', 'Fabricação de turbinas, motores e outros componentes e peças para aeronaves', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(476, '3050400', 'Fabricação de veículos militares de combate', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(477, '3091101', 'Fabricação de motocicletas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(478, '3091102', 'Fabricação de peças e acessórios para motocicletas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(479, '3092000', 'Fabricação de bicicletas e triciclos não-motorizados, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(480, '3099700', 'Fabricação de equipamentos de transporte não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(481, '3101200', 'Fabricação de móveis com predominância de madeira', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(482, '3102100', 'Fabricação de móveis com predominância de metal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(483, '3103900', 'Fabricação de móveis de outros materiais, exceto madeira e metal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(484, '3104700', 'Fabricação de colchões', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(485, '3211601', 'Lapidação de gemas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(486, '3211602', 'Fabricação de artefatos de joalheria e ourivesaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(487, '3211603', 'Cunhagem de moedas e medalhas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(488, '3212401', 'Fabricação de bijuterias e artefatos semelhantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(489, '3212402', 'Fabricação de bijuterias e artefatos semelhantes de materiais preciosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(490, '3220500', 'Fabricação de instrumentos musicais, peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(491, '3230200', 'Fabricação de artefatos para pesca e esporte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(492, '3240001', 'Fabricação de jogos eletrônicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(493, '3240002', 'Fabricação de mesas de bilhar, sinuca e acessórios não associada à locação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(494, '3240099', 'Fabricação de outros brinquedos e jogos recreativos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(495, '3250701', 'Fabricação de instrumentos não-eletrônicos e utensílios para uso médico-cirúrgico, dentário e de laboratório', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(496, '3250702', 'Fabricação de mobiliário para uso médico-cirúrgico, dentário e de laboratório', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(497, '3250703', 'Fabricação de aparelhos e utensílios para correção de defeitos físicos e aparelhos ortopédicos em geral sob encomenda', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(498, '3250704', 'Fabricação de aparelhos e utensílios para correção de defeitos físicos e aparelhos ortopédicos em geral, exceto sob encomenda', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(499, '3250705', 'Fabricação de materiais para medicina e odontologia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(500, '3250706', 'Serviços de prótese dentária', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(501, '3250707', 'Fabricação de artigos ópticos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(502, '3250708', 'Fabricação de aparelhos auditivos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(503, '3250709', 'Fabricação de outros instrumentos e utensílios médicos e odontológicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(504, '3291400', 'Fabricação de escovas, pincéis e vassouras', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(505, '3292201', 'Fabricação de roupas de proteção e segurança e artigos antichamas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(506, '3292202', 'Fabricação de equipamentos e acessórios para segurança pessoal e profissional', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(507, '3299001', 'Fabricação de guarda-chuvas e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(508, '3299002', 'Fabricação de canetas, lápis e outros artigos para escritório', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(509, '3299003', 'Fabricação de letras, letreiros e placas de qualquer material, exceto luminosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(510, '3299004', 'Fabricação de painéis e letreiros luminosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(511, '3299005', 'Fabricação de aviamentos para costura', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(512, '3299006', 'Fabricação de velas, inclusive decorativas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(513, '3299099', 'Fabricação de outros produtos diversos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(514, '3311200', 'Manutenção e reparação de equipamentos eletrônicos de áudio e vídeo para uso doméstico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(515, '3312101', 'Manutenção e reparação de máquinas de escrever, calcular e de outros equipamentos não-eletrônicos para escritório', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(516, '3312102', 'Manutenção e reparação de máquinas e equipamentos para uso geral', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(517, '3312103', 'Manutenção e reparação de máquinas e equipamentos para agricultura e pecuária', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(518, '3312104', 'Manutenção e reparação de máquinas e equipamentos para a indústria têxtil, do vestuário, do couro e calçados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(519, '3313901', 'Manutenção e reparação de geradores, transformadores e motores elétricos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(520, '3313902', 'Manutenção e reparação de baterias e acumuladores elétricos, exceto para veículos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(521, '3313999', 'Manutenção e reparação de outras máquinas e equipamentos elétricos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(522, '3314701', 'Manutenção e reparação de máquinas motrizes não-elétricas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(523, '3314702', 'Manutenção e reparação de equipamentos hidráulicos e pneumáticos, exceto válvulas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(524, '3314703', 'Manutenção e reparação de válvulas industriais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(525, '3314704', 'Manutenção e reparação de compressores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(526, '3314705', 'Manutenção e reparação de equipamentos de transmissão para fins industriais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(527, '3314706', 'Manutenção e reparação de máquinas, aparelhos e materiais para instalações térmicas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(528, '3314799', 'Manutenção e reparação de outras máquinas e equipamentos para usos industriais não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(529, '3315500', 'Manutenção e reparação de veículos ferroviários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(530, '3316301', 'Manutenção e reparação de aeronaves, exceto manutenção na pista', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(531, '3316302', 'Manutenção de aeronaves na pista', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(532, '3317100', 'Manutenção e reparação de embarcações e estruturas flutuantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(533, '3319800', 'Manutenção e reparação de embarcações para esporte e lazer', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(534, '3321000', 'Instalação de máquinas e equipamentos industriais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(535, '3329501', 'Serviços de montagem de móveis de qualquer material', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(536, '3329599', 'Outras atividades de instalação não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(537, '3511501', 'Geração de energia elétrica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(538, '3511502', 'Atividades de coordenação e controle da operação da geração e transmissão de energia elétrica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(539, '3512300', 'Transmissão de energia elétrica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(540, '3513100', 'Comércio atacadista de energia elétrica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(541, '3514000', 'Distribuição de energia elétrica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(542, '3520401', 'Produção de gás; processamento de gás natural', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(543, '3520402', 'Distribuição de combustíveis gasosos por redes urbanas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(544, '3530100', 'Produção e distribuição de vapor, água quente e ar-condicionado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(545, '3600601', 'Captação, tratamento e distribuição de água', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(546, '3600602', 'Distribuição de água por caminhões', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(547, '3701100', 'Gestão de redes de esgoto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(548, '3702900', 'Atividades relacionadas a esgoto, exceto a gestão de redes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(549, '3811400', 'Coleta de resíduos não-perigosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(550, '3812200', 'Coleta de resíduos perigosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(551, '3821100', 'Tratamento e disposição de resíduos não-perigosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(552, '3822000', 'Tratamento e disposição de resíduos perigosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(553, '3831901', 'Recuperação de sucatas de alumínio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(554, '3831902', 'Recuperação de sucatas de outros metais não-ferrosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(555, '3831999', 'Recuperação de materiais metálicos, exceto alumínio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(556, '3832700', 'Recuperação de materiais plásticos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(557, '3839401', 'Usinas de compostagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(558, '3839499', 'Recuperação de materiais não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(559, '3900500', 'Descontaminação e outros serviços de gestão de resíduos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(560, '4110700', 'Incorporação de empreendimentos imobiliários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(561, '4120400', 'Construção de edifícios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(562, '4211101', 'Construção de rodovias e ferrovias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(563, '4211102', 'Pintura para sinalização em pistas rodoviárias e aeroportos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(564, '4212000', 'Construção de obras-de-arte especiais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(565, '4213800', 'Obras de urbanização - ruas, praças e calçadas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(566, '4221901', 'Construção de barragens e represas para geração de energia elétrica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(567, '4221902', 'Construção de estações e redes de distribuição de energia elétrica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(568, '4221903', 'Manutenção de redes de distribuição de energia elétrica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(569, '4221904', 'Construção de estações e redes de telecomunicações', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(570, '4221905', 'Manutenção de estações e redes de telecomunicações', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(571, '4222701', 'Construção de redes de abastecimento de água, coleta de esgoto e construções correlatas, exceto obras de irrigação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(572, '4222702', 'Obras de irrigação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(573, '4223500', 'Construção de redes de transportes por dutos, exceto para água e esgoto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(574, '4291000', 'Obras portuárias, marítimas e fluviais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(575, '4292801', 'Montagem de estruturas metálicas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(576, '4292802', 'Obras de montagem industrial', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(577, '4299501', 'Perfurações e sondagens', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(578, '4299599', 'Outras obras de engenharia civil não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(579, '4311801', 'Demolição', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(580, '4311802', 'Preparação de canteiro e limpeza de terreno', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(581, '4312600', 'Perfurações e sondagens', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(582, '4313400', 'Obras de terraplenagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(583, '4319300', 'Serviços de preparação do terreno não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(584, '4321500', 'Instalação e manutenção elétrica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(585, '4322301', 'Instalações hidráulicas, de sistemas de ventilação e de refrigeração', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(586, '4322302', 'Instalação e manutenção de sistemas centrais de ar-condicionado, de ventilação e refrigeração', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(587, '4322303', 'Instalações de sistema de prevenção contra incêndio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(588, '4329101', 'Instalação de painéis publicitários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(589, '4329102', 'Instalação de equipamentos para orientação à navegação marítima, fluvial e lacustre', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(590, '4329103', 'Instalação, manutenção e reparação de elevadores, escadas e esteiras rolantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(591, '4329104', 'Montagem e instalação de sistemas e equipamentos de iluminação e sinalização em vias públicas, portos e aeroportos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(592, '4329105', 'Tratamentos térmicos, acústicos ou de vibração', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(593, '4329199', 'Outras obras de instalações em construções não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(594, '4330401', 'Obras de acabamento em gesso e estuque', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(595, '4330402', 'Instalação de portas, janelas, tetos, divisórias e armários embutidos de qualquer material', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(596, '4330403', 'Obras de acabamento em madeira', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(597, '4330404', 'Serviços de pintura de edifícios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(598, '4330405', 'Aplicação de revestimentos e de resinas em interiores e exteriores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(599, '4330499', 'Outras obras de acabamento da construção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(600, '4391600', 'Obras de fundações', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(601, '4399101', 'Administração de obras', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(602, '4399102', 'Montagem e desmontagem de andaimes e outras estruturas temporárias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(603, '4399103', 'Obras de alvenaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(604, '4399104', 'Serviços de operação e fornecimento de equipamentos para realização de sondagens, exceto geotécnicas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(605, '4399105', 'Perfuração e construção de poços de água', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(606, '4399199', 'Serviços especializados para construção não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(607, '4511101', 'Comércio a varejo de automóveis, camionetas e utilitários novos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(608, '4511102', 'Comércio a varejo de automóveis, camionetas e utilitários usados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(609, '4511103', 'Comércio por atacado de automóveis, camionetas e utilitários novos e usados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(610, '4511104', 'Comércio por atacado de caminhões novos e usados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(611, '4511105', 'Comércio por atacado de reboques e semi-reboques novos e usados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(612, '4511106', 'Comércio por atacado de ônibus e micro-ônibus novos e usados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(613, '4512901', 'Representantes comerciais e agentes do comércio de veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(614, '4512902', 'Comércio sob consignação de veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(615, '4520001', 'Serviços de manutenção e reparação mecânica de veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(616, '4520002', 'Serviços de lanternagem ou funilaria e pintura de veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(617, '4520003', 'Serviços de manutenção e reparação elétrica de veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(618, '4520004', 'Serviços de alinhamento e balanceamento de veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(619, '4520005', 'Serviços de lavagem, lubrificação e polimento de veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(620, '4520006', 'Serviços de borracharia para veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(621, '4520007', 'Serviços de instalação, manutenção e reparação de acessórios para veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(622, '4520099', 'Serviços de manutenção e reparação de veículos automotores não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(623, '4530701', 'Comércio por atacado de peças e acessórios novos para veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(624, '4530702', 'Comércio por atacado de pneumáticos e câmaras-de-ar', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(625, '4530703', 'Comércio a varejo de peças e acessórios novos para veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(626, '4530704', 'Comércio a varejo de peças e acessórios usados para veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(627, '4530705', 'Comércio a varejo de pneumáticos e câmaras-de-ar', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(628, '4530706', 'Representantes comerciais e agentes do comércio de peças e acessórios novos e usados para veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(629, '4541201', 'Comércio por atacado de motocicletas e motonetas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(630, '4541202', 'Comércio a varejo de motocicletas e motonetas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(631, '4541203', 'Comércio por atacado de peças e acessórios para motocicletas e motonetas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(632, '4541204', 'Comércio a varejo de peças e acessórios para motocicletas e motonetas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(633, '4541205', 'Representantes comerciais e agentes do comércio de motocicletas e motonetas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(634, '4541206', 'Comércio por atacado de peças e acessórios para motocicletas e motonetas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(635, '4542101', 'Comércio por atacado de equipamentos e artigos de uso pessoal e doméstico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(636, '4543100', 'Comércio por atacado de bicicletas, triciclos e outros veículos recreativos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(637, '4543900', 'Manutenção e reparação de motocicletas e motonetas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(638, '4611700', 'Representantes comerciais e agentes do comércio de matérias-primas agrícolas e animais vivos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(639, '4612500', 'Representantes comerciais e agentes do comércio de combustíveis, minerais, produtos siderúrgicos e químicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(640, '4613300', 'Representantes comerciais e agentes do comércio de madeira, material de construção e ferragens', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(641, '4614100', 'Representantes comerciais e agentes do comércio de máquinas, equipamentos, embarcações e aeronaves', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(642, '4615000', 'Representantes comerciais e agentes do comércio de eletrodomésticos, móveis e artigos de uso doméstico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(643, '4616800', 'Representantes comerciais e agentes do comércio de têxteis, vestuário, calçados e artigos de viagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(644, '4617600', 'Representantes comerciais e agentes do comércio de produtos alimentícios, bebidas e fumo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(645, '4618401', 'Representantes comerciais e agentes do comércio de medicamentos, cosméticos e produtos de perfumaria e higiene', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(646, '4618402', 'Representantes comerciais e agentes do comércio de produtos farmacêuticos para uso veterinário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(647, '4618403', 'Representantes comerciais e agentes do comércio de produtos odontológicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(648, '4619201', 'Representantes comerciais e agentes do comércio de mercadorias em geral não especializado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(649, '4619299', 'Outras atividades de representantes comerciais e agentes do comércio especializado em produtos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(650, '4621400', 'Comércio atacadista de café em grão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(651, '4622200', 'Comércio atacadista de soja', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(652, '4623101', 'Comércio atacadista de animais vivos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(653, '4623102', 'Comércio atacadista de couros, lãs, peles e outros subprodutos não-comestíveis de origem animal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(654, '4623103', 'Comércio atacadista de algodão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(655, '4623104', 'Comércio atacadista de fumo em folha não beneficiado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(656, '4623105', 'Comércio atacadista de cacau', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(657, '4623106', 'Comércio atacadista de sementes, flores, plantas e gramas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(658, '4623107', 'Comércio atacadista de sisal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(659, '4623108', 'Comércio atacadista de matérias-primas agrícolas não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(660, '4623109', 'Comércio atacadista de alimentos para animais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(661, '4631100', 'Comércio atacadista de leite e laticínios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(662, '4632001', 'Comércio atacadista de cereais e leguminosas beneficiados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(663, '4632002', 'Comércio atacadista de farinhas, amidos e féculas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(664, '4632003', 'Comércio atacadista de cereais e leguminosas beneficiados, farinhas, amidos e féculas, exceto de mandioca', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(665, '4633801', 'Comércio atacadista de frutas, verduras, raízes, tubérculos, hortaliças e legumes frescos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(666, '4633802', 'Comércio atacadista de aves vivas e ovos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(667, '4633803', 'Comércio atacadista de coelhos e outros pequenos animais vivos para alimentação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(668, '4634601', 'Comércio atacadista de carnes bovinas e suínas e derivados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(669, '4634602', 'Comércio atacadista de aves abatidas e derivados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(670, '4634603', 'Comércio atacadista de pescados e frutos do mar', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(671, '4634699', 'Comércio atacadista de carnes e derivados de outros animais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(672, '4635401', 'Comércio atacadista de água mineral', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(673, '4635402', 'Comércio atacadista de cerveja, chope e refrigerante', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(674, '4635403', 'Comércio atacadista de bebidas com álcool, exceto cerveja e chope', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(675, '4635499', 'Comércio atacadista de bebidas não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(676, '4636201', 'Comércio atacadista de fumo beneficiado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(677, '4636202', 'Comércio atacadista de cigarros, cigarrilhas e charutos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(678, '4637101', 'Comércio atacadista de café torrado, moído e solúvel', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(679, '4637102', 'Comércio atacadista de açúcar', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(680, '4637103', 'Comércio atacadista de óleos e gorduras', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(681, '4637104', 'Comércio atacadista de pães, bolos, biscoitos e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(682, '4637105', 'Comércio atacadista de massas alimentícias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(683, '4637106', 'Comércio atacadista de sorvetes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(684, '4637107', 'Comércio atacadista de chocolates, balas, bombons e semelhantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(685, '4637199', 'Comércio atacadista especializado de outros produtos alimentícios não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(686, '4639701', 'Comércio atacadista de produtos alimentícios em geral', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(687, '4639799', 'Comércio atacadista de produtos alimentícios em geral, com atividade de fracionamento e acondicionamento associada', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(688, '4640701', 'Comércio atacadista de madeira e produtos derivados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(689, '4640702', 'Comércio atacadista de tubos e conexões de material plástico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(690, '4640703', 'Comércio atacadista de telhas, tijolos e materiais de construção em geral', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(691, '4640704', 'Comércio atacadista de cimento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(692, '4640705', 'Comércio atacadista de ferragens e ferramentas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(693, '4640706', 'Comércio atacadista de mármore e granito', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(694, '4640707', 'Comércio atacadista de vidros, espelhos e vitrais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(695, '4640708', 'Comércio atacadista de materiais de construção em geral', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(696, '4640709', 'Comércio atacadista de materiais de construção não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(697, '4641901', 'Comércio atacadista de tecidos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(698, '4641902', 'Comércio atacadista de artigos de cama, mesa e banho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(699, '4641903', 'Comércio atacadista de artigos de armarinho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(700, '4642701', 'Comércio atacadista de artigos do vestuário e acessórios, exceto uniformes e roupas profissionais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(701, '4642702', 'Comércio atacadista de roupas e acessórios para uso profissional e de segurança do trabalho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(702, '4643501', 'Comércio atacadista de calçados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(703, '4643502', 'Comércio atacadista de bolsas, malas e artigos de viagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(704, '4644301', 'Comércio atacadista de medicamentos e drogas de uso humano', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(705, '4644302', 'Comércio atacadista de medicamentos e drogas de uso veterinário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(706, '4645101', 'Comércio atacadista de instrumentos e materiais para uso médico-cirúrgico, ortopédico e odontológico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(707, '4645102', 'Comércio atacadista de próteses e artigos de ortopedia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(708, '4645103', 'Comércio atacadista de produtos odontológicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(709, '4646001', 'Comércio atacadista de cosméticos e produtos de perfumaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(710, '4646002', 'Comércio atacadista de produtos de higiene pessoal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(711, '4647801', 'Comércio atacadista de artigos de escritório e de papelaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(712, '4647802', 'Comércio atacadista de livros, jornais e outras publicações', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(713, '4649401', 'Comércio atacadista de equipamentos elétricos de uso pessoal e doméstico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(714, '4649402', 'Comércio atacadista de aparelhos eletrônicos de uso pessoal e doméstico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(715, '4649403', 'Comércio atacadista de bicicletas, triciclos e outros veículos recreativos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(716, '4649404', 'Comércio atacadista de móveis e artigos de colchoaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(717, '4649405', 'Comércio atacadista de artigos de tapeçaria, persianas e cortinas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(718, '4649406', 'Comércio atacadista de lustres, luminárias e abajures', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(719, '4649407', 'Comércio atacadista de filmes, CDs, DVDs, fitas e discos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(720, '4649408', 'Comércio atacadista de produtos de higiene, limpeza e conservação domiciliar', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(721, '4649409', 'Comércio atacadista de produtos de higiene, limpeza e conservação domiciliar, exceto detergentes e desinfetantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(722, '4649410', 'Comércio atacadista de jóias, relógios e bijuterias, inclusive pedras preciosas e semipreciosas lapidadas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(723, '4649499', 'Comércio atacadista de outros equipamentos e artigos de uso pessoal e doméstico não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(724, '4651601', 'Comércio atacadista de equipamentos de informática', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(725, '4651602', 'Comércio atacadista de suprimentos para informática', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(726, '4652400', 'Comércio atacadista de equipamentos de telefonia e comunicação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(727, '4661300', 'Comércio atacadista de máquinas, aparelhos e equipamentos para uso agropecuário; partes e peças', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(728, '4662100', 'Comércio atacadista de máquinas, equipamentos para terraplenagem, mineração e construção; partes e peças', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(729, '4663000', 'Comércio atacadista de máquinas e equipamentos para uso industrial; partes e peças', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(730, '4664800', 'Comércio atacadista de máquinas, aparelhos, equipamentos, componentes e acessórios eletrônicos e de telecomunicações', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(731, '4665600', 'Comércio atacadista de máquinas e equipamentos para uso comercial; partes e peças', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(732, '4669901', 'Comércio atacadista de bombas e compressores; partes e peças', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(733, '4669999', 'Comércio atacadista de outras máquinas e equipamentos não especificados anteriormente; partes e peças', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(734, '4671100', 'Comércio atacadista de madeira e produtos derivados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(735, '4672900', 'Comércio atacadista de ferragens e ferramentas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(736, '4673700', 'Comércio atacadista de material elétrico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(737, '4674500', 'Comércio atacadista de cimento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(738, '4679601', 'Comércio atacadista de tintas, vernizes e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(739, '4679602', 'Comércio atacadista de mármore e granito', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(740, '4679603', 'Comércio atacadista de vidros, espelhos e vitrais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(741, '4679604', 'Comércio atacadista especializado de materiais de construção não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(742, '4679699', 'Comércio atacadista de materiais de construção em geral', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(743, '4681801', 'Comércio atacadista de álcool carburante, biodiesel, gasolina e demais combustíveis para veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(744, '4681802', 'Comércio atacadista de combustíveis sólidos, líquidos e gasosos, exceto para veículos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(745, '4681803', 'Comércio atacadista de lubrificantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(746, '4682600', 'Comércio atacadista de gás liquefeito de petróleo (GLP)', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(747, '4683400', 'Comércio atacadista de defensivos agrícolas, adubos, fertilizantes e corretivos do solo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(748, '4684200', 'Comércio atacadista de produtos químicos e petroquímicos, exceto agroquímicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(749, '4685100', 'Comércio atacadista de produtos siderúrgicos e metalúrgicos, exceto para construção', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(750, '4686901', 'Comércio atacadista de papel e papelão em bruto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(751, '4686902', 'Comércio atacadista de embalagens', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(752, '4687701', 'Comércio atacadista de resíduos e sucatas metálicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(753, '4687702', 'Comércio atacadista de resíduos e sucatas não-metálicos, exceto papel e plástico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(754, '4687703', 'Comércio atacadista de resíduos de papel e papelão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(755, '4687704', 'Comércio atacadista de resíduos e sucatas de plástico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(756, '4689301', 'Comércio atacadista de mercados futuros, mercadorias e valores mobiliários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(757, '4689399', 'Comércio atacadista especializado de outros produtos intermediários não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(758, '4691500', 'Comércio atacadista de mercadorias em geral, com predominância de produtos alimentícios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(759, '4692300', 'Comércio atacadista de mercadorias em geral, com predominância de insumos agropecuários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(760, '4693100', 'Comércio atacadista de mercadorias em geral, sem predominância de alimentos ou de insumos agropecuários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(761, '4711301', 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - hipermercados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(762, '4711302', 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - supermercados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(763, '4712100', 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - minimercados, mercearias e armazéns', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(764, '4713001', 'Lojas de departamentos ou magazines', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(765, '4713002', 'Lojas de departamentos ou magazines, exceto lojas francas (Duty Free)', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(766, '4713003', 'Lojas francas (Duty Free)', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(767, '4713004', 'Lojas de variedades, exceto lojas de departamentos ou magazines', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(768, '4713005', 'Lojas de variedades - lojinhas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(769, '4721102', 'Padaria e confeitaria com predominância de revenda', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(770, '4721103', 'Comércio varejista de laticínios e frios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(771, '4721104', 'Comércio varejista de doces, balas, bombons e semelhantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(772, '4722901', 'Comércio varejista de carnes - açougues', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(773, '4722902', 'Peixaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(774, '4723700', 'Comércio varejista de bebidas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(775, '4724500', 'Comércio varejista de hortifrutigranjeiros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(776, '4729601', 'Tabacaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(777, '4729699', 'Comércio varejista de produtos alimentícios em geral ou especializado em produtos alimentícios não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(778, '4731800', 'Comércio varejista de combustíveis para veículos automotores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(779, '4732600', 'Comércio varejista de lubrificantes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(780, '4741500', 'Comércio varejista de tintas e materiais para pintura', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(781, '4742300', 'Comércio varejista de material elétrico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(782, '4743100', 'Comércio varejista de vidros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(783, '4744001', 'Comércio varejista de ferragens e ferramentas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(784, '4744002', 'Comércio varejista de madeira e artefatos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(785, '4744003', 'Comércio varejista de materiais hidráulicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(786, '4744004', 'Comércio varejista de cal, areia, pedra britada, tijolos e telhas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(787, '4744005', 'Comércio varejista de materiais de construção em geral', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(788, '4744099', 'Comércio varejista de materiais de construção não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(789, '4751201', 'Comércio varejista especializado de equipamentos e suprimentos de informática', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(790, '4751202', 'Recarga de cartuchos para equipamentos de informática', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(791, '4752100', 'Comércio varejista especializado de equipamentos de telefonia e comunicação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(792, '4753900', 'Comércio varejista especializado de eletrodomésticos e equipamentos de áudio e vídeo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(793, '4754701', 'Comércio varejista de móveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(794, '4754702', 'Comércio varejista de artigos de colchoaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(795, '4754703', 'Comércio varejista de artigos de iluminação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(796, '4755500', 'Comércio varejista de tecidos e artigos de armarinho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(797, '4756300', 'Comércio varejista de artigos de cama, mesa e banho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(798, '4757100', 'Comércio varejista especializado de peças e acessórios para aparelhos eletroeletrônicos para uso doméstico, exceto informática e comunicação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(799, '4759801', 'Comércio varejista de artigos de uso doméstico não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(800, '4759899', 'Comércio varejista de outros artigos de uso pessoal e doméstico não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(801, '4761001', 'Comércio varejista de livros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(802, '4761002', 'Comércio varejista de jornais e revistas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(803, '4761003', 'Comércio varejista de artigos de papelaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(804, '4762800', 'Comércio varejista de discos, CDs, DVDs e fitas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(805, '4763601', 'Comércio varejista de brinquedos e artigos recreativos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(806, '4763602', 'Comércio varejista de artigos esportivos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(807, '4763603', 'Comércio varejista de bicicletas e triciclos; peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(808, '4763604', 'Comércio varejista de artigos de caça, pesca e camping', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(809, '4763605', 'Comércio varejista de embarcações e outros veículos recreativos; peças e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(810, '4771701', 'Comércio varejista de produtos farmacêuticos, sem manipulação de fórmulas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(811, '4771702', 'Comércio varejista de produtos farmacêuticos, com manipulação de fórmulas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(812, '4771703', 'Comércio varejista de produtos farmacêuticos homeopáticos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(813, '4771704', 'Comércio varejista de medicamentos veterinários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(814, '4772500', 'Comércio varejista de cosméticos, produtos de perfumaria e de higiene pessoal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(815, '4773300', 'Comércio varejista de artigos médicos e ortopédicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(816, '4774100', 'Comércio varejista de artigos de óptica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(817, '4781400', 'Comércio varejista de artigos do vestuário e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(818, '4782201', 'Comércio varejista de calçados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(819, '4782202', 'Comércio varejista de artigos de viagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(820, '4783101', 'Comércio varejista de artigos de joalheria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(821, '4783102', 'Comércio varejista de artigos de relojoaria', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(822, '4789001', 'Comércio varejista de suvenires, bijuterias e artesanatos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(823, '4789002', 'Comércio varejista de plantas e flores naturais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(824, '4789003', 'Comércio varejista de objetos de arte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(825, '4789004', 'Comércio varejista de animais vivos e artigos e alimentos para animais de estimação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(826, '4789005', 'Comércio varejista de produtos saneantes domissanitários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(827, '4789006', 'Comércio varejista de fogos de artifício e artigos pirotécnicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(828, '4789007', 'Comércio varejista de equipamentos para escritório', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(829, '4789008', 'Comércio varejista de artigos fotográficos e para filmagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(830, '4789009', 'Comércio varejista de armas e munições', '2025-12-12 00:05:34', '2025-12-12 00:05:34');
INSERT INTO `cnae` (`id`, `codigo`, `descricao`, `created_at`, `updated_at`) VALUES
(831, '4789099', 'Comércio varejista de outros produtos novos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(832, '4789000', 'Comércio varejista de gás liquefeito de petróleo (GLP)', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(833, '4791001', 'Comércio varejista de mercadorias em geral por correspondência ou internet', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(834, '4910800', 'Transporte ferroviário de carga', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(835, '4911600', 'Transporte ferroviário de passageiros intermunicipal, interestadual e internacional', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(836, '4912401', 'Transporte ferroviário de passageiros municipal e em região metropolitana', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(837, '4912402', 'Transporte ferroviário de passageiros intermunicipal, interestadual e internacional', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(838, '4912403', 'Transporte metroviário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(839, '4921301', 'Transporte rodoviário de passageiros municipal e em região metropolitana', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(840, '4921302', 'Transporte rodoviário de passageiros intermunicipal, interestadual e internacional', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(841, '4922101', 'Transporte rodoviário de táxi', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(842, '4922102', 'Transporte rodoviário de passageiros por aplicativo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(843, '4923001', 'Serviço de táxi aéreo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(844, '4923002', 'Serviço de transporte de passageiros por navegação interior', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(845, '4924800', 'Transporte escolar', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(846, '4929901', 'Transporte rodoviário coletivo de passageiros, com itinerário fixo, municipal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(847, '4929902', 'Transporte rodoviário coletivo de passageiros, com itinerário fixo, intermunicipal em região metropolitana', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(848, '4929903', 'Transporte rodoviário coletivo de passageiros, com itinerário fixo, intermunicipal, exceto em região metropolitana', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(849, '4929904', 'Transporte rodoviário coletivo de passageiros, com itinerário fixo, interestadual', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(850, '4929905', 'Transporte rodoviário coletivo de passageiros, com itinerário fixo, internacional', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(851, '4929999', 'Outros transportes rodoviários de passageiros não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(852, '4930201', 'Transporte rodoviário de carga, exceto produtos perigosos e mudanças, municipal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(853, '4930202', 'Transporte rodoviário de carga, exceto produtos perigosos e mudanças, intermunicipal, interestadual e internacional', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(854, '4930203', 'Transporte rodoviário de produtos perigosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(855, '4930204', 'Transporte rodoviário de mudanças', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(856, '4940000', 'Transporte dutoviário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(857, '4950700', 'Trens turísticos, teleférricos e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(858, '5011401', 'Transporte marítimo de cabotagem - carga', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(859, '5011402', 'Transporte marítimo de cabotagem - passageiros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(860, '5012201', 'Transporte marítimo de longo curso - carga', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(861, '5012202', 'Transporte marítimo de longo curso - passageiros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(862, '5021101', 'Transporte por navegação interior de carga, municipal, exceto travessia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(863, '5021102', 'Transporte por navegação interior de carga, intermunicipal, interestadual e internacional, exceto travessia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(864, '5022001', 'Transporte por navegação interior de passageiros em linhas regulares, municipal, exceto travessia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(865, '5022002', 'Transporte por navegação interior de passageiros em linhas regulares, intermunicipal, interestadual e internacional, exceto travessia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(866, '5030101', 'Navegação de travessia, municipal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(867, '5030102', 'Navegação de travessia, intermunicipal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(868, '5030103', 'Navegação de travessia, interestadual', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(869, '5091201', 'Transporte por navegação de travessia, municipal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(870, '5091202', 'Transporte por navegação de travessia, intermunicipal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(871, '5099801', 'Transporte aquaviário para passeios turísticos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(872, '5099899', 'Outros transportes aquaviários não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(873, '5111100', 'Transporte aéreo de passageiros regular', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(874, '5112901', 'Serviço de táxi aéreo e locação de aeronaves com tripulação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(875, '5112999', 'Outros serviços de transporte aéreo de passageiros não-regular', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(876, '5120000', 'Transporte aéreo de carga', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(877, '5130700', 'Transporte espacial', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(878, '5211701', 'Armazéns gerais - emissão de warrant', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(879, '5211702', 'Guarda-móveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(880, '5212500', 'Carga e descarga', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(881, '5221400', 'Estacionamento de veículos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(882, '5222200', 'Terminais rodoviários e ferroviários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(883, '5223100', 'Estações e terminais de transporte aquaviário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(884, '5229001', 'Serviços de apoio ao transporte por táxi, inclusive centrais de chamada', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(885, '5229002', 'Serviços de reboque de veículos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(886, '5229099', 'Outras atividades auxiliares dos transportes terrestres não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(887, '5231101', 'Administração de aeroportos, complexos aeroportuários e heliportos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(888, '5231102', 'Atividades auxiliares dos transportes aéreos, exceto operação de aeroportos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(889, '5232000', 'Atividades de agenciamento marítimo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(890, '5239701', 'Serviços de praticagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(891, '5239799', 'Outras atividades auxiliares dos transportes aquaviários não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(892, '5240101', 'Atividades auxiliares dos transportes terrestres não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(893, '5240199', 'Atividades auxiliares dos transportes terrestres não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(894, '5250801', 'Comissaria de despachos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(895, '5250802', 'Atividades de despachantes aduaneiros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(896, '5250803', 'Agenciamento de cargas, nacional', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(897, '5250804', 'Agenciamento de cargas, internacional', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(898, '5250805', 'Operador de transporte multimodal - OTM', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(899, '5310501', 'Atividades do Correio Nacional', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(900, '5310502', 'Atividades de franqueadas e permissionárias do Correio Nacional', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(901, '5320201', 'Serviços de malote não realizados pelo Correio Nacional', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(902, '5320202', 'Serviços de entrega rápida', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(903, '5510801', 'Hotéis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(904, '5510802', 'Apart-hotéis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(905, '5510803', 'Motéis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(906, '5590601', 'Pousadas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(907, '5590602', 'Albergues, exceto assistenciais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(908, '5590603', 'Pensões (alojamento)', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(909, '5590699', 'Outros alojamentos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(910, '5611201', 'Restaurantes e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(911, '5611202', 'Bares e outros estabelecimentos especializados em servir bebidas, sem entretenimento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(912, '5611203', 'Bares e outros estabelecimentos especializados em servir bebidas, com entretenimento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(913, '5611204', 'Lanchonetes, casas de chá, de sucos e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(914, '5611205', 'Comércio varejista de produtos alimentícios em geral ou especializado em produtos alimentícios não especificados anteriormente, com serviço completo de refeição', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(915, '5612100', 'Serviços ambulantes de alimentação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(916, '5620101', 'Fornecimento de alimentos preparados preponderantemente para empresas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(917, '5620102', 'Serviços de alimentação para eventos e recepções - bufê', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(918, '5620103', 'Cantinas - serviços de alimentação privativos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(919, '5620104', 'Fornecimento de alimentos preparados preponderantemente para consumo domiciliar', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(920, '5811500', 'Edição de livros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(921, '5812301', 'Edição de jornais diários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(922, '5812302', 'Edição de jornais não diários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(923, '5813100', 'Edição de revistas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(924, '5819100', 'Edição de cadastros, listas e outros produtos gráficos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(925, '5821200', 'Edição integrada à impressão de livros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(926, '5822101', 'Edição integrada à impressão de jornais diários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(927, '5822102', 'Edição integrada à impressão de jornais não diários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(928, '5823900', 'Edição integrada à impressão de revistas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(929, '5829100', 'Edição integrada à impressão de cadastros, listas e outros produtos gráficos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(930, '5911101', 'Atividades de produção cinematográfica, de vídeos e de programas de televisão não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(931, '5911102', 'Atividades de produção cinematográfica, de vídeos e de programas de televisão não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(932, '5912001', 'Serviços de dublagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(933, '5912002', 'Serviços de mixagem sonora em produção audiovisual', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(934, '5913800', 'Distribuição cinematográfica, de vídeo e de programas de televisão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(935, '5914600', 'Atividades de exibição cinematográfica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(936, '5920100', 'Atividades de gravação de som e de edição de música', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(937, '6010100', 'Atividades de rádio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(938, '6021700', 'Atividades de televisão aberta', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(939, '6022501', 'Programadoras', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(940, '6022502', 'Atividades relacionadas à televisão por assinatura, exceto programadoras', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(941, '6110801', 'Serviços de telefonia fixa comutada - STFC', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(942, '6110802', 'Serviços de redes de transportes de telecomunicações - SRTT', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(943, '6110803', 'Serviços de comunicação multimídia - SCM', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(944, '6110899', 'Serviços de telecomunicações por fio não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(945, '6120501', 'Telefonia móvel celular', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(946, '6120502', 'Serviço móvel pessoal - SMP', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(947, '6120599', 'Serviços de telecomunicações sem fio não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(948, '6130200', 'Telecomunicações por satélite', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(949, '6141800', 'Operadoras de televisão por assinatura por cabo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(950, '6142600', 'Operadoras de televisão por assinatura por micro-ondas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(951, '6143400', 'Operadoras de televisão por assinatura por satélite', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(952, '6190601', 'Serviços de internet', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(953, '6190602', 'Serviços de provedores de acesso às redes de comunicações', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(954, '6190699', 'Outras atividades de telecomunicações não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(955, '6201501', 'Desenvolvimento de programas de computador sob encomenda', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(956, '6201502', 'Desenvolvimento e licenciamento de programas de computador customizáveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(957, '6201503', 'Desenvolvimento e licenciamento de programas de computador não-customizáveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(958, '6202300', 'Desenvolvimento e licenciamento de programas de computador customizáveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(959, '6203100', 'Desenvolvimento e licenciamento de programas de computador não-customizáveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(960, '6204000', 'Consultoria em tecnologia da informação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(961, '6209100', 'Suporte técnico, manutenção e outros serviços em tecnologia da informação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(962, '6311900', 'Tratamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(963, '6319400', 'Portais, provedores de conteúdo e outros serviços de informação na internet', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(964, '6391700', 'Agências de notícias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(965, '6399200', 'Outras atividades de prestação de serviços de informação não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(966, '6410700', 'Banco Central', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(967, '6421200', 'Bancos comerciais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(968, '6422100', 'Bancos múltiplos, com carteira comercial', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(969, '6423900', 'Caixas econômicas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(970, '6424701', 'Bancos cooperativos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(971, '6424702', 'Cooperativas centrais de crédito', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(972, '6424703', 'Cooperativas de crédito mútuo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(973, '6424704', 'Cooperativas de crédito rural', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(974, '6431000', 'Bancos múltiplos, sem carteira comercial', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(975, '6432800', 'Bancos de investimento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(976, '6433500', 'Bancos de desenvolvimento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(977, '6435201', 'Sociedades de crédito imobiliário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(978, '6435202', 'Associações de poupança e empréstimo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(979, '6435203', 'Companhias hipotecárias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(980, '6436100', 'Sociedades de crédito, financiamento e investimento - financeiras', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(981, '6437900', 'Sociedades de crédito ao microempreendedor', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(982, '6440700', 'Operadoras de cartões de crédito e débito', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(983, '6450600', 'Sociedades de arrendamento mercantil', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(984, '6461100', 'Holdings de instituições financeiras', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(985, '6462000', 'Holdings de instituições não-financeiras', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(986, '6463800', 'Outras sociedades de participação, exceto holdings', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(987, '6470101', 'Fundos de investimento, exceto previdenciários e imobiliários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(988, '6470102', 'Fundos de investimento previdenciários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(989, '6470103', 'Fundos de investimento imobiliários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(990, '6491300', 'Sociedades de fomento mercantil - factoring', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(991, '6492100', 'Securitização de créditos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(992, '6493000', 'Fundos garantidores de crédito', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(993, '6499901', 'Clubes de investimento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(994, '6499902', 'Sociedades de investimento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(995, '6499903', 'Fundos mútuos de investimento em ações', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(996, '6499904', 'Outras atividades de serviços financeiros não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(997, '6511101', 'Seguros de vida', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(998, '6511102', 'Seguros de vida resgatáveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(999, '6512000', 'Seguros não-vida', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1000, '6520100', 'Seguros-saúde', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1001, '6530800', 'Resseguros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1002, '6541300', 'Previdência complementar fechada', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1003, '6542100', 'Previdência complementar aberta', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1004, '6550200', 'Planos de saúde', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1005, '6611801', 'Bolsas de mercadorias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1006, '6611802', 'Bolsas de valores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1007, '6611803', 'Corretoras de títulos e valores mobiliários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1008, '6611804', 'Corretoras de câmbio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1009, '6611805', 'Administradoras de cartões de crédito', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1010, '6612601', 'Corretoras de contratos de mercadorias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1011, '6612602', 'Distribuidoras de títulos e valores mobiliários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1012, '6612603', 'Administradoras de consórcios para aquisição de bens e direitos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1013, '6612604', 'Administradoras de fundos mútuos de investimento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1014, '6612605', 'Outras sociedades de intermediação no mercado de capitais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1015, '6613400', 'Administração de mercados de balcão organizados', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1016, '6619301', 'Serviços de liquidação e custódia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1017, '6619302', 'Serviços de depósito centralizado', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1018, '6619303', 'Serviços de registro e compensação de operações de valores mobiliários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1019, '6619304', 'Serviços de administração de carteiras de valores mobiliários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1020, '6619305', 'Serviços de custódia de valores mobiliários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1021, '6619399', 'Outras atividades auxiliares dos serviços financeiros não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1022, '6621501', 'Corretores e agentes de seguros, de planos de previdência complementar e de saúde', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1023, '6621502', 'Peritos e avaliadores de seguros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1024, '6622300', 'Agentes auxiliares de seguros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1025, '6629100', 'Atividades auxiliares dos seguros, da previdência complementar e dos planos de saúde não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1026, '6630400', 'Atividades de administração de fundos por contrato ou comissão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1027, '6810201', 'Compra e venda de imóveis próprios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1028, '6810202', 'Loteamento de imóveis próprios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1029, '6810203', 'Venda de imóveis próprios adquiridos para revenda', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1030, '6810204', 'Aluguel de imóveis próprios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1031, '6821801', 'Corretagem na compra e venda e avaliação de imóveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1032, '6821802', 'Corretagem no aluguel de imóveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1033, '6822600', 'Gestão e administração da propriedade imobiliária', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1034, '6911701', 'Serviços advocatícios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1035, '6911702', 'Cartórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1036, '6911703', 'Serviços de arbitragem, mediação e conciliação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1037, '6912500', 'Direção e consultoria em assuntos jurídicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1038, '6920601', 'Atividades de contabilidade', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1039, '6920602', 'Atividades de consultoria e auditoria contábil e tributária', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1040, '6930100', 'Serviços de perícia técnica contábil e econômica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1041, '7010700', 'Sede de empresas e unidades administrativas locais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1042, '7020400', 'Atividades de consultoria em gestão empresarial, exceto consultoria técnica específica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1043, '7111100', 'Serviços de arquitetura', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1044, '7112000', 'Serviços de engenharia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1045, '7119701', 'Serviços de cartografia, topografia e geodésia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1046, '7119702', 'Atividades de estudos geológicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1047, '7119703', 'Serviços de desenho técnico relacionados à arquitetura e engenharia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1048, '7119704', 'Serviços de perícia e avaliação técnica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1049, '7119799', 'Outras atividades técnicas relacionadas à engenharia e arquitetura', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1050, '7120100', 'Testes e análises técnicas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1051, '7210000', 'Pesquisa e desenvolvimento experimental em ciências físicas e naturais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1052, '7220700', 'Pesquisa e desenvolvimento experimental em ciências sociais e humanas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1053, '7311400', 'Agências de publicidade', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1054, '7312200', 'Criação de estandes para feiras e exposições', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1055, '7319001', 'Criação de estandes para feiras e exposições', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1056, '7319002', 'Promoção de vendas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1057, '7319003', 'Marketing direto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1058, '7319004', 'Consultoria em publicidade', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1059, '7319099', 'Outras atividades de publicidade não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1060, '7320300', 'Pesquisas de mercado e de opinião pública', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1061, '7410202', 'Design de interiores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1062, '7410203', 'Design de produto', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1063, '7410299', 'Atividades de design não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1064, '7420001', 'Atividades de produção de fotografias, exceto aérea e submarina', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1065, '7420002', 'Atividades de produção de fotografias aéreas e submarinas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1066, '7420003', 'Laboratórios fotográficos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1067, '7420004', 'Filmagem de festas e eventos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1068, '7420005', 'Serviços de microfilmagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1069, '7490101', 'Serviços de tradução, interpretação e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1070, '7490102', 'Escafandria e mergulho', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1071, '7490103', 'Serviços de agronomia e de consultoria às atividades agrícolas e pecuárias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1072, '7490104', 'Atividades veterinárias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1073, '7490105', 'Serviços de levantamento de fundos realizados sob contrato', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1074, '7490199', 'Outras atividades profissionais, científicas e técnicas não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1075, '7500100', 'Atividades veterinárias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1076, '7711000', 'Locação de automóveis sem condutor', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1077, '7719501', 'Locação de embarcações sem tripulação, exceto para fins recreativos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1078, '7719599', 'Locação de outros meios de transporte não especificados anteriormente, sem condutor', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1079, '7721700', 'Aluguel de equipamentos recreativos e esportivos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1080, '7722500', 'Aluguel de fitas de vídeo, DVDs e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1081, '7723300', 'Aluguel de objetos do vestuário, jóias e acessórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1082, '7729201', 'Aluguel de aparelhos de jogos eletrônicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1083, '7729202', 'Aluguel de móveis', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1084, '7729203', 'Aluguel de material médico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1085, '7729299', 'Aluguel de outros objetos pessoais e domésticos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1086, '7731400', 'Aluguel de máquinas e equipamentos agrícolas sem operador', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1087, '7732201', 'Aluguel de máquinas e equipamentos para construção sem operador, exceto andaimes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1088, '7732202', 'Aluguel de andaimes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1089, '7733100', 'Aluguel de máquinas e equipamentos para escritórios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1090, '7739001', 'Aluguel de máquinas e equipamentos para extração de minérios e petróleo, sem operador', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1091, '7739002', 'Aluguel de equipamentos científicos, médicos e hospitalares, sem operador', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1092, '7739003', 'Aluguel de palcos, coberturas e outras estruturas de uso temporário, exceto andaimes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1093, '7739099', 'Aluguel de outras máquinas e equipamentos comerciais e industriais não especificados anteriormente, sem operador', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1094, '7740300', 'Gestão de ativos intangíveis não-financeiros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1095, '7810800', 'Seleção e agenciamento de mão-de-obra', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1096, '7820500', 'Locação de mão-de-obra temporária', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1097, '7830200', 'Fornecimento e gestão de recursos humanos para terceiros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1098, '7911200', 'Agências de viagens', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1099, '7912100', 'Operadores turísticos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1100, '7990200', 'Serviços de reservas e outros serviços de turismo não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1101, '8011101', 'Atividades de vigilância e segurança privada', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1102, '8011102', 'Serviços de adestramento de cães de guarda', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1103, '8012900', 'Atividades de transporte de valores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1104, '8020001', 'Atividades de monitoramento de sistemas de segurança eletrônico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1105, '8020002', 'Outras atividades de serviços de segurança', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1106, '8030700', 'Atividades de investigação particular', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1107, '8111700', 'Serviços combinados para apoio a edifícios, exceto condomínios prediais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1108, '8112500', 'Condomínios prediais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1109, '8121400', 'Limpeza em prédios e em domicílios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1110, '8122200', 'Imunização e controle de pragas urbanas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1111, '8129000', 'Atividades de limpeza não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1112, '8130300', 'Atividades paisagísticas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1113, '8211300', 'Serviços combinados de escritório e apoio administrativo', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1114, '8219901', 'Fotocópias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1115, '8219902', 'Envasamento e empacotamento sob contrato', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1116, '8219999', 'Preparação de documentos e serviços especializados de apoio administrativo não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1117, '8220200', 'Atividades de teleatendimento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1118, '8230001', 'Serviços de organização de feiras, congressos, exposições e festas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1119, '8230002', 'Casas de festas e eventos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1120, '8291100', 'Atividades de cobrança e informações cadastrais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1121, '8292000', 'Envasamento e empacotamento sob contrato', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1122, '8299701', 'Medição de consumo de energia elétrica, gás e água', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1123, '8299702', 'Emissão de vales-alimentação, vales-transporte e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1124, '8299703', 'Serviços de gravação de carimbos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1125, '8299704', 'Serviços de corte e dobra de metais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1126, '8299799', 'Outras atividades de serviços prestados principalmente às empresas não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1127, '8411600', 'Administração pública em geral', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1128, '8412400', 'Regulação das atividades de saúde, educação, serviços culturais e outros serviços sociais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1129, '8413200', 'Regulação das atividades econômicas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1130, '8421300', 'Defesa', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1131, '8422100', 'Segurança e ordem pública', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1132, '8423000', 'Justiça', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1133, '8424800', 'Relações exteriores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1134, '8425600', 'Defesa civil', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1135, '8430200', 'Seguridade social obrigatória', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1136, '8511200', 'Educação infantil - creche', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1137, '8512100', 'Educação infantil - pré-escola', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1138, '8513900', 'Ensino fundamental', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1139, '8520100', 'Ensino médio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1140, '8531700', 'Educação superior - graduação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1141, '8532500', 'Educação superior - graduação tecnológica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1142, '8533300', 'Educação superior - pós-graduação e extensão', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1143, '8541400', 'Educação profissional de nível técnico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1144, '8542200', 'Educação profissional de nível tecnológico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1145, '8550301', 'Atividades de administração de cursos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1146, '8550302', 'Atividades de apoio à educação, exceto caixas escolares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1147, '8591100', 'Ensino de esportes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1148, '8592901', 'Ensino de dança', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1149, '8592902', 'Ensino de artes cênicas, exceto dança', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1150, '8592903', 'Ensino de música', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1151, '8593700', 'Ensino de idiomas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1152, '8599601', 'Formação de condutores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1153, '8599602', 'Cursos de pilotagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1154, '8599603', 'Treinamento em informática', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1155, '8599604', 'Treinamento em desenvolvimento profissional e gerencial', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1156, '8599605', 'Cursos preparatórios para concursos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1157, '8599699', 'Outras atividades de ensino não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1158, '8610101', 'Atividades de atendimento hospitalar, exceto pronto-socorro e unidades para atendimento a urgências', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1159, '8610102', 'Atividades de atendimento em pronto-socorro e unidades hospitalares para atendimento a urgências', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1160, '8621601', 'UTI móvel', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1161, '8621602', 'Atividades de atenção ambulatorial executadas por médicos e odontólogos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1162, '8622400', 'Serviços de remoção de pacientes, exceto os serviços móveis de atendimento a urgências', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1163, '8630501', 'Atividade médica ambulatorial com recursos para realização de procedimentos cirúrgicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1164, '8630502', 'Atividade médica ambulatorial com recursos para realização de exames complementares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1165, '8630503', 'Atividade médica ambulatorial restrita a consultas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1166, '8630504', 'Atividade odontológica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1167, '8630505', 'Atividades de profissionais da nutrição', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1168, '8630506', 'Atividades de profissionais da psicologia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1169, '8630507', 'Atividades de profissionais da área de fonoaudiologia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1170, '8630508', 'Atividades de profissionais da área de fisioterapia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1171, '8630509', 'Atividades de profissionais da área de terapia ocupacional, ortoptia e outras atividades de atenção à saúde humana', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1172, '8640201', 'Laboratórios de anatomia patológica e citológica', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1173, '8640202', 'Laboratórios clínicos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1174, '8640203', 'Serviços de diálise e nefrologia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1175, '8640204', 'Serviços de tomografia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1176, '8640205', 'Serviços de diagnóstico por imagem com uso de radiação ionizante, exceto tomografia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1177, '8640206', 'Serviços de ressonância magnética', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1178, '8640207', 'Serviços de diagnóstico por imagem sem uso de radiação ionizante, exceto ressonância magnética', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1179, '8640208', 'Serviços de diagnóstico por registro gráfico - ECG, EEG e outros exames gráficos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1180, '8640209', 'Serviços de diagnóstico por métodos ópticos - endoscopia e outros exames ópticos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1181, '8640210', 'Serviços de diagnóstico por imagem - ultrassonografia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1182, '8640299', 'Atividades de serviços de complementação diagnóstica e terapêutica não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1183, '8650001', 'Atividades de enfermagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1184, '8650002', 'Atividades de profissionais da área de saúde, nível superior, exceto médicos e odontólogos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1185, '8650003', 'Atividades de profissionais da área de saúde, nível médio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1186, '8650004', 'Atividades de profissionais da área de medicina alternativa e complementar', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1187, '8650005', 'Atividades de profissionais da área de saúde animal', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1188, '8650099', 'Atividades de profissionais da área de saúde não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1189, '8660700', 'Atividades de apoio à gestão de saúde', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1190, '8690901', 'Atividades de práticas integrativas e complementares em saúde humana', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1191, '8690902', 'Atividades de bancos de leite humano', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1192, '8690903', 'Atividades de acupuntura', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1193, '8690904', 'Atividades de podologia', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1194, '8690999', 'Outras atividades de atenção à saúde humana não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1195, '8711501', 'Clínicas e residências geriátricas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1196, '8711502', 'Instituições de longa permanência para idosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1197, '8711503', 'Atividades de assistência a deficientes físicos, imunodeprimidos e convalescentes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1198, '8711504', 'Centros de apoio a pacientes com câncer e com AIDS', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1199, '8711505', 'Condomínios residenciais para idosos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1200, '8712300', 'Atividades de fornecimento de infraestrutura de apoio e assistência a paciente no domicílio', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1201, '8720401', 'Atividades de centros de apoio a pacientes com câncer e com AIDS em residência temporária', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1202, '8720499', 'Atividades de assistência psicossocial e à saúde a portadores de distúrbios psíquicos, deficiência mental e dependência química', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1203, '8730101', 'Orfanatos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1204, '8730102', 'Albergues assistenciais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1205, '8730199', 'Atividades de assistência social prestadas em residências coletivas e particulares não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1206, '8800600', 'Serviços de assistência social sem alojamento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1207, '9001901', 'Produção teatral', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1208, '9001902', 'Produção musical', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1209, '9001903', 'Produção de espetáculos de dança', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1210, '9001904', 'Produção de espetáculos circenses, de marionetes e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1211, '9001905', 'Produção de eventos artísticos e culturais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1212, '9001906', 'Atividades de sonorização e de iluminação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1213, '9002701', 'Atividades de artistas plásticos, jornalistas independentes e escritores', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1214, '9002702', 'Restauração de obras de arte', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1215, '9003500', 'Gestão de espaços para artes cênicas, espetáculos e outras atividades artísticas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1216, '9101500', 'Atividades de bibliotecas e arquivos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1217, '9102301', 'Atividades de museus e de exploração de lugares e prédios históricos e atrações similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1218, '9102302', 'Restauração e conservação de lugares e prédios históricos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1219, '9103100', 'Atividades de jardins botânicos, zoológicos, parques nacionais, reservas ecológicas e áreas de proteção ambiental', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1220, '9200600', 'Atividades de organizações associativas patronais e empresariais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1221, '9311500', 'Gestão de instalações de esportes', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1222, '9312300', 'Clubes sociais, esportivos e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1223, '9313100', 'Atividades de condicionamento físico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1224, '9319101', 'Produção e promoção de eventos esportivos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1225, '9319199', 'Outras atividades esportivas não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1226, '9321200', 'Parques de diversão e parques temáticos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1227, '9329801', 'Discotecas, danceterias, salões de dança e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1228, '9329802', 'Exploração de jogos de sinuca, bilhar e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1229, '9329803', 'Exploração de jogos eletrônicos recreativos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1230, '9329804', 'Exploração de boliches', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1231, '9329899', 'Outras atividades de recreação e lazer não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1232, '9411100', 'Atividades de organizações patronais e empresariais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1233, '9412000', 'Atividades de organizações sindicais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1234, '9420100', 'Atividades de organizações associativas profissionais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1235, '9430800', 'Atividades de associações de defesa de direitos sociais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1236, '9491000', 'Atividades de organizações religiosas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1237, '9492800', 'Atividades de organizações políticas', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1238, '9493600', 'Atividades associativas não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1239, '9511500', 'Reparação e manutenção de computadores e de equipamentos periféricos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1240, '9512600', 'Reparação e manutenção de equipamentos de comunicação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1241, '9521500', 'Reparação e manutenção de equipamentos eletroeletrônicos de uso pessoal e doméstico', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1242, '9529101', 'Reparação de calçados, bolsas e artigos de viagem', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1243, '9529102', 'Reparação de relógios', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1244, '9529103', 'Reparação de jóias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1245, '9529104', 'Reparação de artigos do vestuário', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1246, '9529105', 'Reparação de artigos e equipamentos de uso pessoal e doméstico não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1247, '9529199', 'Reparação e manutenção de outros objetos e equipamentos pessoais e domésticos não especificados anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1248, '9601701', 'Lavanderias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1249, '9601702', 'Tinturarias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1250, '9601703', 'Toalheiros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1251, '9602501', 'Cabeleireiros', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1252, '9602502', 'Outras atividades de tratamento de beleza', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1253, '9603301', 'Atividades funerárias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1254, '9603302', 'Serviços de cremação', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1255, '9603303', 'Serviços de sepultamento', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1256, '9603304', 'Serviços de funerárias', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1257, '9603305', 'Serviços de somatização', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1258, '9603399', 'Outras atividades de serviços funerários', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1259, '9609201', 'Clínicas de estética e similares', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1260, '9609202', 'Atividades de esteticista', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1261, '9609203', 'Atividades de tatuagem e colocação de piercing', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1262, '9609204', 'Atividades de produção de fotografias, exceto aérea e submarina', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1263, '9609205', 'Atividades de sauna e banhos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1264, '9609206', 'Serviços de tatuagem e colocação de piercing', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1265, '9609207', 'Alojamento, higiene e embelezamento de animais domésticos', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1266, '9609208', 'Atividades de estética e outros serviços de cuidados com animais', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1267, '9609299', 'Outras atividades de serviços pessoais não especificadas anteriormente', '2025-12-12 00:05:34', '2025-12-12 00:05:34'),
(1268, '9700500', 'Serviços domésticos', '2025-12-12 00:05:34', '2025-12-12 00:05:34');
INSERT INTO `cnae` (`id`, `codigo`, `descricao`, `created_at`, `updated_at`) VALUES
(1269, '9900800', 'Organismos internacionais e outras instituições extraterritoriais', '2025-12-12 00:05:34', '2025-12-12 00:05:34');

-- --------------------------------------------------------

--
-- Estrutura para tabela `departamentos`
--

CREATE TABLE `departamentos` (
  `id` int(11) NOT NULL COMMENT 'Chave primária do departamento',
  `nome` varchar(100) NOT NULL COMMENT 'Nome do Departamento',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `departamentos`
--

INSERT INTO `departamentos` (`id`, `nome`, `created_at`, `updated_at`) VALUES
(1, 'Administrativo', '2025-12-12 00:16:09', '2025-12-12 00:16:09'),
(2, 'Contabilidade e Financeiro', '2025-12-12 00:16:09', '2025-12-12 00:16:09'),
(3, 'Recursos Humanos e DP', '2025-12-12 00:16:09', '2025-12-12 00:16:09'),
(4, 'Comercial e Vendas', '2025-12-12 00:16:09', '2025-12-12 00:16:09'),
(5, 'Produção e Operações', '2025-12-12 00:16:09', '2025-12-12 00:16:09'),
(6, 'Forno e Secagem', '2025-12-12 00:16:09', '2025-12-12 00:16:09'),
(7, 'Logística e Expedição', '2025-12-12 00:16:09', '2025-12-12 00:16:09'),
(8, 'Manutenção Industrial', '2025-12-12 00:16:09', '2025-12-12 00:16:09'),
(9, 'Qualidade e Laboratório', '2025-12-12 00:16:09', '2025-12-12 00:16:09'),
(10, 'Suprimentos e Compras', '2025-12-12 00:16:09', '2025-12-12 00:16:09'),
(11, 'Informática', '2025-12-12 00:41:28', '2025-12-12 00:41:28');

-- --------------------------------------------------------

--
-- Estrutura para tabela `empresa`
--

CREATE TABLE `empresa` (
  `id` int(11) NOT NULL COMMENT 'Chave primária da empresa',
  `razao_social` varchar(255) NOT NULL COMMENT 'Nome legal e completo da empresa',
  `nome_fantasia` varchar(255) DEFAULT NULL COMMENT 'Nome comercial',
  `cnpj` varchar(18) NOT NULL COMMENT 'CNPJ',
  `porte` enum('ME','EPP','Outros') NOT NULL,
  `inscricao_estadual` varchar(30) DEFAULT NULL,
  `inscricao_municipal` varchar(30) DEFAULT NULL,
  `id_cnae_principal` int(11) NOT NULL COMMENT 'CNAE principal',
  `regime_tributario` enum('Simples Nacional','Lucro Presumido','Lucro Real') NOT NULL,
  `data_fundacao` date DEFAULT NULL,
  `natureza_juridica` varchar(100) DEFAULT NULL,
  `cep` varchar(10) DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `estado` varchar(2) DEFAULT NULL,
  `rua` varchar(255) DEFAULT NULL,
  `numero` varchar(10) DEFAULT NULL,
  `bairro` varchar(100) DEFAULT NULL,
  `complemento` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `site` varchar(100) DEFAULT NULL,
  `pessoa_contato` varchar(100) DEFAULT NULL,
  `situacao_cadastral` enum('Ativa','Suspensa','Baixada') NOT NULL DEFAULT 'Ativa',
  `criado_em` datetime DEFAULT current_timestamp(),
  `atualizado_em` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `empresa`
--

INSERT INTO `empresa` (`id`, `razao_social`, `nome_fantasia`, `cnpj`, `porte`, `inscricao_estadual`, `inscricao_municipal`, `id_cnae_principal`, `regime_tributario`, `data_fundacao`, `natureza_juridica`, `cep`, `cidade`, `estado`, `rua`, `numero`, `bairro`, `complemento`, `email`, `telefone`, `site`, `pessoa_contato`, `situacao_cadastral`, `criado_em`, `atualizado_em`) VALUES
(1, 'Ceramica Vicente Portela Limitada', 'Ceramica Vicente Portela', '09.207.910/0001-14', 'ME', '001052821.00-50', '145896', 123, 'Simples Nacional', '2007-09-26', 'Sociedade Empresária Limitada', '35130-000', 'Engenheiro Caldas', 'MG', 'Rodovia Margem da Br 116 Corrego das Pedras', 'SN', 'Zona Rural', 'Km 455,5', 'portella@gmail.com', '(33) 3234-xxxx', NULL, NULL, 'Ativa', '2025-12-12 00:50:30', '2025-12-12 00:53:29');

-- --------------------------------------------------------

--
-- Estrutura para tabela `ferias`
--

CREATE TABLE `ferias` (
  `id` int(11) NOT NULL COMMENT 'Chave primária do registro de férias',
  `funcionario_id` int(11) NOT NULL,
  `periodo_aquisitivo_inicio` date NOT NULL,
  `periodo_aquisitivo_fim` date NOT NULL,
  `data_inicio` date NOT NULL,
  `data_fim` date NOT NULL,
  `dias_concedidos` tinyint(3) NOT NULL,
  `abono_pecuniario` tinyint(3) UNSIGNED DEFAULT 0 COMMENT 'Número de dias convertidos em abono pecuniário (máximo 1/3 dos dias concedidos = 10 dias de 30)',
  `status` enum('Planejada','Em Andamento','Concluída','Cancelada','Atrasada','Abono Pecuniário','Vencida') NOT NULL DEFAULT 'Planejada' COMMENT 'Status da solicitação de férias.',
  `motivo` varchar(255) DEFAULT NULL,
  `criado_em` datetime DEFAULT current_timestamp(),
  `atualizado_em` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `ferias`
--

INSERT INTO `ferias` (`id`, `funcionario_id`, `periodo_aquisitivo_inicio`, `periodo_aquisitivo_fim`, `data_inicio`, `data_fim`, `dias_concedidos`, `abono_pecuniario`, `status`, `motivo`, `criado_em`, `atualizado_em`) VALUES
(1, 17, '2023-01-10', '2024-01-09', '2025-01-01', '2025-01-30', 30, 0, '', 'Atrasadas', '2025-12-12 17:48:18', '2025-12-12 18:38:16'),
(2, 1, '2025-07-13', '2026-07-12', '2026-03-01', '2026-03-20', 30, 0, 'Concluída', NULL, '2025-12-12 17:48:57', '2025-12-12 23:38:16'),
(3, 2, '2023-01-10', '2024-01-09', '2025-01-01', '2026-01-30', 30, 10, 'Abono Pecuniário', NULL, '2025-12-12 19:12:16', '2025-12-13 00:25:01'),
(4, 2, '2024-02-15', '2025-02-14', '2026-01-01', '2026-01-11', 30, 0, 'Cancelada', 'Demissão', '2025-12-12 23:18:59', '2025-12-13 00:41:23');

-- --------------------------------------------------------

--
-- Estrutura para tabela `fornecedores`
--

CREATE TABLE `fornecedores` (
  `id` int(11) NOT NULL COMMENT 'Chave primária do fornecedor',
  `razao_social` varchar(255) NOT NULL COMMENT 'Nome legal ou razão social da empresa',
  `nome_fantasia` varchar(255) DEFAULT NULL COMMENT 'Nome comercial (opcional)',
  `cnpj` varchar(18) NOT NULL COMMENT 'Cadastro Nacional da Pessoa Jurídica (CNPJ)',
  `telefone_contato` varchar(20) DEFAULT NULL,
  `email_contato` varchar(100) DEFAULT NULL,
  `nome_contato` varchar(150) DEFAULT NULL COMMENT 'Pessoa de contato na empresa fornecedora',
  `cep` varchar(10) DEFAULT NULL,
  `endereco` varchar(255) DEFAULT NULL COMMENT 'Rua, Avenida, etc.',
  `numero` varchar(10) DEFAULT NULL,
  `complemento` varchar(100) DEFAULT NULL,
  `bairro` varchar(100) DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `estado` varchar(2) DEFAULT NULL COMMENT 'Sigla do Estado',
  `ativo` enum('sim','nao') NOT NULL DEFAULT 'sim' COMMENT 'Status do fornecedor (Ativo/Inativo)',
  `observacoes` text DEFAULT NULL,
  `criado_em` datetime DEFAULT current_timestamp(),
  `atualizado_em` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `fornecedores`
--

INSERT INTO `fornecedores` (`id`, `razao_social`, `nome_fantasia`, `cnpj`, `telefone_contato`, `email_contato`, `nome_contato`, `cep`, `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `estado`, `ativo`, `observacoes`, `criado_em`, `atualizado_em`) VALUES
(1, 'TechPlus Soluções em Tecnologia Ltda', 'IT Solutions LDA', '12345678000190', '(64) 98582-3564', 'hauriovieira@gmail.com', 'haurio', '74843710', 'Avenida Rio Verde', '10', NULL, 'Setor dos Afonsos', 'Goiânia', 'GO', 'sim', 'teste', '2025-12-13 01:07:28', '2025-12-13 01:07:28');

-- --------------------------------------------------------

--
-- Estrutura para tabela `funcionarios`
--

CREATE TABLE `funcionarios` (
  `id` int(11) NOT NULL COMMENT 'Chave primária do funcionário',
  `nome` varchar(255) NOT NULL,
  `cpf` varchar(14) NOT NULL COMMENT 'Cadastro de Pessoa Física',
  `email` varchar(255) NOT NULL,
  `cargo_id` int(11) NOT NULL COMMENT 'Chave estrangeira para o cargo',
  `departamento_id` int(11) NOT NULL COMMENT 'Chave estrangeira para o departamento',
  `status` enum('ativo','afastado','demitido') NOT NULL DEFAULT 'ativo' COMMENT 'Status atual do funcionário',
  `data_admissao` date NOT NULL COMMENT 'Data de início do contrato',
  `data_demissao` date DEFAULT NULL COMMENT 'Data de desligamento (se houver)',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `funcionarios`
--

INSERT INTO `funcionarios` (`id`, `nome`, `cpf`, `email`, `cargo_id`, `departamento_id`, `status`, `data_admissao`, `data_demissao`, `created_at`, `updated_at`) VALUES
(1, 'Haurio Vieira da Silva', '04778787170', 'hauriovieira@gmail.com', 45, 11, 'ativo', '2025-07-15', NULL, '2025-12-12 00:48:16', '2025-12-12 01:19:54'),
(2, 'João da Silva', '123.456.789-00', 'joao.silva@portela.com.br', 1, 1, 'ativo', '2023-01-10', NULL, '2025-12-12 01:13:40', '2025-12-12 01:20:01'),
(3, 'Maria Oliveira', '234.567.890-11', 'maria.oliveira@portela.com.br', 2, 1, 'ativo', '2023-02-15', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(4, 'Carlos Souza', '345.678.901-22', 'carlos.souza@portela.com.br', 3, 1, 'ativo', '2023-03-01', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(5, 'Ana Paula', '456.789.012-33', 'ana.paula@portela.com.br', 5, 2, 'ativo', '2023-01-20', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(6, 'Pedro Gomes', '567.890.123-44', 'pedro.gomes@portela.com.br', 6, 2, 'ativo', '2023-04-05', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(7, 'Juliana Costa', '678.901.234-55', 'juliana.costa@portela.com.br', 7, 2, 'ativo', '2023-05-12', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(8, 'Rafael Martins', '789.012.345-66', 'rafael.martins@portela.com.br', 10, 3, 'ativo', '2023-06-01', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(9, 'Fernanda Lima', '890.123.456-77', 'fernanda.lima@portela.com.br', 11, 3, 'ativo', '2023-06-20', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(10, 'Gustavo Rocha', '901.234.567-88', 'gustavo.rocha@portela.com.br', 14, 4, 'ativo', '2023-07-10', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(11, 'Patrícia Alves', '012.345.678-99', 'patricia.alves@portela.com.br', 15, 4, 'ativo', '2023-08-01', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(12, 'Bruno Ferreira', '111.222.333-00', 'bruno.ferreira@portela.com.br', 19, 5, 'ativo', '2023-08-15', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(13, 'Carla Mendes', '222.333.444-11', 'carla.mendes@portela.com.br', 20, 5, 'ativo', '2023-09-01', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(14, 'Diego Pires', '333.444.555-22', 'diego.pires@portela.com.br', 25, 6, 'ativo', '2023-09-15', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(15, 'Eliana Santos', '444.555.666-33', 'eliana.santos@portela.com.br', 29, 7, 'ativo', '2023-10-01', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(16, 'Fábio Lima', '555.666.777-44', 'fabio.lima@portela.com.br', 44, 11, 'ativo', '2023-10-10', NULL, '2025-12-12 01:13:40', '2025-12-12 01:30:14'),
(17, 'João Silva', '111.111.111-11', 'joao.silva@empresa.com', 1, 1, 'ativo', '2023-01-10', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(18, 'Maria Oliveira', '222.222.222-22', 'maria.oliveira@empresa.com', 2, 1, 'ativo', '2023-02-15', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(19, 'Carlos Pereira', '333.333.333-33', 'carlos.pereira@empresa.com', 3, 1, 'ativo', '2023-03-20', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(20, 'Ana Souza', '444.444.444-44', 'ana.souza@empresa.com', 4, 1, 'ativo', '2023-04-05', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(21, 'Paulo Santos', '555.555.555-55', 'paulo.santos@empresa.com', 5, 2, 'ativo', '2023-01-12', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(22, 'Juliana Costa', '666.666.666-66', 'juliana.costa@empresa.com', 6, 2, 'ativo', '2023-03-10', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(23, 'Fernanda Lima', '77777777777', 'fernanda.lima@empresa.com', 7, 2, 'ativo', '2023-02-22', NULL, '2025-12-12 01:15:29', '2026-04-11 15:16:21'),
(24, 'Diego Pires', '888.888.888-88', 'diego.pires@empresa.com', 8, 2, 'ativo', '2023-04-01', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(25, 'Patrícia Alves', '999.999.999-99', 'patricia.alves@empresa.com', 9, 2, 'ativo', '2023-05-15', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(26, 'Rafael Martins', '123.123.123-12', 'rafael.martins@empresa.com', 10, 3, 'ativo', '2023-06-20', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(27, 'Carla Mendes', '234.234.234-23', 'carla.mendes@empresa.com', 11, 3, 'ativo', '2023-07-10', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(28, 'Bruno Rocha', '345.345.345-34', 'bruno.rocha@empresa.com', 12, 3, 'ativo', '2023-08-05', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(29, 'Diego Pires', '456.456.456-45', 'diego.pires2@empresa.com', 13, 3, 'ativo', '2023-09-12', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(30, 'Sofia Almeida', '567.567.567-56', 'sofia.almeida@empresa.com', 14, 4, 'ativo', '2023-10-01', NULL, '2025-12-12 01:15:29', '2025-12-12 01:30:14'),
(32, 'Lucas Ferreira', '678.678.678-67', 'lucas.ferreira@empresa.com', 15, 4, 'ativo', '2023-11-15', NULL, '2025-12-12 01:15:29', '2025-12-12 01:15:29');

-- --------------------------------------------------------

--
-- Estrutura para tabela `funcionarios_dados_bancarios`
--

CREATE TABLE `funcionarios_dados_bancarios` (
  `funcionario_id` int(11) NOT NULL COMMENT 'Chave estrangeira e primária para o funcionário',
  `forma_pagamento` enum('pix','transferencia','dinheiro') NOT NULL DEFAULT 'transferencia' COMMENT 'Método principal de pagamento',
  `chave_pix` varchar(255) DEFAULT NULL COMMENT 'Chave PIX do funcionário',
  `banco_id` int(11) DEFAULT NULL COMMENT 'Chave estrangeira para o banco (tabela bancos)',
  `agencia` varchar(10) DEFAULT NULL COMMENT 'Número da agência bancária',
  `conta` varchar(20) DEFAULT NULL COMMENT 'Número da conta bancária com dígito',
  `tipo_conta` enum('corrente','poupanca','salario') DEFAULT 'corrente' COMMENT 'Tipo de conta bancária',
  `criado_em` datetime DEFAULT current_timestamp(),
  `atualizado_em` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `funcionarios_dados_bancarios`
--

INSERT INTO `funcionarios_dados_bancarios` (`funcionario_id`, `forma_pagamento`, `chave_pix`, `banco_id`, `agencia`, `conta`, `tipo_conta`, `criado_em`, `atualizado_em`) VALUES
(1, 'transferencia', 'haurio.silva@pix.com', 62, '1001', '00010001', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(2, 'pix', 'joao.silva@pix.com', 62, '1002', '00010002', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(3, 'transferencia', 'maria.oliveira@pix.com', 63, '1003', '00010003', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(4, 'transferencia', 'carlos.souza@pix.com', 64, '1004', '00010004', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(5, 'pix', 'ana.paula@pix.com', 65, '1005', '00010005', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(6, 'transferencia', 'pedro.gomes@pix.com', 66, '1006', '00010006', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(7, 'pix', 'juliana.costa@pix.com', 67, '1007', '00010007', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(8, 'transferencia', 'rafael.martins@pix.com', 62, '1008', '00010008', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(9, 'pix', 'fernanda.lima@pix.com', 63, '1009', '00010009', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(10, 'transferencia', 'gustavo.rocha@pix.com', 64, '1010', '00010010', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(11, 'pix', 'patricia.alves@pix.com', 65, '1011', '00010011', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(12, 'transferencia', 'bruno.ferreira@pix.com', 66, '1012', '00010012', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(13, 'pix', 'carla.mendes@pix.com', 67, '1013', '00010013', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(14, 'transferencia', 'diego.pires@pix.com', 62, '1014', '00010014', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(15, 'pix', 'eliana.santos@pix.com', 63, '1015', '00010015', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(16, 'transferencia', 'fabio.lima@pix.com', 64, '1016', '00010016', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(17, 'pix', 'joao.silva2@pix.com', 65, '1017', '00010017', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(18, 'transferencia', 'maria.oliveira2@pix.com', 66, '1018', '00010018', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(19, 'pix', 'carlos.pereira@pix.com', 67, '1019', '00010019', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(20, 'transferencia', 'ana.souza@pix.com', 62, '1020', '00010020', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(21, 'pix', 'paulo.santos@pix.com', 63, '1021', '00010021', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(22, 'transferencia', 'juliana.costa2@pix.com', 64, '1022', '00010022', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(23, 'pix', 'fernanda.lima2@pix.com', 65, NULL, NULL, NULL, '2025-12-12 01:34:49', '2026-04-11 15:16:21'),
(24, 'transferencia', 'diego.pires2@pix.com', 66, '1024', '00010024', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(25, 'pix', 'patricia.alves2@pix.com', 67, '1025', '00010025', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(26, 'transferencia', 'rafael.martins2@pix.com', 62, '1026', '00010026', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(27, 'pix', 'carla.mendes2@pix.com', 63, '1027', '00010027', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(28, 'transferencia', 'bruno.rocha@pix.com', 64, '1028', '00010028', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(29, 'pix', 'diego.pires3@pix.com', 65, '1029', '00010029', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(30, 'transferencia', 'sofia.almeida@pix.com', 66, '1030', '00010030', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49'),
(32, 'transferencia', 'lucas.ferreira@pix.com', 62, '1032', '00010032', 'corrente', '2025-12-12 01:34:49', '2025-12-12 01:34:49');

-- --------------------------------------------------------

--
-- Estrutura para tabela `funcionarios_dados_pessoais`
--

CREATE TABLE `funcionarios_dados_pessoais` (
  `funcionario_id` int(11) NOT NULL COMMENT 'Chave estrangeira e primária para o funcionário',
  `data_nascimento` date NOT NULL,
  `cidade_nascimento` varchar(100) DEFAULT NULL,
  `estado_nascimento` varchar(2) DEFAULT NULL COMMENT 'Sigla do Estado de nascimento',
  `nacionalidade` varchar(50) NOT NULL DEFAULT 'Brasileira',
  `escolaridade` enum('fundamental incompleto','fundamental completo','medio incompleto','medio completo','superior incompleto','superior completo','pos-graduacao','mestrado','doutorado') NOT NULL,
  `telefone` varchar(20) DEFAULT NULL COMMENT 'Telefone pessoal para contato',
  `estado_civil` enum('solteiro(a)','casado(a)','divorciado(a)','viuvo(a)','separado(a)') NOT NULL,
  `titulo_eleitor` varchar(20) DEFAULT NULL,
  `zona_eleitoral` varchar(10) DEFAULT NULL,
  `secao_eleitoral` varchar(10) DEFAULT NULL,
  `reservista` varchar(20) DEFAULT NULL COMMENT 'Número do Certificado de Reservista',
  `categoria_reservista` varchar(20) DEFAULT NULL,
  `rg` varchar(20) NOT NULL COMMENT 'Registro Geral (RG)',
  `data_emissao_rg` date DEFAULT NULL,
  `orgao_emissor_rg` varchar(10) DEFAULT NULL,
  `estado_emissor_rg` varchar(2) DEFAULT NULL,
  `nome_pai` varchar(255) DEFAULT NULL,
  `nome_mae` varchar(255) DEFAULT NULL,
  `conjuge` varchar(255) DEFAULT NULL COMMENT 'Nome completo do cônjuge (se casado)',
  `possui_filhos` enum('sim','nao') NOT NULL DEFAULT 'nao' COMMENT 'Indicador se possui filhos',
  `criado_em` datetime DEFAULT current_timestamp(),
  `atualizado_em` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `funcionarios_dados_pessoais`
--

INSERT INTO `funcionarios_dados_pessoais` (`funcionario_id`, `data_nascimento`, `cidade_nascimento`, `estado_nascimento`, `nacionalidade`, `escolaridade`, `telefone`, `estado_civil`, `titulo_eleitor`, `zona_eleitoral`, `secao_eleitoral`, `reservista`, `categoria_reservista`, `rg`, `data_emissao_rg`, `orgao_emissor_rg`, `estado_emissor_rg`, `nome_pai`, `nome_mae`, `conjuge`, `possui_filhos`, `criado_em`, `atualizado_em`) VALUES
(1, '1985-07-15', 'São Paulo', 'SP', 'Brasileira', 'pos-graduacao', '11988887777', 'casado(a)', '12345678901', '0100', '0050', '12345678901', '1ª Categoria', '351234567', '2005-03-01', 'SSP', 'SP', 'Paulo S. Lima', 'Ana C. Silva', 'Laura C. Mendes', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:40'),
(2, '1990-01-10', 'Rio de Janeiro', 'RJ', 'Brasileira', 'superior completo', '21999998888', 'solteiro(a)', '12345678902', '0200', '0060', NULL, NULL, '229876543', '2008-05-10', 'DETRAN', 'RJ', 'João P. Neto', 'Maria A. Santos', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:40'),
(3, '1988-02-15', 'Belo Horizonte', 'MG', 'Brasileira', 'superior incompleto', '31988889999', 'divorciado(a)', '12345678903', '0300', '0070', '12345678903', '2ª Categoria', '154567890', '2004-09-20', 'PC', 'MG', 'Pedro R. Almeida', 'Carla B. Costa', 'Ex-esposa Maria', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:40'),
(4, '1992-03-01', 'Curitiba', 'PR', 'Brasileira', 'medio completo', '41977778888', 'solteiro(a)', '12345678904', '0400', '0080', NULL, NULL, '801122334', '2010-01-15', 'SSP', 'PR', 'Carlos A. Oliveira', 'Renata F. Souza', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:40'),
(5, '1987-01-20', 'Fortaleza', 'CE', 'Brasileira', 'mestrado', '85988889999', 'casado(a)', '12345678905', '0500', '0090', '12345678905', '1ª Categoria', '954433221', '2006-02-05', 'SSPDS', 'CE', 'Roberto N. Gomes', 'Patricia M. Martins', 'Julia A. Rodrigues', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(6, '1985-04-05', 'Recife', 'PE', 'Brasileira', 'superior completo', '81988887777', 'casado(a)', '12345678906', '0600', '0100', '12345678906', '2ª Categoria', '785566778', '2007-06-12', 'SDS', 'PE', 'Fernando J. Lima', 'Beatriz C. Rocha', 'Teresa R. Dias', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(7, '1991-05-12', 'Porto Alegre', 'RS', 'Brasileira', 'superior incompleto', '51999998888', 'solteiro(a)', '12345678907', '0700', '0110', NULL, NULL, '563344556', '2009-08-25', 'IGP', 'RS', 'Luiz O. Barreto', 'Vera D. Alves', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(8, '1989-06-01', 'Salvador', 'BA', 'Brasileira', 'medio completo', '71988881111', 'viuvo(a)', '12345678908', '0800', '0120', '12345678908', '1ª Categoria', '667788990', '2005-10-30', 'SSP', 'BA', 'Antônio M. Ferreira', 'Helena S. Pires', 'Falecida Esposa', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(9, '1986-06-20', 'Goiânia', 'GO', 'Brasileira', 'pos-graduacao', '62999992222', 'casado(a)', '12345678909', '0900', '0130', '12345678909', '2ª Categoria', '401020304', '2004-12-18', 'SSP', 'GO', 'Marcelo T. Nunes', 'Elaine G. Dias', 'Fábio H. Oliveira', 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(10, '1993-07-10', 'Manaus', 'AM', 'Brasileira', 'superior completo', '92988883333', 'solteiro(a)', '12345678910', '1000', '0140', NULL, NULL, '115566778', '2011-03-01', 'PC', 'AM', 'Ricardo V. Santos', 'Débora K. Moreira', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(11, '1990-08-01', 'Florianópolis', 'SC', 'Brasileira', 'superior incompleto', '48988884444', 'casado(a)', '12345678911', '1100', '0150', '12345678911', '1ª Categoria', '498765432', '2009-07-20', 'SSP', 'SC', 'Gustavo A. Reis', 'Sandra L. Souza', 'Michele S. Dias', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(12, '1988-08-15', 'Vitória', 'ES', 'Brasileira', 'medio completo', '27988885555', 'solteiro(a)', '12345678912', '1200', '0160', NULL, NULL, '301144770', '2007-02-10', 'SSP', 'ES', 'Eduardo V. Mello', 'Camila T. Borges', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(13, '1987-09-01', 'Belém', 'PA', 'Brasileira', 'pos-graduacao', '91988886666', 'separado(a)', '12345678913', '1300', '0170', '12345678913', '2ª Categoria', '445566778', '2006-04-15', 'PC', 'PA', 'Wellington F. Silva', 'Luciana K. Paz', 'Ex-cônjuge Marcos', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(14, '1991-09-15', 'João Pessoa', 'PB', 'Brasileira', 'superior completo', '83999987777', 'solteiro(a)', '12345678914', '1400', '0180', NULL, NULL, '556677889', '2010-11-20', 'PC', 'PB', 'André J. Rodrigues', 'Juliana T. Ferreira', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(15, '1986-10-01', 'Campinas', 'SP', 'Brasileira', 'superior incompleto', '19988888888', 'casado(a)', '12345678915', '1500', '0190', '12345678915', '1ª Categoria', '419988776', '2005-01-20', 'SSP', 'SP', 'Henrique D. Costa', 'Vanessa A. Pinto', 'Mariana S. Moura', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(16, '1990-10-10', 'Cuiabá', 'MT', 'Brasileira', 'medio completo', '65999989999', 'solteiro(a)', '12345678916', '1600', '0200', NULL, NULL, '201030405', '2009-04-01', 'PC', 'MT', 'Felipe G. Santos', 'Isabela V. Ramos', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(17, '1992-01-10', 'São Paulo', 'SP', 'Brasileira', 'doutorado', '11911112222', 'casado(a)', '12345678917', '1700', '0210', '12345678917', '1ª Categoria', '331122445', '2010-06-25', 'SSP', 'SP', 'João Carlos Pereira', 'Silvia M. Oliveira', 'Sofia R. Neves', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(18, '1988-02-15', 'Rio de Janeiro', 'RJ', 'Brasileira', 'superior completo', '21922223333', 'solteiro(a)', '12345678918', '1800', '0220', NULL, NULL, '249988776', '2006-03-10', 'SSP', 'RJ', 'Marcelo T. Costa', 'Viviane A. Souza', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(19, '1990-03-20', 'Belo Horizonte', 'MG', 'Brasileira', 'superior incompleto', '31933324444', 'divorciado(a)', '12345678919', '1900', '0230', '12345678919', '2ª Categoria', '175566778', '2008-08-05', 'PC', 'MG', 'Geraldo R. Pires', 'Lucia M. Duarte', 'Ex-esposa Juliana', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(20, '1989-04-05', 'Curitiba', 'PR', 'Brasileira', 'medio completo', '41944425555', 'solteiro(a)', '12345678920', '2000', '0240', NULL, NULL, '884433221', '2007-12-12', 'SSP', 'PR', 'Ricardo S. Alves', 'Paula V. Dantas', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(21, '1991-01-12', 'Fortaleza', 'CE', 'Brasileira', 'pos-graduacao', '85955526666', 'casado(a)', '12345678921', '2100', '0250', '12345678921', '1ª Categoria', '991122334', '2009-02-28', 'SSPDS', 'CE', 'Roberto A. Gomes', 'Carla M. Oliveira', 'Patrícia F. Lima', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(22, '1987-03-10', 'Recife', 'PE', 'Brasileira', 'superior completo', '81966627777', 'casado(a)', '12345678922', '2200', '0260', '12345678922', '2ª Categoria', '775544332', '2005-07-15', 'SDS', 'PE', 'José R. Silva', 'Elaine C. Lima', 'Rogério S. Pires', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(23, '1990-02-22', 'Porto Alegre', 'RS', 'Brasileira', 'superior incompleto', '51977728888', 'solteiro(a)', '12345678923', '2300', '0270', NULL, NULL, '541234987', '2008-11-01', 'IGP', 'RS', 'Manoel D. Soares', 'Adriana P. Lins', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(24, '1986-04-01', 'Salvador', 'BA', 'Brasileira', 'medio completo', '71988829999', 'solteiro(a)', '12345678924', '2400', '0280', '12345678924', '1ª Categoria', '671234987', '2004-05-20', 'SSP', 'BA', 'Ronaldo B. Neves', 'Sandra C. Diniz', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(25, '1993-05-15', 'Goiânia', 'GO', 'Brasileira', 'mestrado', '62999930000', 'casado(a)', '12345678925', '2500', '0290', '12345678925', '2ª Categoria', '418877665', '2011-09-10', 'SSP', 'GO', 'Pedro H. Torres', 'Ana L. Fonseca', 'Rodrigo A. Brito', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(26, '1988-06-20', 'Manaus', 'AM', 'Brasileira', 'superior completo', '92911131111', 'solteiro(a)', '12345678926', '2600', '0300', NULL, NULL, '109988776', '2006-01-01', 'PC', 'AM', 'Carlos F. Alves', 'Marcia D. Guerra', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(27, '1990-07-10', 'Florianópolis', 'SC', 'Brasileira', 'superior incompleto', '48922232222', 'casado(a)', '12345678927', '2700', '0310', '12345678927', '1ª Categoria', '471122334', '2008-04-10', 'SSP', 'SC', 'Ramon H. Oliveira', 'Silvana P. Costa', 'Elisa N. Mello', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(28, '1987-08-05', 'Vitória', 'ES', 'Brasileira', 'medio completo', '27933343333', 'solteiro(a)', '12345678928', '2800', '0320', NULL, NULL, '334455667', '2005-09-29', 'PC', 'ES', 'Marcos J. Nogueira', 'Beatriz F. Rocha', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(29, '1991-09-12', 'Belém', 'PA', 'Brasileira', 'pos-graduacao', '91944454444', 'separado(a)', '12345678929', '2900', '0330', '12345678929', '2ª Categoria', '400112233', '2009-01-18', 'SSP', 'PA', 'Daniel R. Martins', 'Clara P. Costa', 'Ex-cônjuge Ana', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(30, '1989-10-01', 'João Pessoa', 'PB', 'Brasileira', 'superior completo', '83955565555', 'solteiro(a)', '12345678930', '3000', '0340', NULL, NULL, '588776654', '2007-03-20', 'PC', 'PB', 'Arthur V. Silva', 'Rebeca A. Nunes', NULL, 'nao', '2025-12-12 01:34:34', '2025-12-12 02:07:41'),
(32, '1988-12-12', 'Cuiabá', 'MT', 'Brasileira', 'superior incompleto', '65977787777', 'casado(a)', '12345678932', '3200', '0360', '12345678932', '1ª Categoria', '224466880', '2006-02-01', 'PC', 'MT', 'Vicente C. Rocha', 'Heloísa T. Sales', 'Joana D. Castro', 'sim', '2025-12-12 01:34:34', '2025-12-12 02:07:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `funcionarios_dados_profissionais`
--

CREATE TABLE `funcionarios_dados_profissionais` (
  `funcionario_id` int(11) NOT NULL COMMENT 'Chave estrangeira e primária para o funcionário',
  `ctps` varchar(20) NOT NULL COMMENT 'Número da Carteira de Trabalho e Previdência Social',
  `ctps_estado` varchar(2) DEFAULT NULL COMMENT 'Estado de emissão da CTPS',
  `ctps_data_emissao` date DEFAULT NULL,
  `pis` varchar(15) NOT NULL COMMENT 'Número do PIS/PASEP/NIT',
  `salario` decimal(10,2) NOT NULL COMMENT 'Salário base mensal bruto (Ex: 3500.00)',
  `carga_horaria_mensal` smallint(4) NOT NULL COMMENT 'Carga horária total no mês (Ex: 220, 180)',
  `carga_horaria_semanal` tinyint(2) NOT NULL COMMENT 'Carga horária semanal (Ex: 44, 30)',
  `periodo_experiencia` tinyint(2) DEFAULT 90 COMMENT 'Duração do período de experiência em dias (Ex: 45, 90)',
  `adicional_noturno` tinyint(1) DEFAULT 0 COMMENT 'Indicador se o funcionário recebe adicional noturno (0=Não, 1=Sim)',
  `primeiro_emprego` enum('sim','nao') NOT NULL DEFAULT 'nao' COMMENT 'Indicador se este é o primeiro emprego formal',
  `motivo_saida` varchar(255) DEFAULT NULL COMMENT 'Breve descrição do motivo do desligamento',
  `horario_inicio_semana` time DEFAULT NULL,
  `horario_fim_semana` time DEFAULT NULL,
  `horario_inicio_sabado` time DEFAULT NULL,
  `horario_fim_sabado` time DEFAULT NULL,
  `horario_inicio_domingo` time DEFAULT NULL,
  `horario_fim_domingo` time DEFAULT NULL,
  `criado_em` datetime DEFAULT current_timestamp(),
  `atualizado_em` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `funcionarios_dados_profissionais`
--

INSERT INTO `funcionarios_dados_profissionais` (`funcionario_id`, `ctps`, `ctps_estado`, `ctps_data_emissao`, `pis`, `salario`, `carga_horaria_mensal`, `carga_horaria_semanal`, `periodo_experiencia`, `adicional_noturno`, `primeiro_emprego`, `motivo_saida`, `horario_inicio_semana`, `horario_fim_semana`, `horario_inicio_sabado`, `horario_fim_sabado`, `horario_inicio_domingo`, `horario_fim_domingo`, `criado_em`, `atualizado_em`) VALUES
(1, '00011101', 'SP', '2005-01-10', '12345678901', 4800.00, 200, 40, 90, 0, 'nao', NULL, '09:00:00', '18:00:00', NULL, NULL, NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:46'),
(2, '00011102', 'RJ', '2010-02-20', '12345678902', 3500.00, 220, 44, 90, 20, 'sim', NULL, '22:00:00', '06:00:00', '22:00:00', '02:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(3, '00011103', 'MG', '2012-03-15', '12345678903', 3600.00, 220, 44, 90, 0, 'nao', NULL, '07:00:00', '17:00:00', '07:00:00', '11:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(4, '00011104', 'PR', '2015-04-01', '12345678904', 3800.00, 220, 44, 90, 1, 'sim', NULL, '09:00:00', '19:00:00', '09:00:00', '13:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(5, '00011105', 'CE', '2011-01-20', '12345678905', 4000.00, 220, 44, 90, 0, 'nao', NULL, '08:00:00', '18:48:00', NULL, NULL, NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(6, '00011106', 'PE', '2013-04-05', '12345678906', 3700.00, 220, 44, 90, 0, 'nao', NULL, '08:30:00', '18:30:00', '08:30:00', '12:30:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(7, '00011107', 'RS', '2014-05-12', '12345678907', 3900.00, 220, 44, 90, 1, 'nao', NULL, '09:00:00', '19:48:00', NULL, NULL, NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(8, '00011108', 'BA', '2016-06-01', '12345678908', 3600.00, 220, 44, 90, 20, 'sim', NULL, '23:00:00', '07:00:00', '23:00:00', '03:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(9, '00011109', 'GO', '2017-06-20', '12345678909', 4100.00, 220, 44, 90, 0, 'nao', NULL, '08:00:00', '18:00:00', '08:00:00', '12:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(10, '00011110', 'AM', '2018-07-10', '12345678910', 4200.00, 220, 44, 90, 0, 'nao', NULL, '07:30:00', '18:18:00', NULL, NULL, NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(11, '00011111', 'SC', '2019-08-01', '12345678911', 4300.00, 220, 44, 90, 1, 'nao', NULL, '08:00:00', '18:00:00', '08:00:00', '12:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(12, '00011112', 'ES', '2020-08-15', '12345678912', 3900.00, 220, 44, 90, 20, 'sim', NULL, '22:00:00', '06:00:00', '22:00:00', '02:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(13, '00011113', 'PA', '2021-09-01', '12345678913', 4000.00, 220, 44, 90, 0, 'nao', NULL, '09:00:00', '19:00:00', '09:00:00', '13:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(14, '00011114', 'PB', '2022-09-15', '12345678914', 3500.00, 220, 44, 90, 20, 'sim', NULL, '23:00:00', '07:00:00', '23:00:00', '03:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(15, '00011115', 'SP', '2023-10-01', '12345678915', 3600.00, 220, 44, 90, 1, 'nao', NULL, '08:30:00', '19:18:00', NULL, NULL, NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(16, '00011116', 'MT', '2023-10-10', '12345678916', 3700.00, 220, 44, 90, 0, 'nao', NULL, '07:00:00', '17:00:00', '07:00:00', '11:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(17, '00011117', 'SP', '2010-01-10', '12345678917', 3500.00, 220, 44, 90, 20, 'sim', NULL, '22:00:00', '06:00:00', '22:00:00', '02:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(18, '00011118', 'RJ', '2011-02-15', '12345678918', 3600.00, 220, 44, 90, 1, 'nao', NULL, '10:00:00', '20:48:00', NULL, NULL, NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(19, '00011119', 'MG', '2012-03-20', '12345678919', 3700.00, 220, 44, 90, 20, 'sim', NULL, '23:00:00', '07:00:00', '23:00:00', '03:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(20, '00011120', 'PR', '2013-04-05', '12345678920', 3800.00, 220, 44, 90, 1, 'nao', NULL, '08:00:00', '18:00:00', '08:00:00', '12:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(21, '00011121', 'CE', '2014-01-12', '12345678921', 3900.00, 220, 44, 90, 0, 'nao', NULL, '09:00:00', '19:48:00', NULL, NULL, NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(22, '00011122', 'PE', '2015-03-10', '12345678922', 4000.00, 220, 44, 90, 20, 'sim', NULL, '22:00:00', '06:00:00', '22:00:00', '02:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(23, '00011123', 'RS', '2016-02-22', '12345678923', 4100.00, 220, 44, 90, 1, 'nao', NULL, '08:30:00', '18:30:00', '08:30:00', '12:30:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:45'),
(24, '00011124', 'BA', '2017-04-01', '12345678924', 4200.00, 220, 44, 90, 20, 'sim', NULL, '23:00:00', '07:00:00', '23:00:00', '03:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:46'),
(25, '00011125', 'GO', '2018-05-15', '12345678925', 4300.00, 220, 44, 90, 1, 'nao', NULL, '09:00:00', '19:48:00', NULL, NULL, NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:46'),
(26, '00011126', 'AM', '2019-06-20', '12345678926', 4400.00, 220, 44, 90, 0, 'nao', NULL, '07:00:00', '17:00:00', '07:00:00', '11:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:46'),
(27, '00011127', 'SC', '2020-07-10', '12345678927', 4500.00, 220, 44, 90, 1, 'sim', NULL, '08:00:00', '18:00:00', '08:00:00', '12:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:46'),
(28, '00011128', 'ES', '2021-08-05', '12345678928', 4600.00, 220, 44, 90, 0, 'nao', NULL, '09:00:00', '19:48:00', NULL, NULL, NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:46'),
(29, '00011129', 'PA', '2022-09-12', '12345678929', 4700.00, 220, 44, 90, 1, 'sim', NULL, '08:30:00', '18:30:00', '08:30:00', '12:30:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:46'),
(30, '00011130', 'PB', '2023-10-01', '12345678930', 4800.00, 220, 44, 90, 0, 'nao', NULL, '07:30:00', '17:30:00', '07:30:00', '11:30:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:46'),
(32, '00011132', 'MT', '2023-12-01', '12345678932', 5000.00, 220, 44, 90, 20, 'sim', NULL, '22:00:00', '06:00:00', '22:00:00', '02:00:00', NULL, NULL, '2025-12-12 01:35:34', '2025-12-12 02:01:46');

-- --------------------------------------------------------

--
-- Estrutura para tabela `funcionarios_dependentes`
--

CREATE TABLE `funcionarios_dependentes` (
  `id` int(11) NOT NULL COMMENT 'Chave primária do dependente',
  `funcionario_id` int(11) NOT NULL COMMENT 'Chave estrangeira para o funcionário titular',
  `nome` varchar(255) NOT NULL COMMENT 'Nome completo do dependente',
  `data_nascimento` date NOT NULL,
  `parentesco` enum('filho(a)','conjuge/companheiro(a)','pai/mae','irmao(a)','outros') NOT NULL COMMENT 'Grau de parentesco ou tipo de dependência legal',
  `cpf` varchar(14) DEFAULT NULL COMMENT 'CPF do dependente',
  `ativo` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Indica se o dependente está ativo para benefícios',
  `criado_em` datetime DEFAULT current_timestamp(),
  `atualizado_em` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `funcionarios_dependentes`
--

INSERT INTO `funcionarios_dependentes` (`id`, `funcionario_id`, `nome`, `data_nascimento`, `parentesco`, `cpf`, `ativo`, `criado_em`, `atualizado_em`) VALUES
(1, 1, 'Ana Vieira', '2005-03-15', 'filho(a)', '12345091', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(2, 1, 'Carlos Vieira', '2008-07-20', 'filho(a)', '12345092', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(3, 2, 'Lucas Oliveira', '2010-05-10', 'filho(a)', '12345093', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(4, 3, 'Beatriz Santos', '2012-09-12', 'filho(a)', '12345094', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(5, 4, 'Fernanda Souza', '2007-11-20', 'filho(a)', '12345095', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(6, 5, 'Pedro Paula', '2011-01-30', 'filho(a)', '12345096', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(7, 6, 'Mariana Costa', '2013-04-15', 'filho(a)', '12345097', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(8, 7, 'Ricardo Martins', '2009-08-22', 'filho(a)', '12345098', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(9, 8, 'Larissa Lima', '2014-06-05', 'filho(a)', '12345099', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(10, 9, 'Gabriel Alves', '2015-10-11', 'filho(a)', '12345100', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(11, 10, 'Sofia Alves', '2012-12-25', 'filho(a)', '12345101', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(12, 11, 'Mateus Ribeiro', '2013-03-14', 'filho(a)', '12345102', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(13, 12, 'Isabela Mendes', '2014-07-07', 'filho(a)', '12345103', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(14, 13, 'Lucas Pires', '2010-09-30', 'filho(a)', '12345104', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(15, 14, 'Camila Alves', '2011-11-19', 'filho(a)', '12345105', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(16, 15, 'Vitor Ferreira', '2009-05-03', 'filho(a)', '12345106', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(17, 16, 'Laura Lima', '2012-02-10', 'filho(a)', '12345107', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(18, 17, 'Marcos Silva', '2010-06-21', 'filho(a)', '12345108', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(19, 18, 'Beatriz Oliveira', '2011-08-15', 'filho(a)', '12345109', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(20, 19, 'Gabriel Pereira', '2012-12-05', 'filho(a)', '12345110', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(21, 20, 'Julia Souza', '2013-09-09', 'filho(a)', '12345111', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(22, 21, 'Rafael Santos', '2010-03-18', 'filho(a)', '12345112', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(23, 22, 'Carla Costa', '2011-07-25', 'filho(a)', '12345113', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(25, 24, 'Fernanda Pires', '2013-11-14', 'filho(a)', '12345115', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(26, 25, 'Lucas Alves', '2014-01-20', 'filho(a)', '12345116', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(27, 26, 'Mariana Martins', '2015-06-12', 'filho(a)', '12345117', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(28, 27, 'Gustavo Mendes', '2010-09-08', 'filho(a)', '12345118', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(29, 28, 'Isabela Rocha', '2011-12-22', 'filho(a)', '12345119', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(30, 29, 'Vitor Pires', '2012-08-30', 'filho(a)', '12345120', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(31, 30, 'Laura Almeida', '2013-04-14', 'filho(a)', '12345121', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(32, 32, 'Camila Ferreira', '2015-11-10', 'filho(a)', '12345123', 1, '2025-12-12 01:37:48', '2025-12-12 01:37:48'),
(33, 23, 'Pedro Lima', '2012-05-30', 'filho(a)', NULL, 1, '2026-04-11 15:16:21', '2026-04-11 15:16:21');

-- --------------------------------------------------------

--
-- Estrutura para tabela `funcionarios_dias_folga`
--

CREATE TABLE `funcionarios_dias_folga` (
  `id` int(11) NOT NULL COMMENT 'Chave primária do registro de folga',
  `funcionario_id` int(11) NOT NULL COMMENT 'Chave estrangeira para o funcionário titular',
  `dia` enum('domingo','segunda','terca','quarta','quinta','sexta','sabado') NOT NULL COMMENT 'Dia da semana fixo de folga do funcionário',
  `criado_em` datetime DEFAULT current_timestamp(),
  `atualizado_em` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `funcionarios_dias_folga`
--

INSERT INTO `funcionarios_dias_folga` (`id`, `funcionario_id`, `dia`, `criado_em`, `atualizado_em`) VALUES
(1, 1, 'domingo', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(2, 2, 'sabado', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(3, 3, 'domingo', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(4, 4, 'sexta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(5, 5, 'quinta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(6, 6, 'sabado', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(7, 7, 'domingo', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(8, 8, 'sexta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(9, 9, 'quinta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(10, 10, 'sabado', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(11, 11, 'domingo', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(12, 12, 'sexta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(13, 13, 'quinta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(14, 14, 'sabado', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(15, 15, 'domingo', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(16, 16, 'sexta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(17, 17, 'quinta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(18, 18, 'sabado', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(19, 19, 'domingo', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(20, 20, 'sexta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(21, 21, 'quinta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(22, 22, 'sabado', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(24, 24, 'sexta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(25, 25, 'quinta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(26, 26, 'sabado', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(27, 27, 'domingo', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(28, 28, 'sexta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(29, 29, 'quinta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(30, 30, 'sabado', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(31, 32, 'sexta', '2025-12-12 01:36:27', '2025-12-12 01:36:27'),
(32, 23, 'domingo', '2026-04-11 15:16:21', '2026-04-11 15:16:21'),
(33, 23, 'terca', '2026-04-11 15:16:21', '2026-04-11 15:16:21');

-- --------------------------------------------------------

--
-- Estrutura para tabela `funcionarios_enderecos`
--

CREATE TABLE `funcionarios_enderecos` (
  `funcionario_id` int(11) NOT NULL COMMENT 'Chave estrangeira e primária para o funcionário',
  `cep` varchar(10) NOT NULL,
  `cidade` varchar(100) NOT NULL,
  `estado` varchar(2) NOT NULL COMMENT 'Sigla do Estado (Ex: SP, RJ)',
  `rua` varchar(255) NOT NULL,
  `numero` varchar(10) DEFAULT NULL COMMENT 'Número da residência',
  `bairro` varchar(100) DEFAULT NULL,
  `complemento` varchar(100) DEFAULT NULL COMMENT 'Ex: Apartamento 101, Fundos, Bloco C',
  `criado_em` datetime DEFAULT current_timestamp(),
  `atualizado_em` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `funcionarios_enderecos`
--

INSERT INTO `funcionarios_enderecos` (`funcionario_id`, `cep`, `cidade`, `estado`, `rua`, `numero`, `bairro`, `complemento`, `criado_em`, `atualizado_em`) VALUES
(1, '01001-000', 'São Paulo', 'SP', 'Rua A', '100', 'Centro', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(2, '20010-000', 'Rio de Janeiro', 'RJ', 'Rua B', '101', 'Copacabana', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(3, '30110-000', 'Belo Horizonte', 'MG', 'Rua C', '102', 'Savassi', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(4, '80010-000', 'Curitiba', 'PR', 'Rua D', '103', 'Centro', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(5, '60010-000', 'Fortaleza', 'CE', 'Rua E', '104', 'Aldeota', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(6, '50010-000', 'Recife', 'PE', 'Rua F', '105', 'Boa Viagem', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(7, '90010-000', 'Porto Alegre', 'RS', 'Rua G', '106', 'Moinhos', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(8, '40010-000', 'Salvador', 'BA', 'Rua H', '107', 'Barra', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(9, '74010-000', 'Goiânia', 'GO', 'Rua I', '108', 'Setor Oeste', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(10, '69010-000', 'Manaus', 'AM', 'Rua J', '109', 'Centro', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(11, '88010-000', 'Florianópolis', 'SC', 'Rua K', '110', 'Trindade', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(12, '29010-000', 'Vitória', 'ES', 'Rua L', '111', 'Praia do Canto', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(13, '66010-000', 'Belém', 'PA', 'Rua M', '112', 'Marco', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(14, '58010-000', 'João Pessoa', 'PB', 'Rua N', '113', 'Tambaú', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(15, '13010-000', 'Campinas', 'SP', 'Rua O', '114', 'Cambuí', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(16, '78010-000', 'Cuiabá', 'MT', 'Rua P', '115', 'Centro Norte', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(17, '01002-000', 'São Paulo', 'SP', 'Rua Q', '116', 'Vila Mariana', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(18, '20020-000', 'Rio de Janeiro', 'RJ', 'Rua R', '117', 'Botafogo', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(19, '30120-000', 'Belo Horizonte', 'MG', 'Rua S', '118', 'Funcionários', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(20, '80020-000', 'Curitiba', 'PR', 'Rua T', '119', 'Batel', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(21, '60020-000', 'Fortaleza', 'CE', 'Rua U', '120', 'Meireles', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(22, '50020-000', 'Recife', 'PE', 'Rua V', '121', 'Casa Forte', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(23, '90020-000', 'Porto Alegre', 'RS', 'Rua W', '122', 'Petrópolis', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(24, '40020-000', 'Salvador', 'BA', 'Rua X', '123', 'Ondina', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(25, '74020-000', 'Goiânia', 'GO', 'Rua Y', '124', 'Setor Leste', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(26, '69020-000', 'Manaus', 'AM', 'Rua Z', '125', 'Centro', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(27, '88020-000', 'Florianópolis', 'SC', 'Rua AA', '126', 'Saco Grande', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(28, '29020-000', 'Vitória', 'ES', 'Rua BB', '127', 'Jardim da Penha', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(29, '66020-000', 'Belém', 'PA', 'Rua CC', '128', 'Reduto', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(30, '58020-000', 'João Pessoa', 'PB', 'Rua DD', '129', 'Manaíra', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46'),
(32, '78020-000', 'Cuiabá', 'MT', 'Rua FF', '131', 'CPA', NULL, '2025-12-12 01:35:46', '2025-12-12 01:35:46');

-- --------------------------------------------------------

--
-- Estrutura para tabela `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL COMMENT 'Chave primária do usuário',
  `username` varchar(50) NOT NULL COMMENT 'Nome de usuário',
  `email` varchar(100) NOT NULL COMMENT 'Email de contato e recuperação',
  `password` varchar(255) NOT NULL COMMENT 'Senha criptografada (hash)',
  `full_name` varchar(255) NOT NULL COMMENT 'Nome completo do usuário',
  `status` enum('Ativo','Inativo','Bloqueado') NOT NULL DEFAULT 'Ativo',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `full_name`, `status`, `created_at`, `updated_at`) VALUES
(1, 'hauriovieira', 'hauriovieira@gmail.com', '$2b$10$YBznmqfbK0aTSUkycAxZnupzNA6gig0mKfhYSC27qiWo4BbwN/SKq', 'Haurio Vieira da Silva', 'Ativo', '2025-12-12 00:07:50', '2025-12-12 00:07:50'),
(2, 'hauriosilva', 'haurio.ti@gmail.com', '$2b$10$Vc6rkodJZq8hkATgKLFppOb3xywy77AAXzsT0WlZP7/SeGsdAk9NC', 'hauriovieria', 'Ativo', '2026-04-11 13:49:05', '2026-04-11 13:49:05');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `ausencias`
--
ALTER TABLE `ausencias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ausencias_funcionario_id` (`funcionario_id`);

--
-- Índices de tabela `bancos`
--
ALTER TABLE `bancos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_bancos_codigo` (`codigo`);

--
-- Índices de tabela `cargos`
--
ALTER TABLE `cargos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cargos_departamento_id` (`departamento_id`);

--
-- Índices de tabela `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cpf_cnpj` (`cpf_cnpj`);

--
-- Índices de tabela `cnae`
--
ALTER TABLE `cnae`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_cnae_codigo` (`codigo`);

--
-- Índices de tabela `departamentos`
--
ALTER TABLE `departamentos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_departamentos_nome` (`nome`);

--
-- Índices de tabela `empresa`
--
ALTER TABLE `empresa`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cnpj` (`cnpj`),
  ADD KEY `fk_empresa_cnae_principal` (`id_cnae_principal`);

--
-- Índices de tabela `ferias`
--
ALTER TABLE `ferias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ferias_funcionario_id` (`funcionario_id`);

--
-- Índices de tabela `fornecedores`
--
ALTER TABLE `fornecedores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cnpj` (`cnpj`);

--
-- Índices de tabela `funcionarios`
--
ALTER TABLE `funcionarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cpf` (`cpf`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_funcionarios_cargo_id` (`cargo_id`),
  ADD KEY `fk_funcionarios_departamento_id` (`departamento_id`);

--
-- Índices de tabela `funcionarios_dados_bancarios`
--
ALTER TABLE `funcionarios_dados_bancarios`
  ADD PRIMARY KEY (`funcionario_id`),
  ADD KEY `fk_fdb_banco_id` (`banco_id`);

--
-- Índices de tabela `funcionarios_dados_pessoais`
--
ALTER TABLE `funcionarios_dados_pessoais`
  ADD PRIMARY KEY (`funcionario_id`),
  ADD UNIQUE KEY `rg` (`rg`);

--
-- Índices de tabela `funcionarios_dados_profissionais`
--
ALTER TABLE `funcionarios_dados_profissionais`
  ADD PRIMARY KEY (`funcionario_id`),
  ADD UNIQUE KEY `ctps` (`ctps`),
  ADD UNIQUE KEY `pis` (`pis`);

--
-- Índices de tabela `funcionarios_dependentes`
--
ALTER TABLE `funcionarios_dependentes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cpf` (`cpf`),
  ADD KEY `fk_fdep_funcionario_id` (`funcionario_id`);

--
-- Índices de tabela `funcionarios_dias_folga`
--
ALTER TABLE `funcionarios_dias_folga`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_folga_funcionario_dia` (`funcionario_id`,`dia`) COMMENT 'Garante que o dia de folga não seja duplicado',
  ADD KEY `fk_fdf_funcionario_id` (`funcionario_id`);

--
-- Índices de tabela `funcionarios_enderecos`
--
ALTER TABLE `funcionarios_enderecos`
  ADD PRIMARY KEY (`funcionario_id`);

--
-- Índices de tabela `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `ausencias`
--
ALTER TABLE `ausencias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária da ausência', AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `bancos`
--
ALTER TABLE `bancos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do banco', AUTO_INCREMENT=119;

--
-- AUTO_INCREMENT de tabela `cargos`
--
ALTER TABLE `cargos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do cargo', AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT de tabela `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do cliente', AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `cnae`
--
ALTER TABLE `cnae`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do CNAE', AUTO_INCREMENT=1270;

--
-- AUTO_INCREMENT de tabela `departamentos`
--
ALTER TABLE `departamentos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do departamento', AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de tabela `empresa`
--
ALTER TABLE `empresa`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária da empresa', AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `ferias`
--
ALTER TABLE `ferias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do registro de férias', AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `fornecedores`
--
ALTER TABLE `fornecedores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do fornecedor', AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `funcionarios`
--
ALTER TABLE `funcionarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do funcionário', AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT de tabela `funcionarios_dependentes`
--
ALTER TABLE `funcionarios_dependentes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do dependente', AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT de tabela `funcionarios_dias_folga`
--
ALTER TABLE `funcionarios_dias_folga`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do registro de folga', AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT de tabela `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do usuário', AUTO_INCREMENT=3;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `ausencias`
--
ALTER TABLE `ausencias`
  ADD CONSTRAINT `fk_ausencias_funcionario_id` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON UPDATE CASCADE;

--
-- Restrições para tabelas `cargos`
--
ALTER TABLE `cargos`
  ADD CONSTRAINT `fk_cargos_departamento_id` FOREIGN KEY (`departamento_id`) REFERENCES `departamentos` (`id`) ON UPDATE CASCADE;

--
-- Restrições para tabelas `empresa`
--
ALTER TABLE `empresa`
  ADD CONSTRAINT `fk_empresa_cnae_principal` FOREIGN KEY (`id_cnae_principal`) REFERENCES `cnae` (`id`) ON UPDATE CASCADE;

--
-- Restrições para tabelas `ferias`
--
ALTER TABLE `ferias`
  ADD CONSTRAINT `fk_ferias_funcionario_id` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON UPDATE CASCADE;

--
-- Restrições para tabelas `funcionarios`
--
ALTER TABLE `funcionarios`
  ADD CONSTRAINT `fk_funcionarios_cargo_id` FOREIGN KEY (`cargo_id`) REFERENCES `cargos` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_funcionarios_departamento_id` FOREIGN KEY (`departamento_id`) REFERENCES `departamentos` (`id`) ON UPDATE CASCADE;

--
-- Restrições para tabelas `funcionarios_dados_bancarios`
--
ALTER TABLE `funcionarios_dados_bancarios`
  ADD CONSTRAINT `fk_fdb_banco_id` FOREIGN KEY (`banco_id`) REFERENCES `bancos` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_fdb_funcionario_id` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `funcionarios_dados_pessoais`
--
ALTER TABLE `funcionarios_dados_pessoais`
  ADD CONSTRAINT `fk_fdp_funcionario_id` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `funcionarios_dados_profissionais`
--
ALTER TABLE `funcionarios_dados_profissionais`
  ADD CONSTRAINT `fk_fdprof_funcionario_id` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `funcionarios_dependentes`
--
ALTER TABLE `funcionarios_dependentes`
  ADD CONSTRAINT `fk_fdep_funcionario_id` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `funcionarios_dias_folga`
--
ALTER TABLE `funcionarios_dias_folga`
  ADD CONSTRAINT `fk_fdf_funcionario_id` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `funcionarios_enderecos`
--
ALTER TABLE `funcionarios_enderecos`
  ADD CONSTRAINT `fk_fend_funcionario_id` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
