-- Resultado publicado de un concurso cerrado.
-- El Departamento Concursos sube el PDF (resolución, orden de mérito, dictamen) de un llamado ya
-- cerrado y lo publica en la página principal. Las tres columnas se escriben juntas:
-- resultadoPublicadoEn != null es lo que hace visible el documento, y resultadoPath es la ruta
-- relativa dentro de UPLOAD_DIR (nunca absoluta, para que el guardado siga dentro del volumen).
--
-- Sin backfill y sin índice: la tabla Concurso es chica (una fila por llamado) y la página principal
-- filtra por fecha de publicación sobre el total, así que un índice solo agregaría ruido de drift.

-- AlterTable
ALTER TABLE "Concurso" ADD COLUMN "resultadoPath" TEXT;
ALTER TABLE "Concurso" ADD COLUMN "resultadoNombre" TEXT;
ALTER TABLE "Concurso" ADD COLUMN "resultadoPublicadoEn" TIMESTAMP(3);
