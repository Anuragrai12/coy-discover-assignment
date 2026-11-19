import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'

const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 3000)
const databasePath = process.env.DATABASE_PATH || fileURLToPath(new URL('../data/coy.sqlite', import.meta.url))
const { app } = createApp(databasePath)
app.listen(port, host, () => console.log('Coy Discover is available at http://' + host + ':' + port))
