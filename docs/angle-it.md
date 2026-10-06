# Angle It

The fourth featured game replaces Mirror Me. Play at `/play/angle-it`.

- Five unique seeded targets between 15° and 165°. The first two are multiples of 15°, the third is a multiple of 5°, and the last two can be any whole degree. 90° is excluded.
- A fixed horizontal ray points left; the hand rotates across the upper half of the board. The peach wedge identifies the measured angle. The requested number stays visible, while the guess has no numeric readout or degree markings during play.
- Drag or tap the board with mouse or touch. Pointer capture keeps dragging active outside the board. Keyboard arrows turn by 1°, Shift by 5°, and Home/End move to 0°/180°.
- Each round lasts 20 seconds. Confirm locks the guess, or the deadline saves the last adjusted position. No interaction earns zero points. An expired deadline cannot accept further input, including after returning to a backgrounded tab.
- Guesses are stored to one decimal place. Scores start at 1,000 and lose 20 points per degree of absolute error, with a minimum of zero. Scores do not depend on speed.
- Reveals overlay the target as a sage dashed hand and show both angles, the error, and points. Players choose when to advance.
- Final results cover all five rounds, with fresh targets, same-seed replay, and a shareable practice link. Shared links reproduce the targets; they do not create multiplayer rooms.
- Motion follows the existing saved preference. No game assets or new dependencies are required.

## Multiplayer

- Angle It is the fourth registry game, after Split It, Flash Grid, and Internal Clock. Selected games finish all their rounds in that order, regardless of checkbox selection order.
- Hosts choose 1–10 rounds and 5–60 seconds per round (five rounds and 20 seconds by default). Targets stay random; there are no per-round target settings. Changing settings clears Ready marks as usual.
- The Next.js server generates and stores a shared challenge with its own round seed. Within Angle It, the first two rounds use multiples of 15°, the third uses multiples of 5°, and later rounds use whole degrees. Room targets can repeat because each round has an independent seed.
- The three-second countdown rotates a peach hand, shows 3, 2, 1, and displays the requested angle. Saved Motion off disables the rotation transition.
- The same board supports mouse, touch, and keyboard. Positions save periodically while dragging and recover after refresh/reconnect. Confirm locks the latest position; the database rejects pre-countdown, expired, stale, and already-confirmed submissions.
- Clients send only their hand angle. The server validates 0°–180° and computes the result and points. A 0° answer is valid. An absent answer earns zero. Individual guesses and scores stay hidden from other players until reveal.
- The deadline uses the host's per-game duration through the existing room SQL. Timeout scores the last successfully saved guess; unfinished network requests after the deadline cannot overwrite it.
- Reveals show each player's angle and a sage dashed target overlay, plus error and points. The shared standings, host progression, final results, rematch, and host transfer paths remain in use.
- No new migration is required for Angle It. Existing room migration 005 supports its per-game timer; keep migrations through 007 applied for matches involving the earlier games.

Rule tests and route tests verify settings, mixed-game ordering, reproducible generation, server scoring, authenticated identity, malformed/stale submissions, and propagation of database round rejection. Route tests mock the Supabase boundary; they do not execute live Postgres functions. Browser access was previously declined in this chat. Live multiplayer, visual layout, reconnect behavior, and real-device touch still need a playtest with separate browser profiles.
