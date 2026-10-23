-- Resolución del llamado + campos opcionales.
--
-- resolucionPath/resolucionNombre guardan el PDF que se carga al crear el concurso y se enlaza en la
-- página principal. resolucionPath es una ruta relativa dentro de UPLOAD_DIR (nunca absoluta), asi el
-- guardado sigue contenido dentro del volumen.
--
-- disciplina y asignatura pasan a admitir NULL porque el Departamento Concursos habilita llamados que
-- se identifican solo por expediente, cargo y dedicación. No hay backfill: NULL significa "sin dato",
-- igual que area y catedra, que ya lo eran.

-- AlterTable
ALTER TABLE "Concurso" ADD COLUMN "resolucionPath" TEXT;
ALTER TABLE "Concurso" ADD COLUMN "resolucionNombre" TEXT;
ALTER TABLE "Concurso" ALTER COLUMN "disciplina" DROP NOT NULL;
ALTER TABLE "Concurso" ALTER COLUMN "asignatura" DROP NOT NULL;
