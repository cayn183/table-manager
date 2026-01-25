const { Client } = require('pg')

const cs = process.env.DATABASE_URL || 'postgresql://tm:tm@localhost:5432/table_manager'
const client = new Client({ connectionString: cs })

async function run() {
  await client.connect()
  try {
    const users = await client.query("SELECT id,email FROM users WHERE email LIKE 'smoke%'")
    const ids = users.rows.map(r => r.id)
    if (ids.length === 0) {
      console.log('No test users found')
      return
    }
    console.log('Deleting events for users:', ids)
    await client.query('DELETE FROM events WHERE user_id = ANY($1)', [ids])
    console.log('Deleting users:', ids)
    await client.query('DELETE FROM users WHERE id = ANY($1)', [ids])
    console.log('Cleanup complete')
  } finally {
    await client.end()
  }
}

run().catch(err => { console.error(err); process.exit(1) })
