import type { Position, ShipData } from '../types/index.js';

export class Ship {
  position: Position;
  direction: boolean;
  length: number;
  type: string;
  hits: Position[];

  constructor(position: Position, direction: boolean, length: number, type: string) {
    this.position = position;
    this.direction = direction;
    this.length = length;
    this.type = type;
    this.hits = [];
  }

  getCells(): Position[] {
    const cells: Position[] = [];
    for (let i = 0; i < this.length; i++) {
      if (this.direction) {
        cells.push({ x: this.position.x, y: this.position.y + i });
      } else {
        cells.push({ x: this.position.x + i, y: this.position.y });
      }
    }
    return cells;
  }

  isHit(x: number, y: number): boolean {
    return this.getCells().some((cell) => cell.x === x && cell.y === y);
  }

  markHit(x: number, y: number): void {
    if (this.isHit(x, y) && !this.hits.some((h) => h.x === x && h.y === y)) {
      this.hits.push({ x, y });
    }
  }

  isKilled(): boolean {
    return this.hits.length === this.length;
  }

  getAdjacentCells(): Position[] {
    const cells = this.getCells();
    const adjacent = new Set<string>();

    for (const cell of cells) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const x = cell.x + dx;
          const y = cell.y + dy;

          if (dx === 0 && dy === 0) continue;

          if (x >= 0 && x <= 9 && y >= 0 && y <= 9) {
            if (!cells.some((c) => c.x === x && c.y === y)) {
              adjacent.add(`${x},${y}`);
            }
          }
        }
      }
    }

    return Array.from(adjacent).map((str) => {
      const [x, y] = str.split(',').map(Number);
      return { x, y };
    });
  }

  toJSON(): ShipData {
    return {
      position: this.position,
      direction: this.direction,
      length: this.length,
      type: this.type as ShipData['type'],
    };
  }
}
