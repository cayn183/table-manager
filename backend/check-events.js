const { Client } = require('pg')
const logger = require('./cli-logger')

const cs = process.env.DATABASE_URL || 'postgresql://tm:tm@localhost:5432/table_manager'
const client = new Client({ connectionString: cs })

async function run() {
  await client.connect()
  const res = await client.query('SELECT id,user_id,title,created_at FROM events ORDER BY created_at DESC LIMIT 5')
  logger.info('check-events', JSON.stringify(res.rows, null, 2))
  await client.end()
}

run().catch(err => { logger.error('check-events', err); process.exit(1) })
