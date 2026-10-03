-- Script SQL para atualizar a tabela ferias
-- Adicionar status "Abono Pecuniário" ao ENUM
-- Adicionar status "Vencida" ao ENUM (se necessário)
-- Adicionar coluna abono_pecuniario

-- 1. Adicionar novos valores ao ENUM do campo status
ALTER TABLE `ferias` 
MODIFY COLUMN `status` ENUM(
    'Planejada',
    'Em Andamento',
    'Concluída',
    'Cancelada',
    'Atrasada',
    'Abono Pecuniário',
    'Vencida'
) NOT NULL DEFAULT 'Planejada' COMMENT 'Status da solicitação de férias.';

-- 2. Adicionar coluna abono_pecuniario para armazenar os dias vendidos
ALTER TABLE `ferias` 
ADD COLUMN `abono_pecuniario` TINYINT(3) UNSIGNED DEFAULT 0 
COMMENT 'Número de dias convertidos em abono pecuniário (máximo 1/3 dos dias concedidos = 10 dias de 30)' 
AFTER `dias_concedidos`;

-- Verificar se as alterações foram aplicadas
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'ferias'
ORDER BY ORDINAL_POSITION;



