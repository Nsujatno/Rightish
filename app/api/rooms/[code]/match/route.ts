import { matchRoundCount, selectGame, type GameId } from "@/lib/games/registry";
import { gameOptionsFor, getGame, parseMatchSettings } from "@/lib/games/settings";
import type { MatchSettings } from "@/lib/games/types";
import { handleRoomRequest, readBody, requirePlayer, RoomError, roomCode, roomResponse, roomRpc } from "@/lib/rooms/server";
import type { RoomSnapshot } from "@/lib/rooms/types";

type Context = { params: Promise<{ code: string }> };

function newRound(settings: MatchSettings<GameId>, roundIndex: number) {
  const roundSeed = crypto.randomUUID();
  const gameId = selectGame(settings, roundIndex);
  const game = getGame(gameId)!;
  return { gameId, roundSeed, challenge: game.generate(roundSeed, gameOptionsFor(settings, gameId)) };
}

export async function POST(request: Request, context: Context) {
  return handleRoomRequest(async () => {
    const playerId = await requirePlayer(request);
    const { code: rawCode } = await context.params;
    const code = roomCode(rawCode);
    const body = await readBody(request);
    const snapshot = await roomRpc<RoomSnapshot>("rightish_room_snapshot", {
      p_code: code, p_player_id: playerId,
    });

    if (body.action === "start") {
      const settings = parseMatchSettings(snapshot.room.settings);
      if (!settings) throw new RoomError(503, "INVALID_SETTINGS", "The room settings need to be saved again.");
      const round = newRound(settings, 0);
      const next = await roomRpc<RoomSnapshot>("rightish_start_match", {
        p_code: code, p_player_id: playerId, p_game_id: round.gameId,
        p_round_seed: round.roundSeed, p_challenge: round.challenge,
      });
      return roomResponse({ snapshot: next });
    }

    if (body.action === "answer") {
      const match = snapshot.match;
      if (!match || match.phase !== "playing" || !Number.isInteger(body.roundIndex) ||
        body.roundIndex !== match.roundIndex || typeof body.confirm !== "boolean") {
        throw new RoomError(409, "ROUND_CLOSED", "That round has already ended. Results are on their way.");
      }
      const game = getGame(match.gameId);
      const settings = parseMatchSettings(match.settings);
      if (!game || !settings) throw new RoomError(503, "INVALID_ROUND", "This challenge couldn’t be loaded.");
      const answer = body.answer ?? null;
      if (answer !== null && !game.validateAnswer(match.challenge, answer)) {
        throw new RoomError(400, "INVALID_ANSWER", "That cut couldn’t be scored. Try placing it again.");
      }
      if (answer === null && body.confirm) {
        throw new RoomError(400, "INVALID_ANSWER", "Place a cut before locking it in.");
      }
      const result = answer === null ? null : game.score(match.challenge, answer, gameOptionsFor(settings, match.gameId));
      if (result && (!Number.isInteger(result.score) || result.score < 0 || result.score > 1000)) {
        throw new RoomError(503, "INVALID_ROUND", "This challenge couldn’t be scored.");
      }
      const next = await roomRpc<RoomSnapshot>("rightish_submit_round", {
        p_code: code, p_player_id: playerId, p_round_index: match.roundIndex,
        p_answer: answer, p_result: result, p_score: result?.score ?? 0, p_confirm: body.confirm,
      });
      return roomResponse({ snapshot: next });
    }

    if (body.action === "next") {
      const match = snapshot.match;
      const settings = match && parseMatchSettings(match.settings);
      if (!match || !settings || match.phase !== "reveal" || body.roundIndex !== match.roundIndex) {
        throw new RoomError(409, "ROUND_NOT_READY", "The round is still going. Wait for the reveal.");
      }
      const round = match.roundIndex + 1 < matchRoundCount(settings)
        ? newRound(settings, match.roundIndex + 1)
        : { gameId: match.gameId, roundSeed: match.roundSeed, challenge: match.challenge };
      const next = await roomRpc<RoomSnapshot>("rightish_next_round", {
        p_code: code, p_player_id: playerId, p_round_index: match.roundIndex,
        p_game_id: round.gameId, p_round_seed: round.roundSeed, p_challenge: round.challenge,
      });
      return roomResponse({ snapshot: next });
    }

    if (body.action === "rematch") {
      const next = await roomRpc<RoomSnapshot>("rightish_rematch", {
        p_code: code, p_player_id: playerId,
      });
      return roomResponse({ snapshot: next });
    }

    throw new RoomError(400, "INVALID_REQUEST", "That match action wasn’t understood.");
  });
}
