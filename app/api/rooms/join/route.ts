import { handleRoomRequest, nickname, readBody, requirePlayer, roomCode, roomResponse, roomRpc } from "@/lib/rooms/server";
import type { RoomSnapshot } from "@/lib/rooms/types";

export async function POST(request: Request) {
  return handleRoomRequest(async () => {
    const playerId = await requirePlayer(request);
    const body = await readBody(request);
    const snapshot = await roomRpc<RoomSnapshot>("rightish_join_room", {
      p_player_id: playerId, p_nickname: nickname(body.nickname), p_code: roomCode(body.code),
    });
    return roomResponse({ snapshot });
  });
}
