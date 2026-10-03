-- Comprovação e vínculo com férias
ALTER TABLE ausencias
    ADD COLUMN IF NOT EXISTS comprovacao_url TEXT;

ALTER TABLE ausencias
    ADD COLUMN IF NOT EXISTS ferias_id INT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ausencias_ferias_id'
    ) THEN
        ALTER TABLE ausencias
            ADD CONSTRAINT fk_ausencias_ferias_id
            FOREIGN KEY (ferias_id) REFERENCES ferias(id)
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
