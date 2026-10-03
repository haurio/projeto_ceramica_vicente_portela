-- Adicionar campo complemento à tabela clientes
ALTER TABLE `clientes` 
ADD COLUMN `complemento` VARCHAR(100) DEFAULT NULL COMMENT 'Complemento do endereço (apto, bloco, etc.)' 
AFTER `numero`;



