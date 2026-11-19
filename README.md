# Coy Discover

A standalone assessment project with a blank Home tab and a mobile-first Discover tab. React renders the interface, Express serves the API, and SQLite stores the demo state.

## Run locally

Requires Node.js 22.13+.

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:3000. For frontend development, run `npm run server` and `npm run dev` in separate terminals and open the URL printed by Vite. Run `npm test` for the API integration test.

Drag left to pass or right to like. The Pass and Like buttons also work with a mouse and keyboard. On a fresh database, at least one of the first four profiles will match if you like all four. Open Matches to see saved mutual matches. Data persists in `data/coy.sqlite` across page reloads and server restarts. Set `DATABASE_PATH` to another file for a separate demo. The fictional seed profiles use bundled, AI-generated portraits. Cards fall back to initials if a photo is unavailable.

## API

| Route | Behavior |
| --- | --- |
| GET /feed | Lists unswiped profiles with public fields only. |
| POST /swipe | Accepts `{ "profileId": "...", "direction": "like" }` or `"pass"`. Returns `matched` and `created`. Repeating the same swipe returns the stored outcome with `created: false`. Changing a recorded decision returns 409. |
| GET /matches | Lists mutual matches newest first. |

Incoming likes stay in SQLite. One atomic insert records the swipe and whether it is mutual. A unique key prevents a second decision for the same profile. This demo assumes one viewer and has no authentication.

## Part A: Coy walkthrough and feature proposals

I signed in with a phone OTP and added a crush. The home screen showed one of three slots in use and said Coy sends the recipient an anonymous heads-up right away. Settings showed a saved email with a Remove email option and no separate verification badge. I found the personal invite link in Settings and the copy and share controls on Home. The recipient landing page was not checked. The extra-slots screen offered bundles of one, three, or five permanent slots and a free slot when three invited friends join and add a crush. No purchase was made.

1. **Social sign-up and sign-in.** Add Google and Facebook sign-in alongside phone OTP. This gives users a faster way to join from an invite or return to their account. Explore Instagram sign-in if it becomes available for personal accounts.
2. **Private contact blocking.** Let users block a phone number or email in Settings. Neither person would receive a crush alert or match with the other. This helps users avoid unwanted contact while keeping the block private.
