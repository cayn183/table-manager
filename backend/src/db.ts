import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config()

// Support either a full DATABASE_URL or separate POSTGRES_* env vars.
// Preferred env names: POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER,
// POSTGRES_PASSWORD, POSTGRES_DB. Falls back to process.env.DATABASE_URL.
const { DATABASE_URL, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_SSL } = process.env

let pool: Pool

if (DATABASE_URL) {
	pool = new Pool({ connectionString: DATABASE_URL })
} else {
	const config: any = {
		host: POSTGRES_HOST,
		port: POSTGRES_PORT ? parseInt(POSTGRES_PORT, 10) : undefined,
		user: POSTGRES_USER,
		password: POSTGRES_PASSWORD,
		database: POSTGRES_DB,
	}

	// Allow enabling SSL via POSTGRES_SSL=true (useful for managed DBs)
	if (POSTGRES_SSL === 'true') {
		config.ssl = { rejectUnauthorized: false }
	}

	pool = new Pool(config)
}

export default pool
