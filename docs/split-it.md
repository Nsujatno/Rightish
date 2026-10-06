# Split It design

Agreed September 29–30, 2026. Build design → solo prototype → multiplayer.

## Challenge

Every player in a room receives the same shape. Start with procedural generation,
not preset croissants, squashes, or a finite silhouette library. Seeded rounded,
lobed, dented, and angular families vary proportions, asymmetry, rotation, shear,
and position. Shapes stay connected and have no holes. Avoid tiny spikes, very
thin sections, or details that are hard to see on a phone.

V1 uses positive radial outlines, so its shapes are simple, connected, and
star-shaped. It offers effectively unlimited combinations, but does not generate
every possible silhouette (for example, winding spirals). The renderer and scorer
use the identical sampled vector polygon. The generator has a version number so
future recipes can coexist with reproducible older challenges.

## Input and scoring

- Place the first anchor with a click/tap, aim, and place a second anchor.
- On touch screens, board taps place anchors on release. Swipes outside the numbered handles scroll without changing the guess; handles still support direct dragging. Pinch zoom is allowed away from the handles.
- The two points define a straight line extended across the entire shape.
- Drag either numbered handle to adjust. Start over resets the attempt.
- Confirm locks the answer; percentages and scores stay hidden until reveal.
- Default duration: 20 seconds. At the deadline, submit the latest valid cut.
- A lone first anchor or an uncommitted replacement line is not an answer.
- No valid cut earns zero. Invalid/cancelled adjustments preserve the saved cut.
- After both anchors are placed, valid handle movements update the saved answer
  live, including when the deadline expires mid-drag. Cancel restores the cut
  from before the drag; releasing an invalid move does the same.
- Concave cuts can create multiple fragments; score the combined area on each side.
- Keyboard alternative: arrows move the line; Q/E rotate; Shift makes smaller
  movements; Enter confirms; Escape resets.

Accuracy only, with no speed bonus. The default target remains 50/50. A room host
can choose 50/50 through 80/20 in five-point steps; either side may be larger.
For a target `T`, the room score is:

`score = max(0, round(1000 × (1 − |smallerAreaFraction − (100 − T)/100| / ((100 − T)/100))))`

At 50/50 this is the original rule:

`score = round(1000 × (1 − |leftArea − rightArea| / totalArea))`

| Split | Points |
| --- | ---: |
| 50/50 | 1,000 |
| 60/40 | 800 |
| 75/25 | 500 |

Displayed percentages round to one decimal place and sum to 100; scores use
unrounded areas. Default match length is five rounds with cumulative points.

## Social reveal

Room capacity is four players. Wait until everyone confirms or the deadline
passes before revealing any scores. Show four result cards with names, cuts on
the shared shape, percentages, and round points. Highlight the current player.
Selecting a card expands that attempt and its comparison.

Separate the pieces slightly, then allow a comparison against the selected target
at the player's own angle. There is no single unique perfect cut. Show total
scores and rank changes, with equal scores sharing a rank. The host decides when
to continue so friends have time to react. Solo uses Next shape instead.

The prototype renders one actual player using the same result-board contract;
it does not invent opponents or imply a synchronized room match.

## Shared minigame structure

`lib/games/types.ts` defines game metadata, seeded generation, answer validation,
scoring, per-game match settings, and result records. `lib/games/registry.ts` lists playable
games and interleaves each enabled game's configured rounds. Each game owns its
domain rules and its input/reveal components. Match timers, progression, result
cards, and standings belong to the shared shell.

Solo runs the pure rules locally. Multiplayer must score the same rules on the
server, receive only normalized input, and own the seed, deadline, submissions,
round completion, totals, and host-only progression. Broadcast authoritative
challenge geometry alongside its seed/version to avoid client generator drift.
Host configuration now exposes enabled games, with duration, round count, and target
inside Split It's settings panel. A registered game supplies its own rules and settings; the room engine
owns the countdown, deadline, answer storage, server scoring, reveal, and standings.

## Current status and remaining validation

The solo prototype is `/play/split-it`, linked from the landing-page Split It
dialog. It includes five rounds, fresh seeds, replay/shareable challenge sets,
deadline submission, reveal, and final totals. Its shape colors match the lobby's
pastel palette; the cream surfaces and gold/sage controls follow the landing page.

Automated checks cover analytic accuracy, malformed answers, concave fragments,
area conservation, parallel 50/50 cuts, deterministic generation across 2,000
seeds, topology checks, and enabled-game selection. Lint and production build
are also required.

Before calling the solo interaction finished, playtest anchor placement and
dragging with mouse, touch, and keyboard, especially pointer cancellation,
invalid moves, and the deadline during adjustment. Browser automation was not
connected in this development session. Multiplayer integration is implemented in
code and migration 005, which must be applied to Supabase before room matches work.
Room-level browser playtests for simultaneous players, refreshes, disconnects, and
timeouts are still pending.
