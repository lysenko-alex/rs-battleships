import type { AttackStatus, ShipType } from '../constants/message-types.js';

export interface Position {
  x: number;
  y: number;
}

export interface ShipData {
  position: Position;
  direction: boolean;
  length: number;
  type: ShipType;
}

export interface Message {
  type: string;
  data: unknown;
  id: number;
}

export interface RegistrationRequest {
  name: string;
  password: string;
}

export interface RegistrationResponse {
  name: string;
  index: number | string;
  error: boolean;
  errorText: string;
}

export interface AddUserToRoomRequest {
  indexRoom: number | string;
}

export interface AddShipsRequest {
  gameId: number | string;
  ships: ShipData[];
  indexPlayer: number | string;
}

export interface AttackRequest {
  gameId: number | string;
  x: number;
  y: number;
  indexPlayer: number | string;
}

export interface RandomAttackRequest {
  gameId: number | string;
  indexPlayer: number | string;
}

export interface RoomUser {
  name: string;
  index: number | string;
}

export interface RoomData {
  roomId: number | string;
  roomUsers: RoomUser[];
}

export interface Winner {
  name: string;
  wins: number;
}

export interface CreateGameResponse {
  idGame: number | string;
  idPlayer: number | string;
}

export interface StartGameResponse {
  ships: ShipData[];
  currentPlayerIndex: number | string;
}

export interface AttackResponse {
  position: Position;
  currentPlayer: number | string;
  status: AttackStatus;
}

export interface TurnResponse {
  currentPlayer: number | string;
}

export interface FinishResponse {
  winPlayer: number | string;
}
