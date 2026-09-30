import type { GameId } from "@/lib/games/registry";
import type { MatchSettings } from "@/lib/games/types";

export type Room = {
  id: string;
  code: string;
  host_id: string;
  status: "lobby" | "playing" | "finished" | "closed";
  max_players: number;
  settings: MatchSettings<GameId>;
  created_at: string;
  expires_at: string;
};

export type MatchPlayer = {
  playerId: string;
  nickname: string;
  totalScore: number;
};

export type MatchRoundResult = MatchPlayer & {
  roundScore: number;
  result: unknown | null;
};

export type RoomMatch = {
  id: string;
  phase: "playing" | "reveal" | "finished";
  settings: MatchSettings<GameId>;
  roundIndex: number;
  gameId: GameId;
  roundSeed: string;
  challenge: unknown;
  startsAt: string;
  deadline: string;
  players: MatchPlayer[];
  confirmedCount: number;
  myAnswer: unknown | null;
  myConfirmed: boolean;
  results: MatchRoundResult[] | null;
};

export type Player = {
  room_id: string;
  user_id: string;
  nickname: string;
  is_ready: boolean;
  joined_at: string;
};

export type RoomSnapshot = {
  room: Room;
  players: Player[];
  currentPlayerId: string;
  match: RoomMatch | null;
  serverNow: string;
  clientReceivedAt?: number;
};
