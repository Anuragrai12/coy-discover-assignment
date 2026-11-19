import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createApp } from './app.js'

test('Discover API keeps incoming likes private and persists decisions', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'coy-discover-'))
  const path = join(folder, 'test.sqlite')
  let close
  let server
  let base
  async function start() {
    const instance = createApp(path)
    close = instance.close
    server = instance.app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    base = 'http://127.0.0.1:' + server.address().port
  }
  async function stop() {
    if (!server) return
    await new Promise(resolve => server.close(resolve))
    close()
    server = null
  }
  const get = async route => (await fetch(base + route)).json()
  const swipe = (profileId, direction) => fetch(base + '/swipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, direction })
  })

  try {
    await start()
    const profiles = await get('/feed')
    assert.equal(profiles.length, 30)
    profiles.forEach(profile => assert.deepEqual(
      Object.keys(profile).sort(), ['age', 'bio', 'city', 'id', 'interests', 'name', 'photo']
    ))
    assert.deepEqual(await get('/matches'), [])

    const fixture = new DatabaseSync(path)
    fixture.prepare('UPDATE profiles SET incoming_like = 0').run()
    fixture.prepare('UPDATE profiles SET incoming_like = 1 WHERE id IN (?, ?)').run(profiles[0].id, profiles[1].id)
    fixture.close()
    const [passed, mutual, oneWay, ...remaining] = profiles
    assert.equal((await swipe(passed.id, 'skip')).status, 400)
    assert.equal((await swipe('unknown', 'like')).status, 404)
    assert.deepEqual(await (await swipe(passed.id, 'pass')).json(), { matched: false, created: true })
    assert.deepEqual(await (await swipe(oneWay.id, 'like')).json(), { matched: false, created: true })
    assert.deepEqual(await get('/matches'), [])

    const simultaneous = await Promise.all([swipe(mutual.id, 'like'), swipe(mutual.id, 'like')])
    const results = await Promise.all(simultaneous.map(response => response.json()))
    assert.ok(results.every(result => result.matched))
    assert.equal(results.filter(result => result.created).length, 1)
    assert.equal((await swipe(passed.id, 'like')).status, 409)
    assert.deepEqual(await get('/matches'), [mutual])

    await stop()
    await start()
    assert.deepEqual(await get('/feed'), remaining)
    assert.deepEqual(await get('/matches'), [mutual])
    for (const profile of remaining) assert.equal((await swipe(profile.id, 'pass')).status, 200)
    assert.deepEqual(await get('/feed'), [])
  } finally {
    await stop()
    await rm(folder, { recursive: true, force: true })
  }
})
