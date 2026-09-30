# Rightish

A party game for your perfectly imperfect brain. The landing page and multiplayer lobby are implemented; playable rounds are next.

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
- Leaving explicitly removes a player; the next player becomes host when the host leaves.
- New rooms accept four players and expire after 24 hours. The cleanup migration removes expired and closed rooms every 15 minutes.
- The guest identity belongs to that browser profile. Incognito or another browser creates another player; clearing browser storage loses that identity.

Use two separate browser profiles to try multiplayer. Two tabs in one profile represent the same player.

## Checks

```bash
npm run lint
npm run build
```
