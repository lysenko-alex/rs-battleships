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

    const target = this.findTargetNearHits(attackBoard);
    if (target) {
      return target;
    }

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

  private findTargetNearHits(attackBoard: Map<string, string>): Position | null {
    const activeHits: Position[] = [];
    for (const [key, status] of attackBoard.entries()) {
      if (status === 'shot') {
        const [x, y] = key.split(',').map(Number);
        activeHits.push({ x, y });
      }
    }

    if (activeHits.length === 0) {
      return null;
    }

    if (activeHits.length >= 2) {
      const sortedHits = [...activeHits].sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
      });

      const firstHit = sortedHits[0];
      const secondHit = sortedHits[1];

      if (firstHit.x === secondHit.x) {
        const minY = Math.min(...sortedHits.map((h) => h.y));
        const maxY = Math.max(...sortedHits.map((h) => h.y));

        if (minY > 0) {
          const target = { x: firstHit.x, y: minY - 1 };
          const key = `${target.x},${target.y}`;
          if (!attackBoard.has(key)) {
            return target;
          }
        }

        if (maxY < 9) {
          const target = { x: firstHit.x, y: maxY + 1 };
          const key = `${target.x},${target.y}`;
          if (!attackBoard.has(key)) {
            return target;
          }
        }
      } else if (firstHit.y === secondHit.y) {
        const minX = Math.min(...sortedHits.map((h) => h.x));
        const maxX = Math.max(...sortedHits.map((h) => h.x));

        if (minX > 0) {
          const target = { x: minX - 1, y: firstHit.y };
          const key = `${target.x},${target.y}`;
          if (!attackBoard.has(key)) {
            return target;
          }
        }

        if (maxX < 9) {
          const target = { x: maxX + 1, y: firstHit.y };
          const key = `${target.x},${target.y}`;
          if (!attackBoard.has(key)) {
            return target;
          }
        }
      }
    }

    const lastHit = activeHits[activeHits.length - 1];
    const adjacentCells = [
      { x: lastHit.x - 1, y: lastHit.y }, // left
      { x: lastHit.x + 1, y: lastHit.y }, // right
      { x: lastHit.x, y: lastHit.y - 1 }, // up
      { x: lastHit.x, y: lastHit.y + 1 }, // down
    ];

    const shuffled = adjacentCells.sort(() => Math.random() - 0.5);

    for (const cell of shuffled) {
      if (cell.x >= 0 && cell.x <= 9 && cell.y >= 0 && cell.y <= 9) {
        const key = `${cell.x},${cell.y}`;
        if (!attackBoard.has(key)) {
          return cell;
        }
      }
    }

    for (let i = activeHits.length - 2; i >= 0; i--) {
      const hit = activeHits[i];
      const cells = [
        { x: hit.x - 1, y: hit.y },
        { x: hit.x + 1, y: hit.y },
        { x: hit.x, y: hit.y - 1 },
        { x: hit.x, y: hit.y + 1 },
      ];

      for (const cell of cells) {
        if (cell.x >= 0 && cell.x <= 9 && cell.y >= 0 && cell.y <= 9) {
          const key = `${cell.x},${cell.y}`;
          if (!attackBoard.has(key)) {
            return cell;
          }
        }
      }
    }

    return null;
  }
}
