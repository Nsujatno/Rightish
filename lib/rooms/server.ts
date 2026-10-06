import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";

export class RoomError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

const databaseErrors: Record<string, [number, string]> = {
  ROOM_NOT_FOUND: [404, "That room wasn’t found. Double-check the code with your friend."],
  ROOM_EXPIRED: [410, "That room has expired. Time to host a fresh one!"],
  NOT_A_MEMBER: [403, "Pick a nickname to join this room."],
  MATCH_IN_PROGRESS: [409, "That game has already started. Ask your friend to wait for you."],
  ROOM_FULL: [409, "This room is full. Ask your friend to make another one."],
  NICKNAME_TAKEN: [409, "Someone in this room already has that nickname. Try another."],
  INVALID_NICKNAME: [400, "Use a nickname with 1–20 characters."],
  INVALID_READY_STATE: [400, "That ready status wasn’t understood. Try again."],
  NOT_AUTHENTICATED: [401, "Your player session couldn’t be verified. Refresh and try again."],
  ROOM_CODE_UNAVAILABLE: [503, "We couldn’t find a free room code. Please try again."],
  NOT_HOST: [403, "Only the host can do that."],
  INVALID_SETTINGS: [400, "Those match settings weren’t understood."],
  PLAYERS_NOT_READY: [409, "At least two players must be here and everyone must be ready."],
  INVALID_ROUND: [400, "That round couldn’t be started."],
  ROUND_CLOSED: [409, "That round has already ended. Results are on their way."],
  ROUND_NOT_STARTED: [409, "Wait for the countdown before making your guess."],
  ROUND_NOT_READY: [409, "The round is still going. Wait for the reveal."],
  INVALID_ANSWER: [400, "That answer couldn’t be scored. Try choosing again."],
  ALREADY_CONFIRMED: [409, "Your answer is already locked in."],
};

export function nickname(value: unknown) {
  if (typeof value !== "string") throw new RoomError(400, "INVALID_NICKNAME", "Enter your nickname first.");
  const name = value.trim();
  if ([...name].length < 1 || [...name].length > 20 || /[\u0000-\u001f\u007f-\u009f]/.test(name)) {
    throw new RoomError(400, "INVALID_NICKNAME", "Use a nickname with 1–20 characters.");
  }
  return name;
}

export function roomCode(value: unknown) {
  if (typeof value !== "string" || !/^[A-Z0-9]{6}$/.test(value.trim().toUpperCase())) {
    throw new RoomError(400, "INVALID_ROOM_CODE", "Room codes have six letters or numbers.");
  }
  return value.trim().toUpperCase();
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const text = await request.text();
    if (text.length > 4096) throw new Error("Too large");
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
    return body as Record<string, unknown>;
  } catch { throw new RoomError(400, "INVALID_REQUEST", "That request wasn’t understood. Please try again."); }
}

export async function requirePlayer(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token || token.length > 8192) throw new RoomError(401, "NOT_AUTHENTICATED", databaseErrors.NOT_AUTHENTICATED[1]);
  // Verify with Auth; never trust a player ID or decoded JWT from the client.
  const { data, error } = await getServerSupabase().auth.getUser(token);
  if (error || !data.user) {
    if (error && (error.name === "AuthRetryableFetchError" || (error.status && error.status >= 500))) {
      throw new RoomError(503, "CONNECTION_UNAVAILABLE", "The connection is taking a break. Try again in a moment.");
    }
    throw new RoomError(401, "NOT_AUTHENTICATED", databaseErrors.NOT_AUTHENTICATED[1]);
  }
  return data.user.id;
}

export async function roomRpc<T>(name: string, parameters: Record<string, unknown>): Promise<T> {
  const { data, error } = await getServerSupabase().rpc(name, parameters);
  if (error) {
    const known = databaseErrors[error.message];
    if (known) throw new RoomError(known[0], error.message, known[1]);
    if (error.code === "PGRST202" || error.code === "42P01") {
      throw new RoomError(503, "DATABASE_NOT_READY", "The room database isn’t ready yet. Apply the latest Supabase SQL migration.");
    }
    console.error("Room RPC failed", { name, code: error.code, message: error.message });
    throw new RoomError(503, "CONNECTION_UNAVAILABLE", "We couldn’t reach the room. Try again in a moment.");
  }
  return data as T;
}

export function roomResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleRoomRequest(operation: () => Promise<Response>) {
  try { return await operation(); }
  catch (error) {
    if (error instanceof RoomError) return roomResponse({ error: error.message, code: error.code }, error.status);
    const configuration = error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED";
    return roomResponse({
      error: configuration ? "Supabase is not configured yet. Restart the dev server after adding .env.local." : "Something interrupted the connection. Please try again.",
      code: configuration ? "SUPABASE_NOT_CONFIGURED" : "CONNECTION_UNAVAILABLE",
    }, 503);
  }
}
