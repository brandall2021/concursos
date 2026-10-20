#!/bin/sh
set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$UPLOAD_DIR"
  chown -R nextjs:nodejs "$UPLOAD_DIR"
  exec su-exec nextjs:nodejs "$0" "$@"
fi

echo "[entrypoint] Asegurando base de datos..."
node scripts/ensure-db.mjs

echo "[entrypoint] Aplicando migraciones Prisma..."
node node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Iniciando aplicación..."
exec node server.js
