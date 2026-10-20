#!/bin/sh
set -e

echo "[entrypoint] Asegurando base de datos..."
node scripts/ensure-db.mjs

echo "[entrypoint] Aplicando migraciones Prisma..."
node node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Iniciando aplicación..."
exec node server.js