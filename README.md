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

In Supabase:

1. Enable anonymous sign-ins under Authentication settings.
2. Apply the lobby database setup SQL. For an already configured project, run `supabase/migrations/202609290002_four_player_lobbies.sql` in the SQL Editor to use four-player rooms.
3. Disable **Allow public access** in Realtime settings; lobby channels are private.

Guests have a persisted anonymous Auth session. Next.js verifies their access token before calling server-only room functions. Browsers cannot write room tables directly or invoke these functions. Database changes broadcast an invalidation to members; each lobby fetches a fresh snapshot. Presence shows who is connected. Polling every 15 seconds recovers missed notifications.

## Lobby behavior

- Host creates a room with a six-character code and a player nickname.
- Friends join using the six-character room code.
- Players appear live, can toggle ready, and keep their place when refreshing or disconnecting.
- Leaving explicitly removes a player; the next player becomes host when the host leaves.
- New rooms accept four players and expire after 24 hours. Expiration does not delete database rows.
- The guest identity belongs to that browser profile. Incognito or another browser creates another player; clearing browser storage loses that identity.

Use two separate browser profiles to try multiplayer. Two tabs in one profile represent the same player.

## Checks

```bash
npm run lint
npm run build
```
