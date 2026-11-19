import express from 'express'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedProfiles } from './seed.js'

const dist = fileURLToPath(new URL('../dist', import.meta.url))

export function createApp(databasePath) {
  if (databasePath !== ':memory:') mkdirSync(dirname(resolve(databasePath)), { recursive: true })
  const db = new DatabaseSync(databasePath)
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      incoming_like INTEGER NOT NULL CHECK (incoming_like IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS swipes (
      profile_id TEXT PRIMARY KEY REFERENCES profiles(id),
      direction TEXT NOT NULL CHECK (direction IN ('like', 'pass')),
      matched INTEGER NOT NULL CHECK (matched IN (0, 1))
    );
  `)
  seedProfiles(db)

  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '4kb' }))
  app.use(['/feed', '/swipe', '/matches'], (_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  const feed = db.prepare(`
    SELECT p.payload FROM profiles p LEFT JOIN swipes s ON p.id = s.profile_id
    WHERE s.profile_id IS NULL ORDER BY p.rowid
  `)
  const matches = db.prepare(`
    SELECT p.payload FROM swipes s JOIN profiles p ON p.id = s.profile_id
    WHERE s.matched = 1 ORDER BY s.rowid DESC
  `)
  const record = db.prepare(`
    INSERT INTO swipes (profile_id, direction, matched)
    SELECT id, ?, CASE WHEN ? = 'like' THEN incoming_like ELSE 0 END
    FROM profiles WHERE id = ?
    ON CONFLICT(profile_id) DO NOTHING
    RETURNING matched
  `)
  const previous = db.prepare('SELECT direction, matched FROM swipes WHERE profile_id = ?')
  const readProfiles = (query) => query.all().map(({ payload }) => JSON.parse(payload))

  app.get('/feed', (_req, res) => res.json(readProfiles(feed)))
  app.get('/matches', (_req, res) => res.json(readProfiles(matches)))
  app.post('/swipe', (req, res) => {
    const { profileId, direction } = req.body ?? {}
    if (typeof profileId !== 'string' || !['like', 'pass'].includes(direction)) {
      return res.status(400).json({ error: 'Send a profileId and a direction of like or pass.' })
    }

    const swipe = record.get(direction, direction, profileId)
    if (swipe) return res.json({ matched: Boolean(swipe.matched), created: true })

    const existing = previous.get(profileId)
    if (!existing) return res.status(404).json({ error: 'Profile not found.' })
    if (existing.direction !== direction) {
      return res.status(409).json({ error: 'This profile has already been swiped.' })
    }
    return res.json({ matched: Boolean(existing.matched), created: false })
  })
  app.use(express.static(dist))
  app.use((error, _req, res, _next) => {
    if (error.status === 400 || error.status === 413) {
      return res.status(error.status).json({ error: 'Invalid request body.' })
    }
    console.error(error)
    return res.status(500).json({ error: 'Something went wrong. Try again.' })
  })
  return { app, close: () => db.close() }
}
