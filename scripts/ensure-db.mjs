import { execFileSync } from 'node:child_process'

function quoteLiteral(value) {
  return `'${value.replace(/'/g, "''")}'`
}

function quoteIdent(value) {
  return `"${value.replace(/"/g, '""')}"`
}

function main() {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    throw new Error('DATABASE_URL no esta definida')
  }

  const url = new URL(raw)
  const dbName = url.pathname.slice(1)
  if (!dbName) {
    throw new Error(`DATABASE_URL no incluye nombre de base (${url.host})`)
  }

  url.pathname = '/postgres'
  url.search = ''
  const conn = url.toString()

  console.log(`[ensure-db] Verificando base '${dbName}' en ${url.host}...`)
  const check = execFileSync(
    'psql',
    ['--no-psqlrc', conn, '-tAc', `SELECT 1 FROM pg_database WHERE datname = ${quoteLiteral(dbName)}`],
    { encoding: 'utf8' },
  ).trim()

  if (check === '1') {
    console.log(`[ensure-db] La base '${dbName}' ya existe.`)
    return
  }

  execFileSync('psql', ['--no-psqlrc', conn, '-c', `CREATE DATABASE ${quoteIdent(dbName)}`], {
    stdio: 'inherit',
  })
  console.log(`[ensure-db] Base '${dbName}' creada.`)
}

main()