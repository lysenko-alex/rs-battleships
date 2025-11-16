import { SHIP_LENGTHS, SHIP_TYPES, type ShipType } from '../constants/message-types.js';
import type { Message, RegistrationRequest, ShipData } from '../types/index.js';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateMessage(message: unknown): ValidationResult {
  const msg = message as Message;

  if (typeof msg.type !== 'string') {
    return { valid: false, error: 'Message type is required' };
  }

  if (msg.id !== 0 && msg.id !== undefined) {
    return { valid: false, error: 'Message id must be 0' };
  }

  return { valid: true };
}

export function validateRegistration(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid registration data' };
  }

  const regData = data as RegistrationRequest;

  if (!regData.name || typeof regData.name !== 'string' || regData.name.trim() === '') {
    return { valid: false, error: 'Name is required' };
  }

  if (!regData.password || typeof regData.password !== 'string' || regData.password.trim() === '') {
    return { valid: false, error: 'Password is required' };
  }

  return { valid: true };
}

export function validateShips(ships: unknown): ValidationResult {
  if (!Array.isArray(ships) || ships.length === 0) {
    return { valid: false, error: 'Ships array is required' };
  }

  if (ships.length !== 10) {
    return { valid: false, error: 'Must have exactly 10 ships' };
  }

  const shipCounts: Record<string, number> = {
    [SHIP_TYPES.SMALL]: 0,
    [SHIP_TYPES.MEDIUM]: 0,
    [SHIP_TYPES.LARGE]: 0,
    [SHIP_TYPES.HUGE]: 0,
  };

  for (const ship of ships) {
    if (!ship || typeof ship !== 'object') {
      return { valid: false, error: 'Invalid ship object' };
    }

    const shipData = ship as ShipData;

    if (!shipData.position || typeof shipData.position !== 'object') {
      return { valid: false, error: 'Ship position is required' };
    }

    if (typeof shipData.position.x !== 'number' || typeof shipData.position.y !== 'number') {
      return { valid: false, error: 'Ship position must have numeric x and y' };
    }

    if (typeof shipData.direction !== 'boolean') {
      return { valid: false, error: 'Ship direction must be boolean' };
    }

    if (typeof shipData.length !== 'number' || shipData.length < 1 || shipData.length > 4) {
      return { valid: false, error: 'Ship length must be between 1 and 4' };
    }

    if (!Object.values(SHIP_TYPES).includes(shipData.type as ShipType)) {
      return { valid: false, error: 'Invalid ship type' };
    }

    if (shipData.length !== SHIP_LENGTHS[shipData.type]) {
      return { valid: false, error: `Ship length does not match type ${shipData.type}` };
    }

    shipCounts[shipData.type]++;

    if (!validateCoordinates(shipData.position.x, shipData.position.y)) {
      return { valid: false, error: 'Ship position out of bounds' };
    }

    const endX = shipData.direction
      ? shipData.position.x
      : shipData.position.x + shipData.length - 1;
    const endY = shipData.direction
      ? shipData.position.y + shipData.length - 1
      : shipData.position.y;

    if (endX < 0 || endX > 9 || endY < 0 || endY > 9) {
      return { valid: false, error: 'Ship extends out of bounds' };
    }
  }

  if (
    shipCounts[SHIP_TYPES.SMALL] !== 4 ||
    shipCounts[SHIP_TYPES.MEDIUM] !== 3 ||
    shipCounts[SHIP_TYPES.LARGE] !== 2 ||
    shipCounts[SHIP_TYPES.HUGE] !== 1
  ) {
    return { valid: false, error: 'Invalid ship count by type' };
  }

  return { valid: true };
}

export function validateCoordinates(x: unknown, y: unknown): boolean {
  if (typeof x !== 'number' || typeof y !== 'number') {
    return false;
  }
  return x >= 0 && x <= 9 && y >= 0 && y <= 9;
}

export function validateAttack(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid attack data' };
  }

  const attackData = data as { gameId?: unknown; indexPlayer?: unknown };

  if (typeof attackData.gameId === 'undefined') {
    return { valid: false, error: 'Game ID is required' };
  }

  if (typeof attackData.indexPlayer === 'undefined') {
    return { valid: false, error: 'Player index is required' };
  }

  return { valid: true };
}

export function validateAddUserToRoom(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid room data' };
  }

  const roomData = data as { indexRoom?: unknown };

  if (typeof roomData.indexRoom === 'undefined') {
    return { valid: false, error: 'Room index is required' };
  }

  return { valid: true };
}
