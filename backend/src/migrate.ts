import fs from 'fs'
import path from 'path'
import pool from './db'
import logger from './logger'

async function waitForDb(retries = 10, delayMs = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect()
      client.release()
      return
    } catch (e) {
      logger.info('migrate', `DB not ready, retrying in ${delayMs}ms (${i + 1}/${retries})`)
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
  logger.info('migrate', 'Waiting for DB before running migrations')
  await waitForDb()
  const client = await pool.connect()
  try {
    logger.info('migrate', 'Applying migration SQL')
    // Execute full SQL script
    await client.query(sql)
    logger.info('migrate', 'Migration SQL executed')
    // Record last applied migration info into system_meta (if table exists)
    try {
      const migrationsDir = path.resolve(__dirname, '..', 'migrations')
      let latestMigration: string | null = null
      if (fs.existsSync(migrationsDir)) {
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
        if (files.length) latestMigration = files[files.length - 1]
      }
      const metaVal = { applied_at: new Date().toISOString(), latest_available: latestMigration }
      await client.query(
        `INSERT INTO system_meta(key, value, updated_at) VALUES($1, $2::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        ['last_migration', JSON.stringify(metaVal)]
      )
    } catch (e) {
      logger.warn('migrate', 'Failed to write system_meta last_migration', e)
    }
  } finally {
    client.release()
  }
}

if (require.main === module) {
  runMigrations().then(() => {
    logger.info('migrate', 'Migrations applied')
    process.exit(0)
  }).catch((err) => {
    logger.error('migrate', 'Migration failed', err)
    process.exit(1)
  })
}
