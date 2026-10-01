-- Guarda cuándo la persona aceptó la política de privacidad.
-- Es la prueba del consentimiento que exige la Ley 25.326.
-- Columna opcional: las consultas anteriores no tienen ese dato y no se inventa.
ALTER TABLE "Lead" ADD COLUMN "acceptedPrivacyAt" TIMESTAMP(3);
