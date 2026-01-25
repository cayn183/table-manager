import fs from 'fs'
import path from 'path'
import pool from './db'

async function waitForDb(retries = 10, delayMs = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect()
      client.release()
      return
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`DB not ready, retrying in ${delayMs}ms (${i + 1}/${retries})`)
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw new Error('Timed out waiting for DB')
}

export async function runMigrations() {
  const sqlPath = path.join(__dirname, '..', 'db', 'schema.sql')
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Migration file not found: ${sqlPath}`)
  }
  const sql = fs.readFileSync(sqlPath, 'utf8')
  await waitForDb()
  const client = await pool.connect()
  try {
    // Execute full SQL script
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
