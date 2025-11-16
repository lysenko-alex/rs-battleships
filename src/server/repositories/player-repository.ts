import { Player } from '../models/player.js';

export class PlayerRepository {
  private players: Map<number, Player>;
  private playersByName: Map<string, Player>;
  private nextId: number;

  constructor() {
    this.players = new Map();
    this.playersByName = new Map();
    this.nextId = 1;
  }

  findById(id: number): Player | null {
    return this.players.get(id) || null;
  }

  findByName(name: string): Player | null {
    return this.playersByName.get(name) || null;
  }

  create(name: string, password: string): Player {
    const existing = this.findByName(name);
    if (existing) {
      throw new Error('Player already exists');
    }

    const id = this.nextId++;
    const player = new Player(id, name, password, 0);
    this.players.set(id, player);
    this.playersByName.set(name, player);
    return player;
  }

  update(player: Player): void {
    if (!this.players.has(player.id)) {
      throw new Error('Player not found');
    }
    this.players.set(player.id, player);
    this.playersByName.set(player.name, player);
  }

  getAll(): Player[] {
    return Array.from(this.players.values());
  }
}
