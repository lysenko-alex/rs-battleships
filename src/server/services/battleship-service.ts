import type { Ship } from '../models/ship.js';
import type { GameRepository } from '../repositories/game-repository.js';
import type { Position, ShipData } from '../types/index.js';
import * as Validators from '../utils/validators.js';

interface AttackResult {
  status: string;
  ship: Ship | null;
}

export class BattleshipService {
  private gameRepository: GameRepository;

  constructor(gameRepository: GameRepository) {
    this.gameRepository = gameRepository;
  }

  validateShipPlacement(ships: ShipData[]): boolean {
    const validation = Validators.validateShips(ships);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const occupied = new Set<string>();
    for (const ship of ships) {
      const cells = this.getShipCells(ship);
      for (const cell of cells) {
        const key = `${cell.x},${cell.y}`;
        if (occupied.has(key)) {
          throw new Error('Ships overlap');
        }
        occupied.add(key);
      }
    }

    for (const ship of ships) {
      const cells = this.getShipCells(ship);
      for (const cell of cells) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const x = cell.x + dx;
            const y = cell.y + dy;
            if (x >= 0 && x <= 9 && y >= 0 && y <= 9) {
              const key = `${x},${y}`;
              if (occupied.has(key)) {
                const isPartOfCurrentShip = cells.some((c) => c.x === x && c.y === y);
                if (!isPartOfCurrentShip) {
                  throw new Error('Ships cannot be adjacent');
                }
              }
            }
          }
        }
      }
    }

    return true;
  }

  private getShipCells(ship: ShipData): Position[] {
    const cells: Position[] = [];
    for (let i = 0; i < ship.length; i++) {
      if (ship.direction) {
        cells.push({ x: ship.position.x, y: ship.position.y + i });
      } else {
        cells.push({ x: ship.position.x + i, y: ship.position.y });
      }
    }
    return cells;
  }

  processAttack(gameId: number, attackerId: number, x: number, y: number): AttackResult {
    if (!Validators.validateCoordinates(x, y)) {
      throw new Error('Invalid coordinates');
    }

    const game = this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    return game.processAttack(attackerId, x, y);
  }

  checkHit(gameId: number, playerId: number, x: number, y: number): boolean {
    const game = this.gameRepository.findById(gameId);
    if (!game) {
      return false;
    }

    const opponentId = game.players.find((id) => id !== playerId);
    if (!opponentId) {
      return false;
    }

    const key = `${x},${y}`;
    return game.boards[opponentId].ownBoard.has(key);
  }

  markKilledShip(gameId: number, playerId: number, ship: Ship): Position[] {
    const game = this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const adjacentCells = ship.getAdjacentCells();
    const attackerId = game.players.find((id) => id !== playerId);
    if (!attackerId) {
      throw new Error('Attacker not found');
    }

    for (const cell of adjacentCells) {
      const key = `${cell.x},${cell.y}`;
      if (!game.boards[attackerId].attackBoard.has(key)) {
        game.boards[attackerId].attackBoard.set(key, 'miss');
      }
    }

    this.gameRepository.update(game);
    return adjacentCells;
  }

  checkGameWin(gameId: number, playerId: number): boolean {
    const game = this.gameRepository.findById(gameId);
    if (!game) {
      return false;
    }

    return game.checkWin(playerId);
  }

  generateRandomAttack(gameId: number, playerId: number): Position {
    const game = this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const opponentId = game.players.find((id) => id !== playerId);
    if (!opponentId) {
      throw new Error('Opponent not found');
    }

    const attackBoard = game.boards[playerId].attackBoard;

    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const x = Math.floor(Math.random() * 10);
      const y = Math.floor(Math.random() * 10);
      const key = `${x},${y}`;

      if (!attackBoard.has(key)) {
        return { x, y };
      }

      attempts++;
    }

    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const key = `${x},${y}`;
        if (!attackBoard.has(key)) {
          return { x, y };
        }
      }
    }

    throw new Error('No available cells to attack');
  }
}
