export type Room = {
  id: string;
  code: string;
  host_id: string;
  status: "lobby" | "playing" | "finished" | "closed";
  max_players: number;
  created_at: string;
  expires_at: string;
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
};
