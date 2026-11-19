import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

async function request(path, options) {
  const response = await fetch(path, options)
  if (!response.ok) throw new Error((await response.json()).error || 'Please try again.')
  return response.json()
}

function Photo({ profile }) {
  const [failed, setFailed] = useState(false)
  // Older demo databases still contain the original remote portrait URLs.
  const photo = profile.photo.startsWith('https://randomuser.me/api/portraits/')
    ? '/portraits/' + profile.name.toLowerCase() + '.jpg'
    : profile.photo
  return (
    <div className="photo">
      <span aria-hidden="true">{profile.name[0]}</span>
      {!failed && <img src={photo} alt={profile.name} onError={() => setFailed(true)} draggable="false" />}
    </div>
  )
}

function App() {
  const [tab, setTab] = useState('discover')
  const [profiles, setProfiles] = useState(null)
  const [matches, setMatches] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [offset, setOffset] = useState(0)
  const [exit, setExit] = useState('')
  const [busy, setBusy] = useState(false)
  const [match, setMatch] = useState(null)
  const pointer = useRef(null)
  const submitting = useRef(false)
  const dialog = useRef(null)
  const profile = profiles?.[0]

  async function load(view) {
    setError('')
    try {
      if (view === 'discover') setProfiles(await request('/feed'))
      if (view === 'matches') setMatches(await request('/matches'))
    } catch (failure) {
      setError(failure.message || 'Could not load your profiles.')
    }
  }

  useEffect(() => { void load(tab) }, [tab])
  useEffect(() => {
    if (match) dialog.current?.showModal()
  }, [match])

  async function swipe(direction) {
    if (!profile || submitting.current) return
    submitting.current = true
    setBusy(true)
    setError('')
    setNotice('')
    setOffset(0)
    setExit(direction)
    try {
      const animation = new Promise(resolve => setTimeout(resolve, 220))
      const result = await request('/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, direction })
      })
      await animation
      setProfiles(current => current.filter(item => item.id !== profile.id))
      setNotice(direction === 'like' ? 'Like sent' : 'Profile passed')
      if (result.matched) setMatch(profile)
    } catch (failure) {
      setError(failure.message || 'Could not save your swipe. Try again.')
    } finally {
      setExit('')
      setBusy(false)
      submitting.current = false
    }
  }

  function startDrag(event) {
    if (submitting.current || pointer.current || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointer.current = { id: event.pointerId, x: event.clientX }
  }

  function moveDrag(event) {
    if (pointer.current?.id === event.pointerId) setOffset(event.clientX - pointer.current.x)
  }

  function endDrag(event, cancelled = false) {
    if (pointer.current?.id !== event.pointerId) return
    const distance = event.clientX - pointer.current.x
    pointer.current = null
    setOffset(0)
    if (!cancelled && Math.abs(distance) >= 72) void swipe(distance > 0 ? 'like' : 'pass')
  }

  function navigate(view) {
    setError('')
    setNotice('')
    setTab(view)
  }

  return (
    <div className="shell">
      <header><span className="wordmark">coy<span>.</span></span></header>
      <main aria-label={tab}>
        {tab === 'discover' && <>
          <h1>Discover</h1>
          {profile ? <>
            <article
              key={profile.id}
              className={'card ' + (exit ? 'exit-' + exit : '') + (offset ? ' dragging' : '')}
              style={{ '--offset': offset + 'px', '--angle': offset / 18 + 'deg' }}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={event => endDrag(event, true)}
              onLostPointerCapture={event => endDrag(event, true)}
            >
              <Photo profile={profile} />
              {(Math.abs(offset) > 30 || exit) && <span className={'stamp ' + ((exit || (offset > 0 ? 'like' : 'pass')))}>
                {exit === 'like' || (!exit && offset > 0) ? 'LIKE' : 'PASS'}
              </span>}
              <div className="details">
                <h2>{profile.name}, {profile.age}</h2>
                <p className="city">{profile.city}</p>
                <p>{profile.bio}</p>
                <ul className="interests">{profile.interests.map(interest => <li key={interest}>{interest}</li>)}</ul>
              </div>
            </article>
            <div className="actions">
              <button className="pass-button" aria-label="Pass" disabled={busy} onClick={() => swipe('pass')}>× <span>Pass</span></button>
              <button className="like-button" aria-label="Like" disabled={busy} onClick={() => swipe('like')}>♥ <span>Like</span></button>
            </div>
          </> : profiles ? <div className="empty"><h2>You're all caught up</h2><p>You've seen every profile in your feed.</p><button onClick={() => navigate('matches')}>View matches</button></div>
            : !error && <p role="status">Loading profiles…</p>}
        </>}
        {tab === 'matches' && <>
          <h1>Matches</h1>
          {matches?.length > 0 ? <ul className="matches">{matches.map(item => <li key={item.id}>
            <Photo profile={item} /><div><h2>{item.name}, {item.age}</h2><p>{item.city}</p></div>
          </li>)}</ul> : matches ? <div className="empty"><h2>No matches yet</h2><p>Your mutual matches will appear here.</p></div>
            : !error && <p role="status">Loading matches…</p>}
        </>}
        {error && <div role="alert" className="error">{error} <button disabled={busy} onClick={() => load(tab)}>Refresh</button></div>}
        <p role="status" className="notice">{notice}</p>
      </main>
      <nav aria-label="Main navigation">
        {[['home', 'Home', '⌂'], ['discover', 'Discover', '◇'], ['matches', 'Matches', '♡']].map(([view, label, icon]) =>
          <button key={view} aria-current={tab === view ? 'page' : undefined} disabled={busy} onClick={() => navigate(view)}>
            <span aria-hidden="true">{icon}</span>{label}
          </button>
        )}
      </nav>
      <dialog ref={dialog} onClose={() => setMatch(null)} aria-labelledby="match-title">
        {match && <>
          <Photo profile={match} />
          <h2 id="match-title">It’s a match!</h2>
          <p>You and {match.name} liked each other.</p>
          <div className="dialog-actions">
            <button className="like-button" onClick={() => dialog.current.close()}>Keep discovering</button>
            <button onClick={() => { dialog.current.close(); navigate('matches') }}>View matches</button>
          </div>
        </>}
      </dialog>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
