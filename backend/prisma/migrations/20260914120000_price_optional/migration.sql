-- Permite cargar propiedades sin precio ("Consultar precio").
-- Sólo quita el NOT NULL: no borra ni modifica ningún dato existente.
ALTER TABLE "Property" ALTER COLUMN "price" DROP NOT NULL;
