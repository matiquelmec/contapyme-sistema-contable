ALTER TABLE payroll_config
ADD COLUMN IF NOT EXISTS legal_gratification_type VARCHAR(20) DEFAULT 'none' NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payroll_config_legal_gratification_type_check'
    ) THEN
        ALTER TABLE payroll_config
        ADD CONSTRAINT payroll_config_legal_gratification_type_check
        CHECK (legal_gratification_type IN ('article_50', 'none'));
    END IF;
END $$;