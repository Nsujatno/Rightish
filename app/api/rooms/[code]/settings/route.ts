import { parseMatchSettings, settingsForDatabase } from "@/lib/games/settings";
import { handleRoomRequest, readBody, requirePlayer, RoomError, roomCode, roomResponse, roomRpc } from "@/lib/rooms/server";
import type { RoomSnapshot } from "@/lib/rooms/types";

type Context = { params: Promise<{ code: string }> };

export async function PATCH(request: Request, context: Context) {
  return handleRoomRequest(async () => {
    const playerId = await requirePlayer(request);
    const { code } = await context.params;
    const body = await readBody(request);
    const settings = parseMatchSettings(body.settings);
    if (!settings) throw new RoomError(400, "INVALID_SETTINGS", "Choose valid rounds, time, target, and at least one game.");
    const snapshot = await roomRpc<RoomSnapshot>("rightish_update_settings", {
      p_code: roomCode(code), p_player_id: playerId, p_settings: settingsForDatabase(settings),
    });
    return roomResponse({ snapshot });
  });
}
