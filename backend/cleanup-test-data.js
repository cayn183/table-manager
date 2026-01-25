const { Client } = require('pg')
const logger = require('./cli-logger')

const cs = process.env.DATABASE_URL || 'postgresql://tm:tm@localhost:5432/table_manager'
const client = new Client({ connectionString: cs })

async function run() {
  await client.connect()
  try {
    const users = await client.query("SELECT id,email FROM users WHERE email LIKE 'smoke%'")
    const ids = users.rows.map(r => r.id)
    if (ids.length === 0) {
      logger.info('cleanup-test-data', 'No test users found')
      return
    }
    logger.info('cleanup-test-data', { action: 'deleting-events', ids })
    await client.query('DELETE FROM events WHERE user_id = ANY($1)', [ids])
    logger.info('cleanup-test-data', { action: 'deleting-users', ids })
    await client.query('DELETE FROM users WHERE id = ANY($1)', [ids])
    logger.info('cleanup-test-data', 'Cleanup complete')
  } finally {
    await client.end()
  }
}

run().catch(err => { logger.error('cleanup-test-data', err); process.exit(1) })
