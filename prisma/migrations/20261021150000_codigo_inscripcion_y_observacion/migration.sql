-- AlterTable
ALTER TABLE "Postulante" ADD COLUMN "observacion" TEXT;
ALTER TABLE "Postulante" ADD COLUMN "codigoInscripcion" TEXT;

-- Backfill: 5 letras de un alfabeto de 23 sin I, L ni O, para que el codigo se pueda leer y dictar
-- por telefono. Se comprueba contra la tabla en vez de apoyarse en un handler de excepcion: EXIT y
-- CONTINUE no se pueden usar dentro de un bloque EXCEPTION en PL/pgSQL.
DO $$
DECLARE
  alfabeto CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ';
  registro RECORD;
  candidato TEXT;
  intentos INT;
  i INT;
BEGIN
  FOR registro IN SELECT "id" FROM "Postulante" WHERE "codigoInscripcion" IS NULL LOOP
    intentos := 0;
    LOOP
      candidato := '';
      FOR i IN 1..5 LOOP
        -- length(alfabeto) y no un literal: si se edita la cadena, substr no devolveria vacio
        -- y generaria codigos mas cortos que la longitud esperada.
        candidato := candidato || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
      END LOOP;

      IF NOT EXISTS (SELECT 1 FROM "Postulante" p WHERE p."codigoInscripcion" = candidato) THEN
        UPDATE "Postulante" SET "codigoInscripcion" = candidato WHERE "id" = registro.id;
        EXIT;
      END IF;

      intentos := intentos + 1;
      IF intentos > 50 THEN
        RAISE EXCEPTION 'No se pudo asignar codigo de inscripcion al postulante %', registro.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE "Postulante" ALTER COLUMN "codigoInscripcion" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Postulante_codigoInscripcion_key" ON "Postulante"("codigoInscripcion");
