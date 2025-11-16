import { GAME_STATUS, type GameStatus } from '../constants/message-types.js';
import type { ShipData } from '../types/index.js';
import { Ship } from './ship.js';

interface GameBoard {
  ownBoard: Set<string>;
  attackBoard: Map<string, string>;
}

export class Game {
  id: number;
  roomId: number;
  players: number[];
  ships: Record<number, Ship[]>;
  boards: Record<number, GameBoard>;
  currentPlayerId: number | null;
  status: GameStatus;

  constructor(id: number, roomId: number, playerIds: number[]) {
    this.id = id;
    this.roomId = roomId;
    this.players = playerIds;
    this.ships = {};
    this.boards = {};
    this.currentPlayerId = null;
    this.status = GAME_STATUS.WAITING;

    for (const playerId of playerIds) {
      this.boards[playerId] = {
        ownBoard: new Set<string>(),
        attackBoard: new Map<string, string>(),
      };
    }
  }

  setShips(playerId: number, shipsData: ShipData[]): void {
    if (this.status !== GAME_STATUS.WAITING) {
      throw new Error('Game is not in waiting state');
    }

    if (!this.players.includes(playerId)) {
      throw new Error('Player not in this game');
    }

    if (this.ships[playerId]) {
      throw new Error('Player already set ships');
    }

    const ships = shipsData.map((shipData) => {
      const ship = new Ship(shipData.position, shipData.direction, shipData.length, shipData.type);

      const cells = ship.getCells();
      for (const cell of cells) {
        const key = `${cell.x},${cell.y}`;
        this.boards[playerId].ownBoard.add(key);
      }

      return ship;
    });

    this.ships[playerId] = ships;

    this.currentPlayerId = playerId;
  }

  isReady(): boolean {
    return this.players.every(
      (playerId) => this.ships[playerId] && this.ships[playerId].length > 0
    );
  }

  start(): void {
    if (!this.isReady()) {
      throw new Error('Not all players have set ships');
    }
    this.status = GAME_STATUS.IN_PROGRESS;
  }

  processAttack(attackerId: number, x: number, y: number): { status: string; ship: Ship | null } {
    if (this.status !== GAME_STATUS.IN_PROGRESS) {
      throw new Error('Game is not in progress');
    }

    if (this.currentPlayerId !== attackerId) {
      throw new Error('Not your turn');
    }

    const attackKey = `${x},${y}`;

    const opponentId = this.players.find((id) => id !== attackerId);
    if (!opponentId) {
      throw new Error('Opponent not found');
    }

    if (this.boards[attackerId].attackBoard.has(attackKey)) {
      throw new Error('Already attacked this cell');
    }

    const hit = this.boards[opponentId].ownBoard.has(attackKey);

    if (hit) {
      const ship = this.ships[opponentId].find((s) => s.isHit(x, y));
      if (ship) {
        ship.markHit(x, y);
        const isKilled = ship.isKilled();

        this.boards[attackerId].attackBoard.set(attackKey, isKilled ? 'killed' : 'shot');

        return {
          status: isKilled ? 'killed' : 'shot',
          ship: isKilled ? ship : null,
        };
      }
    }

    this.boards[attackerId].attackBoard.set(attackKey, 'miss');
    return { status: 'miss', ship: null };
  }

  switchTurn(): void {
    this.currentPlayerId = this.players.find((id) => id !== this.currentPlayerId) || null;
  }

  checkWin(playerId: number): boolean {
    if (this.status !== GAME_STATUS.IN_PROGRESS) {
      return false;
    }

    const opponentId = this.players.find((id) => id !== playerId);
    if (!opponentId) {
      return false;
    }

    const opponentShips = this.ships[opponentId] || [];

    return opponentShips.every((ship) => ship.isKilled());
  }

  finish(_winnerId: number): void {
    this.status = GAME_STATUS.FINISHED;
  }

  getPlayerShips(playerId: number): ShipData[] {
    return (this.ships[playerId] || []).map((ship) => ship.toJSON());
  }
}
