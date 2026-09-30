# Rightish

A party game for your perfectly imperfect brain. The landing page, live rooms, procedural Split It practice, and synchronized Split It matches are implemented.

## Local development

Use Node 22 or newer. Install the project's dependencies yourself with `npm install`, then run `npm run dev` and open http://localhost:3000.

Create `.env.local` with:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-server-secret-key
```

The secret key stays on the server. Never give it a `NEXT_PUBLIC_` prefix. Restart the dev server after changing these values.

The Supabase SQL history, migration order, and required dashboard settings are documented in [supabase/migrations/README.md](supabase/migrations/README.md).

## Lobby behavior

- Host creates a room with a six-character code and a player nickname.
- Friends join using the six-character room code.
- Players appear live, can toggle ready, and keep their place when refreshing or disconnecting.
- Hosts choose playable games, then use each game's settings button. Split It offers 1–10 rounds, a 5–60 second timer, and a target from 50/50 to 80/20. Saving settings clears Ready marks.
- Rooms created with the earlier settings format ask the host to save once before starting; their round, timer, and target choices are preserved.
- A match needs at least two players and everyone Ready. Each round has a shared three-second countdown and a server deadline. The host advances after the reveal.
- A disconnected host hands control to the next active player after 30 seconds. Explicitly leaving removes a player from the match; a rematch returns everyone to the same lobby with settings kept and Ready marks cleared.
- Leaving explicitly removes a player; the next player becomes host when the host leaves.
- New rooms accept four players and expire after 24 hours. The cleanup migration removes expired and closed rooms every 15 minutes.
- The guest identity belongs to that browser profile. Incognito or another browser creates another player; clearing browser storage loses that identity.

Use two separate browser profiles to try multiplayer. Two tabs in one profile represent the same player.

## Split It solo practice

Open `/play/split-it`, or select Split It on the landing page and choose **Try Split It**.

- Five rounds, 20 seconds each. Click/tap to place two anchors; drag either to adjust the straight cut.
- Confirm locks the attempt. The deadline submits the latest valid cut, or zero if there is none.
- Accuracy only: 50/50 earns 1,000 points; 60/40 earns 800; 75/25 earns 500.
- Reveal shows percentages, separated pieces, points, and a perfect line parallel to the attempt. Next shape waits for the player.
- Replay the same set or copy a link for a friend to try those shapes independently.
- Shared generation/validation/scoring lives in `lib/games`; UI lives in `app/components/games`. The game registry supports future host-selected pools.

See [the Split It design](docs/split-it.md) for multiplayer decisions and outstanding playtests.

## Checks

```bash
npm run lint
npm run test:games
npm run build
```
