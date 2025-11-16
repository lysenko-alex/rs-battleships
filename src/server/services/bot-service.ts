import { SHIP_LENGTHS, SHIP_TYPES } from '../constants/message-types.js';
import type { Position, ShipData } from '../types/index.js';

export const BOT_PLAYER_ID = -1;

export class BotService {
  generateRandomShips(): ShipData[] {
    const ships: ShipData[] = [];
    const occupied = new Set<string>();
    const shipCounts = {
      [SHIP_TYPES.SMALL]: 0,
      [SHIP_TYPES.MEDIUM]: 0,
      [SHIP_TYPES.LARGE]: 0,
      [SHIP_TYPES.HUGE]: 0,
    };

    const requiredShips = [
      { type: SHIP_TYPES.HUGE, count: 1 },
      { type: SHIP_TYPES.LARGE, count: 2 },
      { type: SHIP_TYPES.MEDIUM, count: 3 },
      { type: SHIP_TYPES.SMALL, count: 4 },
    ];

    for (const { type, count } of requiredShips) {
      while (shipCounts[type] < count) {
        const ship = this.tryPlaceShip(type, occupied);
        if (ship) {
          ships.push(ship);
          shipCounts[type]++;

          const cells = this.getShipCells(ship);
          for (const cell of cells) {
            occupied.add(`${cell.x},${cell.y}`);
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const x = cell.x + dx;
                const y = cell.y + dy;
                if (x >= 0 && x <= 9 && y >= 0 && y <= 9) {
                  occupied.add(`${x},${y}`);
                }
              }
            }
          }
        }
      }
    }

    return ships;
  }

  private tryPlaceShip(type: string, occupied: Set<string>): ShipData | null {
    const length = SHIP_LENGTHS[type];
    const maxAttempts = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const direction = Math.random() < 0.5;
      const x = Math.floor(Math.random() * 10);
      const y = Math.floor(Math.random() * 10);

      const endX = direction ? x : x + length - 1;
      const endY = direction ? y + length - 1 : y;

      if (endX < 0 || endX > 9 || endY < 0 || endY > 9) {
        continue;
      }

      let canPlace = true;
      for (let i = 0; i < length; i++) {
        const cellX = direction ? x : x + i;
        const cellY = direction ? y + i : y;
        const key = `${cellX},${cellY}`;
        if (occupied.has(key)) {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        return {
          position: { x, y },
          direction,
          length,
          type: type as ShipData['type'],
        };
      }
    }

    return null;
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
}
