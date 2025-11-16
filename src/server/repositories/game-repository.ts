import { Game } from '../models/game.js';

export class GameRepository {
  private games: Map<number, Game>;
  private gamesByRoom: Map<number, Game>;
  private nextId: number;

  constructor() {
    this.games = new Map();
    this.gamesByRoom = new Map();
    this.nextId = 1;
  }

  create(roomId: number, playerIds: number[]): Game {
    const id = this.nextId++;
    const game = new Game(id, roomId, playerIds);
    this.games.set(id, game);
    this.gamesByRoom.set(roomId, game);
    return game;
  }

  findById(id: number): Game | null {
    return this.games.get(id) || null;
  }

  findByRoomId(roomId: number): Game | null {
    return this.gamesByRoom.get(roomId) || null;
  }

  update(game: Game): void {
    if (!this.games.has(game.id)) {
      throw new Error('Game not found');
    }
    this.games.set(game.id, game);
    this.gamesByRoom.set(game.roomId, game);
  }

  remove(id: number): void {
    const game = this.findById(id);
    if (game) {
      this.games.delete(id);
      this.gamesByRoom.delete(game.roomId);
    }
  }
}
