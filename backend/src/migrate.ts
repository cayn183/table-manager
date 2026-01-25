import fs from 'fs'
import path from 'path'
import pool from './db'

export async function runMigrations() {
  const sqlPath = path.join(__dirname, '..', 'db', 'schema.sql')
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Migration file not found: ${sqlPath}`)
  }
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const client = await pool.connect()
  try {
    // split by semicolon may be naive; execute full script as one query
    await client.query(sql)
  } finally {
    client.release()
  }
}

if (require.main === module) {
  runMigrations().then(() => {
    // eslint-disable-next-line no-console
    console.log('Migrations applied')
    process.exit(0)
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Migration failed', err)
    process.exit(1)
  })
}
