import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import eventsRoutes from './routes/events'
import migrationRoutes from './routes/migration'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

app.use('/auth', authRoutes)
app.use('/events', eventsRoutes)
app.use('/migration', migrationRoutes)

app.get('/', (req, res) => res.json({ ok: true, version: '0.1.0' }))

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`Server listening on ${port}`))
