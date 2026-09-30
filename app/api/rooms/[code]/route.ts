import { handleRoomRequest, readBody, requirePlayer, RoomError, roomCode, roomResponse, roomRpc } from "@/lib/rooms/server";
import type { RoomSnapshot } from "@/lib/rooms/types";

type Context = { params: Promise<{ code: string }> };

export async function GET(request: Request, context: Context) {
  return handleRoomRequest(async () => {
    const playerId = await requirePlayer(request);
    const { code } = await context.params;
    const snapshot = await roomRpc<RoomSnapshot>("rightish_room_snapshot", {
      p_code: roomCode(code), p_player_id: playerId,
    });
    return roomResponse({ snapshot });
  });
}

export async function PATCH(request: Request, context: Context) {
  return handleRoomRequest(async () => {
    const playerId = await requirePlayer(request);
    const { code } = await context.params;
    const body = await readBody(request);
    if (typeof body.ready !== "boolean") throw new RoomError(400, "INVALID_READY_STATE", "Choose ready or not ready.");
    const snapshot = await roomRpc<RoomSnapshot>("rightish_set_ready", {
      p_code: roomCode(code), p_player_id: playerId, p_ready: body.ready,
    });
    return roomResponse({ snapshot });
  });
}

export async function DELETE(request: Request, context: Context) {
  return handleRoomRequest(async () => {
    const playerId = await requirePlayer(request);
    const { code } = await context.params;
    await roomRpc("rightish_leave_room", { p_code: roomCode(code), p_player_id: playerId });
    return roomResponse({ ok: true });
  });
}
